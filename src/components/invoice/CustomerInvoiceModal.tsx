'use client';

import React, { useState } from 'react';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';
import { OnlinePaymentModal } from '@/components/payments/OnlinePaymentModal';

export interface InvoiceBookingData {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropAddress: string;
  pickupTime?: string;
  tripMode: string;
  tripDays?: number;
  status: string;
  estimatedFare: number;
  tollCharges?: number;
  advancePaid?: number;
  remainingFare?: number;
  assignedDriverName?: string;
  driverPhone?: string;
  assignedVehicleReg?: string;
  vehicleModel?: string;
  vendorAgencyName?: string;
  initialMeterKm?: number;
  finalMeterKm?: number;
  actualDistanceKm?: number;
  createdAt?: string;
}

interface CustomerInvoiceModalProps {
  booking: InvoiceBookingData;
  onClose: () => void;
}

export const CustomerInvoiceModal: React.FC<CustomerInvoiceModalProps> = ({
  booking,
  onClose,
}) => {
  const [showOnlinePayModal, setShowOnlinePayModal] = useState(false);
  const invoiceNo = `INV-${booking.bookingReference.replace('KC-', '')}-${Date.now().toString().slice(-4)}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const baseFare = booking.estimatedFare || 0;
  const toll = booking.tollCharges || 0;
  const grossTotal = baseFare + toll;
  const advance = booking.advancePaid || 0;
  const netPayable = booking.remainingFare !== undefined 
    ? booking.remainingFare 
    : Math.max(0, grossTotal - advance);

  const formattedCustomerPhone = booking.customerPhone.replace(/\D/g, '');

  const whatsappMessage = encodeURIComponent(
    `*KANDY CABS — OFFICIAL RIDE INVOICE*\n` +
    `--------------------------------------\n` +
    `📄 Invoice No: ${invoiceNo}\n` +
    `📅 Date: ${invoiceDate}\n` +
    `👤 Customer: ${booking.customerName}\n` +
    `🚗 Route: ${booking.pickupAddress} ➔ ${booking.dropAddress}\n` +
    `👨‍✈️ Driver: ${booking.assignedDriverName || 'Assigned Chauffeur'} (${booking.assignedVehicleReg || 'KA-19-CABS'})\n` +
    `--------------------------------------\n` +
    `💰 Base Fare: ₹${baseFare.toLocaleString('en-IN')}\n` +
    (toll > 0 ? `💳 Toll & Interstate Charges: ₹${toll.toLocaleString('en-IN')}\n` : '') +
    `💵 Gross Total: ₹${grossTotal.toLocaleString('en-IN')}\n` +
    (advance > 0 ? `✅ Advance Paid: -₹${advance.toLocaleString('en-IN')}\n` : '') +
    `--------------------------------------\n` +
    `🚩 *NET BALANCE COLLECTED/DUE: ₹${netPayable.toLocaleString('en-IN')}*\n` +
    `--------------------------------------\n` +
    `Thank you for riding with Kandy Cabs Mangaluru!\n` +
    `📞 Support: +91 99008 87777 | 🌐 https://kandycabs.in`
  );

  const whatsappUrl = `https://wa.me/91${formattedCustomerPhone.slice(-10)}?text=${whatsappMessage}`;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Kandy Cabs Invoice - ${booking.bookingReference}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f9fafb; color: #111827; }
    .invoice-card { max-width: 700px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
    .logo-text { font-size: 24px; font-weight: 800; color: #059669; }
    .section-title { font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-box { background: #f3f4f6; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; font-size: 14px; }
    th { text-align: left; background: #059669; color: #ffffff; padding: 10px 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: 800; font-size: 16px; color: #059669; background: #ecfdf5; }
    .footer { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px dashed #e5e7eb; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="logo-text">KANDY CABS</div>
        <div style="font-size: 12px; color: #4b5563;">Authentic Coastal Karnataka Cab Services</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: 800;">TAX INVOICE</div>
        <div style="font-size: 12px; color: #6b7280;">No: ${invoiceNo}</div>
        <div style="font-size: 12px; color: #6b7280;">Date: ${invoiceDate}</div>
      </div>
    </div>

    <div class="grid">
      <div class="info-box">
        <div class="section-title">Customer Details</div>
        <strong>${booking.customerName}</strong><br/>
        Phone: ${booking.customerPhone}<br/>
        Ref: <code>${booking.bookingReference}</code>
      </div>
      <div class="info-box">
        <div class="section-title">Chauffeur & Fleet Info</div>
        Driver: <strong>${booking.assignedDriverName || 'Assigned Driver'}</strong><br/>
        Vehicle: ${booking.vehicleModel || 'Cab'} [${booking.assignedVehicleReg || 'KA-19'}]
      </div>
    </div>

    <div class="info-box" style="margin-bottom: 24px;">
      <div class="section-title">Route & Trip Details</div>
      <strong>Trip Mode:</strong> ${booking.tripMode}<br/>
      <strong>Pickup Location:</strong> ${booking.pickupAddress}<br/>
      <strong>Drop Destination:</strong> ${booking.dropAddress}<br/>
      ${booking.initialMeterKm && booking.finalMeterKm ? `<strong>Distance Driven:</strong> ${booking.finalMeterKm - booking.initialMeterKm} KM (${booking.initialMeterKm} KM → ${booking.finalMeterKm} KM)<br/>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Base Estimated Ride Fare (${booking.tripMode})</td>
          <td style="text-align: right;">₹${baseFare.toLocaleString('en-IN')}</td>
        </tr>
        ${toll > 0 ? `
        <tr>
          <td>Toll Gate & Interstate Permit Charges (FASTag Receipt Attached)</td>
          <td style="text-align: right;">+₹${toll.toLocaleString('en-IN')}</td>
        </tr>
        ` : ''}
        <tr>
          <td><strong>Gross Total Charges</strong></td>
          <td style="text-align: right;"><strong>₹${grossTotal.toLocaleString('en-IN')}</strong></td>
        </tr>
        ${advance > 0 ? `
        <tr>
          <td>Advance Paid Online / Deposit</td>
          <td style="text-align: right; color: #059669;">-₹${advance.toLocaleString('en-IN')}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>NET BALANCE DUE / COLLECTED FROM CUSTOMER</td>
          <td style="text-align: right;">₹${netPayable.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      Thank you for traveling with Kandy Cabs Mangaluru · GSTIN: 29AAACK1234F1Z0<br/>
      24/7 Helpline: +91 99008 87777 · Email: support@kandycabs.in
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KandyCabs_Invoice_${booking.bookingReference}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="kc-invoice-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .kc-printable-invoice, .kc-printable-invoice * {
            visibility: visible;
          }
          .kc-printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .kc-invoice-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="kc-printable-invoice"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '680px',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e5e7eb',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Control Bar */}
        <div
          className="kc-invoice-no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            background: '#065F46',
            color: '#ffffff',
            borderBottom: '1px solid #047857',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🧾</span>
            <span style={{ fontWeight: 800, fontSize: '15px' }}>Official Tax Invoice Preview</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#25D366',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              💬 Send WhatsApp Invoice
            </a>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#2563EB',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              🖨️ Print / PDF
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#D97706',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              📥 Download HTML
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#DC2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto' }}>
          {/* Logo & Invoice Title Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--green, #059669)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KandyCabsLogo height={32} width={140} />
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                Coastal Karnataka Premium Cab & Outstation Aggregator<br/>
                Mangaluru • Udupi • Kollur • Murdeshwar • Bengaluru
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#065F46', letterSpacing: '0.5px' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginTop: '2px' }}>
                No: <code>{invoiceNo}</code>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                Date: {invoiceDate}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                GSTIN: 29AAACK1234F1Z0
              </div>
            </div>
          </div>

          {/* Grid Info Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '12px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>
                👤 Customer Details
              </div>
              <div style={{ fontWeight: 800, color: '#111827', fontSize: '14px' }}>{booking.customerName}</div>
              <div style={{ color: '#4B5563', marginTop: '2px' }}>📱 Phone: <b>{booking.customerPhone}</b></div>
              <div style={{ color: '#6B7280', marginTop: '2px' }}>📋 Booking Ref: <code>{booking.bookingReference}</code></div>
            </div>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '12px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>
                🚗 Chauffeur & Vehicle Info
              </div>
              <div style={{ fontWeight: 800, color: '#111827' }}>👨‍✈️ Driver: {booking.assignedDriverName || 'Assigned Chauffeur'}</div>
              <div style={{ color: '#4B5563', marginTop: '2px' }}>
                🏎️ Vehicle: {booking.vehicleModel || 'Cab'} [<b>{booking.assignedVehicleReg || 'KA-19-CABS'}</b>]
              </div>
            </div>
          </div>

          {/* Trip Details Card */}
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 14px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '4px' }}>
              📍 Trip Route & Distance Summary
            </div>
            <div style={{ color: '#065F46', marginBottom: '4px' }}>
              <b>Trip Mode:</b> <span className="pill green" style={{ fontSize: '10.5px' }}>{booking.tripMode}</span>
            </div>
            <div style={{ color: '#111827' }}>
              📍 <b>Pickup:</b> {booking.pickupAddress}
            </div>
            <div style={{ color: '#111827', marginTop: '2px' }}>
              🏁 <b>Dropoff:</b> {booking.dropAddress}
            </div>
            {booking.initialMeterKm && booking.finalMeterKm ? (
              <div style={{ color: '#047857', fontWeight: 700, marginTop: '4px', fontSize: '12px' }}>
                📏 Odometer: {booking.initialMeterKm} KM ➔ {booking.finalMeterKm} KM (Total Distance Driven: {booking.finalMeterKm - booking.initialMeterKm} KM)
              </div>
            ) : null}
          </div>

          {/* Itemized Fare Billing Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#059669', color: '#ffffff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '6px 0 0 0' }}>Billing Description</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '10px 12px', color: '#374151' }}>
                  Base Ride Fare ({booking.tripMode})
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                  ₹{baseFare.toLocaleString('en-IN')}
                </td>
              </tr>

              {toll > 0 && (
                <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#FFFBEB' }}>
                  <td style={{ padding: '10px 12px', color: '#92400E' }}>
                    💳 Toll Gate & Interstate Permit Charges (FASTag Receipt Attached)
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#B45309' }}>
                    +₹{toll.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#111827' }}>
                  Gross Total Ride Charges
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#111827', fontSize: '14px' }}>
                  ₹{grossTotal.toLocaleString('en-IN')}
                </td>
              </tr>

              {advance > 0 && (
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 600 }}>
                    ✅ Advance Amount Paid Online
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    -₹{advance.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              <tr style={{ background: '#ECFDF5', borderTop: '2px solid #059669' }}>
                <td style={{ padding: '12px', fontWeight: 900, color: '#065F46', fontSize: '15px' }}>
                  NET BALANCE PAYABLE / COLLECTED
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#065F46', fontSize: '17px' }}>
                  ₹{netPayable.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          {netPayable > 0 && (
            <div style={{ marginTop: '14px', marginBottom: '16px', textAlign: 'center' }} className="kc-invoice-no-print">
              <button
                type="button"
                onClick={() => setShowOnlinePayModal(true)}
                style={{
                  padding: '10px 20px',
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15)',
                }}
              >
                💳 Pay Remaining Balance Online (Dynamic UPI QR Code Scanner & Cards)
              </button>
            </div>
          )}

          {/* Footer Terms */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6B7280', borderTop: '1px dashed #E5E7EB', paddingTop: '14px' }}>
            <p style={{ margin: 0 }}>
              Thank you for riding with Kandy Cabs! For queries or feedback, contact us at <b>+91 99008 87777</b> or email <b>support@kandycabs.in</b>.
            </p>
            <p style={{ margin: '4px 0 0', fontWeight: 600, color: '#059669' }}>
              This is a computer-generated GST tax invoice and requires no physical signature.
            </p>
          </div>
        </div>
      </div>

      {showOnlinePayModal && (
        <OnlinePaymentModal
          booking={{
            id: booking.id,
            bookingReference: booking.bookingReference,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            estimatedFare: baseFare,
            tollCharges: toll,
            advancePaid: advance,
            remainingFare: netPayable,
            tripMode: booking.tripMode,
            pickupAddress: booking.pickupAddress,
            dropAddress: booking.dropAddress,
          }}
          onClose={() => setShowOnlinePayModal(false)}
        />
      )}
    </div>
  );
};
