'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { recordAuditLog } from '@/lib/adminEngine';
import { sendNotification } from '@/lib/notificationEngine';
import { getDriverPartnerRequests, getAllDriverAccounts, DriverJoinRequestRecord } from '@/lib/driverAccountEngine';

export const DriverJoinRequestForm: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Mangaluru');
  const [vehicleDetails, setVehicleDetails] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ name: string; phone: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your valid Full Name.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Mobile Number.');
      return;
    }

    // Check if driver is already a registered driver partner
    const registeredDrivers = getAllDriverAccounts();
    const isAlreadyPartner = registeredDrivers.some((d) => {
      const dPhone = (d.phone || '').replace(/\D/g, '').slice(-10);
      const dName = (d.fullName || '').toLowerCase().trim();
      const phoneMatch = cleanPhone.length >= 10 && dPhone.length >= 10 && cleanPhone.slice(-10) === dPhone;
      const nameMatch = cleanName.toLowerCase() === dName;
      return phoneMatch || nameMatch;
    });

    if (isAlreadyPartner) {
      setErrorMsg(`You are already a registered Driver Partner with Kandy Cabs! (Mobile: ${cleanPhone}). Please login to your chauffeur portal or contact support.`);
      return;
    }

    setIsLoading(true);

    try {
      const newRequest: DriverJoinRequestRecord = {
        id: `drv_req_${Date.now()}`,
        name: cleanName,
        phone: cleanPhone,
        city: city.trim() || 'Mangaluru',
        vehicleDetails: vehicleDetails.trim() || 'AC Sedan / SUV',
        status: 'PENDING_CONTACT',
        createdAt: new Date().toISOString(),
      };

      // Store in LocalStorage for Admin Console Retrieval
      if (typeof window !== 'undefined') {
        const list = getDriverPartnerRequests();
        list.unshift(newRequest);
        localStorage.setItem('kc_driver_join_requests', JSON.stringify(list));
        window.dispatchEvent(new Event('storage'));
      }

      // Sync to live Supabase Database API
      try {
        await fetch('/api/driver-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            city: city.trim() || 'Mangaluru',
            vehicleDetails: vehicleDetails.trim() || 'AC Sedan / SUV',
          }),
        });
      } catch (err) {
        console.error('Failed to sync driver application to DB:', err);
      }

      // Record Audit Log in Admin Engine
      recordAuditLog({
        adminId: 'public_web',
        adminName: 'Driver Recruitment Portal',
        action: 'ADD_DRIVER_JOIN_REQUEST',
        targetType: 'DRIVER',
        targetId: cleanPhone,
        details: `New Driver Partner Application received: ${cleanName} (Phone: ${cleanPhone}, City: ${city}, Vehicle: ${vehicleDetails || 'N/A'})`,
      });

      // Send Alert to Admin Desk
      sendNotification({
        recipientId: 'admin_super',
        recipientPhone: '9481086058',
        eventType: 'ADMIN_ALERT',
        channels: ['IN_APP', 'WHATSAPP'],
        title: '👨‍✈️ NEW DRIVER JOIN REQUEST',
        message: `ALERT FOR ADMIN: New Driver Partner application submitted by ${cleanName} (Mobile: ${cleanPhone}, Hub: ${city}). Please contact driver for onboarding!`,
        metadata: { driverName: cleanName, driverPhone: cleanPhone, city },
      });

      setSubmittedData({ name: cleanName, phone: cleanPhone });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application. Please try calling customer care.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submittedData) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--green-soft)', borderRadius: '12px', border: '1px solid var(--green)' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'var(--green)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '26px',
            margin: '0 auto 12px',
            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
          }}
        >
          ✓
        </div>
        <h4 className="h3" style={{ color: 'var(--green)', marginBottom: '8px', fontWeight: 800 }}>
          Application Received Successfully!
        </h4>
        <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.6, margin: '0 auto', maxWidth: '380px', fontWeight: 600 }}>
          Thank you <b>{submittedData.name}</b>! Your request to join Kandy Cabs as a driver partner has been received. Our team will contact you shortly at <b>📱 {submittedData.phone}</b>.
        </p>
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setSubmittedData(null);
              setName('');
              setPhone('');
              setVehicleDetails('');
            }}
            style={{
              background: '#ffffff',
              border: '1px solid var(--green)',
              color: 'var(--green)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ➕ Submit Another Driver Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '14px', background: '#EFF6FF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '12.5px', color: '#1E40AF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🤝</span>
          <span><b>Join Our Team — Driver Partner Onboarding</b></span>
        </div>
        <div style={{ fontSize: '12px', color: '#1E3A8A', marginTop: '2px' }}>
          If you want to be a part of our driver team, enter your Name and Mobile Number below. Our team will contact you!
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="fld2">
        <div className="fld">
          <label htmlFor="drv-join-name">Driver Name *</label>
          <input
            id="drv-join-name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="fld">
          <label htmlFor="drv-join-phone">Mobile Number *</label>
          <input
            id="drv-join-phone"
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="fld2" style={{ marginTop: '10px' }}>
        <div className="fld">
          <label htmlFor="drv-join-city">Operating City / Hub</label>
          <select
            id="drv-join-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="Mangaluru">Mangaluru</option>
            <option value="Udupi">Udupi</option>
            <option value="Kundapura">Kundapura</option>
            <option value="Subramanya / Dharmasthala">Subramanya / Dharmasthala</option>
            <option value="Puttur / Sullia">Puttur / Sullia</option>
            <option value="Other Coastal Hub">Other Coastal Hub</option>
          </select>
        </div>

        <div className="fld">
          <label htmlFor="drv-join-vehicle">Vehicle Details (Optional)</label>
          <input
            id="drv-join-vehicle"
            type="text"
            placeholder="e.g. Swift Dzire (KA 19 C 4829)"
            value={vehicleDetails}
            onChange={(e) => setVehicleDetails(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <Button type="submit" variant="primary" fullWidth disabled={isLoading} style={{ background: '#2563EB', borderColor: '#2563EB' }}>
          {isLoading ? 'Submitting Request...' : '🚗 Submit Driver Request — Our Team Will Contact You'}
        </Button>
      </div>
    </form>
  );
};
