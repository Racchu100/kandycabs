'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CustomerPayPage() {
  const params = useParams();
  const ref = params?.ref as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'UPI_QR' | 'CARD' | 'NETBANKING'>('UPI_QR');

  const fetchInvoice = async () => {
    if (!ref) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/${ref}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.booking);
        if (json.booking.pricing.balancePaymentStatus === 'PAID') {
          setPaidSuccess(true);
        }
      } else {
        setError(json.error || 'Invoice not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [ref]);

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const res = await fetch(`/api/pay/${ref}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          transactionId: `pay_upi_${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPaidSuccess(true);
        await fetchInvoice();
      } else {
        alert(json.error || 'Payment failed. Please try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Payment network error');
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading Kandy Cabs invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Invalid booking reference.'}</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
          >
            Go to Kandy Cabs Home
          </Link>
        </div>
      </div>
    );
  }

  const isBalancePaid = data.pricing.balancePaymentStatus === 'PAID';
  const balanceDue = data.pricing.balanceAmount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚖</span>
            <span className="text-xl font-black tracking-tight text-white">
              KANDY <span className="text-amber-400">CABS</span>
            </span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            Booking #{data.ref}
          </span>
        </div>

        {/* Invoice Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Top Banner */}
          <div
            className={`p-5 text-center border-b ${
              isBalancePaid
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            {isBalancePaid ? (
              <div className="space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xl font-black mb-1">
                  ✓
                </div>
                <h1 className="text-base font-black text-white">Payment Received & Confirmed</h1>
                <p className="text-[11px] text-emerald-400/90 font-mono">
                  Official Receipt: RCP-{data.ref}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-black text-white">
                  ₹{balanceDue.toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Pending Balance Payment Due
                </div>
                <p className="text-[11px] text-slate-400">
                  Pay online to settle balance & download your GST tax invoice.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* Customer & Route Details */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Customer</div>
                  <div className="font-bold text-white text-sm mt-0.5">{data.customer.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Trip Type</div>
                  <div className="font-bold text-amber-400 mt-0.5">{data.tripType} • {data.distanceKm} km</div>
                </div>
              </div>

              {/* Route */}
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">📍</span>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Pickup Location</span>
                    <span className="text-slate-200 font-medium">{data.pickupAddress}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">🏁</span>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Drop Location</span>
                    <span className="text-slate-200 font-medium">{data.dropAddress}</span>
                  </div>
                </div>
              </div>

              {/* Assigned Driver (if any) */}
              {data.driver && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-400">Assigned Driver: </span>
                    <span className="font-bold text-white">{data.driver.name}</span>
                  </div>
                  <span className="font-mono text-slate-400">{data.driver.vehicleNumber || ''}</span>
                </div>
              )}
            </div>

            {/* Fare Breakdown */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Fare & Payment Breakdown
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Total Estimated Trip Fare:</span>
                <span className="font-bold text-white">₹{data.pricing.estimatedFare.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-emerald-400">
                <span className="flex items-center gap-1">
                  <span>✓</span> Advance Paid (Online):
                </span>
                <span className="font-bold">-₹{data.pricing.advanceAmount.toLocaleString('en-IN')}</span>
              </div>

              {data.pricing.tollAmount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>🛣️ Tolls:</span>
                  <span className="font-bold">+₹{data.pricing.tollAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {data.pricing.parkingAmount > 0 && (
                <div className="flex justify-between text-sky-300">
                  <span>🅿️ Parking:</span>
                  <span className="font-bold">+₹{data.pricing.parkingAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
                <span className="font-black text-white">Balance Amount:</span>
                <span
                  className={`font-black text-base ${
                    isBalancePaid ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>

              {isBalancePaid && data.pricing.balancePaymentId && (
                <div className="text-[10px] text-emerald-400 font-mono pt-1 text-right">
                  Txn ID: {data.pricing.balancePaymentId}
                </div>
              )}
            </div>

            {/* Payment Section OR Receipt Actions */}
            {!isBalancePaid ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Select Payment Method:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'UPI_QR', label: 'UPI / GPay / PhonePe', icon: '📱' },
                      { id: 'CARD', label: 'Credit / Debit Card', icon: '💳' },
                      { id: 'NETBANKING', label: 'NetBanking', icon: '🏦' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                          selectedMethod === m.id
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-base">{m.icon}</span>
                        <span className="text-[10px] leading-tight">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instant Pay Action */}
                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒 Pay ₹{balanceDue.toLocaleString('en-IN')} Securely</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-300 font-medium">
                  🎉 Thank you for traveling with Kandy Cabs! Your ride has been settled.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handlePrint}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <span>🖨️</span> Print / Save PDF
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🚖 Kandy Cabs Receipt: RCP-${data.ref}\nAmount Paid: ₹${balanceDue}\nRoute: ${data.pickupAddress} ➔ ${data.dropAddress}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <span>📲</span> Share on WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Support */}
        <div className="text-center text-slate-500 text-[11px] space-y-1">
          <div>Need help with your invoice? Call +91 9786452563</div>
          <div>© {new Date().getFullYear()} Kandy Cabs Mangalore. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
