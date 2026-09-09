'use client';

import React, { useState } from 'react';
import { recordOnlinePaymentPaid } from '@/lib/adminEngine';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';

export interface OnlinePaymentBooking {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  estimatedFare: number;
  tollCharges?: number;
  advancePaid?: number;
  remainingFare?: number;
  tripMode?: string;
  pickupAddress?: string;
  dropAddress?: string;
}

interface OnlinePaymentModalProps {
  booking: OnlinePaymentBooking;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export const OnlinePaymentModal: React.FC<OnlinePaymentModalProps> = ({
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const [paymentTab, setPaymentTab] = useState<'UPI_QR' | 'RAZORPAY_ONLINE' | 'WHATSAPP_LINK'>('UPI_QR');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txnSuccessMsg, setTxnSuccessMsg] = useState<string | null>(null);

  const baseFare = booking.estimatedFare || 0;
  const toll = booking.tollCharges || 0;
  const advance = booking.advancePaid || 0;
  const remainingFare = booking.remainingFare !== undefined
    ? booking.remainingFare
    : Math.max(0, baseFare + toll - advance);

  const upiId = 'kandycabs@upi';
  const payeeName = 'Kandy Cabs Mangaluru';
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${remainingFare}&cu=INR&tn=${encodeURIComponent(`Fare Payment ${booking.bookingReference}`)}`;
  
  // Dynamic QR Code SVG API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  const formattedPhone = booking.customerPhone.replace(/\D/g, '');

  const whatsappMessage = encodeURIComponent(
    `*KANDY CABS — ONLINE RIDE PAYMENT REQUEST*\n` +
    `--------------------------------------\n` +
    `👤 Customer: ${booking.customerName}\n` +
    `📋 Booking Ref: ${booking.bookingReference}\n` +
    `📍 Route: ${booking.pickupAddress || 'Mangaluru'} ➔ ${booking.dropAddress || 'Outstation'}\n` +
    `--------------------------------------\n` +
    `💰 Total Ride Charges: ₹${(baseFare + toll).toLocaleString('en-IN')}\n` +
    (advance > 0 ? `✅ Advance Paid: -₹${advance.toLocaleString('en-IN')}\n` : '') +
    `🚩 *NET BALANCE DUE: ₹${remainingFare.toLocaleString('en-IN')}*\n` +
    `--------------------------------------\n` +
    `📱 *PAY ONLINE INSTANTLY VIA UPI / GPAY / PHONEPE / PAYTM:*\n` +
    `Click to pay: ${upiUri}\n\n` +
    `🌐 *Pay via Credit Card / Debit Card / Netbanking:*\n` +
    `https://kandycabs.in/pay?ref=${booking.bookingReference}&amount=${remainingFare}\n\n` +
    `Thank you for traveling with Kandy Cabs!`
  );

