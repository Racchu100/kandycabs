'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GeotagCameraModal } from '@/components/camera/GeotagCameraModal';
import { compressAndConvertToWebP } from '@/lib/supabaseStorage';
import {
  DriverAccountRecord,
  DriverDocumentRecord,
  VehiclePhotoRecord,
  updateDriverVerificationData,
  updateDriverVerificationStatus,
} from '@/lib/driverAccountEngine';

interface DriverOnboardingViewProps {
  driver: DriverAccountRecord;
  onVerificationSubmitted?: (updatedDriver: DriverAccountRecord) => void;
}

type DocKey = 'licenseUrl' | 'rcUrl' | 'insuranceUrl';
type VehiclePhotoKey = 'frontUrl' | 'leftUrl' | 'rightUrl' | 'backUrl' | 'interiorUrl';

interface UploadItemDef {
  key: string;
  label: string;
  type: 'DOCUMENT' | 'VEHICLE';
  subKey: DocKey | VehiclePhotoKey;
  description: string;
  category: 'documents' | 'exterior' | 'interior';
  fileName: string;
}

const REQUIRED_UPLOADS: UploadItemDef[] = [
  {
    key: 'vehicle_front',
    label: 'Vehicle Front Photo',
    type: 'VEHICLE',
    subKey: 'frontUrl',
    description: 'Front view showing vehicle license plate number clearly',
    category: 'exterior',
    fileName: 'front',
  },
  {
    key: 'vehicle_left',
    label: 'Vehicle Left Side Photo',
    type: 'VEHICLE',
    subKey: 'leftUrl',
    description: 'Full side view of the left body & tires',
    category: 'exterior',
    fileName: 'left',
  },
  {
    key: 'vehicle_right',
    label: 'Vehicle Right Side Photo',
    type: 'VEHICLE',
    subKey: 'rightUrl',
    description: 'Full side view of the right body & tires',
    category: 'exterior',
    fileName: 'right',
  },
  {
    key: 'vehicle_back',
    label: 'Vehicle Back / Rear Photo',
    type: 'VEHICLE',
    subKey: 'backUrl',
    description: 'Rear view showing registration badge and boot',
    category: 'exterior',
    fileName: 'back',
  },
  {
    key: 'vehicle_interior',
    label: 'Permanent Vehicle Interior Photo',
    type: 'VEHICLE',
    subKey: 'interiorUrl',
    description: 'Clean cabin seats & dashboard view',
    category: 'interior',
    fileName: 'interior',
  },
  {
    key: 'doc_license',
    label: 'Commercial Driving Licence (DL)',
    type: 'DOCUMENT',
    subKey: 'licenseUrl',
    description: 'Front clear photo of your valid commercial driving licence',
    category: 'documents',
    fileName: 'license',
  },
  {
    key: 'doc_rc',
    label: 'Vehicle Registration Certificate (RC)',
    type: 'DOCUMENT',
    subKey: 'rcUrl',
    description: 'Clear image of yellow-board vehicle RC document',
    category: 'documents',
    fileName: 'rc',
  },
  {
    key: 'doc_insurance',
    label: 'Commercial Vehicle Insurance Policy',
    type: 'DOCUMENT',
    subKey: 'insuranceUrl',
    description: 'Valid commercial third-party / comprehensive insurance document',
    category: 'documents',
    fileName: 'insurance',
  },
];

