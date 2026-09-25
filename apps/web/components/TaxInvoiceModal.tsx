'use client';

import React, { useState, useEffect } from 'react';

interface TaxInvoiceModalProps {
  bookingId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaxInvoiceModal({
  bookingId,
  isOpen,
  onClose,
}: TaxInvoiceModalProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && bookingId) {
      setLoading(true);
      setError('');
      fetch(`/api/customer/bookings/${bookingId}/invoice`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.invoice) {
            setInvoice(data.invoice);
          } else {
            setError(data.message || 'Failed to load invoice');
          }
        })
        .catch(() => setError('Failed to load invoice'))
        .finally(() => setLoading(false));
    } else {
      setInvoice(null);
    }
  }, [isOpen, bookingId]);

  if (!isOpen || !bookingId) return null;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-800">
      {/* Top bar: title left, close right */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
            Official Tax Invoice
          </span>
          <h2 className="text-sm font-black text-slate-900 leading-tight">
            Kandy Cabs Private Limited
          </h2>
          <p className="text-[10px] text-slate-500">GSTIN: 29ABCDE1234F1Z5 • Karnataka, India</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Print / PDF button row */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
        >
          🖨️ Print / PDF
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Generating invoice...</div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-red-600">{error}</div>
        ) : invoice ? (
          <div className="space-y-3 text-xs max-w-2xl mx-auto">
            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Booking Reference:</span>
                <span className="font-mono font-bold text-indigo-700">{invoice.booking.ref}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Invoice Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(invoice.invoiceDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer Name:</span>
                <span className="font-bold text-slate-900">{invoice.customer.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer Phone:</span>
                <span className="font-mono text-slate-800">{invoice.customer.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Trip Type:</span>
                <span className="font-bold text-slate-900">{invoice.booking.tripType}</span>
              </div>
            </div>

            {/* Route Details */}
            <div className="p-3 rounded-xl border border-slate-200 space-y-1">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                Trip Route &amp; Itinerary
              </h4>
              <p><span className="text-slate-500">Pickup:</span> {invoice.booking.pickupAddress}</p>
              <p><span className="text-slate-500">Drop:</span> {invoice.booking.dropAddress}</p>
              <div className="flex space-x-4 pt-0.5 text-slate-500">
                <span>Distance: <strong className="text-slate-800">{invoice.booking.distanceKm} km</strong></span>
                <span>Scheduled: <strong className="text-slate-800">{new Date(invoice.booking.scheduledAt).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Financial Itemization Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-3 py-1.5">Pre-tax Ride Subtotal</td>
                    <td className="px-3 py-1.5 text-right font-mono">₹{invoice.financials.preTaxSubtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">CGST (2.5%)</td>
                    <td className="px-3 py-1.5 text-right font-mono">₹{invoice.financials.cgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">SGST (2.5%)</td>
                    <td className="px-3 py-1.5 text-right font-mono">₹{invoice.financials.sgst.toFixed(2)}</td>
                  </tr>
                  {invoice.financials.tollAmount > 0 && (
                    <tr>
                      <td className="px-3 py-1.5">Toll Charges</td>
                      <td className="px-3 py-1.5 text-right font-mono">₹{invoice.financials.tollAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoice.financials.parkingAmount > 0 && (
                    <tr>
                      <td className="px-3 py-1.5">Parking Charges</td>
                      <td className="px-3 py-1.5 text-right font-mono">₹{invoice.financials.parkingAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className="px-3 py-2">Total Tax-Inclusive Fare</td>
                    <td className="px-3 py-2 text-right font-mono">₹{invoice.financials.totalFare.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Summary */}
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1 text-emerald-900">
              <div className="flex justify-between font-bold">
                <span>Online Advance Paid (25%):</span>
                <span className="font-mono">₹{invoice.financials.advancePaid.toFixed(2)} (PAID)</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Balance Payable to Driver (75%):</span>
                <span className="font-mono font-bold">₹{invoice.financials.balanceDue.toFixed(2)} ({invoice.financials.balanceStatus})</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-400 pb-2">
              <div>
                <p>This is a computer-generated tax invoice and requires no physical signature.</p>
                <p>For support, contact support@kandycabs.com</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700 block">Kandy Cabs Verified</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
