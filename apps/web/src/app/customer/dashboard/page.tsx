'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  PhoneCall,
  User,
  ShieldCheck,
  Printer,
  Download,
  X,
  Navigation,
} from 'lucide-react';

interface BookingItem {
  id: string;
  humanReadableRef: string;
  tripType: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledAt: string;
  distanceKm?: number;
  estimatedFare: number;
  advanceAmount: number;
  advancePaymentStatus: string;
  balanceAmount: number;
  balancePaymentStatus: string;
  tollAmount: number;
  status: string;
  priceSnapshot?: any;
  customerPhoneReleased: boolean;
  customer?: {
    fullName?: string;
    phone?: string;
  };
  assignedDriver?: {
    fullName: string;
    licenseNumber?: string;
    user?: { phone: string };
  };
  vehicle?: {
    name: string;
    category: string;
  };
}

const formatPickupDate = (isoString?: string) => {
  if (!isoString) return 'Date Pending';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return isoString;
  }
};

const formatPickupTime = (isoString?: string) => {
  if (!isoString) return '06:00 AM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '06:00 AM';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return '06:00 AM';
  }
};

export default function CustomerDashboardPage() {
  const { user, loading: authLoading, logout: handleDashboardLogout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const fetchedUserRef = useRef<string | null>(null);

  // Invoice modal state
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<BookingItem | null>(null);

  // Cancellation modal state
  const [cancelTargetBooking, setCancelTargetBooking] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelWarning, setCancelWarning] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // OTP Login modal state
  const [loginPhone, setLoginPhone] = useState('9876543210');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleOpenCancelModal = (b: BookingItem) => {
    setCancelTargetBooking(b);
    setCancelReason('');
    setCancelSuccess(null);

    // Calculate time until departure (in hours)
    const scheduledTime = new Date(b.scheduledAt).getTime();
    const now = Date.now();
    const diffHours = (scheduledTime - now) / (1000 * 60 * 60);

    if (diffHours < 2) {
      setCancelWarning(
        `Rides can only be cancelled at least 2 hours before departure time. Your pickup is scheduled for ${formatPickupDate(
          b.scheduledAt
        )} at ${formatPickupTime(
          b.scheduledAt
        )} (less than 2 hours away). Please contact Kandy Cabs Operations (+91 98765 43210) for urgent changes.`
      );
    } else {
      setCancelWarning(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetBooking) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/customer/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: cancelTargetBooking.id,
          cancellationReason: cancelReason || 'Cancelled by customer online',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCancelSuccess('Booking cancelled successfully!');
        setBookings((prev) =>
          prev.map((item) =>
            item.id === cancelTargetBooking.id || item.humanReadableRef === cancelTargetBooking.humanReadableRef
              ? { ...item, status: 'CANCELLED' }
              : item
          )
        );
        setTimeout(() => {
          setCancelTargetBooking(null);
        }, 1500);
      } else {
        setCancelWarning(data.error || 'Failed to cancel booking.');
      }
    } catch (err: any) {
      setCancelWarning('Error processing cancellation request.');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const userKey = `${user.id}_${user.phone}`;
    if (fetchedUserRef.current === userKey) {
      setLoading(false);
      return;
    }

    fetchedUserRef.current = userKey;
    fetchCustomerBookings(user.id, user.phone);
  }, [user, authLoading]);

  const fetchCustomerBookings = async (userId: string, phone?: string) => {
    try {
      const res = await fetch('/api/customer/bookings');
      if (res.ok) {
        const data = await res.json();
        const rawBookings = Array.isArray(data.bookings) ? data.bookings : [];
        const paidBookings = rawBookings.filter((b: any) => b.advancePaymentStatus === 'PAID');
        setBookings(paidBookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.warn('Error fetching customer bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-kandy-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-bold text-kandy-muted">
          Loading Customer Portal...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 pt-1.5 sm:pt-2.5 pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {!user ? (
            /* Unauthenticated Prompt */
            <div className="max-w-md mx-auto bg-white p-5 sm:p-8 rounded-widget border border-kandy-border shadow-widget text-center space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-kandy-orangeLight text-kandy-orange rounded-full mx-auto flex items-center justify-center font-black text-xl sm:text-2xl border border-orange-200">
                <User className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-kandy-ink">Customer Account Access</h2>
              <p className="text-xs text-kandy-muted">
                Please sign in to view your bookings, trip receipts, and active ride status.
              </p>
              <Link
                href="/login"
                className="block w-full py-2.5 sm:py-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded text-xs uppercase tracking-wider transition shadow-md"
              >
                SIGN IN WITH MOBILE OTP →
              </Link>
            </div>
          ) : (
            /* Logged-In Customer Dashboard */
            <div className="space-y-3 sm:space-y-5">
              {/* Personalization Welcome Banner */}
              <div className="bg-white p-3.5 sm:p-5 rounded-card border border-kandy-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-kandy-orangeLight text-kandy-orange rounded-full flex items-center justify-center font-extrabold text-lg sm:text-xl border border-orange-200 shrink-0">
                    {user.fullName.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-base sm:text-xl md:text-2xl font-black text-kandy-ink">
                      {user.isNewUser ? `Welcome, ${user.fullName}!` : `Welcome back, ${user.fullName}!`}
                    </h1>
                    <p className="text-[11px] sm:text-xs text-kandy-muted">
                      +91 {user.phone} • Customer Account
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Link
                    href="/booking"
                    className="flex-1 sm:flex-none text-center px-3 py-1.5 sm:px-4 sm:py-2 bg-kandy-orange hover:bg-kandy-orangeHover text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wider rounded transition shadow"
                  >
                    + BOOK NEW CAB
                  </Link>
                  <button
                    onClick={handleDashboardLogout}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 border border-kandy-border text-kandy-ink text-[11px] sm:text-xs font-bold rounded hover:bg-gray-100 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* Bookings Section */}
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-kandy-ink mb-2 sm:mb-3 border-l-4 border-kandy-orange pl-2 sm:pl-3">
                  Your Bookings & Trip Invoices
                </h2>

                {bookings.length === 0 ? (
                  <div className="bg-white p-6 sm:p-10 text-center rounded-card border border-kandy-border">
                    <Car className="w-10 h-10 text-kandy-muted mx-auto mb-2" />
                    <h3 className="text-base sm:text-lg font-bold text-kandy-ink mb-1">No Active Bookings Found</h3>
                    <p className="text-xs text-kandy-muted mb-3">You haven&apos;t booked any intercity cab yet.</p>
                    <Link
                      href="/booking"
                      className="inline-block px-5 py-2 bg-kandy-orange text-white font-bold text-xs uppercase tracking-wider rounded"
                    >
                      Book Your First Cab →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white rounded-card border border-kandy-border shadow-card p-3 sm:p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="space-y-1.5 flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-sm sm:text-base font-black text-kandy-orange">
                              Ref: {b.humanReadableRef}
                            </span>
                            <span className="bg-kandy-ink text-white text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                              {b.tripType}
                            </span>
                            <span
                              className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                b.status === 'TRIP_COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : b.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-[11px] sm:text-xs text-kandy-ink pt-0.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <MapPin className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                              <span>{b.pickupAddress}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                              <Navigation className="w-3.5 h-3.5 text-kandy-ink shrink-0" />
                              <span>{b.dropAddress}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-kandy-muted pt-0.5">
                            <span className="flex items-center gap-1 font-bold text-kandy-ink">
                              <Calendar className="w-3.5 h-3.5 text-kandy-orange" />
                              {formatPickupDate(b.scheduledAt)}
                            </span>
                            <span className="flex items-center gap-1 font-extrabold text-kandy-orange bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                              <Clock className="w-3.5 h-3.5 text-kandy-orange" />
                              {formatPickupTime(b.scheduledAt)}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-kandy-ink">{b.vehicle?.name || 'SEDAN (Standard)'}</span>
                            {b.distanceKm && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-kandy-ink">~{b.distanceKm} km</span>
                              </>
                            )}
                          </div>

                          {/* Driver Contact Status */}
                          <div className="pt-1">
                            {b.customerPhoneReleased && b.assignedDriver ? (
                              <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-xs text-emerald-900 flex items-center justify-between">
                                <div>
                                  <strong>Driver Assigned:</strong> {b.assignedDriver.fullName}
                                </div>
                                <a
                                  href={`tel:${b.assignedDriver.user?.phone}`}
                                  className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-0.5 rounded font-bold text-[10px] uppercase"
                                >
                                  <PhoneCall className="w-3 h-3" /> Call Driver
                                </a>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 p-2 rounded text-[11px] sm:text-xs text-kandy-muted flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                                <span>Driver details will be released by ops prior to pickup time.</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Billing Details & Invoice Button */}
                        <div className="text-right md:border-l md:border-kandy-border md:pl-4 w-full md:w-auto flex md:flex-col justify-between items-center md:items-end mt-1 md:mt-0">
                          <div>
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-kandy-muted block">Estimated Total</span>
                            <span className="text-lg sm:text-xl font-black text-kandy-ink">₹{b.estimatedFare.toLocaleString()}</span>
                            <div className="text-[10px] font-bold text-emerald-600">
                              25% Advance Paid: ₹{b.advanceAmount.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-semibold text-kandy-muted">
                              Balance Pending: ₹{b.balanceAmount.toLocaleString()}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                            {b.status !== 'CANCELLED' && b.status !== 'TRIP_COMPLETED' && (
                              <button
                                onClick={() => handleOpenCancelModal(b)}
                                className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 font-bold text-[11px] sm:text-xs rounded transition flex items-center gap-1 shadow-sm"
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                <span>CANCEL RIDE</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedInvoiceBooking(b)}
                              className="px-3 py-1.5 bg-kandy-ink hover:bg-black text-white font-bold text-[11px] sm:text-xs rounded transition flex items-center gap-1 shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5 text-kandy-orange" />
                              <span>VIEW INVOICE</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Invoice Modal */}
      {selectedInvoiceBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white rounded-widget border border-kandy-border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-3.5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-kandy-border pb-2.5 sm:pb-4 mb-3 sm:mb-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-kandy-orange rounded text-white font-bold flex items-center justify-center text-xs sm:text-sm">KC</div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-kandy-ink">Tax Invoice</h3>
                  <p className="text-[9px] sm:text-[10px] text-kandy-muted">Kandy Cabs India Pvt Ltd • GSTIN: 29AABCK1234F1Z5</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceBooking(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-kandy-ink" />
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-4 text-xs text-kandy-ink mb-3.5 sm:mb-6">
              <div className="flex justify-between bg-kandy-bg p-2 sm:p-3 rounded">
                <div>
                  <div className="text-kandy-muted font-bold text-[10px] sm:text-xs">Invoice Ref:</div>
                  <div className="font-extrabold text-kandy-orange text-xs sm:text-sm">{selectedInvoiceBooking.humanReadableRef}</div>
                </div>
                <div className="text-right">
                  <div className="text-kandy-muted font-bold text-[10px] sm:text-xs">Invoice Date:</div>
                  <div className="font-bold text-xs sm:text-sm">{new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              {/* Scheduled Pickup Date & Pickup Time Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-orange-50/80 border border-orange-200 p-2 sm:p-3 rounded">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-kandy-muted font-bold uppercase block">Scheduled Pickup Date & Time</span>
                  <div className="font-extrabold text-kandy-orange text-[11px] sm:text-xs flex items-center gap-1.5 mt-0.5 sm:mt-1">
                    <Calendar className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                    <span>{formatPickupDate(selectedInvoiceBooking.scheduledAt)}</span>
                    <span className="mx-0.5 text-orange-300">•</span>
                    <Clock className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                    <span>{formatPickupTime(selectedInvoiceBooking.scheduledAt)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-kandy-muted font-bold uppercase block">Trip Distance & Type</span>
                  <div className="font-bold text-kandy-ink text-[11px] sm:text-xs flex items-center gap-2 mt-0.5 sm:mt-1">
                    <span>~{selectedInvoiceBooking.distanceKm || 180} km</span>
                    <span className="text-kandy-muted">•</span>
                    <span className="bg-kandy-ink text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                      {selectedInvoiceBooking.tripType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 border-b border-kandy-border pb-2.5 sm:pb-4 text-[11px] sm:text-xs">
                <div>
                  <span className="text-kandy-muted font-bold block uppercase text-[9px] sm:text-[10px]">Pickup Location</span>
                  <span className="font-semibold">{selectedInvoiceBooking.pickupAddress}</span>
                </div>
                <div>
                  <span className="text-kandy-muted font-bold block uppercase text-[9px] sm:text-[10px]">Drop Location</span>
                  <span className="font-semibold">{selectedInvoiceBooking.dropAddress}</span>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2 text-[11px] sm:text-xs">
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Customer Details:</span>
                  <span className="font-bold text-kandy-ink">
                    {user?.fullName || selectedInvoiceBooking.customer?.fullName || 'Valued Customer'} (+91 {user?.phone || 'Account'})
                  </span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Vehicle Model:</span>
                  <span className="font-bold">{selectedInvoiceBooking.vehicle?.name || 'SEDAN (Standard)'}</span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Trip Fare Subtotal:</span>
                  <span className="font-bold">₹{Math.round(selectedInvoiceBooking.estimatedFare * 0.95).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Driver Allowance:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedInvoiceBooking.priceSnapshot?.breakdown?.driverAllowance
                      ? `₹${selectedInvoiceBooking.priceSnapshot.breakdown.driverAllowance.toLocaleString()} (Included)`
                      : 'Included in Fare'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>GST (5%):</span>
                  <span className="font-bold">₹{Math.round(selectedInvoiceBooking.estimatedFare * 0.05).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 text-xs sm:text-sm font-black text-kandy-orange border-t-2 border-kandy-border">
                  <span>Total Invoice Amount:</span>
                  <span>₹{selectedInvoiceBooking.estimatedFare.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2 sm:p-3 rounded space-y-1 text-[11px] sm:text-xs">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>25% Advance Paid Online:</span>
                  <span>₹{selectedInvoiceBooking.advanceAmount.toLocaleString()} (PAID)</span>
                </div>
                <div className="flex justify-between font-bold text-kandy-ink">
                  <span>75% Balance Pending:</span>
                  <span>₹{selectedInvoiceBooking.balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 sm:gap-3 pt-2.5 sm:pt-4 border-t border-kandy-border">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-kandy-bg text-kandy-ink font-bold text-[11px] sm:text-xs rounded hover:bg-gray-200 flex items-center gap-1 sm:gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-kandy-orange text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider rounded hover:bg-kandy-orangeHover flex items-center gap-1 sm:gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelTargetBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-widget border border-kandy-border max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-kandy-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-kandy-ink">Cancel Ride</h3>
                  <p className="text-[10px] text-kandy-muted">Ref: {cancelTargetBooking.humanReadableRef}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelTargetBooking(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-kandy-ink" />
              </button>
            </div>

            {cancelSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded text-xs font-bold text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>{cancelSuccess}</span>
              </div>
            ) : cancelWarning ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Cancellation Notice</span>
                  </div>
                  <p>{cancelWarning}</p>
                </div>
                <div className="flex justify-end pt-2 border-t border-kandy-border">
                  <button
                    onClick={() => setCancelTargetBooking(null)}
                    className="px-5 py-2 bg-kandy-ink text-white text-xs font-extrabold uppercase rounded hover:bg-black"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-kandy-ink leading-relaxed">
                  Are you sure you want to cancel booking <strong>{cancelTargetBooking.humanReadableRef}</strong> scheduled for{' '}
                  <strong>{formatPickupDate(cancelTargetBooking.scheduledAt)}</strong> at{' '}
                  <strong>{formatPickupTime(cancelTargetBooking.scheduledAt)}</strong>?
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-kandy-muted uppercase mb-1">
                    Reason for Cancellation (Optional)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Plans changed, booked another cab..."
                    rows={3}
                    className="w-full text-xs p-2.5 border border-kandy-border rounded focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-kandy-border">
                  <button
                    onClick={() => setCancelTargetBooking(null)}
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold text-kandy-ink border border-kandy-border rounded hover:bg-gray-100"
                  >
                    Keep Ride
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