export const DriverOnboardingView: React.FC<DriverOnboardingViewProps> = ({
  driver,
  onVerificationSubmitted,
}) => {
  const [documents, setDocuments] = useState<DriverDocumentRecord>(driver.documents || {});
  const [vehiclePhotos, setVehiclePhotos] = useState<VehiclePhotoRecord>(driver.vehiclePhotos || {});
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Camera Modal Target State
  const [activeCameraItem, setActiveCameraItem] = useState<UploadItemDef | null>(null);

  const cleanVehicleId = (driver.vehicleRegistration || 'ka19c4829').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  // Helper to process raw imageDataUrl or File, compress to WebP & upload to Supabase Storage
  const handleUploadImage = async (item: UploadItemDef, rawDataUrl: string) => {
    setUploadingItem(item.key);
    setUploadProgress(`Compressing ${item.label} to WebP...`);
    setErrorMsg(null);

    try {
      // 1. Client-Side WebP Compression
      const compressed = await compressAndConvertToWebP(rawDataUrl, 1200, 900, 0.82);

      setUploadProgress(`Uploading ${item.label} to Supabase Storage...`);

      // 2. Upload to Supabase Storage via API Route
      const res = await fetch('/api/cab-photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          vehicleId: cleanVehicleId,
          category: item.category,
          fileName: item.fileName,
          imageDataUrl: compressed.dataUrl,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.publicUrl) {
        throw new Error(data.error || 'Failed to upload photo to Supabase Storage.');
      }

      const uploadedUrl = data.publicUrl;

      // 3. Update Local State & Persist
      let updatedDocs = { ...documents };
      let updatedPhotos = { ...vehiclePhotos };

      if (item.type === 'DOCUMENT') {
        updatedDocs[item.subKey as DocKey] = uploadedUrl;
        setDocuments(updatedDocs);
      } else {
        updatedPhotos[item.subKey as VehiclePhotoKey] = uploadedUrl;
        setVehiclePhotos(updatedPhotos);
      }

      const result = updateDriverVerificationData(driver.id, updatedDocs, updatedPhotos);
      if (result.driver && onVerificationSubmitted) {
        onVerificationSubmitted(result.driver);
      }

      setSuccessMsg(`✓ ${item.label} successfully uploaded and saved to Supabase Storage!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error uploading onboarding item:', err);
      setErrorMsg(`Failed to upload ${item.label}: ${err.message || 'Network error'}`);
    } finally {
      setUploadingItem(null);
      setUploadProgress(null);
    }
  };

  // Handle File Input Selection ("Upload from Device")
  const handleFileSelect = (item: UploadItemDef, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        handleUploadImage(item, dataUrl);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so re-selecting same file fires event
    e.target.value = '';
  };

  const getItemUrl = (item: UploadItemDef): string | undefined => {
    if (item.type === 'DOCUMENT') {
      return documents[item.subKey as DocKey];
    }
    return vehiclePhotos[item.subKey as VehiclePhotoKey];
  };

  const uploadedCount = REQUIRED_UPLOADS.filter((item) => Boolean(getItemUrl(item))).length;
  const isAllUploaded = uploadedCount === REQUIRED_UPLOADS.length;

  const handleFinalSubmit = () => {
    const result = updateDriverVerificationStatus(driver.id, 'PENDING_VERIFICATION');
    if (result.driver && onVerificationSubmitted) {
      onVerificationSubmitted(result.driver);
    }
    setSuccessMsg('🎉 Driver & Vehicle Verification submitted to Admin! Waiting for approval.');
  };

  // If driver status is PENDING_VERIFICATION, render Waiting for Admin Approval Banner
  const isPendingApproval = driver.verificationStatus === 'PENDING_VERIFICATION';
  const isRejected = driver.verificationStatus === 'REJECTED';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {/* Header Info Card */}
      <Card padded style={{ background: '#1E293B', color: '#fff', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="h2" style={{ color: '#fff', margin: 0 }}>
              🛡️ Chauffeur & Vehicle Verification Portal
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
              Welcome, <b>{driver.fullName}</b> ({driver.vehicleRegistration} - {driver.vendorAgencyName})
            </p>
          </div>
          <div>
            {isPendingApproval && (
              <span className="pill yellow" style={{ fontSize: '12px', fontWeight: 800, padding: '6px 12px' }}>
                ⏳ WAITING FOR ADMIN APPROVAL
              </span>
            )}
            {isRejected && (
              <span className="pill red" style={{ fontSize: '12px', fontWeight: 800, padding: '6px 12px' }}>
                ❌ VERIFICATION DECLINED
              </span>
            )}
            {!isPendingApproval && !isRejected && (
              <span className="pill blue" style={{ fontSize: '12px', fontWeight: 800, padding: '6px 12px' }}>
                📝 STEP 1: ONBOARDING VERIFICATION
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Rejection Alert */}
      {isRejected && (
        <Card padded style={{ background: '#FEE2E2', border: '2px solid #EF4444', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <h3 style={{ margin: '0 0 6px', color: '#991B1B', fontSize: '16px', fontWeight: 800 }}>
                Verification Requires Correction / Re-upload
              </h3>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#7F1D1D' }}>
                <b>Admin Feedback:</b> {driver.rejectionReason || 'Uploaded documents or vehicle photos were unclear or expired. Please re-upload clear copies below.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pending Approval Screen */}
      {isPendingApproval ? (
        <Card padded style={{ background: '#FFFBEB', border: '2px solid #F59E0B', textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#92400E', margin: '0 0 8px' }}>
            Verification Under Admin Review
          </h3>
          <p style={{ fontSize: '14px', color: '#78350F', maxWidth: '560px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Your 5 vehicle photos and 3 commercial documents have been successfully compressed and saved to <b>Supabase Cloud Storage</b>. Kandy Cabs Admin Control will review your credentials shortly.
          </p>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', maxWidth: '480px', margin: '0 auto 20px', border: '1px solid #FCD34D' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Uploaded Storage Evidence Log ({uploadedCount} / {REQUIRED_UPLOADS.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {REQUIRED_UPLOADS.map((item) => {
                const url = getItemUrl(item);
                return (
                  <div key={item.key} style={{ textAlign: 'center' }}>
                    {url ? (
                      <img src={url} alt={item.label} style={{ width: '100%', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #10B981' }} />
                    ) : (
                      <div style={{ height: '55px', background: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94A3B8' }}>Pending</div>
                    )}
                    <div style={{ fontSize: '9.5px', marginTop: '3px', fontWeight: 700, color: url ? '#059669' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.fileName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              onClick={() => {
                const updated = updateDriverVerificationStatus(driver.id, 'PENDING_VERIFICATION');
                if (updated.driver && onVerificationSubmitted) onVerificationSubmitted(updated.driver);
              }}
              variant="ghost"
              style={{ fontWeight: 700 }}
            >
              🔄 Refresh Approval Status
            </Button>
          </div>
        </Card>
      ) : (
        /* Upload Form Screen */
        <div>
          {errorMsg && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', color: '#065F46', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 700 }}>
              {successMsg}
            </div>
          )}

          {uploadProgress && (
            <div style={{ background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1E40AF', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="animate-spin">🌀</span>
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Progress Indicator Card */}
          <Card padded style={{ background: '#fff', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                Required Verification Files Uploaded ({uploadedCount} / {REQUIRED_UPLOADS.length})
              </span>
              <span className={`pill ${isAllUploaded ? 'green' : 'blue'}`} style={{ fontSize: '11px', fontWeight: 800 }}>
                {isAllUploaded ? '✅ ALL REQUIRED FILES READY' : `${REQUIRED_UPLOADS.length - uploadedCount} REMAINING`}
              </span>
            </div>
            <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(uploadedCount / REQUIRED_UPLOADS.length) * 100}%`, height: '100%', background: isAllUploaded ? '#10B981' : '#3B82F6', transition: 'width 0.3s ease' }} />
            </div>
          </Card>

          {/* Section 1: Vehicle Exterior & Interior Photos */}
          <Card padded style={{ background: '#fff', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚗 Vehicle Photos (5 Positions)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 16px' }}>
              Capture or upload 5 clear photos of vehicle <b>{driver.vehicleRegistration}</b> from all sides and cabin interior. Files will be saved to Supabase path: <code>vehicle-photos/{cleanVehicleId}/...</code>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {REQUIRED_UPLOADS.filter((i) => i.type === 'VEHICLE').map((item) => {
                const url = getItemUrl(item);
                const isItemUploading = uploadingItem === item.key;

                return (
                  <div
                    key={item.key}
                    style={{
                      border: url ? '2px solid #10B981' : '1.5px dashed #CBD5E1',
                      background: url ? '#F0FDF4' : '#F8FAFC',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{item.label}</span>
                        {url && <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}>✓ Uploaded</span>}
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 10px', lineHeight: 1.3 }}>{item.description}</p>
                    </div>

                    {url ? (
                      <div style={{ marginBottom: '10px' }}>
                        <img src={url} alt={item.label} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #6EE7B7' }} />
                      </div>
                    ) : null}

                    {/* Dual Buttons: Take Photo & Upload from Device */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        type="button"
                        onClick={() => setActiveCameraItem(item)}
                        disabled={isItemUploading}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: '#3B82F6',
                          color: '#fff',
                          borderRadius: '6px',
                        }}
                      >
                        📷 Take Photo
                      </Button>

                      <input
                        type="file"
                        accept="image/*"
                        id={`input-device-${item.key}`}
                        onChange={(e) => handleFileSelect(item, e)}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor={`input-device-${item.key}`}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        📁 Device
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section 2: Driver & Vehicle Documents */}
          <Card padded style={{ background: '#fff', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📄 Commercial Documents (3 Items)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 16px' }}>
              Provide clear photos or scans of your Commercial Licence, RC, and Insurance. Files saved to path: <code>driver-documents/{driver.id}/...</code>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              {REQUIRED_UPLOADS.filter((i) => i.type === 'DOCUMENT').map((item) => {
                const url = getItemUrl(item);
                const isItemUploading = uploadingItem === item.key;

                return (
                  <div
                    key={item.key}
                    style={{
                      border: url ? '2px solid #10B981' : '1.5px dashed #CBD5E1',
                      background: url ? '#F0FDF4' : '#F8FAFC',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>{item.label}</span>
                        {url && <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 800 }}>✓ Uploaded</span>}
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 10px', lineHeight: 1.3 }}>{item.description}</p>
                    </div>

                    {url ? (
                      <div style={{ marginBottom: '10px' }}>
                        <img src={url} alt={item.label} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #6EE7B7' }} />
                      </div>
                    ) : null}

                    {/* Dual Buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button
                        type="button"
                        onClick={() => setActiveCameraItem(item)}
                        disabled={isItemUploading}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#3B82F6',
                          color: '#fff',
                          borderRadius: '6px',
                        }}
                      >
                        📷 Take Photo
                      </Button>

                      <input
                        type="file"
                        accept="image/*"
                        id={`input-device-doc-${item.key}`}
                        onChange={(e) => handleFileSelect(item, e)}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor={`input-device-doc-${item.key}`}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        📁 Device
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Submit Verification Card */}
          <Card padded style={{ background: isAllUploaded ? '#ECFDF5' : '#FFFBEB', border: isAllUploaded ? '2px solid #10B981' : '1px solid #FCD34D', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: isAllUploaded ? '#065F46' : '#92400E' }}>
              {isAllUploaded ? '✅ All 8 Verification Items Uploaded!' : `📋 ${REQUIRED_UPLOADS.length - uploadedCount} Required Uploads Remaining`}
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: isAllUploaded ? '#047857' : '#78350F' }}>
              {isAllUploaded
                ? 'Click below to submit your credentials to Kandy Cabs Admin for immediate review and trip assignment activation.'
                : 'You can submit now to let Admin begin reviewing completed items, or finish uploading remaining photos.'}
            </p>

            <Button
              onClick={handleFinalSubmit}
              variant="accent"
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 800,
                background: isAllUploaded ? '#059669' : '#D97706',
              }}
            >
              🚀 Submit Verification to Admin for Approval
            </Button>
          </Card>
        </div>
      )}

      {/* Geotag Camera Modal */}
      {activeCameraItem && (
        <GeotagCameraModal
          isOpen={Boolean(activeCameraItem)}
          onClose={() => setActiveCameraItem(null)}
          title={`📷 Capture ${activeCameraItem.label}`}
          driverName={driver.fullName}
          vehicleReg={driver.vehicleRegistration}
          driverId={driver.id}
          vehicleId={cleanVehicleId}
          category={activeCameraItem.category === 'documents' ? 'receipt' : activeCameraItem.category === 'interior' ? 'interior' : 'exterior'}
          onCapture={(imageDataUrl, _meta, cloudUrl) => {
            const finalData = imageDataUrl || cloudUrl || '';
            if (finalData && activeCameraItem) {
              handleUploadImage(activeCameraItem, finalData);
              setActiveCameraItem(null);
            }
          }}
        />
      )}
    </div>
  );
};
