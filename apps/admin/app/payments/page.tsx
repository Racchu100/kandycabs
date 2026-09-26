'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { PaymentStatus } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export default function AdminPaymentsPage() {
  const [summary, setSummary] = useState<any>({
    totalRevenue: 0,
    totalBookings: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    pendingCount: 0,
    driverPaidCount: 0,
    totalDriverPaidAmount: 0,
    driverPendingCount: 0,
    totalDriverPendingAmount: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, limit: 25, page: 1 });

  // Driver Payout Quick Action & Edit States
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editModalBooking, setEditModalBooking] = useState<any | null>(null);
  const [editAllowance, setEditAllowance] = useState<string>('350');
  const [editPayee, setEditPayee] = useState<string>('0');
  const [editStatus, setEditStatus] = useState<string>('PENDING');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Customer Balance Payment Recording States
  const [balanceModalBooking, setBalanceModalBooking] = useState<any | null>(null);
  const [balanceMethod, setBalanceMethod] = useState<string>('UPI_QR');
  const [balanceTxnRef, setBalanceTxnRef] = useState<string>('');
  const [balanceNotes, setBalanceNotes] = useState<string>('');
  const [savingBalance, setSavingBalance] = useState<boolean>(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '25',
        status: statusFilter,
        ...(search ? { search } : {}),
      });

      const res = await fetch(`/api/admin/payments?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setTransactions(data.transactions || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  // WhatsApp Share Functions
  const handleShareWhatsAppBill = (t: any) => {
    const rawPhone = t.customerPhone ? t.customerPhone.replace(/[^0-9]/g, '') : '';
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const webBaseUrl = typeof window !== 'undefined' ? window.location.origin.replace(':3001', ':3000') : 'http://localhost:3000';
    const payUrl = `${webBaseUrl}/pay/${t.humanReadableRef}`;

    const message = `🚖 *KANDY CABS — TRIP INVOICE & BALANCE DUE*
----------------------------------------
*Booking Ref:* ${t.humanReadableRef}
*Customer:* ${t.customerName}
*Trip Type:* ${t.tripType}

💰 *FARE BREAKDOWN*
• Total Trip Fare: ₹${t.estimatedFare.toLocaleString('en-IN')}
• Advance Paid (Online): -₹${t.advanceAmount.toLocaleString('en-IN')} (✓ Confirmed)
${t.tollAmount > 0 ? `• Tolls: +₹${t.tollAmount.toLocaleString('en-IN')}\n` : ''}${t.parkingAmount > 0 ? `• Parking: +₹${t.parkingAmount.toLocaleString('en-IN')}\n` : ''}----------------------------------------
🔴 *Pending Balance to Pay: ₹${t.balanceAmount.toLocaleString('en-IN')}*
----------------------------------------

💳 *Pay Online & View Tax Invoice:*
${payUrl}

Thank you for traveling with Kandy Cabs!
📞 Support: +91 9786452563`;

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  const handleShareWhatsAppReceipt = (t: any) => {
    const rawPhone = t.customerPhone ? t.customerPhone.replace(/[^0-9]/g, '') : '';
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const webBaseUrl = typeof window !== 'undefined' ? window.location.origin.replace(':3001', ':3000') : 'http://localhost:3000';
    const receiptUrl = `${webBaseUrl}/pay/${t.humanReadableRef}`;

    const message = `🎉 *KANDY CABS — PAYMENT RECEIVED & CONFIRMED*
----------------------------------------
*Booking Ref:* ${t.humanReadableRef}
*Customer:* ${t.customerName}
*Receipt No:* RCP-${t.humanReadableRef}

*Balance Paid:* ₹${t.balanceAmount.toLocaleString('en-IN')}
*Status:* ✓ 100% SETTLED & PAID

🧾 *View & Download Tax Invoice Receipt:*
${receiptUrl}

Thank you for choosing Kandy Cabs Mangalore!
📞 Support: +91 9786452563`;

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  // Open Balance Payment Record Modal
  const handleOpenBalanceModal = (t: any) => {
    setBalanceModalBooking(t);
    setBalanceMethod('UPI_QR');
    setBalanceTxnRef('');
    setBalanceNotes('');
  };

  // Save Balance Payment
  const handleSaveBalancePayment = async () => {
    if (!balanceModalBooking) return;
    setSavingBalance(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: balanceModalBooking.id,
          paymentMethod: balanceMethod,
          transactionRef: balanceTxnRef,
          notes: balanceNotes,
        }),
      });

      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === balanceModalBooking.id
              ? {
                  ...t,
                  balancePaymentStatus: PaymentStatus.PAID,
                  balancePayment: {
                    paymentMethod: balanceMethod,
                    razorpayPaymentId: balanceTxnRef,
                    status: PaymentStatus.PAID,
                  },
                }
              : t
          )
        );
        setBalanceModalBooking(null);
        fetchPayments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to record balance payment');
      }
    } catch (err) {
      console.error('Failed to record balance payment:', err);
      alert('Network error while recording balance payment');
    } finally {
      setSavingBalance(false);
    }
  };

  // Toggle Driver Payment Status directly from table
  const handleToggleDriverPayment = async (bookingId: string, newStatus: 'PAID' | 'PENDING') => {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverPaymentStatus: newStatus }),
      });

      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === bookingId ? { ...t, driverPaymentStatus: newStatus } : t))
        );
        // Refresh summary counters
        fetchPayments();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update driver payment status');
      }
    } catch (err) {
      console.error('Failed to update driver payment status:', err);
      alert('Network error while updating driver payment status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (t: any) => {
    setEditModalBooking(t);
    setEditAllowance(String(t.driverAllowance || 0));
    setEditPayee(String(t.driverPayeeAmount || 0));
    setEditStatus(t.driverPaymentStatus || 'PENDING');
  };

  // Save Edit Modal
  const handleSaveDriverPayoutEdit = async () => {
    if (!editModalBooking) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/bookings/${editModalBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverAllowance: parseFloat(editAllowance) || 0,
          driverPayeeAmount: parseFloat(editPayee) || 0,
          driverPaymentStatus: editStatus,
        }),
      });

      if (res.ok) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editModalBooking.id
              ? {
                  ...t,
                  driverAllowance: parseFloat(editAllowance) || 0,
                  driverPayeeAmount: parseFloat(editPayee) || 0,
                  driverPaymentStatus: editStatus,
                }
              : t
          )
        );
        setEditModalBooking(null);
        fetchPayments();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update driver payout');
      }
    } catch (err) {
      console.error('Error saving driver payout:', err);
      alert('Failed to save driver payout');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span>💳</span> Revenue & Driver Payout Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live financial ledger, customer collections & manual driver payouts verification
            </p>
          </div>
          <button
            onClick={() => fetchPayments()}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 text-slate-700 transition shadow-xs"
          >
            <span>🔄</span> Refresh Data
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
          {/* Total Revenue */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Revenue</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{(summary.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Verified customer payments</div>
          </div>

          {/* Driver Payout Done */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-xs">
            <div className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <span>✓</span> Driver Paid
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              ₹{(summary.totalDriverPaidAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-1">
              {summary.driverPaidCount || 0} trips settled
            </div>
          </div>

          {/* Driver Payout Pending */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-xs">
            <div className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <span>✗</span> Driver Unpaid
            </div>
            <div className="text-2xl font-black text-rose-800 mt-1">
              ₹{(summary.totalDriverPendingAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-rose-700 font-medium mt-1">
              {summary.driverPendingCount || 0} trips due payout
            </div>
          </div>

          {/* Customer Fully Paid */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">Cust. Fully Paid</div>
            <div className="text-2xl font-black text-blue-700 mt-1">{summary.paidCount || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1">Advance + Balance paid</div>
          </div>

          {/* Customer Partially Paid */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Advance Paid (25%)</div>
            <div className="text-2xl font-black text-amber-700 mt-1">{summary.partiallyPaidCount || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1">Balance due at drop</div>
          </div>

          {/* Customer Pending Advance */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Adv. Pending</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{summary.pendingCount || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1">Unpaid bookings</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Bookings' },
              { id: 'DRIVER_PAID', label: `✓ Driver Paid (${summary.driverPaidCount || 0})`, color: 'emerald' },
              { id: 'DRIVER_UNPAID', label: `✗ Driver Unpaid (${summary.driverPendingCount || 0})`, color: 'rose' },
              { id: 'PAID', label: 'Customer Fully Paid' },
              { id: 'PARTIALLY_PAID', label: 'Customer Adv Only' },
              { id: 'PENDING', label: 'Customer Adv Due' },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              let activeClass = 'bg-amber-500 text-slate-950 font-bold shadow-xs';
              if (tab.color === 'emerald') activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
              if (tab.color === 'rose') activeClass = 'bg-rose-600 text-white font-bold shadow-xs';

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    isActive ? activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex gap-2">
            <input
              type="text"
              placeholder="Search by ref, phone, driver name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-xs"
            >
              Search
            </button>
          </form>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
              <div>Loading financial ledger & driver payouts...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="text-3xl mb-2">🧾</div>
              <div>No payment transactions found matching the filter criteria.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Booking Ref / Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Assigned Driver</th>
                    <th className="py-3 px-4">Total Fare</th>
                    <th className="py-3 px-4">25% Advance</th>
                    <th className="py-3 px-4">75% Balance</th>
                    <th className="py-3 px-4">Tolls / Parking</th>
                    <th className="py-3 px-4 bg-slate-100/70 border-x border-slate-200 text-emerald-800 font-extrabold">
                      Driver Payout (Manual Admin)
                    </th>
                    <th className="py-3 px-4">Ride Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => {
                    const isDriverPaid = t.driverPaymentStatus === 'PAID';
                    const isProcessing = actionLoadingId === t.id;
                    const totalDriverEarning = (t.driverAllowance || 0) + (t.driverPayeeAmount || 0);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        {/* Booking Ref */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-amber-800">{t.humanReadableRef}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(t.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-medium">{t.tripType}</div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{t.customerName}</div>
                          <div className="text-[10px] text-slate-500">{t.customerPhone}</div>
                        </td>

                        {/* Driver */}
                        <td className="py-3 px-4">
                          {t.driverName ? (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <span>🚕</span> {t.driverName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{t.driverPhone}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        {/* Total Fare */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">₹{t.estimatedFare.toLocaleString('en-IN')}</div>
                        </td>

                        {/* 25% Advance */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">₹{t.advanceAmount.toLocaleString('en-IN')}</div>
                          {t.advancePaymentStatus === PaymentStatus.PAID ? (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold">
                              ✓ PAID (Online)
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[9px] font-bold">
                              PENDING
                            </span>
                          )}
                          {t.advancePayment?.razorpayPaymentId && (
                            <div
                              className="text-[9px] font-mono text-slate-500 mt-0.5 truncate max-w-[110px]"
                              title={t.advancePayment.razorpayPaymentId}
                            >
                              {t.advancePayment.razorpayPaymentId}
                            </div>
                          )}
                        </td>

                        {/* 75% Balance */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">₹{t.balanceAmount.toLocaleString('en-IN')}</div>
                          {t.balancePaymentStatus === PaymentStatus.PAID ? (
                            <div className="space-y-1 mt-0.5">
                              <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold">
                                ✓ PAID ({t.balancePayment?.paymentMethod || 'CASH'})
                              </span>
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsAppReceipt(t)}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold transition flex items-center gap-1 shadow-2xs"
                                  title="Send Official Receipt via WhatsApp"
                                >
                                  <span>📲</span> Receipt
                                </button>
                                <a
                                  href={`http://localhost:3000/pay/${t.humanReadableRef}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-300 transition shadow-2xs"
                                  title="View Public Tax Invoice"
                                >
                                  📄 View
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 mt-0.5">
                              <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold">
                                DUE AT DROP
                              </span>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsAppBill(t)}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-bold transition flex items-center gap-1 shadow-2xs"
                                  title="Share Trip Bill & Payment Link on WhatsApp"
                                >
                                  <span>📲</span> Share Bill
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBalanceModal(t)}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-amber-900 border border-amber-300 rounded text-[9px] font-bold transition flex items-center gap-0.5 shadow-2xs"
                                  title="Record or Mark Balance Payment"
                                >
                                  <span>💵</span> Mark Paid
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Tolls & Parking */}
                        <td className="py-3 px-4">
                          {t.tollAmount > 0 || t.parkingAmount > 0 ? (
                            <div className="space-y-1">
                              {t.tollAmount > 0 && (
                                <div className="text-[10px] font-mono text-amber-800 font-semibold">
                                  🛣️ Toll: ₹{t.tollAmount.toLocaleString('en-IN')}
                                </div>
                              )}
                              {t.parkingAmount > 0 && (
                                <div className="text-[10px] font-mono text-sky-800 font-semibold">
                                  🅿️ Park: ₹{t.parkingAmount.toLocaleString('en-IN')}
                                </div>
                              )}
                              <div className="text-[9px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded inline-block">
                                +₹{(t.tollAmount + t.parkingAmount).toLocaleString('en-IN')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Driver Payout Column with Tick Mark PAID / Cross Mark NOT PAID */}
                        <td className="py-3 px-4 bg-slate-50/50 border-x border-slate-200">
                          {t.driverName ? (
                            <div className="space-y-2">
                              {/* Prominent Badge */}
                              <div className="flex items-center gap-2">
                                {isDriverPaid ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                    <span className="text-base font-black text-emerald-700">✓</span>
                                    <span>PAID</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                    <span className="text-base font-black text-rose-700">✗</span>
                                    <span>NOT PAID</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(t)}
                                  className="text-[10px] text-slate-600 hover:text-amber-800 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
                                  title="Edit Allowance and Payee Amounts"
                                >
                                  ✏️ Edit
                                </button>
                              </div>

                              {/* Breakdown */}
                              <div className="text-[11px] space-y-0.5">
                                <div className="text-emerald-800">
                                  🚗 Allowance: <span className="font-bold">₹{(t.driverAllowance || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-sky-800">
                                  💰 Payee: <span className="font-bold">₹{(t.driverPayeeAmount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-slate-900 font-extrabold border-t border-slate-200 pt-0.5">
                                  Total: ₹{totalDriverEarning.toLocaleString('en-IN')}
                                </div>
                              </div>

                              {/* Instant 1-Click Toggle Button */}
                              <div>
                                {isDriverPaid ? (
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleToggleDriverPayment(t.id, 'PENDING')}
                                    className="w-full px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-300 hover:border-rose-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-50 shadow-2xs"
                                  >
                                    {isProcessing ? (
                                      <span>Updating...</span>
                                    ) : (
                                      <>
                                        <span>✗</span> Mark as Unpaid
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleToggleDriverPayment(t.id, 'PAID')}
                                    className="w-full px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    {isProcessing ? (
                                      <span>Updating...</span>
                                    ) : (
                                      <>
                                        <span className="text-xs">✓</span> Mark as Paid
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No driver assigned</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              t.status === 'TRIP_COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : t.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
            <div>
              Showing {transactions.length} of {pagination.totalCount} transactions
            </div>
            <div className="flex gap-2 items-center">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded transition shadow-2xs font-medium"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded transition shadow-2xs font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Driver Payout Edit Modal */}
      {editModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
                  <span>💵</span> Edit Driver Payout
                </h3>
                <p className="text-xs text-amber-800 font-mono mt-0.5 font-bold">
                  {editModalBooking.humanReadableRef} • {editModalBooking.driverName || 'Driver'}
                </p>
              </div>
              <button
                onClick={() => setEditModalBooking(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">🚗 Driver Allowance (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={editAllowance}
                  onChange={(e) => setEditAllowance(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. 350"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Given at trip start / acceptance</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">💰 Driver Final Payee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={editPayee}
                  onChange={(e) => setEditPayee(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. 1800"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Settled after ride completion</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">💳 Driver Payment Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="PAID">✓ PAID (Settled)</option>
                  <option value="PENDING">✗ NOT PAID (Pending)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Total Driver Amount:</span>
                <span className="text-emerald-800 font-black text-sm">
                  ₹{((parseFloat(editAllowance) || 0) + (parseFloat(editPayee) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditModalBooking(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveDriverPayoutEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                {savingEdit ? <span>Saving...</span> : <span>💾 Save Payout</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Customer Balance Payment Modal */}
      {balanceModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>💵</span> Record Balance Payment — {balanceModalBooking.humanReadableRef}
              </h3>
              <button
                type="button"
                onClick={() => setBalanceModalBooking(null)}
                className="text-slate-400 hover:text-slate-700 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-600 flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-900">{balanceModalBooking.customerName}</span>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Total Fare:</span>
                  <span className="font-bold text-slate-900">₹{balanceModalBooking.estimatedFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Advance Paid:</span>
                  <span className="font-bold text-emerald-800">-₹{balanceModalBooking.advanceAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Balance Due:</span>
                  <span className="font-black text-amber-800 text-base">₹{balanceModalBooking.balanceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">💳 Payment Collection Method</label>
                <select
                  value={balanceMethod}
                  onChange={(e) => setBalanceMethod(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="UPI_QR">📱 UPI QR / GPay / PhonePe</option>
                  <option value="CASH">💵 Cash Collected by Driver / Office</option>
                  <option value="RAZORPAY">🌐 Online Razorpay Gateway</option>
                  <option value="BANK_TRANSFER">🏦 Direct Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">🔖 Transaction Reference / UTR (Optional)</label>
                <input
                  type="text"
                  value={balanceTxnRef}
                  onChange={(e) => setBalanceTxnRef(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. UPI Ref #426789123456"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">📝 Internal Note (Optional)</label>
                <input
                  type="text"
                  value={balanceNotes}
                  onChange={(e) => setBalanceNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Received at drop location by driver"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setBalanceModalBooking(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingBalance}
                onClick={handleSaveBalancePayment}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                {savingBalance ? <span>Recording...</span> : <span>✓ Confirm & Generate Receipt</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
