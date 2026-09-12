"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  IndianRupee,
  Receipt,
  X,
  FileText,
  MessageCircle,
  Printer,
  QrCode,
  Check,
  Copy,
  Sparkles,
} from "lucide-react";

interface PaymentRow {
  id: string;
  humanReadableRef: string;
  bookingStatus: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  estimatedFare: number;
  advanceAmount: number;
  balanceAmount: number;
  tollAmount: number;
  advancePaymentStatus: string;
  balancePaymentStatus: string;
  paymentStatus: string;
  advancePaymentRef: string | null;
  balancePaymentRef: string | null;
  advancePaidAt: string | null;
  createdAt: string;
  scheduledAt: string;
  priceSnapshot?: any;
}

type PaymentFilter = "ALL" | "PAID" | "PARTIALLY_PAID" | "PENDING";

const FILTER_PILLS: { key: PaymentFilter; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "PAID", label: "PAID" },
  { key: "PARTIALLY_PAID", label: "PARTIALLY PAID" },
  { key: "PENDING", label: "PENDING" },
];

function fmt(amount: number) {
  return `Rs.${amount.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function PaymentBadge({ status }: { status: string }) {
  const cls =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : status === "PARTIALLY_PAID"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-red-100 text-red-700 border-red-300";
  const label =
    status === "PAID" ? "PAID" : status === "PARTIALLY_PAID" ? "PARTIAL" : "PENDING";
  return (
    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider border ${cls}`}>
      {label}
    </span>
  );
}

function buildWaText(p: PaymentRow) {
  const invoiceDate = fmtDate(p.scheduledAt || p.createdAt);
  const dueAmt = p.paymentStatus === "PAID" ? 0 : p.balanceAmount > 0 ? p.balanceAmount : p.advanceAmount;
  const lines: string[] = [
    `*KANDY CABS - PAYMENT INVOICE*`,
    `--------------------`,
    `Booking ID: ${p.humanReadableRef || p.id}`,
    `Date: ${invoiceDate}`,
    ``,
    `Customer: ${p.customerName}`,
    `Driver: ${p.driverName !== "N/A" ? p.driverName : "Unassigned"}`,
    ``,
    `PAYMENT SUMMARY`,
    `--------------------`,
    `Total Fare:   Rs.${p.estimatedFare.toLocaleString("en-IN")}`,
    ...(p.tollAmount > 0 ? [`Toll:         Rs.${p.tollAmount.toLocaleString("en-IN")}`] : []),
    `Advance Paid: Rs.${p.advanceAmount.toLocaleString("en-IN")} ${p.advancePaymentStatus === "PAID" ? "PAID" : "PENDING"}`,
    `Balance Due:  Rs.${p.balanceAmount.toLocaleString("en-IN")} ${p.balancePaymentStatus === "PAID" ? "PAID" : "PENDING"}`,
    ``,
    `Status: ${p.paymentStatus === "PAID" ? "FULLY PAID" : p.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : "PAYMENT PENDING"}`,
    ...(dueAmt > 0 ? [`UPI Pay Link: upi://pay?pa=9481086058@ybl&pn=KandyCabs&am=${dueAmt}&tn=Booking-${p.humanReadableRef || p.id}`] : []),
    ...(p.advancePaymentRef ? [`Ref: ${p.advancePaymentRef}`] : []),
    ``,
    `Thank you for choosing Kandy Cabs!`,
    `Queries: +91 9481086058`,
  ];
  return lines.join("\n");
}