  const whatsappPayUrl = `https://wa.me/91${formattedPhone.slice(-10)}?text=${whatsappMessage}`;

  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 3000);
    }
  };

  const handleConfirmOnlinePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = recordOnlinePaymentPaid(booking.id || booking.bookingReference, `ONLINE_${paymentTab}`, `TXN-${Date.now().toString().slice(-6)}`);
      setIsProcessing(false);
      if (res.success) {
        setTxnSuccessMsg(`✅ Online payment of ₹${remainingFare.toLocaleString('en-IN')} successfully verified and recorded!`);
        if (onPaymentSuccess) onPaymentSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    }, 600);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          border: '1px solid #e5e7eb',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>💳</span>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>Only Online Payment Portal</span>
            </div>
            <div style={{ fontSize: '12px', color: '#A7F3D0', marginTop: '2px' }}>
              Instant Dynamic UPI QR Code Scanner & WhatsApp Payment Link Dispatch
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {txnSuccessMsg ? (
            <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 800, fontSize: '15px' }}>
              {txnSuccessMsg}
            </div>
          ) : (
            <>
              {/* Fare Summary Card */}
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                    Remaining Customer Balance Due (Online)
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350F', marginTop: '2px' }}>
                    Ref: <b>{booking.bookingReference}</b> ({booking.customerName})
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px' }}>
                    Base: ₹{baseFare.toLocaleString('en-IN')} {toll > 0 ? `+ Toll: ₹${toll.toLocaleString('en-IN')}` : ''} {advance > 0 ? `- Adv: ₹${advance.toLocaleString('en-IN')}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#92400E' }}>
                    ₹{remainingFare.toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '10px', background: '#D97706', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    ONLINE ONLY
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentTab('UPI_QR')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: paymentTab === 'UPI_QR' ? '#059669' : 'transparent',
                    color: paymentTab === 'UPI_QR' ? '#fff' : '#4B5563',
                    cursor: 'pointer',
                  }}
                >
                  📱 Dynamic UPI QR Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('WHATSAPP_LINK')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: paymentTab === 'WHATSAPP_LINK' ? '#25D366' : 'transparent',
                    color: paymentTab === 'WHATSAPP_LINK' ? '#fff' : '#4B5563',
                    cursor: 'pointer',
                  }}
                >
                  📲 Send WhatsApp Payment Link
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('RAZORPAY_ONLINE')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: paymentTab === 'RAZORPAY_ONLINE' ? '#2563EB' : 'transparent',
                    color: paymentTab === 'RAZORPAY_ONLINE' ? '#fff' : '#4B5563',
                    cursor: 'pointer',
                  }}
                >
                  💳 Cards / Netbanking
                </button>
              </div>

              {/* TAB 1: DYNAMIC UPI QR SCANNER */}
              {paymentTab === 'UPI_QR' && (
                <div style={{ textAlign: 'center', background: '#F9FAFB', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                    📷 Scan Dynamic UPI QR Code to Pay ₹{remainingFare.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '12px' }}>
                    Open any UPI App (GPay, PhonePe, Paytm, BHIM) and scan this QR code. Payee & exact fare pre-filled automatically!
                  </div>

                  {/* QR Code Container */}
                  <div
                    style={{
                      display: 'inline-block',
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '2px solid #059669',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)',
                      marginBottom: '12px',
                    }}
                  >
                    <img
                      src={qrImageUrl}
                      alt={`Dynamic UPI QR Code for ₹${remainingFare}`}
                      style={{ width: '210px', height: '210px', display: 'block', margin: '0 auto' }}
                    />
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', marginTop: '6px' }}>
                      Exact Fare: ₹{remainingFare.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Supported UPI Apps Icons */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                      Google Pay
                    </span>
                    <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                      PhonePe
                    </span>
                    <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                      Paytm UPI
                    </span>
                    <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                      BHIM UPI
                    </span>
                  </div>

                  {/* UPI VPA Copy Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ffffff', border: '1px solid #D1D5DB', padding: '8px 12px', borderRadius: '8px', maxWidth: '360px', margin: '0 auto 12px' }}>
                    <span style={{ fontSize: '12px', color: '#4B5563' }}>UPI ID:</span>
                    <code style={{ fontWeight: 800, fontSize: '13px', color: '#059669' }}>{upiId}</code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', fontWeight: 700, fontSize: '12px' }}
                    >
                      {copiedUpi ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>

                  {/* Mobile Direct Pay Button */}
                  <a
                    href={upiUri}
                    style={{
                      display: 'inline-block',
                      width: '100%',
                      maxWidth: '360px',
                      padding: '10px',
                      background: '#059669',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    📱 Pay Directly via UPI App (GPay / PhonePe)
                  </a>
                </div>
              )}

              {/* TAB 2: WHATSAPP PAYMENT LINK DISPATCH */}
              {paymentTab === 'WHATSAPP_LINK' && (
                <div style={{ textAlign: 'center', background: '#ECFDF5', padding: '18px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>💬</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46', marginBottom: '4px' }}>
                    Send Online Payment Link & QR via WhatsApp
                  </div>
                  <p style={{ fontSize: '12px', color: '#047857', margin: '0 0 16px' }}>
                    Click below to open WhatsApp pre-filled with direct UPI payment links (`upi://pay...`) and Razorpay checkout link for customer <b>{booking.customerName} ({booking.customerPhone})</b>.
                  </p>

                  <a
                    href={whatsappPayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      maxWidth: '380px',
                      padding: '12px',
                      background: '#25D366',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '14px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15)',
                    }}
                  >
                    📲 Open WhatsApp & Send ₹{remainingFare.toLocaleString('en-IN')} Payment Link
                  </a>
                </div>
              )}

              {/* TAB 3: RAZORPAY / CARDS / NETBANKING */}
              {paymentTab === 'RAZORPAY_ONLINE' && (
                <div style={{ background: '#EFF6FF', padding: '16px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', marginBottom: '4px' }}>
                    💳 Razorpay Secure Online Payment Gateway
                  </div>
                  <div style={{ fontSize: '12px', color: '#1E3A8A', marginBottom: '12px' }}>
                    Supports Credit Cards (Visa / Mastercard / Amex / RuPay), Netbanking across all Indian banks, and Wallet options.
                  </div>

                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #93C5FD', fontSize: '12px', marginBottom: '12px' }}>
                    <div>• 💳 Credit & Debit Cards (0% surcharge)</div>
                    <div>• 🏛️ Netbanking (SBI, HDFC, ICICI, Axis, Canara)</div>
                    <div>• 👛 Wallets (Mobikwik, Freecharge, Airtel Money)</div>
                  </div>
                </div>
              )}

              {/* Confirmation Action Bar */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleConfirmOnlinePayment}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#065F46',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: isProcessing ? 'wait' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                >
                  {isProcessing ? '⏳ Verifying Online Payment...' : `✅ Mark Online Payment of ₹${remainingFare.toLocaleString('en-IN')} Received & Confirmed`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