function openWa(p: PaymentRow) {
  const phone = (p.customerPhone || "").replace(/\D/g, "");
  if (!phone || phone.length < 10) {
    alert("Customer phone number not available for this booking.");
    return;
  }
  const wa91 = phone.startsWith("91") ? phone : `91${phone.slice(-10)}`;
  const text = buildWaText(p);
  window.open(`https://wa.me/${wa91}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function InvoiceModal({
  payment,
  onClose,
  onPaymentReceived,
}: {
  payment: PaymentRow;
  onClose: () => void;
  onPaymentReceived: (bookingId: string) => Promise<void>;
}) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const invoiceDate = fmtDate(payment.scheduledAt || payment.createdAt);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [processingPay, setProcessingPay] = useState(false);

  const dueAmount =
    payment.paymentStatus === "PAID"
      ? 0
      : payment.balanceAmount > 0
      ? payment.balanceAmount
      : payment.advanceAmount;

  const upiId = "9481086058@ybl";
  const upiPayAmount = dueAmount > 0 ? dueAmount : payment.estimatedFare;
  const upiUri = `upi://pay?pa=${upiId}&pn=Kandy%20Cabs&am=${upiPayAmount}&tn=Booking%20${payment.humanReadableRef || payment.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleMarkPaid = async () => {
    setProcessingPay(true);
    try {
      await onPaymentReceived(payment.id);
    } finally {
      setProcessingPay(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current) return;
    const pw = window.open("", "_blank", "width=800,height=900");
    if (!pw) return;
    pw.document.write(`
      <html><head><title>Invoice ${payment.humanReadableRef}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#1a1a2e}
        .header{text-align:center;border-bottom:3px solid #f97316;padding-bottom:16px;margin-bottom:20px}
        .logo{font-size:28px;font-weight:900;color:#f97316}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        td,th{padding:8px 12px;font-size:12px}
        th{background:#1a1a2e;color:white;text-align:left;font-size:11px;text-transform:uppercase}
        tr:nth-child(even){background:#f9f9f9}
        .total-row td{font-weight:bold;border-top:2px solid #f97316}
        .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:bold;font-size:11px}
        .paid{background:#dcfce7;color:#166534}.partial{background:#fef9c3;color:#713f12}.pending{background:#fee2e2;color:#991b1b}
        .qr-section{text-align:center;margin-top:20px;padding:16px;border:1px dashed #f97316;border-radius:8px;background:#fffaf5}
        .footer{margin-top:24px;text-align:center;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px}
      </style></head><body>
      <div class="header">
        <img src="${window.location.origin}/kandycabs-logo.png" alt="Kandy Cabs" style="height:64px;width:auto;object-fit:contain;margin:0 auto 4px;" />
        <p style="font-size:13px;font-weight:600;color:#555;margin:4px 0">PAYMENT INVOICE</p>
        <p style="font-size:11px;color:#888">Booking Ref: <strong>${payment.humanReadableRef || payment.id}</strong> &nbsp;|&nbsp; Date: ${invoiceDate}</p>
      </div>
      <table>
        <tr><th colspan="2">Booking Details</th></tr>
        <tr><td>Customer</td><td>${payment.customerName} | +91 ${payment.customerPhone}</td></tr>
        <tr><td>Driver</td><td>${payment.driverName !== "N/A" ? payment.driverName : "Unassigned"}</td></tr>
        <tr><td>Booking Status</td><td>${(payment.bookingStatus || "").replace(/_/g, " ")}</td></tr>
        <tr><th colspan="2">Payment Breakdown</th></tr>
        <tr><td>Estimated Fare</td><td>Rs.${payment.estimatedFare.toLocaleString("en-IN")}</td></tr>
        ${payment.tollAmount > 0 ? `<tr><td>Toll / Highway</td><td>Rs.${payment.tollAmount.toLocaleString("en-IN")}</td></tr>` : ""}
        <tr><td>25% Advance Paid</td><td>Rs.${payment.advanceAmount.toLocaleString("en-IN")} <span class="badge paid">${payment.advancePaymentStatus}</span></td></tr>
        <tr><td>Balance Due</td><td>Rs.${payment.balanceAmount.toLocaleString("en-IN")} <span class="badge ${payment.balancePaymentStatus === "PAID" ? "paid" : "pending"}">${payment.balancePaymentStatus}</span></td></tr>
        ${payment.advancePaymentRef ? `<tr><td>Payment Reference</td><td>${payment.advancePaymentRef}</td></tr>` : ""}
        <tr class="total-row"><td>PAYMENT STATUS</td><td><span class="badge ${payment.paymentStatus === "PAID" ? "paid" : payment.paymentStatus === "PARTIALLY_PAID" ? "partial" : "pending"}">${payment.paymentStatus.replace(/_/g, " ")}</span></td></tr>
      </table>
      ${
        payment.paymentStatus !== "PAID"
          ? `<div class="qr-section">
              <p style="font-weight:bold;font-size:12px;margin:0 0 8px;color:#f97316">SCAN & PAY VIA UPI (GPay / PhonePe / Paytm / BHIM)</p>
              <img src="${qrCodeUrl}" alt="UPI QR Scanner" style="width:140px;height:140px;" />
              <p style="font-size:11px;font-weight:bold;margin:8px 0 0;color:#333">UPI ID: 9481086058@ybl</p>
             </div>`
          : ""
      }
      <div class="footer">Thank you for choosing Kandy Cabs &bull; +91 9481086058</div>
      </body></html>
    `);
    pw.document.close();
    pw.focus();
    setTimeout(() => pw.print(), 500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Close Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b border-gray-200 bg-kandy-ink text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-kandy-orange" />
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Payment Invoice</h2>
              <p className="text-[10px] text-gray-300 font-semibold">{payment.humanReadableRef || payment.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase transition shadow-sm"
            title="Close Invoice Modal"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Scrollable Invoice Body */}
        <div ref={invoiceRef} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Brand */}
          <div className="text-center pb-4 border-b-2 border-kandy-orange">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kandycabs-logo.png"
              alt="Kandy Cabs"
              className="h-14 w-auto object-contain mx-auto"
            />
            <div className="text-[11px] font-bold text-kandy-muted uppercase tracking-widest mt-1">Payment Invoice</div>
            <div className="text-[10px] text-gray-400 mt-1">
              Date: {invoiceDate} &nbsp;·&nbsp; Ref:{" "}
              <span className="font-bold text-kandy-ink">{payment.humanReadableRef || payment.id}</span>
            </div>
          </div>

          {/* Customer & Driver */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-kandy-bg rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-black uppercase text-kandy-muted tracking-wider">Customer</p>
              <p className="font-black text-kandy-ink">{payment.customerName}</p>
              {payment.customerPhone !== "N/A" && (
                <p className="text-kandy-muted font-semibold">+91 {payment.customerPhone}</p>
              )}
            </div>
            <div className="bg-kandy-bg rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-black uppercase text-kandy-muted tracking-wider">Driver</p>
              <p className="font-black text-kandy-ink">
                {payment.driverName !== "N/A" ? payment.driverName : "Unassigned"}
              </p>
              <p className="text-kandy-muted font-semibold text-[10px] uppercase">
                {(payment.bookingStatus || "").replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-xl border border-kandy-border overflow-hidden text-xs">
            <div className="bg-kandy-ink text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
              <span>Payment Breakdown</span>
              <PaymentBadge status={payment.paymentStatus} />
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-kandy-muted font-semibold">Estimated Fare</span>
                <span className="font-bold text-kandy-ink">{fmt(payment.estimatedFare)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-kandy-muted font-semibold">Driver Allowance</span>
                <span className="font-bold text-emerald-700">
                  {payment.priceSnapshot?.breakdown?.driverAllowance
                    ? `${fmt(payment.priceSnapshot.breakdown.driverAllowance)} (Included)`
                    : 'Included in Fare'}
                </span>
              </div>
              {payment.tollAmount > 0 && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-kandy-muted font-semibold">Toll / Highway</span>
                  <span className="font-bold text-kandy-ink">{fmt(payment.tollAmount)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-kandy-muted font-semibold">25% Advance Paid</span>
                <span className={`font-bold ${payment.advancePaymentStatus === "PAID" ? "text-emerald-700" : "text-gray-400"}`}>
                  {fmt(payment.advanceAmount)}
                  {payment.advancePaymentStatus === "PAID" && (
                    <CheckCircle2 className="inline w-3 h-3 ml-1 mb-0.5" />
                  )}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-kandy-muted font-semibold">Balance Due</span>
                <span className={`font-bold ${payment.balancePaymentStatus === "PAID" ? "text-emerald-700" : "text-red-600"}`}>
                  {fmt(payment.balanceAmount)}
                  {payment.balancePaymentStatus === "PAID" && (
                    <CheckCircle2 className="inline w-3 h-3 ml-1 mb-0.5" />
                  )}
                </span>
              </div>
              {payment.advancePaymentRef && (
                <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                  <span className="text-kandy-muted font-semibold">Payment Ref</span>
                  <span className="font-mono font-bold text-kandy-ink text-[10px] bg-gray-100 px-2 py-0.5 rounded">
                    {payment.advancePaymentRef}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* UPI QR SCANNER SECTION */}
          {payment.paymentStatus !== "PAID" ? (
            <div className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/70 p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase text-kandy-orange">
                <QrCode className="w-4 h-4" />
                <span>Scan QR Code to Pay via UPI</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shadow-md border border-orange-200 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="UPI Payment QR Code"
                    className="w-36 h-36 object-contain rounded"
                  />
                </div>
                <div className="text-left space-y-1.5 max-w-[180px]">
                  <p className="text-[10px] font-bold text-kandy-muted uppercase">Amount to Pay</p>
                  <p className="text-lg font-black text-emerald-700">{fmt(upiPayAmount)}</p>
                  <p className="text-[10px] font-bold text-kandy-muted uppercase pt-1">UPI VPA</p>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
                    <span className="font-mono text-[10px] font-bold text-kandy-ink">{upiId}</span>
                    <button
                      onClick={handleCopyUpi}
                      className="p-0.5 text-gray-400 hover:text-kandy-orange transition"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500 pt-0.5">
                    Supports Google Pay, PhonePe, Paytm &amp; BHIM
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                Payment Fully Received &amp; Verified
              </span>
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-[10px] text-kandy-muted">
            Thank you for choosing Kandy Cabs &bull; +91 9481086058
          </p>
        </div>

        {/* Sticky Action Footer Bar */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50 space-y-2 sm:space-y-2.5 shrink-0">
          {/* Mark Payment Received Button (if unpaid) */}
          {payment.paymentStatus !== "PAID" && (
            <button
              onClick={handleMarkPaid}
              disabled={processingPay}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase rounded-xl transition shadow-md disabled:opacity-50"
            >
              {processingPay ? (
                <span>Updating Payment...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Mark Payment Received (Dummy Payment)</span>
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 bg-white border border-kandy-border text-kandy-ink font-extrabold text-xs uppercase rounded-xl hover:bg-gray-100 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-kandy-muted" />
              Print
            </button>
            <button
              onClick={() => openWa(payment)}
              className="flex items-center justify-center gap-1.5 py-2 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-extrabold text-xs uppercase rounded-xl transition shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-1 py-2 bg-gray-800 hover:bg-black text-white font-extrabold text-xs uppercase rounded-xl transition shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              Close Bar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("ALL");
  const [invoicePayment, setInvoicePayment] = useState<PaymentRow | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.warn("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaymentReceived = async (bookingId: string) => {
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paymentType: "FULL" }),
      });
      if (res.ok) {
        // Update local state instantly
        setPayments((prev) =>
          prev.map((p) => {
            if (p.id === bookingId || p.humanReadableRef === bookingId) {
              return {
                ...p,
                advancePaymentStatus: "PAID",
                balancePaymentStatus: "PAID",
                paymentStatus: "PAID",
                balanceAmount: 0,
                advancePaymentRef: p.advancePaymentRef || "RECEIPT_ADMIN_OK",
              };
            }
            return p;
          })
        );

        if (invoicePayment && (invoicePayment.id === bookingId || invoicePayment.humanReadableRef === bookingId)) {
          setInvoicePayment({
            ...invoicePayment,
            advancePaymentStatus: "PAID",
            balancePaymentStatus: "PAID",
            paymentStatus: "PAID",
            balanceAmount: 0,
            advancePaymentRef: invoicePayment.advancePaymentRef || "RECEIPT_ADMIN_OK",
          });
        }
      }
    } catch (err) {
      console.error("Error marking payment received:", err);
    }
  };

  const filtered = payments.filter((p) => {
    const matchesSearch =
      (p.humanReadableRef || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "ALL" || p.paymentStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const totalBookings = payments.length;
  const paidCount = payments.filter((p) => p.paymentStatus === "PAID").length;
  const partialCount = payments.filter((p) => p.paymentStatus === "PARTIALLY_PAID").length;
  const pendingCount = payments.filter((p) => p.paymentStatus === "PENDING").length;
  const totalRevenue = payments
    .filter((p) => p.advancePaymentStatus === "PAID")
    .reduce((sum, p) => sum + (p.advanceAmount || 0), 0);

  return (
    <div className="space-y-3.5 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-black text-kandy-ink">Payments</h1>
        <p className="text-[11px] sm:text-xs text-kandy-muted mt-0.5">Track advance, balance, and full payment status per booking</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Total", value: totalBookings, cls: "text-kandy-ink", icon: CreditCard, bg: "bg-kandy-bg", ic: "text-kandy-orange" },
          { label: "Paid", value: paidCount, cls: "text-emerald-700", icon: CheckCircle2, bg: "bg-emerald-50", ic: "text-emerald-600" },
          { label: "Partial", value: partialCount, cls: "text-amber-700", icon: Clock, bg: "bg-amber-50", ic: "text-amber-600" },
          { label: "Pending", value: pendingCount, cls: "text-red-600", icon: AlertCircle, bg: "bg-red-50", ic: "text-red-500" },
        ].map(({ label, value, cls, icon: Icon, bg, ic }) => (
          <div key={label} className="bg-white rounded-card border border-kandy-border shadow-sm p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${ic}`} />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-kandy-muted uppercase tracking-wider">{label}</p>
              <p className={`text-base sm:text-xl font-black ${cls}`}>{value}</p>
            </div>
          </div>
        ))}
        <div className="bg-white rounded-card border border-kandy-border shadow-sm p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-3 col-span-2 sm:col-span-1">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-orange" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold text-kandy-muted uppercase tracking-wider">Collected</p>
            <p className="text-sm sm:text-xl font-black text-kandy-ink">Rs.{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-card border border-kandy-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-muted absolute left-2.5 sm:left-3 top-2.5 sm:top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search booking ref or customer name"
            className="w-full pl-8 sm:pl-9 pr-3 sm:pr-3.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold text-kandy-ink placeholder-kandy-muted focus:outline-none focus:ring-1 focus:ring-kandy-orange"
          />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-md text-[10px] sm:text-[11px] font-extrabold uppercase transition whitespace-nowrap shadow-sm ${
                filter === pill.key
                  ? "bg-kandy-orange text-white ring-2 ring-orange-300"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-kandy-border shadow-card overflow-x-auto">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-kandy-muted">
              <svg className="animate-spin w-5 h-5 text-kandy-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">Loading payments...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-kandy-ink border-collapse">
              <thead>
                <tr className="bg-kandy-ink text-white uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">
                  {["Ref ID", "Customer", "Driver", "Total Fare", "Advance Paid", "Balance Due", "Toll", "Payment Status", "Advance Ref", "Date", "Actions"].map((h) => (
                    <th key={h} className={`p-2 sm:p-3.5 whitespace-nowrap ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-[11px] sm:text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-xs text-kandy-muted">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="w-8 h-8 text-gray-300" />
                        <span>No payments found{filter !== "ALL" && <> for <strong>{filter.replace("_", " ")}</strong></>}.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-2 sm:p-3.5 whitespace-nowrap">
                        <span className="font-black text-kandy-orange">{p.humanReadableRef || p.id}</span>
                        <span className="block text-[9px] sm:text-[10px] text-kandy-muted font-normal mt-0.5">{p.bookingStatus?.replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-2 sm:p-3.5 whitespace-nowrap">
                        <span className="font-bold">{p.customerName}</span>
                        <span className="block text-[9px] sm:text-[10px] text-kandy-muted mt-0.5">
                          {p.customerPhone !== "N/A" ? `+91 ${p.customerPhone}` : "-"}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3.5 text-kandy-ink whitespace-nowrap">
                        {p.driverName !== "N/A" ? p.driverName : <span className="text-kandy-muted italic">Unassigned</span>}
                      </td>
                      <td className="p-2 sm:p-3.5 font-bold whitespace-nowrap">Rs.{p.estimatedFare.toLocaleString("en-IN")}</td>
                      <td className="p-2 sm:p-3.5 whitespace-nowrap">
                        <span className={`font-bold ${p.advancePaymentStatus === "PAID" ? "text-emerald-700" : "text-kandy-muted"}`}>
                          Rs.{p.advanceAmount.toLocaleString("en-IN")}
                        </span>
                        {p.advancePaymentStatus === "PAID" && <CheckCircle2 className="inline w-3 h-3 text-emerald-600 ml-1 mb-0.5" />}
                      </td>
                      <td className="p-2 sm:p-3.5 whitespace-nowrap">
                        <span className={`font-bold ${p.balancePaymentStatus === "PAID" ? "text-emerald-700" : "text-red-600"}`}>
                          Rs.{p.balanceAmount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3.5 text-kandy-muted whitespace-nowrap">
                        {p.tollAmount > 0 ? `Rs.${p.tollAmount.toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td className="p-2 sm:p-3.5 whitespace-nowrap"><PaymentBadge status={p.paymentStatus} /></td>
                      <td className="p-2 sm:p-3.5 font-mono text-[9px] sm:text-[10px] text-kandy-muted whitespace-nowrap">
                        {p.advancePaymentRef ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-kandy-ink font-bold">{p.advancePaymentRef}</span>
                        ) : "-"}
                      </td>
                      <td className="p-2 sm:p-3.5 text-kandy-muted whitespace-nowrap">
                        {p.scheduledAt
                          ? new Date(p.scheduledAt).toLocaleDateString("en-IN")
                          : p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("en-IN")
                          : "-"}
                      </td>
                      {/* Actions */}
                      <td className="p-2 sm:p-3.5">
                        <div className="flex items-center justify-end gap-1 sm:gap-1.5 whitespace-nowrap">
                          {p.paymentStatus !== "PAID" && (
                            <button
                              onClick={() => handleMarkPaymentReceived(p.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] sm:text-[10px] uppercase rounded shadow-sm transition"
                              title="Mark Payment Received (Dummy Payment)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setInvoicePayment(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-kandy-ink hover:bg-black text-white font-bold text-[9px] sm:text-[10px] uppercase rounded shadow-sm transition"
                          >
                            <FileText className="w-3 h-3" />
                            Invoice
                          </button>
                          <button
                            onClick={() => openWa(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-bold text-[9px] sm:text-[10px] uppercase rounded shadow-sm transition"
                            title="Send invoice on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WA
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {invoicePayment && (
        <InvoiceModal
          payment={invoicePayment}
          onClose={() => setInvoicePayment(null)}
          onPaymentReceived={handleMarkPaymentReceived}
        />
      )}
    </div>
  );
}
