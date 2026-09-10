'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  getAdminMasterKpis,
  getAllVehicles,
  toggleVehicleActive,
  getSystemSettings,
  updateSystemSettings,
} from '@/lib/adminMasterEngine';
import {
  getAllLocationsAdmin,
  addMangaluruLocation,
  updateMangaluruLocation,
  reorderLocations,
  MangaluruLocation,
} from '@/lib/mangaluruLocationsEngine';
import { getAdminBookings, getAuditLogs, assignDriverToBooking, assignVendorDriverToBooking, recordAuditLog, verifyAdminCredentials, deleteAllCustomerData, recordCustomerPayment, cancelBookingByAdmin } from '@/lib/adminEngine';
import { deleteAllCustomerAccounts } from '@/lib/customerAccountEngine';
import { getAllAdminPricingRules } from '@/lib/pricingConfigStore';
import { getAllCoupons, setCouponSystemEnabled, getCouponSystemEnabled, upsertCoupon, deleteCoupon, CouponDefinition } from '@/lib/couponEngine';
import {
  getAllVendorPartners,
  addVendorPartner,
  VendorPartnerRecord,
} from '@/lib/vendorEngine';
import {
  getAllDriverAccounts,
  setDriverPassword,
  addDriverAccount,
  updateDriverAccount,
  deleteDriverAccount,
  setDriverDutyStatus,
  getDriverPartnerRequests,
  updateDriverPartnerRequestStatus,
  updateDriverVerificationStatus,
  DriverAccountRecord,
  DriverJoinRequestRecord,
} from '@/lib/driverAccountEngine';
import { AdminLiveTrackingMap } from '@/components/admin/AdminLiveTrackingMap';
import { AdminMeterVerificationConsole } from '@/components/admin/AdminMeterVerificationConsole';
import { CustomerInvoiceModal } from '@/components/invoice/CustomerInvoiceModal';
import { OnlinePaymentModal } from '@/components/payments/OnlinePaymentModal';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';

export const AdminMasterConsoleView: React.FC = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserInput, setAdminUserInput] = useState('kandycabs');
  const [adminPassInput, setAdminPassInput] = useState('kandycabs123');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const [liveDriverAlert, setLiveDriverAlert] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('kc_admin_token');
      const storedUser = localStorage.getItem('kc_admin_user') || localStorage.getItem('kc_user');
      if (storedToken || (storedUser && JSON.parse(storedUser)?.role === 'ADMIN')) {
        setIsAdminAuthenticated(true);
      }
    } catch {}
  }, []);

  // Real-time synchronization for bookings, drivers, and vendor partners
  useEffect(() => {
    setDrivers(getAllDriverAccounts());

    const handleBookingSync = (e?: any) => {
      setBookings(getAdminBookings());
      setKpis(getAdminMasterKpis());
      setAuditLogs(getAuditLogs());
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kc_booking_sync') {
        setBookings(getAdminBookings());
        setKpis(getAdminMasterKpis());
        setAuditLogs(getAuditLogs());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('new_booking_created', handleBookingSync);
      window.addEventListener('storage', handleStorageChange);
    }

    const syncBookingsFromApi = () => {
      fetch('/api/admin/bookings', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setBookings(data.data);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('kc_all_admin_bookings', JSON.stringify(data.data));
              } catch {}
            }
          }
        })
        .catch(() => {});
    };

    const syncDriverApplicationsFromApi = () => {
      fetch('/api/driver-applications', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setDriverRequests(data.data);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('kc_driver_join_requests', JSON.stringify(data.data));
              } catch {}
            }
          }
        })
        .catch(() => {});
    };

    syncBookingsFromApi();
    syncDriverApplicationsFromApi();

    // Polling interval every 2 seconds for instant cross-tab sync of drivers, bookings & driver applications
    const timer = setInterval(() => {
      setDrivers(getAllDriverAccounts());
      setKpis(getAdminMasterKpis());
      setAuditLogs(getAuditLogs());
      syncBookingsFromApi();
      syncDriverApplicationsFromApi();
    }, 2000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('new_booking_created', handleBookingSync);
        window.removeEventListener('storage', handleStorageChange);
      }
      clearInterval(timer);
    };
  }, []);

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);

    const res = verifyAdminCredentials(adminUserInput, adminPassInput);
    if (!res.success || !res.admin) {
      setAdminAuthError(res.error || 'Invalid admin username or password.');
      return;
    }

    const token = `admin_token_${Date.now()}`;
    const adminData = {
      id: res.admin.id,
      name: res.admin.name,
      username: res.admin.username,
      role: 'ADMIN',
    };

    localStorage.setItem('kc_admin_token', token);
    localStorage.setItem('kc_admin_user', JSON.stringify(adminData));
    localStorage.setItem('kc_token', token);
    localStorage.setItem('kc_user', JSON.stringify(adminData));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_change'));
    }

    setIsAdminAuthenticated(true);
  };

  const handleLockConsole = () => {
    localStorage.removeItem('kc_admin_token');
    localStorage.removeItem('kc_admin_user');
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_change'));
    }
    setIsAdminAuthenticated(false);
  };

  const [selectedDispatchDriverMap, setSelectedDispatchDriverMap] = useState<Record<string, string>>({});
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);

  const handleDispatchSubmit = (bookingId: string) => {
    const driverId = selectedDispatchDriverMap[bookingId] || drivers[0]?.id || 'driver_suresh';
    const targetDriver = drivers.find((d) => d.id === driverId || d.phone === driverId);
    if (!targetDriver) return;

    const res = assignDriverToBooking(
      bookingId,
      targetDriver.id,
      targetDriver.fullName,
      targetDriver.vehicleRegistration,
      'admin_super',
      'Super Admin'
    );
    if (!res.success) {
      setDispatchMsg(`⚠️ ${res.error || 'Dispatch failed'}`);
      return;
    }

    setBookings(getAdminBookings());
    setAuditLogs(getAuditLogs());
    setDispatchMsg(
      `✓ Dispatched trip ${res.booking?.bookingReference} to ${targetDriver.fullName} (${targetDriver.vehicleRegistration})! Awaiting driver approval.`
    );
  };

  const handleAdminToggleDriverStatus = (driverId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OFFLINE' ? 'ACTIVE' : 'OFFLINE';
    const res = setDriverDutyStatus(driverId, nextStatus);
    if (res.success && res.driver) {
      setDrivers(getAllDriverAccounts());
      setAuditLogs(getAuditLogs());
      setDriverMsg(
        `✓ Updated duty status for ${res.driver.fullName} to ${nextStatus === 'ACTIVE' ? '🟢 ONLINE' : '🔴 OFFLINE'}`
      );
    }
  };

  const [activeTab, setActiveTab] = useState<
    'LOCATIONS' | 'DRIVERS' | 'DRIVER_REQUESTS' | 'BOOKINGS' | 'MAP' | 'METER' | 'VEHICLES' | 'PRICING' | 'COUPONS' | 'PAYMENTS' | 'SETTINGS' | 'AUDIT'
  >('BOOKINGS');

  const [kpis, setKpis] = useState(getAdminMasterKpis());
  const [bookings, setBookings] = useState(getAdminBookings());
  const [vehicles, setVehicles] = useState(getAllVehicles());
  const [locations, setLocations] = useState<MangaluruLocation[]>(getAllLocationsAdmin());
  const [drivers, setDrivers] = useState<DriverAccountRecord[]>(getAllDriverAccounts());
  const [driverRequests, setDriverRequests] = useState<DriverJoinRequestRecord[]>(getDriverPartnerRequests());
  const [driverRequestFilter, setDriverRequestFilter] = useState<'PENDING' | 'ONBOARDED' | 'ALL'>('PENDING');
  const [vendors, setVendors] = useState<VendorPartnerRecord[]>(getAllVendorPartners());
  const [pricingRules, setPricingRules] = useState(getAllAdminPricingRules());
  const [coupons, setCoupons] = useState(getAllCoupons());
  const [auditLogs, setAuditLogs] = useState(getAuditLogs());
  const [settings, setSettings] = useState(getSystemSettings());
  const [couponSystemActive, setCouponSystemActive] = useState(getCouponSystemEnabled());

  // Driver Verification Inspection Drawer State
  const [selectedInspectionDriver, setSelectedInspectionDriver] = useState<DriverAccountRecord | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // Vendor Partner Registration State
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorAgencyName, setNewVendorAgencyName] = useState('');
  const [newVendorContactPerson, setNewVendorContactPerson] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorCity, setNewVendorCity] = useState('');
  const [newVendorFleetTypes, setNewVendorFleetTypes] = useState('');
  const [vendorMsg, setVendorMsg] = useState<string | null>(null);

  // Odometer Photo Inspection Modal State
  const [modalMeterImage, setModalMeterImage] = useState<{
    url: string;
    ref: string;
    customer: string;
    driver: string;
    km: number;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [copyGpsSuccess, setCopyGpsSuccess] = useState(false);

  const [invoiceBooking, setInvoiceBooking] = useState<any | null>(null);
  const [itineraryBooking, setItineraryBooking] = useState<any | null>(null);
  const [onlinePaymentBooking, setOnlinePaymentBooking] = useState<any | null>(null);

  // Customer Payments Console State
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<'ALL' | 'ONLINE' | 'ADVANCE' | 'DRIVER_CASH' | 'PENDING'>('ALL');
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordPaymentBookingId, setRecordPaymentBookingId] = useState('');
  const [recordPaymentType, setRecordPaymentType] = useState<'ADVANCE' | 'REMAINING_BALANCE' | 'FULL_SETTLEMENT' | 'MANUAL_ADJUSTMENT'>('REMAINING_BALANCE');
  const [recordPaymentAmount, setRecordPaymentAmount] = useState('');
  const [recordPaymentMethod, setRecordPaymentMethod] = useState<'RAZORPAY_ONLINE' | 'CASH_TO_DRIVER' | 'DIRECT_UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH_TO_DRIVER');
  const [recordPaymentTxnRef, setRecordPaymentTxnRef] = useState('');
  const [recordPaymentNotes, setRecordPaymentNotes] = useState('');
  const [paymentActionMsg, setPaymentActionMsg] = useState<string | null>(null);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<any | null>(null);

  // Admin Coupon Management State & Handlers
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState<string>('15');
  const [newCouponLimitType, setNewCouponLimitType] = useState<'UNLIMITED' | 'LIMITED'>('UNLIMITED');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<string>('100');
  const [newCouponMinFare, setNewCouponMinFare] = useState<string>('500');
  const [newCouponMaxCap, setNewCouponMaxCap] = useState<string>('300');
  const [couponActionMsg, setCouponActionMsg] = useState<string | null>(null);
  const [selectedMeterBookingId, setSelectedMeterBookingId] = useState<string>('KC-88429');

  const handleToggleCouponSystem = () => {
    const nextState = !couponSystemActive;
    setCouponSystemEnabled(nextState);
    setCouponSystemActive(nextState);
    setCouponActionMsg(
      `Master Coupon Engine is now ${nextState ? '🟢 ENABLED (Customers can apply promo codes)' : '🔴 DISABLED (Promo codes paused systemwide)'}`
    );
  };

  const handleToggleCouponActive = (c: CouponDefinition) => {
    const updated = upsertCoupon({
      ...c,
      isActive: !c.isActive,
    });
    setCoupons(getAllCoupons());
    setCouponActionMsg(`✓ Promo code '${updated.code}' status changed to ${updated.isActive ? '🟢 Active' : '⚪ Inactive'}.`);
  };

  const handleDeleteCouponSubmit = (code: string) => {
    if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to permanently delete coupon '${code}'?`)) {
      deleteCoupon(code);
      setCoupons(getAllCoupons());
      setCouponActionMsg(`🗑️ Promo code '${code}' deleted successfully.`);
    }
  };

  const handleGenerateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponActionMsg(null);

    const cleanCode = newCouponCode.trim().toUpperCase();
    if (!cleanCode) {
      setCouponActionMsg('⚠️ Please enter a valid coupon code (e.g. SUMMER20).');
      return;
    }

    const val = parseFloat(newCouponValue);
    if (isNaN(val) || val <= 0) {
      setCouponActionMsg('⚠️ Please enter a valid discount value greater than 0.');
      return;
    }

    const isUnl = newCouponLimitType === 'UNLIMITED';
    const maxUses = parseInt(newCouponMaxUses, 10) || 100;
    const minFare = parseFloat(newCouponMinFare) || 0;
    const maxCap = parseFloat(newCouponMaxCap) || 500;

    const created = upsertCoupon({
      code: cleanCode,
      isActive: true,
      discountType: newCouponType,
      discountValue: val,
      isUnlimited: isUnl,
      totalUsageLimit: isUnl ? 999999 : maxUses,
      minBookingAmount: minFare,
      maxDiscount: maxCap,
    });

    setCoupons(getAllCoupons());
    setCouponActionMsg(`✓ Promo code '${created.code}' generated successfully (${created.discountType === 'PERCENTAGE' ? `${created.discountValue}% OFF` : `₹${created.discountValue} OFF`}, ${isUnl ? 'Unlimited Redemptions' : `Limit: ${created.totalUsageLimit} uses`})!`);
    setShowAddCouponModal(false);
    setNewCouponCode('');
    setNewCouponValue('15');
    setNewCouponMinFare('500');
    setNewCouponMaxCap('300');
    setNewCouponMaxUses('100');
  };

  // Admin Booking Cancellation State
  const [cancelBookingModalTarget, setCancelBookingModalTarget] = useState<any | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const [adminActionGlobalMsg, setAdminActionGlobalMsg] = useState<string | null>(null);

  const handleConfirmCancelBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelBookingModalTarget) return;

    const res = cancelBookingByAdmin(cancelBookingModalTarget.id, cancellationReasonInput, 'Super Admin');
    if (!res.success) {
      setAdminActionGlobalMsg(`⚠️ ${res.error || 'Failed to cancel booking.'}`);
      setCancelBookingModalTarget(null);
      return;
    }

    setAdminActionGlobalMsg(`✓ Booking ${res.booking?.bookingReference} (${res.booking?.customerName}) has been cancelled successfully.`);
    setCancelBookingModalTarget(null);
    setCancellationReasonInput('');
    setBookings(getAdminBookings());
  };

  const handleRecordCustomerPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentActionMsg(null);

    if (!recordPaymentBookingId) {
      setPaymentActionMsg('⚠️ Please select a valid booking reference.');
      return;
    }

    const amt = parseFloat(recordPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentActionMsg('⚠️ Please enter a valid payment amount.');
      return;
    }

    const res = recordCustomerPayment(
      recordPaymentBookingId,
      recordPaymentType,
      amt,
      recordPaymentMethod,
      recordPaymentTxnRef,
      recordPaymentNotes,
      'Super Admin'
    );

    if (!res.success) {
      setPaymentActionMsg(`⚠️ ${res.error || 'Failed to record payment.'}`);
      return;
    }

    setPaymentActionMsg(`✓ Payment of ₹${amt} successfully recorded for booking ${res.booking?.bookingReference}!`);
    setShowRecordPaymentModal(false);
    setRecordPaymentBookingId('');
    setRecordPaymentAmount('');
    setRecordPaymentTxnRef('');
    setRecordPaymentNotes('');
    setBookings(getAdminBookings());
  };

  const handleExportPaymentsCsv = () => {
    const filtered = bookings.filter((b) => {
      const q = paymentSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.toLowerCase().includes(q) ||
        b.bookingReference.toLowerCase().includes(q) ||
        b.pickupAddress.toLowerCase().includes(q) ||
        b.dropAddress.toLowerCase().includes(q) ||
        (b.assignedDriverName && b.assignedDriverName.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      const advance = b.advancePaid || 0;
      const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, (b.estimatedFare || 0) + (b.tollCharges || 0) - advance);

      if (paymentFilterStatus === 'ONLINE' || paymentFilterStatus === 'ADVANCE') return advance > 0;
      if (paymentFilterStatus === 'DRIVER_CASH') return b.status === 'COMPLETED' || remaining === 0;
      if (paymentFilterStatus === 'PENDING') return remaining > 0;
      return true;
    });

    const headers = [
      'Booking Ref',
      'Trip Start Date & Time',
      'Trip End Date & Time',
      'Customer Name',
      'Customer Phone',
      'Pickup & Drop Route',
      'Status',
      'Base Fare (INR)',
      'Toll Charges (INR)',
      'Net Total Fare (INR)',
      'Advance Deposit (INR)',
      'Remaining Balance (INR)',
      'Payment Status',
    ];
    const rows = filtered.map((b) => {
      const advance = b.advancePaid || 0;
      const toll = b.tollCharges || 0;
      const total = (b.estimatedFare || 0) + toll;
      const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, total - advance);
      const pStatus = remaining === 0 ? 'FULLY PAID' : (advance > 0 ? 'PARTIAL ADVANCE' : 'UNPAID');

      const tripStartDate = b.tripStartedAt
        ? new Date(b.tripStartedAt).toLocaleString('en-IN')
        : (b.pickupTime || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'));

      const tripEndDate = b.tripCompletedAt
        ? new Date(b.tripCompletedAt).toLocaleString('en-IN')
        : (b.status === 'COMPLETED'
            ? (b.tollEnteredAt ? new Date(b.tollEnteredAt).toLocaleString('en-IN') : 'Completed')
            : (b.status === 'CANCELLED' ? 'Cancelled' : 'Ongoing / Scheduled'));

      return [
        b.bookingReference,
        `"${tripStartDate.replace(/"/g, '""')}"`,
        `"${tripEndDate.replace(/"/g, '""')}"`,
        `"${b.customerName.replace(/"/g, '""')}"`,
        `"${b.customerPhone}"`,
        `"${b.pickupAddress} to ${b.dropAddress}"`,
        b.status,
        b.estimatedFare || 0,
        toll,
        total,
        advance,
        remaining,
        pStatus,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kandy_Cabs_Customer_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Per-booking vendor dispatch form state
  const [vendorDispatchState, setVendorDispatchState] = useState<
    Record<
      string,
      {
        vendorId: string;
        driverName: string;
        driverPhone: string;
        vehicleModel: string;
        vehicleRegistration: string;
      }
    >
  >({});

  const [autoSendItineraryOnDispatch, setAutoSendItineraryOnDispatch] = useState<Record<string, boolean>>({});

  const getEnrichedItineraryBooking = (b: any) => {
    const currentDispatch = vendorDispatchState[b.id] || {
      vendorId: b.vendorId || vendors[0]?.id || 'vnd_durga',
      driverName: b.assignedDriverName || 'Suresh Gowda',
      driverPhone: b.driverPhone || '9900887777',
      vehicleModel: b.vehicleModel || 'Swift Dzire',
      vehicleRegistration: b.assignedVehicleReg || 'KA 19 C 4829',
    };

    const selectedVendor = vendors.find((v) => v.id === currentDispatch.vendorId) || vendors[0];

    const enriched = {
      ...b,
      bookingReference: b.bookingReference || b.id,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail || 'N/A',
      serviceType: b.tripMode || b.serviceType || 'Outstation Cab Service',
      pickupAddress: b.pickupAddress || b.pickupLocation,
      dropAddress: b.dropAddress || b.dropLocation,
      pickupTime: b.pickupTime,
      pickupDate: b.pickupDate,
      estimatedFare: b.estimatedFare || b.estimatedPrice || 0,
      advancePaid: b.advancePaid !== undefined ? b.advancePaid : (b.advanceAmount || 0),
      remainingFare: b.remainingFare !== undefined ? b.remainingFare : Math.max(0, (b.estimatedFare || 0) + (b.tollCharges || 0) - (b.advancePaid || 0)),
      vendorAgencyName: b.vendorAgencyName || (selectedVendor ? selectedVendor.agencyName : 'Sri Durga Travels & Cab Service'),
      assignedDriverName: currentDispatch.driverName || b.assignedDriverName || 'Suresh Gowda',
      driverName: currentDispatch.driverName || b.assignedDriverName || 'Suresh Gowda',
      driverPhone: currentDispatch.driverPhone || b.driverPhone || '9900887777',
      assignedDriverPhone: currentDispatch.driverPhone || b.driverPhone || '9900887777',
      vehicleName: currentDispatch.vehicleModel || b.vehicleModel || b.vehicleName || 'Swift Dzire',
      vehicleModel: currentDispatch.vehicleModel || b.vehicleModel || 'Swift Dzire',
      vehicleType: currentDispatch.vehicleModel || b.vehicleModel || 'Swift Dzire (AC Sedan) 4+1 Seater',
      carType: currentDispatch.vehicleModel || b.vehicleModel || 'Swift Dzire (AC Sedan)',
      assignedVehicleReg: currentDispatch.vehicleRegistration || b.assignedVehicleReg || 'KA 19 C 4829',
      assignedVehicleNo: currentDispatch.vehicleRegistration || b.assignedVehicleReg || 'KA 19 C 4829',
    };

    // Store live edits in localStorage for instant PDF sync
    try {
      if (typeof window !== 'undefined') {
        const edits = JSON.parse(localStorage.getItem('kc_live_dispatch_edits') || '{}');
        edits[b.id] = enriched;
        if (b.bookingReference) edits[b.bookingReference] = enriched;
        localStorage.setItem('kc_live_dispatch_edits', JSON.stringify(edits));
      }
    } catch {}

    return enriched;
  };

  const triggerDirectWhatsAppItinerary = (b: any) => {
    const enriched = getEnrichedItineraryBooking(b);
    let customerPhone = (enriched.customerPhone || b.customerPhone || '').replace(/[^0-9]/g, '');
    if (customerPhone.length === 10) customerPhone = '91' + customerPhone;
    if (!customerPhone) {
      alert('Valid customer phone number is required to send WhatsApp itinerary.');
      return;
    }

    const bId = enriched.bookingReference || enriched.id || 'KC-1001';
    const cleanId = encodeURIComponent(bId.replace(/[^a-zA-Z0-9-]/g, ''));
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    // Direct Access Link for Customer to View Itinerary
    const itineraryViewUrl = `${origin}/itinerary/${cleanId}`;

    const cName = enriched.customerName || 'Valued Guest';
    const sType = enriched.serviceType || 'Outstation Cab Service';
    const pTime = enriched.pickupTime || 'As Scheduled';
    const pick = enriched.pickupAddress || 'Mangaluru';
    const drop = enriched.dropAddress || 'Destination';
    const vName = enriched.vehicleName || 'Swift Dzire';
    const vReg = enriched.assignedVehicleReg || 'KA 19 C 4829';
    const dName = enriched.assignedDriverName || 'Suresh Gowda';
    const dPhone = enriched.driverPhone || '9900887777';
    const vAgency = enriched.vendorAgencyName || 'Sri Durga Travels';
    const estFare = enriched.estimatedFare || 0;
    const advPaid = enriched.advancePaid || 0;
    const balDue = enriched.remainingFare || Math.max(0, estFare - advPaid);

    const message = `*📄 KANDY CABS - OFFICIAL TRAVEL ITINERARY*
----------------------------------------
*Booking Ref:* ${bId}
*Dear Guest:* ${cName}

*📍 TRIP & ROUTE DETAILS*
*Service:* ${sType}
*Reporting Time:* ${pTime}
*Pickup Location:* ${pick}
*Drop Destination:* ${drop}

*🚙 CHAUFFEUR & VEHICLE ASSIGNED*
*Vehicle:* ${vName} (${vReg})
*Chauffeur:* ${dName} (📞 ${dPhone})
*Travel Desk:* ${vAgency}

----------------------------------------
*💰 FARE SUMMARY*
*Total Fare:* ₹${estFare.toLocaleString('en-IN')}
*Advance Paid:* ₹${advPaid.toLocaleString('en-IN')}
*Balance Payable to Driver:* ₹${balDue.toLocaleString('en-IN')}

----------------------------------------
*📲 VIEW OFFICIAL ONLINE ITINERARY:*
${itineraryViewUrl}

----------------------------------------
*📞 24x7 Customer Helpline:* +91 96068 53535 / +91 90080 90090
Thank you for choosing *KANDY CABS*! Have a safe and pleasant journey!`;

    if (typeof window !== 'undefined') {
      // Send directly to Customer's WhatsApp
      const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorAgencyName || !newVendorContactPerson || !newVendorPhone) {
      setVendorMsg('⚠️ Please fill in Agency Name, Contact Person, and Phone.');
      return;
    }

    const record = addVendorPartner(
      {
        agencyName: newVendorAgencyName,
        contactPerson: newVendorContactPerson,
        phone: newVendorPhone,
        email: newVendorEmail || `${newVendorAgencyName.toLowerCase().replace(/\s+/g, '')}@travels.in`,
        city: newVendorCity || 'Mangaluru',
        fleetTypes: newVendorFleetTypes || 'Sedan, SUV, Ertiga',
        status: 'ACTIVE',
      },
      'Super Admin'
    );

    setVendors(getAllVendorPartners());
    setAuditLogs(getAuditLogs());
    setVendorMsg(`✓ Vendor Partner '${record.agencyName}' registered successfully!`);
    setShowAddVendorModal(false);
    setNewVendorAgencyName('');
    setNewVendorContactPerson('');
    setNewVendorPhone('');
    setNewVendorEmail('');
    setNewVendorCity('');
    setNewVendorFleetTypes('');
  };

  const handleVendorDispatchSubmit = (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId || b.bookingReference === bookingId);
    
    if (targetBooking && targetBooking.status === 'CANCELLED') {
      const confirmRedispatch = window.confirm(
        `⚠️ NOTE: Booking ${targetBooking.bookingReference} (${targetBooking.customerName}) is currently CANCELLED.\n\nDo you want to continue and re-dispatch this cancelled booking to the driver?`
      );
      if (!confirmRedispatch) return;
    }

    const currentDispatch = vendorDispatchState[bookingId] || {
      vendorId: targetBooking?.vendorId || vendors[0]?.id || 'vnd_durga',
      driverName: targetBooking?.assignedDriverName || 'Suresh Gowda',
      driverPhone: targetBooking?.driverPhone || '9900887777',
      vehicleModel: targetBooking?.vehicleModel || 'Swift Dzire',
      vehicleRegistration: targetBooking?.assignedVehicleReg || 'KA 19 C 4829',
    };

    const targetDriverName = currentDispatch.driverName || targetBooking?.assignedDriverName || 'Suresh Gowda';
    const targetDriverPhone = currentDispatch.driverPhone || targetBooking?.driverPhone || '9900887777';
    const targetVehicleModel = currentDispatch.vehicleModel || targetBooking?.vehicleModel || 'Swift Dzire';
    const targetVehicleReg = currentDispatch.vehicleRegistration || targetBooking?.assignedVehicleReg || 'KA 19 C 4829';

    const selectedVendor = vendors.find((v) => v.id === currentDispatch.vendorId) || vendors[0];
    const vendorAgencyName = selectedVendor ? selectedVendor.agencyName : 'Sri Durga Travels & Cab Service';

    const res = assignVendorDriverToBooking(
      bookingId,
      currentDispatch.vendorId || selectedVendor.id,
      vendorAgencyName,
      targetDriverName,
      targetDriverPhone,
      targetVehicleModel,
      targetVehicleReg,
      'admin_super',
      'Super Admin'
    );

    if (!res.success) {
      setDispatchMsg(`⚠️ ${res.error || 'Dispatch failed'}`);
      return;
    }

    setBookings(getAdminBookings());
    setAuditLogs(getAuditLogs());
    setDispatchMsg(
      `✓ Successfully re-dispatched trip ${res.booking?.bookingReference} to Driver '${targetDriverName}' (${targetDriverPhone})!`
    );

    // Auto-send WhatsApp Travel Itinerary if checkbox is enabled (default checked)
    if (autoSendItineraryOnDispatch[bookingId] !== false) {
      const updatedBooking = getAdminBookings().find((b) => b.id === bookingId || b.bookingReference === bookingId) || res.booking;
      if (updatedBooking) {
        setItineraryBooking(getEnrichedItineraryBooking(updatedBooking));
        triggerDirectWhatsAppItinerary(updatedBooking);
      }
    }
  };

  const handleDriverSelectionForBooking = (bookingId: string, selectedDriver: DriverAccountRecord) => {
    const matchingVendor = vendors.find(
      (v) =>
        v.id === selectedDriver.vendorId ||
        v.agencyName.toLowerCase() === selectedDriver.vendorAgencyName?.toLowerCase()
    );

    const vehicleModel =
      selectedDriver.vehicleModel ||
      (selectedDriver.fullName.includes('Ramesh')
        ? 'Toyota Ertiga'
        : selectedDriver.fullName.includes('Ganesh')
        ? 'Innova Crysta'
        : 'Swift Dzire');

    setVendorDispatchState((prev) => ({
      ...prev,
      [bookingId]: {
        vendorId: matchingVendor ? matchingVendor.id : (prev[bookingId]?.vendorId || vendors[0]?.id || 'vnd_durga'),
        driverName: selectedDriver.fullName,
        driverPhone: selectedDriver.phone,
        vehicleModel,
        vehicleRegistration: selectedDriver.vehicleRegistration,
      },
    }));
  };

  // Location Form State
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCategory, setNewLocCategory] = useState<'AIRPORT' | 'RAILWAY_STATION' | 'POPULAR_DESTINATION' | 'TEMPLE_OUTSTATION' | 'INTERCITY'>('POPULAR_DESTINATION');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocLat, setNewLocLat] = useState(13.0);
  const [newLocLng, setNewLocLng] = useState(74.8);
  const [newLocDist, setNewLocDist] = useState(50);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Driver Password & Registration State
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [driverMsg, setDriverMsg] = useState<string | null>(null);

  // Add Driver Form State
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverUsername, setNewDriverUsername] = useState('');
  const [newDriverPasswordForm, setNewDriverPasswordForm] = useState('');
  const [newDriverVehicleReg, setNewDriverVehicleReg] = useState('');
  const [newDriverLicenseNo, setNewDriverLicenseNo] = useState('');
  const [newDriverVendorAgency, setNewDriverVendorAgency] = useState('Sri Durga Travels & Cab Service');

  const refreshLocations = () => {
    setLocations(getAllLocationsAdmin());
  };

  const handleToggleShowPassword = (driverId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [driverId]: !prev[driverId] }));
  };

  const handleUpdateDriverPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId || !newDriverPassword) return;

    const res = setDriverPassword(selectedDriverId, newDriverPassword, 'Super Admin');
    if (!res.success) {
      setDriverMsg(`⚠️ ${res.error || 'Failed to update password'}`);
      return;
    }

    setDrivers(getAllDriverAccounts());
    setAuditLogs(getAuditLogs());
    setDriverMsg(`✓ Password updated successfully for ${res.driver?.fullName}!`);
    setSelectedDriverId(null);
    setNewDriverPassword('');
  };

  const handleAddDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone || !newDriverPasswordForm || !newDriverVehicleReg) {
      setDriverMsg('⚠️ Please fill in Driver Name, Phone, Password, and Vehicle Registration.');
      return;
    }

    const newRecord = addDriverAccount(
      {
        fullName: newDriverName,
        phone: newDriverPhone,
        username: newDriverUsername || newDriverName.toLowerCase().replace(/\s+/g, ''),
        password: newDriverPasswordForm,
        vehicleRegistration: newDriverVehicleReg,
        licenseNumber: newDriverLicenseNo || `KA19-${Date.now().toString().slice(-6)}`,
        vendorAgencyName: newDriverVendorAgency || 'Sri Durga Travels & Cab Service',
      },
      'Super Admin'
    );

    // Automatically mark matching application as ONBOARDED so it disappears from incoming pending list
    try {
      const cleanP = newDriverPhone.replace(/\D/g, '');
      const reqs = getDriverPartnerRequests();
      const match = reqs.find(
        (r) =>
          r.phone === newDriverPhone ||
          (cleanP.length >= 10 && r.phone.replace(/\D/g, '') === cleanP) ||
          r.name.toLowerCase().trim() === newDriverName.toLowerCase().trim()
      );
      if (match) {
        updateDriverPartnerRequestStatus(match.id, 'ONBOARDED');
      }
      setDriverRequests(getDriverPartnerRequests());
    } catch {}

    setDrivers(getAllDriverAccounts());
    setAuditLogs(getAuditLogs());
    setDriverMsg(`✓ New driver '${newRecord.fullName}' (${newRecord.vendorAgencyName}) registered successfully with password!`);
    setShowAddDriverModal(false);
    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverUsername('');
    setNewDriverPasswordForm('');
    setNewDriverVehicleReg('');
    setNewDriverLicenseNo('');
  };

  // Edit Driver Form State
  const [editDriverTarget, setEditDriverTarget] = useState<DriverAccountRecord | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverUsername, setEditDriverUsername] = useState('');
  const [editDriverPassword, setEditDriverPassword] = useState('');
  const [editDriverVehicleReg, setEditDriverVehicleReg] = useState('');
  const [editDriverVehicleModel, setEditDriverVehicleModel] = useState('');
  const [editDriverLicenseNo, setEditDriverLicenseNo] = useState('');
  const [editDriverVendorAgency, setEditDriverVendorAgency] = useState('Sri Durga Travels & Cab Service');

  const handleOpenEditDriver = (driver: DriverAccountRecord) => {
    setEditDriverTarget(driver);
    setEditDriverName(driver.fullName);
    setEditDriverPhone(driver.phone);
    setEditDriverUsername(driver.username || '');
    setEditDriverPassword(driver.password || '');
    setEditDriverVehicleReg(driver.vehicleRegistration || '');
    setEditDriverVehicleModel(driver.vehicleModel || '');
    setEditDriverLicenseNo(driver.licenseNumber || '');
    setEditDriverVendorAgency(driver.vendorAgencyName || 'Sri Durga Travels & Cab Service');
    setSelectedDriverId(null);
    setShowAddDriverModal(false);
    setDriverMsg(null);
  };

  const handleUpdateDriverDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDriverTarget) return;

    const res = updateDriverAccount(
      editDriverTarget.id,
      {
        fullName: editDriverName,
        phone: editDriverPhone,
        username: editDriverUsername,
        password: editDriverPassword,
        vehicleRegistration: editDriverVehicleReg,
        vehicleModel: editDriverVehicleModel,
        licenseNumber: editDriverLicenseNo,
        vendorAgencyName: editDriverVendorAgency,
      },
      'Super Admin'
    );

    if (!res.success) {
      setDriverMsg(`⚠️ ${res.error || 'Failed to update driver details'}`);
      return;
    }

    setDrivers(getAllDriverAccounts());
    setAuditLogs(getAuditLogs());
    setDriverMsg(`✓ Driver details for '${res.driver?.fullName}' updated successfully!`);
    setEditDriverTarget(null);
  };

  const handleDeleteDriverSubmit = (driverId: string, driverName: string) => {
    if (!window.confirm(`Are you sure you want to delete the chauffeur account for '${driverName}'?`)) return;

    const res = deleteDriverAccount(driverId, 'Super Admin');
    if (!res.success) {
      setDriverMsg(`⚠️ ${res.error || 'Failed to delete driver'}`);
      return;
    }

    setDrivers(getAllDriverAccounts());
    setAuditLogs(getAuditLogs());
    setDriverMsg(`✓ Chauffeur account for '${driverName}' deleted successfully.`);
    if (editDriverTarget?.id === driverId) {
      setEditDriverTarget(null);
    }
  };

  const handleDeleteDriverRequest = async (requestId: string, applicantName: string) => {
    if (!window.confirm(`Are you sure you want to delete the driver application for '${applicantName}'?`)) return;

    try {
      await fetch(`/api/driver-applications?id=${encodeURIComponent(requestId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete driver application:', e);
    }

    updateDriverPartnerRequestStatus(requestId, 'REJECTED');
    setDriverRequests((prev) => prev.filter((r) => r.id !== requestId));
    setDriverMsg(`✓ Driver partner application for '${applicantName}' deleted successfully.`);
  };

  const handleAddLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName || !newLocAddress) return;

    addMangaluruLocation({
      displayName: newLocName,
      searchName: `${newLocName} ${newLocAddress}`.toLowerCase(),
      category: newLocCategory,
      address: newLocAddress,
      latitude: newLocLat,
      longitude: newLocLng,
      distanceKmFromMangaluru: newLocDist,
      displayOrder: locations.length + 1,
      isPopular: true,
      isActive: true,
    });

    recordAuditLog({
      adminId: 'admin_super',
      adminName: 'Super Admin',
      action: 'ADD_LOCATION',
      targetType: 'LOCATION',
      targetId: newLocName,
      details: `Added new coastal Karnataka location: ${newLocName} (${newLocAddress})`,
    });

    refreshLocations();
    setAuditLogs(getAuditLogs());
    setSuccessMsg(`Location '${newLocName}' created successfully!`);
    setShowAddLocationModal(false);
    setNewLocName('');
    setNewLocAddress('');
  };

  const handleToggleLocationActive = (id: string, currentActive: boolean) => {
    updateMangaluruLocation(id, { isActive: !currentActive });
    recordAuditLog({
      adminId: 'admin_super',
      adminName: 'Super Admin',
      action: 'TOGGLE_LOCATION',
      targetType: 'LOCATION',
      targetId: id,
      details: `Updated location ${id} active state to ${!currentActive}`,
    });
    refreshLocations();
    setAuditLogs(getAuditLogs());
    setSuccessMsg('Location active status updated.');
  };

  const handleMoveLocationOrder = (index: number, direction: 'UP' | 'DOWN') => {
    const list = [...locations];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const orderedIds = list.map((l) => l.id);
    reorderLocations(orderedIds);

    recordAuditLog({
      adminId: 'admin_super',
      adminName: 'Super Admin',
      action: 'REORDER_LOCATIONS',
      targetType: 'LOCATION',
      targetId: 'all',
      details: 'Reordered Mangaluru one-way destination priority',
    });

    refreshLocations();
    setAuditLogs(getAuditLogs());
    setSuccessMsg('Location display order reordered.');
  };

  if (!isAdminAuthenticated) {
    return (
      <section className="sec" style={{ padding: '60px 0' }}>
        <Container>
          <Card padded style={{ maxWidth: '440px', margin: '0 auto', background: '#fff', boxShadow: 'var(--sh-m)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}>
                <KandyCabsLogo width={180} height={52} variant="light" />
              </div>
              <span className="pill orange" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Restricted Command System
              </span>
              <h2 className="h2" style={{ marginTop: '8px' }}>Admin Console Login</h2>
              <p className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                Enter admin credentials to unlock the Master Operations Console.
              </p>
            </div>

            {adminAuthError && (
              <div
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-m)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ⚠️ {adminAuthError}
              </div>
            )}

            <form onSubmit={handleAdminAuthSubmit}>
              <div className="fld">
                <label htmlFor="admin-user-input">Admin Username</label>
                <input
                  id="admin-user-input"
                  type="text"
                  placeholder="kandycabs"
                  value={adminUserInput}
                  onChange={(e) => setAdminUserInput(e.target.value)}
                  required
                />
              </div>

              <div className="fld" style={{ marginTop: '14px' }}>
                <label htmlFor="admin-pass-input">Admin Password</label>
                <input
                  id="admin-pass-input"
                  type="password"
                  placeholder="kandycabs123"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginTop: '12px', background: 'var(--accent-soft)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--accent)' }}>
                💡 <b>Admin Passcode Credentials:</b><br />
                Username: <code>kandycabs</code> · Password: <code>kandycabs123</code>
              </div>

              <div style={{ marginTop: '22px' }}>
                <Button type="submit" variant="accent" fullWidth>
                  🔓 Unlock Admin Master Console
                </Button>
              </div>
            </form>
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="sec" style={{ padding: '20px 0 60px' }}>
      <Container>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="pill green">Mangaluru Control Console</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '12px' }}>
                👨‍✈️ {drivers.length} Registered Chauffeurs
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', background: 'var(--green-soft)', padding: '2px 8px', borderRadius: '12px' }}>
                🚗 Direct Fleet Operations
              </span>
            </div>
            <h1 className="h2" style={{ marginTop: '4px' }}>Admin Operations & Fleet Master Console</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button href="/booking" variant="primary" style={{ fontSize: '13px', background: '#2563EB', borderColor: '#2563EB', color: '#fff' }}>
              🚗 Book a Ride as Admin
            </Button>
            <Button href="/" variant="ghost" style={{ fontSize: '13px' }}>
              🌐 Main Website
            </Button>
            <Button onClick={handleLockConsole} variant="primary" style={{ fontSize: '12.5px', background: '#DC2626', borderColor: '#DC2626' }}>
              🔒 Lock Console
            </Button>
          </div>
        </div>

        {/* Live Driver Duty Status Alert Banner */}
        {liveDriverAlert && (
          <div
            style={{
              background: liveDriverAlert.includes('ONLINE') ? 'var(--green-soft)' : '#FEE2E2',
              color: liveDriverAlert.includes('ONLINE') ? 'var(--green)' : '#991B1B',
              padding: '10px 14px',
              borderRadius: 'var(--r-m)',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
          >
            <span>{liveDriverAlert}</span>
            <button
              type="button"
              onClick={() => setLiveDriverAlert(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Success Alert */}
        {successMsg && (
          <div style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '10px 14px', borderRadius: 'var(--r-m)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            ✓ {successMsg}
          </div>
        )}

        {adminActionGlobalMsg && (
          <div
            style={{
              background: adminActionGlobalMsg.startsWith('⚠️') ? '#FEE2E2' : '#D1FAE5',
              color: adminActionGlobalMsg.startsWith('⚠️') ? '#991B1B' : '#065F46',
              padding: '10px 14px',
              borderRadius: 'var(--r-m)',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{adminActionGlobalMsg}</span>
            <button
              type="button"
              onClick={() => setAdminActionGlobalMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Master Console Navigation Bar */}
        <div className="search-tabs" style={{ marginBottom: '16px', background: '#fff', padding: '4px', borderRadius: 'var(--r-m)', overflowX: 'auto' }}>
          {[
            { id: 'BOOKINGS', label: '📋 Bookings & Dispatch' },
            { id: 'DRIVERS', label: '👨‍✈️ Driver Accounts' },
            { id: 'DRIVER_REQUESTS', label: '📥 Driver Requests & Onboarding' },
            { id: 'LOCATIONS', label: '📍 Mangaluru Locations CRUD' },
            { id: 'MAP', label: '🗺️ Live Fleet GPS' },
            { id: 'METER', label: '📸 Meter Evidence' },
            { id: 'VEHICLES', label: '🚗 Vehicles Fleet' },
            { id: 'PRICING', label: '🏷️ Pricing Rules' },
            { id: 'COUPONS', label: '🎟️ Coupons' },
            { id: 'PAYMENTS', label: '💳 Payments' },
            { id: 'SETTINGS', label: '⚙️ Settings' },
            { id: 'AUDIT', label: '📜 Audit Logs' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id as any)}
              style={{ fontSize: '12px', padding: '8px 10px', whiteSpace: 'nowrap' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: DRIVER ACCOUNTS */}
        {activeTab === 'DRIVERS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="h3" style={{ margin: 0 }}>Chauffeur Accounts</h3>
                <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Manage driver credentials, passwords, and vehicle registration numbers.
                </p>
              </div>
              <Button onClick={() => { setShowAddDriverModal(true); setDriverMsg(null); }} variant="accent" style={{ fontSize: '12px' }}>
                ➕ Register New Driver
              </Button>
            </div>

            {/* Incoming Driver Join Requests from Contact Page (Only show un-registered/pending applicants) */}
            {(() => {
              const allReqs = (driverRequests && driverRequests.length > 0) ? driverRequests : getDriverPartnerRequests();
              const pendingReqs = allReqs.filter((r: any) => {
                if (r.status === 'ONBOARDED' || r.status === 'REJECTED') return false;
                const rCleanP = (r.phone || '').replace(/\D/g, '').slice(-10);
                const rCleanN = (r.name || '').toLowerCase().trim();
                const isAlreadyRegistered = drivers.some((d) => {
                  const dCleanP = (d.phone || '').replace(/\D/g, '').slice(-10);
                  const dCleanN = (d.fullName || '').toLowerCase().trim();
                  return (rCleanP && dCleanP && rCleanP === dCleanP) || (rCleanN && dCleanN && rCleanN === dCleanN);
                });
                return !isAlreadyRegistered;
              });

              if (!pendingReqs || pendingReqs.length === 0) return null;
              return (
                <Card padded style={{ background: '#EFF6FF', border: '1px solid #93C5FD', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 className="h4" style={{ color: '#1E40AF', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📥</span>
                      <span>Incoming Driver Partner Applications (Pending Onboarding)</span>
                    </h4>
                    <span style={{ background: '#2563EB', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                      {pendingReqs.length} Pending
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', background: '#fff', borderRadius: '8px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #BFDBFE', background: '#DBEAFE', color: '#1E3A8A' }}>
                          <th style={{ padding: '8px' }}>Applicant Name</th>
                          <th style={{ padding: '8px' }}>Mobile Number</th>
                          <th style={{ padding: '8px' }}>Hub / City</th>
                          <th style={{ padding: '8px' }}>Vehicle Details</th>
                          <th style={{ padding: '8px' }}>Applied Date</th>
                          <th style={{ padding: '8px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingReqs.map((r: any) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px', fontWeight: 700, color: '#1E293B' }}>{r.name}</td>
                            <td style={{ padding: '8px', fontWeight: 700, color: '#2563EB' }}>📱 {r.phone}</td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>📍 {r.city}</td>
                            <td style={{ padding: '8px', color: '#64748B' }}>{r.vehicleDetails || 'N/A'}</td>
                            <td style={{ padding: '8px', fontSize: '11px', color: '#64748B' }}>{new Date(r.createdAt || Date.now()).toLocaleString()}</td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <a
                                  href={`tel:${r.phone}`}
                                  className="btn btn-g"
                                  style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}
                                >
                                  📞 Call Driver
                                </a>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setShowAddDriverModal(true);
                                    setNewDriverName(r.name);
                                    setNewDriverPhone(r.phone);
                                    setDriverMsg(`Pre-filled registration form for driver applicant '${r.name}' (${r.phone}).`);
                                  }}
                                  variant="accent"
                                  style={{ fontSize: '11px', padding: '4px 8px' }}
                                >
                                  ➕ Onboard Driver
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => handleDeleteDriverRequest(r.id, r.name)}
                                  style={{ fontSize: '11px', padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })()}

            {driverMsg && (
              <div style={{ background: driverMsg.startsWith('⚠️') ? '#FEE2E2' : 'var(--green-soft)', color: driverMsg.startsWith('⚠️') ? '#991B1B' : 'var(--green)', padding: '10px 14px', borderRadius: 'var(--r-m)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                {driverMsg}
              </div>
            )}

            {/* Add New Driver Modal Form */}
            {showAddDriverModal && (
              <Card padded style={{ background: '#ECFDF5', border: '1px solid var(--green)', marginBottom: '20px' }}>
                <h4 className="h4" style={{ color: '#065F46', marginTop: 0 }}>
                  ➕ Register New Chauffeur Account
                </h4>
                <form onSubmit={handleAddDriverSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="fld">
                    <label style={{ color: '#065F46', fontSize: '12px' }}>Driver Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Praveen Kumar"
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#065F46', fontSize: '12px' }}>Mobile Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9845998877"
                      value={newDriverPhone}
                      onChange={(e) => setNewDriverPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#065F46', fontSize: '12px' }}>Username (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. praveen"
                      value={newDriverUsername}
                      onChange={(e) => setNewDriverUsername(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#065F46', fontSize: '12px' }}>Login Password</label>
                    <input
                      type="text"
                      placeholder="e.g. praveen2026"
                      value={newDriverPasswordForm}
                      onChange={(e) => setNewDriverPasswordForm(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#065F46', fontSize: '12px' }}>Vehicle Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. KA 19 C 7788"
                      value={newDriverVehicleReg}
                      onChange={(e) => setNewDriverVehicleReg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld" style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: '#065F46', fontSize: '12px' }}>Commercial License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. KA19-2023-00998"
                      value={newDriverLicenseNo}
                      onChange={(e) => setNewDriverLicenseNo(e.target.value)}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <Button type="submit" variant="accent">
                      Register New Driver 🚗
                    </Button>
                    <Button type="button" onClick={() => setShowAddDriverModal(false)} variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Change Password Modal Form */}
            {selectedDriverId && (
              <Card padded style={{ background: '#FFFBEB', border: '1px solid #FCD34D', marginBottom: '20px' }}>
                <h4 className="h4" style={{ color: '#92400E', marginTop: 0 }}>
                  🔑 Set New Password for Driver
                </h4>
                {(() => {
                  const d = drivers.find((item) => item.id === selectedDriverId);
                  return (
                    <form onSubmit={handleUpdateDriverPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                      <div style={{ fontSize: '13px', color: '#78350F' }}>
                        Driver: <b>{d?.fullName}</b> (Mobile: <code>{d?.phone}</code>)
                      </div>
                      <div className="fld">
                        <label style={{ color: '#92400E', fontSize: '12px' }}>New Driver Password</label>
                        <input
                          type="text"
                          placeholder="Enter new password (e.g. suresh2026)"
                          value={newDriverPassword}
                          onChange={(e) => setNewDriverPassword(e.target.value)}
                          required
                          style={{ fontSize: '14px', fontWeight: 600 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <Button type="submit" variant="accent">
                          Save & Update Password 🔑
                        </Button>
                        <Button type="button" onClick={() => setSelectedDriverId(null)} variant="ghost">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  );
                })()}
              </Card>
            )}

            {/* Edit Driver Details Modal Form */}
            {editDriverTarget && (
              <Card padded style={{ background: '#F0FDF4', border: '1px solid #22C55E', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 className="h4" style={{ color: '#15803D', margin: 0 }}>
                    ✏️ Edit Driver Details: {editDriverTarget.fullName}
                  </h4>
                  <Button
                    type="button"
                    onClick={() => handleDeleteDriverSubmit(editDriverTarget.id, editDriverTarget.fullName)}
                    style={{ fontSize: '11px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', padding: '4px 8px' }}
                  >
                    🗑️ Delete Chauffeur Account
                  </Button>
                </div>
                <form onSubmit={handleUpdateDriverDetailsSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Driver Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Praveen Kumar"
                      value={editDriverName}
                      onChange={(e) => setEditDriverName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Mobile Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9845998877"
                      value={editDriverPhone}
                      onChange={(e) => setEditDriverPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Username</label>
                    <input
                      type="text"
                      placeholder="e.g. praveen"
                      value={editDriverUsername}
                      onChange={(e) => setEditDriverUsername(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Login Password</label>
                    <input
                      type="text"
                      placeholder="e.g. praveen2026"
                      value={editDriverPassword}
                      onChange={(e) => setEditDriverPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Vehicle Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. KA 19 C 7788"
                      value={editDriverVehicleReg}
                      onChange={(e) => setEditDriverVehicleReg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Vehicle Model / Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Swift Dzire / Innova Crysta"
                      value={editDriverVehicleModel}
                      onChange={(e) => setEditDriverVehicleModel(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Commercial License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. KA19-2023-00998"
                      value={editDriverLicenseNo}
                      onChange={(e) => setEditDriverLicenseNo(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#15803D', fontSize: '12px' }}>Vendor Agency</label>
                    <select
                      value={editDriverVendorAgency}
                      onChange={(e) => setEditDriverVendorAgency(e.target.value)}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', width: '100%', background: '#fff' }}
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.agencyName}>
                          {v.agencyName} ({v.city})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <Button type="submit" variant="accent">
                      Save Driver Details 💾
                    </Button>
                    <Button type="button" onClick={() => setEditDriverTarget(null)} variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Driver Accounts Table */}
            <Card padded style={{ background: '#fff' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line)', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px' }}>Driver Name</th>
                      <th style={{ padding: '8px' }}>Mobile / Username</th>
                      <th style={{ padding: '8px' }}>Vehicle Reg</th>
                      <th style={{ padding: '8px' }}>License No</th>
                      <th style={{ padding: '8px' }}>Password</th>
                      <th style={{ padding: '8px' }}>Verification Status</th>
                      <th style={{ padding: '8px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '8px', fontWeight: 700, color: 'var(--ink)' }}>
                          {d.fullName}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div>📱 <b>{d.phone}</b></div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Username: <code>{d.username}</code></div>
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{d.vehicleRegistration}</td>
                        <td style={{ padding: '8px', fontSize: '11.5px', color: 'var(--muted)' }}>{d.licenseNumber}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ background: 'var(--bg-soft)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '13px' }}>
                              {showPasswordMap[d.id] ? d.password : '••••••••'}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleToggleShowPassword(d.id)}
                              title={showPasswordMap[d.id] ? 'Hide Password' : 'Show Password'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                            >
                              {showPasswordMap[d.id] ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          {d.verificationStatus === 'APPROVED' ? (
                            <span className="pill green" style={{ fontSize: '11px', fontWeight: 800 }}>
                              ✅ Approved
                            </span>
                          ) : d.verificationStatus === 'REJECTED' ? (
                            <span className="pill red" style={{ fontSize: '11px', fontWeight: 800 }}>
                              ❌ Rejected
                            </span>
                          ) : (
                            <span className="pill yellow" style={{ fontSize: '11px', fontWeight: 800 }}>
                              ⏳ Pending Review
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <Button
                              type="button"
                              onClick={() => {
                                setSelectedInspectionDriver(d);
                                setRejectionReasonInput('');
                              }}
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#8B5CF6', borderColor: '#8B5CF6', color: '#fff', fontWeight: 700 }}
                            >
                              🔍 Inspect Docs & Photos
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleOpenEditDriver(d)}
                              variant="ghost"
                              style={{ fontSize: '11px', padding: '4px 8px', borderColor: '#CBD5E1' }}
                            >
                              ✏️ Edit Driver
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleDeleteDriverSubmit(d.id, d.fullName)}
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}
                            >
                              🗑️ Delete
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setSelectedDriverId(d.id);
                                setNewDriverPassword('');
                                setDriverMsg(null);
                              }}
                              variant="accent"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              🔑 Set Password
                            </Button>
                            <Button
                              href={`/driver/dashboard?driverId=${d.id}`}
                              variant="primary"
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#2563EB', borderColor: '#2563EB', color: '#fff' }}
                            >
                              📋 View Assigned Works ({bookings.filter((b) => (b.assignedDriverName && b.assignedDriverName.toLowerCase() === d.fullName.toLowerCase()) || (b.driverPhone === d.phone)).length})
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {/* Driver Verification & Document Inspection Modal */}
            {selectedInspectionDriver && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.75)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    maxWidth: '850px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                        🛡️ Driver & Vehicle Credentials Inspection
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                        Driver: <b>{selectedInspectionDriver.fullName}</b> (📱 {selectedInspectionDriver.phone}) · Vehicle: <b>{selectedInspectionDriver.vehicleRegistration}</b>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedInspectionDriver(null)}
                      style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800, fontSize: '14px' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Verification Status Banner */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Current Account Status:
                    </span>
                    {selectedInspectionDriver.verificationStatus === 'APPROVED' ? (
                      <span className="pill green" style={{ fontSize: '12px', fontWeight: 800 }}>
                        ✅ APPROVED & VERIFIED
                      </span>
                    ) : selectedInspectionDriver.verificationStatus === 'REJECTED' ? (
                      <span className="pill red" style={{ fontSize: '12px', fontWeight: 800 }}>
                        ❌ VERIFICATION DECLINED
                      </span>
                    ) : (
                      <span className="pill yellow" style={{ fontSize: '12px', fontWeight: 800 }}>
                        ⏳ PENDING ADMIN APPROVAL
                      </span>
                    )}
                  </div>

                  {/* Section 1: Commercial Documents (3) */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                      📄 Commercial Documents (3 Items)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                      {[
                        { title: 'Commercial DL', url: selectedInspectionDriver.documents?.licenseUrl },
                        { title: 'Vehicle RC', url: selectedInspectionDriver.documents?.rcUrl },
                        { title: 'Vehicle Insurance', url: selectedInspectionDriver.documents?.insuranceUrl },
                      ].map((doc, idx) => (
                        <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', background: '#FAFAFA' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>{doc.title}</div>
                          {doc.url ? (
                            <div>
                              <img src={doc.url} alt={doc.title} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1', marginBottom: '6px' }} />
                              <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                                🔗 Open Full Supabase URL
                              </a>
                            </div>
                          ) : (
                            <div style={{ height: '110px', background: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#94A3B8' }}>
                              Not Uploaded Yet
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Permanent Vehicle Photos (5) */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                      🚗 Permanent Vehicle Exterior & Interior Photos (5 Positions)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                      {[
                        { title: 'Front', url: selectedInspectionDriver.vehiclePhotos?.frontUrl },
                        { title: 'Left Side', url: selectedInspectionDriver.vehiclePhotos?.leftUrl },
                        { title: 'Right Side', url: selectedInspectionDriver.vehiclePhotos?.rightUrl },
                        { title: 'Back / Rear', url: selectedInspectionDriver.vehiclePhotos?.backUrl },
                        { title: 'Cabin Interior', url: selectedInspectionDriver.vehiclePhotos?.interiorUrl },
                      ].map((item, idx) => (
                        <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px', background: '#FAFAFA' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{item.title}</div>
                          {item.url ? (
                            <div>
                              <img src={item.url} alt={item.title} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1', marginBottom: '4px' }} />
                              <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                                🔗 View URL
                              </a>
                            </div>
                          ) : (
                            <div style={{ height: '80px', background: '#F1F5F9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', color: '#94A3B8' }}>
                              Pending
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Rejection Reason Input (If Rejecting) */}
                  <div style={{ marginBottom: '20px', background: '#FFFBEB', padding: '12px', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>
                      Feedback / Rejection Reason (Required only if declining verification)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Driving Licence image is blurred or expired. Please re-upload clear front photo."
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #F59E0B' }}
                    />
                  </div>

                  {/* Section 4: Approval / Rejection Action Controls */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1.5px solid #E2E8F0', paddingTop: '16px' }}>
                    <Button
                      type="button"
                      onClick={() => {
                        const res = updateDriverVerificationStatus(selectedInspectionDriver.id, 'REJECTED', rejectionReasonInput || 'Documents or vehicle photos require correction.');
                        if (res.success) {
                          setDrivers(getAllDriverAccounts());
                          setDriverMsg(`❌ Driver ${selectedInspectionDriver.fullName} verification rejected with reason: "${rejectionReasonInput || 'Correction required'}"`);
                          setSelectedInspectionDriver(null);
                        }
                      }}
                      style={{ background: '#DC2626', color: '#fff', fontWeight: 800, padding: '10px 18px', borderRadius: '6px' }}
                    >
                      ❌ Reject Verification
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        const res = updateDriverVerificationStatus(selectedInspectionDriver.id, 'APPROVED');
                        if (res.success) {
                          setDrivers(getAllDriverAccounts());
                          setDriverMsg(`✅ Driver ${selectedInspectionDriver.fullName} verification APPROVED! Chauffeur can now view & accept trip assignments.`);
                          setSelectedInspectionDriver(null);
                        }
                      }}
                      style={{ background: '#059669', color: '#fff', fontWeight: 800, padding: '10px 22px', borderRadius: '6px' }}
                    >
                      ✅ Approve Driver Account & Grant Access
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: DRIVER PARTNER ONBOARDING REQUESTS */}
        {activeTab === 'DRIVER_REQUESTS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="h3" style={{ margin: 0 }}>📥 Driver Partner Onboarding Applications</h3>
                <p className="muted" style={{ fontSize: '12.5px', margin: '2px 0 0' }}>
                  Manage incoming driver requests submitted from the Contact Us page. Review applicant details, call drivers directly, and onboard them into chauffeur accounts.
                </p>
              </div>
              <Button href="/contact" variant="ghost" style={{ fontSize: '12px' }}>
                🌐 View Public Driver Join Form
              </Button>
            </div>

            {/* Application Statistics & Status Filter Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDriverRequestFilter('PENDING')}
                  className={`tab ${driverRequestFilter === 'PENDING' ? 'active' : ''}`}
                  style={{ fontSize: '12.5px', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🟡 Pending Applications ({driverRequests.filter((r) => r.status !== 'ONBOARDED' && !drivers.some((d) => d.phone === r.phone || d.fullName.toLowerCase().trim() === r.name.toLowerCase().trim())).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDriverRequestFilter('ONBOARDED')}
                  className={`tab ${driverRequestFilter === 'ONBOARDED' ? 'active' : ''}`}
                  style={{ fontSize: '12.5px', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🟢 Onboarded Drivers ({driverRequests.filter((r) => r.status === 'ONBOARDED' || drivers.some((d) => d.phone === r.phone || d.fullName.toLowerCase().trim() === r.name.toLowerCase().trim())).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDriverRequestFilter('ALL')}
                  className={`tab ${driverRequestFilter === 'ALL' ? 'active' : ''}`}
                  style={{ fontSize: '12.5px', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  📋 All ({driverRequests.length})
                </button>
              </div>
            </div>

            {/* Applications Table */}
            <Card padded style={{ background: '#fff' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line)', color: 'var(--muted)' }}>
                      <th style={{ padding: '10px' }}>Applicant Name</th>
                      <th style={{ padding: '10px' }}>Mobile Phone</th>
                      <th style={{ padding: '10px' }}>Operating Hub / City</th>
                      <th style={{ padding: '10px' }}>Vehicle Details</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Applied On</th>
                      <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverRequests
                      .filter((req) => {
                        const isRegistered = drivers.some(
                          (d) => d.phone === req.phone || d.fullName.toLowerCase().trim() === req.name.toLowerCase().trim()
                        );
                        if (driverRequestFilter === 'PENDING') {
                          return req.status !== 'ONBOARDED' && req.status !== 'REJECTED' && !isRegistered;
                        }
                        if (driverRequestFilter === 'ONBOARDED') {
                          return req.status === 'ONBOARDED' || isRegistered;
                        }
                        return true;
                      })
                      .map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--ink)' }}>
                          {req.name}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#2563EB' }}>
                          📱 {req.phone}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>
                          📍 {req.city || 'Mangaluru'}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--muted)' }}>
                          {req.vehicleDetails || 'AC Sedan / SUV'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: req.status === 'PENDING_CONTACT' ? '#FEF3C7' : req.status === 'CONTACTED' ? '#DBEAFE' : '#DCFCE7',
                              color: req.status === 'PENDING_CONTACT' ? '#92400E' : req.status === 'CONTACTED' ? '#1E40AF' : '#166534',
                            }}
                          >
                            {req.status === 'PENDING_CONTACT' ? '🟡 PENDING CONTACT' : req.status === 'CONTACTED' ? '🔵 CONTACTED' : '🟢 ONBOARDED'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '11.5px', color: 'var(--muted)' }}>
                          {new Date(req.createdAt || Date.now()).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <a
                              href={`tel:${req.phone}`}
                              className="btn btn-g"
                              style={{ fontSize: '11.5px', padding: '4px 8px', textDecoration: 'none', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}
                            >
                              📞 Call
                            </a>
                            <a
                              href={`https://wa.me/91${req.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(req.name)},%20this%20is%20Kandy%20Cabs%20admin%20desk.%20We%20received%20your%20driver%20partner%20application!`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-g"
                              style={{ fontSize: '11.5px', padding: '4px 8px', textDecoration: 'none', background: '#E0E7FF', color: '#3730A3', fontWeight: 700 }}
                            >
                              💬 WhatsApp
                            </a>
                            <Button
                              type="button"
                              onClick={() => {
                                updateDriverPartnerRequestStatus(req.id, 'CONTACTED');
                                setDriverRequests(getDriverPartnerRequests());
                              }}
                              variant="ghost"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              ✔️ Mark Contacted
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                updateDriverPartnerRequestStatus(req.id, 'ONBOARDED');
                                setActiveTab('DRIVERS');
                                setShowAddDriverModal(true);
                                setNewDriverName(req.name);
                                setNewDriverPhone(req.phone);
                                setDriverMsg(`Pre-filled driver registration form for applicant '${req.name}' (${req.phone}).`);
                                setDriverRequests(getDriverPartnerRequests());
                              }}
                              variant="accent"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              ➕ Onboard Chauffeur
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleDeleteDriverRequest(req.id, req.name)}
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}
                            >
                              🗑️ Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: MANGALURU ONE-WAY LOCATIONS CRUD */}
        {activeTab === 'LOCATIONS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="h3" style={{ margin: 0 }}>Mangaluru One-Way Destinations Engine</h3>
                <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Manage authentic coastal Karnataka destinations, GPS coordinates, priority ordering, and active toggles.
                </p>
              </div>
              <Button onClick={() => setShowAddLocationModal(true)} variant="accent" style={{ fontSize: '12px' }}>
                ➕ Add New Location
              </Button>
            </div>

            {/* Add Location Modal */}
            {showAddLocationModal && (
              <Card padded style={{ background: '#FFFBEB', border: '1px solid #FCD34D', marginBottom: '20px' }}>
                <h4 className="h4" style={{ color: '#92400E', marginTop: 0 }}>
                  ➕ Add Authentic Coastal Location
                </h4>
                <form onSubmit={handleAddLocationSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="fld">
                    <label style={{ color: '#92400E', fontSize: '12px' }}>Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Murdeshwar Shiva Temple & Beach"
                      value={newLocName}
                      onChange={(e) => setNewLocName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#92400E', fontSize: '12px' }}>Category</label>
                    <select
                      value={newLocCategory}
                      onChange={(e) => setNewLocCategory(e.target.value as any)}
                    >
                      <option value="AIRPORT">Airport</option>
                      <option value="RAILWAY_STATION">Railway Station</option>
                      <option value="POPULAR_DESTINATION">Popular Destination</option>
                      <option value="TEMPLE_OUTSTATION">Temple Outstation</option>
                      <option value="INTERCITY">Intercity</option>
                    </select>
                  </div>
                  <div className="fld" style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: '#92400E', fontSize: '12px' }}>Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Murdeshwar, Uttara Kannada, Karnataka 581350"
                      value={newLocAddress}
                      onChange={(e) => setNewLocAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#92400E', fontSize: '12px' }}>Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newLocLat}
                      onChange={(e) => setNewLocLat(parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div className="fld">
                    <label style={{ color: '#92400E', fontSize: '12px' }}>Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newLocLng}
                      onChange={(e) => setNewLocLng(parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <Button type="submit" variant="accent">
                      Save Coastal Location 📍
                    </Button>
                    <Button type="button" onClick={() => setShowAddLocationModal(false)} variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Locations Table */}
            <Card padded style={{ background: '#fff' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line)', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px' }}>Order</th>
                      <th style={{ padding: '8px' }}>Destination Name</th>
                      <th style={{ padding: '8px' }}>Category</th>
                      <th style={{ padding: '8px' }}>GPS Coordinates</th>
                      <th style={{ padding: '8px' }}>Dist from MNG</th>
                      <th style={{ padding: '8px' }}>Popular</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc, idx) => (
                      <tr key={loc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '8px', fontWeight: 800 }}>#{loc.displayOrder}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{loc.displayName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{loc.address}</div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span className="pill blue" style={{ fontSize: '10px' }}>{loc.category}</span>
                        </td>
                        <td style={{ padding: '8px', fontSize: '11.5px' }}>
                          {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
                        </td>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{loc.distanceKmFromMangaluru} km</td>
                        <td style={{ padding: '8px' }}>{loc.isPopular ? '🌟 Yes' : 'No'}</td>
                        <td style={{ padding: '8px' }}>
                          <span className={`pill ${loc.isActive ? 'green' : 'yellow'}`} style={{ fontSize: '10.5px' }}>
                            {loc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveLocationOrder(idx, 'UP')}
                              disabled={idx === 0}
                              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveLocationOrder(idx, 'DOWN')}
                              disabled={idx === locations.length - 1}
                              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLocationActive(loc.id, loc.isActive)}
                              style={{ background: loc.isActive ? '#991B1B' : 'var(--green)', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              {loc.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: ALL BOOKINGS & VENDOR DISPATCH CONTROL */}
        {activeTab === 'BOOKINGS' && (
          <Card padded style={{ background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="h3" style={{ margin: 0 }}>All Customer Bookings & Vendor Dispatch Desk</h3>
                <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Assign bookings to Vendor Partners, enter assigned driver & vehicle details, and share unmasked phone numbers directly with customers.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.confirm('Are you sure you want to permanently delete all customer bookings and customer data?')) {
                    const res = deleteAllCustomerData();
                    deleteAllCustomerAccounts();
                    setBookings([]);
                    setAuditLogs(getAuditLogs());
                    setDispatchMsg(`🗑️ ${res.message}`);
                  }
                }}
                variant="primary"
                style={{ fontSize: '12px', background: '#DC2626', borderColor: '#DC2626' }}
              >
                🗑️ Delete All Customer Data
              </Button>
            </div>

            {(() => {
              const declinedList = bookings.filter((b) => b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED');
              if (declinedList.length === 0) return null;
              return (
                <div
                  style={{
                    background: '#FEE2E2',
                    border: '2px solid #EF4444',
                    color: '#991B1B',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚨 URGENT ADMIN ACTION REQUIRED: {declinedList.length} Driver(s) Declined Trip Assignment(s)
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 600, color: '#7F1D1D' }}>
                    The following booking(s) were declined by the assigned chauffeur and need immediate re-dispatch to another driver:
                  </div>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12px', fontWeight: 700 }}>
                    {declinedList.map((db) => (
                      <li key={db.id}>
                        Booking <b>{db.bookingReference}</b> (Customer: {db.customerName} - {db.customerPhone}) — Declined by driver {db.assignedDriverName || 'Driver'}. Reason: {(db as any).declineReason || 'Chauffeur declined via duty dashboard swipe'}.
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {dispatchMsg && (
              <div
                style={{
                  background: dispatchMsg.startsWith('⚠️') ? '#FEE2E2' : 'var(--green-soft)',
                  color: dispatchMsg.startsWith('⚠️') ? '#991B1B' : 'var(--green)',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-m)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                {dispatchMsg}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)', color: 'var(--muted)' }}>
                    <th style={{ padding: '10px' }}>Ref ID</th>
                    <th style={{ padding: '10px' }}>Customer Info</th>
                    <th style={{ padding: '10px' }}>Trip Mode & Route</th>
                    <th style={{ padding: '10px' }}>Schedule</th>
                    <th style={{ padding: '10px' }}>Fare Breakdown</th>
                    <th style={{ padding: '10px' }}>Driver Dispatch Entry</th>
                    <th style={{ padding: '10px' }}>Dispatch Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const currentDispatch = vendorDispatchState[b.id] || {
                      vendorId: 'kandy',
                      driverName: b.assignedDriverName || 'Suresh Gowda',
                      driverPhone: b.driverPhone || '9900887777',
                      vehicleModel: b.vehicleModel || 'Swift Dzire',
                      vehicleRegistration: b.assignedVehicleReg || 'KA 19 C 4829',
                    };

                    const displayDrivers = drivers;

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px', fontWeight: 800 }}>{b.bookingReference}</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>👤 {b.customerName}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600 }}>📞 {b.customerPhone}</div>
                        </td>
                        <td style={{ padding: '10px', maxWidth: '220px' }}>
                          <span className="pill blue" style={{ fontSize: '10.5px', marginBottom: '4px' }}>
                            {b.tripMode} {b.tripDays ? `(${b.tripDays} Days)` : ''}
                          </span>
                          <div style={{ fontSize: '11.5px', marginTop: '2px' }}>📍 <b>Pick:</b> {b.pickupAddress}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>🏁 <b>Drop:</b> {b.dropAddress}</div>
                        </td>
                        <td style={{ padding: '10px', fontSize: '11.5px' }}>📅 {b.pickupTime}</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--green)', fontSize: '13.5px' }}>
                            ₹{b.estimatedFare.toLocaleString()}
                            {b.tollCharges ? (
                              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700, marginLeft: '4px' }}>
                                (+₹{b.tollCharges} Toll)
                              </span>
                            ) : null}
                          </div>
                          {b.advancePaid ? (
                            <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                              Adv: ₹{b.advancePaid} · Bal: ₹{(
                                b.remainingFare !== undefined
                                  ? b.remainingFare
                                  : Math.max(0, b.estimatedFare + (b.tollCharges || 0) - b.advancePaid)
                              ).toLocaleString()}
                            </div>
                          ) : null}

                          {(() => {
                            const advance = b.advancePaid || 0;
                            const toll = b.tollCharges || 0;
                            const totalFare = (b.estimatedFare || 0) + toll;
                            const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, totalFare - advance);
                            const isPaymentDone = remaining === 0;
                            const isCancelled = b.status === 'CANCELLED';

                            const hasDriverStartedTrip = Boolean(
                              b.status === 'TRIP_STARTED' ||
                              b.status === 'IN_PROGRESS' ||
                              (b.initialMeterKm && b.initialMeterKm > 0) ||
                              b.initialMeterImage ||
                              (b.startMeterReading && b.startMeterReading > 0) ||
                              (b as any).otpVerified ||
                              (b as any).tripStarted
                            );

                            const isTripCompleted = Boolean(
                              b.status === 'COMPLETED' ||
                              b.status === 'TRIP_COMPLETED' ||
                              b.finalMeterImage ||
                              (b.finalMeterKm && b.finalMeterKm > 0)
                            );

                            // 1. Booking Cancelled
                            if (isCancelled) {
                              return (
                                <div
                                  style={{
                                    marginTop: '6px',
                                    padding: '4px 10px',
                                    background: '#FEE2E2',
                                    color: '#991B1B',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  🔴 Cancelled
                                </div>
                              );
                            }

                            // 2. Payment Done (Fully paid, remaining = 0)
                            if (isPaymentDone) {
                              return (
                                <div
                                  style={{
                                    marginTop: '6px',
                                    padding: '4px 10px',
                                    background: '#D1FAE5',
                                    color: '#065F46',
                                    border: '1px solid #6EE7B7',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  ✅ Payment Done
                                </div>
                              );
                            }

                            // 3. Payment Pending (Trip finished, but balance remaining > 0)
                            if (isTripCompleted && remaining > 0) {
                              return (
                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div
                                    style={{
                                      padding: '4px 10px',
                                      background: '#FEE2E2',
                                      color: '#991B1B',
                                      border: '1px solid #FCA5A5',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      textAlign: 'center',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    ⏳ Payment Pending
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOnlinePaymentBooking(b)}
                                    style={{
                                      padding: '3px 6px',
                                      background: '#047857',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    💳 Pay Online (QR Code)
                                  </button>
                                </div>
                              );
                            }

                            // 4. On Trip (Driver verified OTP & trip is active)
                            if (hasDriverStartedTrip) {
                              return (
                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div
                                    style={{
                                      padding: '4px 10px',
                                      background: '#FEF3C7',
                                      color: '#92400E',
                                      border: '1px solid #FCD34D',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      textAlign: 'center',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    🚖 On Trip
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOnlinePaymentBooking(b)}
                                    style={{
                                      padding: '2px 5px',
                                      background: 'transparent',
                                      color: '#059669',
                                      border: '1px solid #059669',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    💳 QR Code Options
                                  </button>
                                </div>
                              );
                            }

                            // 5. Trip Not Started (Dispatched / Assigned, awaiting driver start)
                            return (
                              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div
                                  style={{
                                    padding: '4px 10px',
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  ⌛ Trip Not Started
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOnlinePaymentBooking(b)}
                                  style={{
                                    padding: '2px 5px',
                                    background: 'transparent',
                                    color: '#059669',
                                    border: '1px solid #059669',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  💳 QR Code Options
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '10px', minWidth: '240px' }}>
                          {b.status === 'COMPLETED' ? (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>
                              🏁 Driver {b.assignedDriverName} ({b.assignedVehicleReg})
                            </span>
                          ) : (
                            (() => {
                              const isCancelled = b.status === 'CANCELLED';
                              const isDispatched = Boolean(b.assignedDriverName && b.assignedDriverName.trim() !== '');
                              return (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    background: isCancelled ? '#FEF2F2' : isDispatched ? '#F0FDF4' : 'var(--bg-soft)',
                                    border: isCancelled ? '1.5px dashed #EF4444' : isDispatched ? '1.5px solid #10B981' : '1px solid var(--line)',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        color: isCancelled ? '#991B1B' : isDispatched ? '#047857' : 'var(--muted)',
                                        letterSpacing: '0.02em',
                                      }}
                                    >
                                      {isCancelled
                                        ? '🔴 CANCELLED — RE-DISPATCH'
                                        : isDispatched
                                        ? '✅ DISPATCHED — RE-ASSIGN DRIVER'
                                        : 'SELECT CHAUFFEUR / DRIVER'}
                                    </label>
                                    {isCancelled ? (
                                      <span
                                        style={{
                                          fontSize: '9.5px',
                                          fontWeight: 700,
                                          background: '#EF4444',
                                          color: '#ffffff',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        CANCELLED
                                      </span>
                                    ) : isDispatched ? (
                                      <span
                                        style={{
                                          fontSize: '9.5px',
                                          fontWeight: 700,
                                          background: '#10B981',
                                          color: '#ffffff',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        DISPATCHED
                                      </span>
                                    ) : null}
                                  </div>

                                  {isCancelled && (
                                    <div style={{ fontSize: '10px', color: '#B91C1C', background: '#FEE2E2', padding: '4px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                      💡 Note: Re-dispatching will un-cancel and activate this booking for duty.
                                    </div>
                                  )}

                                  <select
                                    value={drivers.find((d) => d.fullName.toLowerCase() === (currentDispatch.driverName || '').toLowerCase())?.id || ''}
                                    onChange={(e) => {
                                      const selected = drivers.find((d) => d.id === e.target.value);
                                      if (selected) {
                                        handleDriverSelectionForBooking(b.id, selected);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 6px',
                                      fontSize: '11px',
                                      borderRadius: '4px',
                                      border: isCancelled ? '1px solid #FCA5A5' : isDispatched ? '1px solid #A7F3D0' : '1px solid var(--line)',
                                      background: isCancelled ? '#FFF5F5' : isDispatched ? '#FFFFFF' : '#ECFDF5',
                                      color: isCancelled ? '#7F1D1D' : '#065F46',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <option value="">👨‍✈️ Choose Driver from Dropdown...</option>
                                    {displayDrivers.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        👨‍✈️ {d.fullName} ({d.phone})
                                      </option>
                                    ))}
                                  </select>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <div>
                                      <input
                                        type="text"
                                        placeholder="Search / Enter Driver Name"
                                        list={`driver-datalist-${b.id}`}
                                        value={currentDispatch.driverName}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const matched = drivers.find(
                                            (d) => d.fullName.toLowerCase() === val.toLowerCase() || d.phone === val.trim()
                                          );
                                          if (matched) {
                                            handleDriverSelectionForBooking(b.id, matched);
                                          } else {
                                            setVendorDispatchState((prev) => ({
                                              ...prev,
                                              [b.id]: { ...currentDispatch, driverName: val },
                                            }));
                                          }
                                        }}
                                        style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--line)', width: '100%' }}
                                      />
                                      <datalist id={`driver-datalist-${b.id}`}>
                                        {displayDrivers.map((d) => (
                                          <option key={d.id} value={d.fullName}>
                                            {d.phone}
                                          </option>
                                        ))}
                                      </datalist>
                                    </div>
                                    <input
                                      type="tel"
                                      placeholder="Driver Phone"
                                      value={currentDispatch.driverPhone}
                                      onChange={(e) =>
                                        setVendorDispatchState((prev) => ({
                                          ...prev,
                                          [b.id]: { ...currentDispatch, driverPhone: e.target.value },
                                        }))
                                      }
                                      style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--line)' }}
                                    />
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Vehicle Model (e.g. Dzire)"
                                      value={currentDispatch.vehicleModel}
                                      onChange={(e) =>
                                        setVendorDispatchState((prev) => ({
                                          ...prev,
                                          [b.id]: { ...currentDispatch, vehicleModel: e.target.value },
                                        }))
                                      }
                                      style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--line)' }}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Reg Plate (KA 19 C 1234)"
                                      value={currentDispatch.vehicleRegistration}
                                      onChange={(e) =>
                                        setVendorDispatchState((prev) => ({
                                          ...prev,
                                          [b.id]: { ...currentDispatch, vehicleRegistration: e.target.value },
                                        }))
                                      }
                                      style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--line)' }}
                                    />
                                  </div>

                                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="checkbox"
                                      id={`auto-send-cb-${b.id}`}
                                      checked={autoSendItineraryOnDispatch[b.id] !== false}
                                      onChange={(e) =>
                                        setAutoSendItineraryOnDispatch((prev) => ({ ...prev, [b.id]: e.target.checked }))
                                      }
                                      style={{ accentColor: '#059669', cursor: 'pointer' }}
                                    />
                                    <label htmlFor={`auto-send-cb-${b.id}`} style={{ fontSize: '10.5px', fontWeight: 700, color: '#065F46', cursor: 'pointer' }}>
                                      ☑️ Auto-Send WhatsApp Itinerary on Dispatch
                                    </label>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleVendorDispatchSubmit(b.id)}
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 800,
                                      padding: '6px 12px',
                                      marginTop: '2px',
                                      borderRadius: '6px',
                                      border: isCancelled ? '1px solid #B91C1C' : isDispatched ? '1px solid #047857' : '1px solid #C2410C',
                                      background: isCancelled ? '#DC2626' : isDispatched ? '#059669' : 'var(--accent, #F97316)',
                                      color: '#ffffff',
                                      cursor: 'pointer',
                                      boxShadow: isCancelled
                                        ? '0 2px 5px rgba(220, 38, 38, 0.3)'
                                        : isDispatched
                                        ? '0 2px 5px rgba(5, 150, 105, 0.3)'
                                        : '0 2px 5px rgba(249, 115, 22, 0.3)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {isCancelled
                                      ? '🔄 Re-Dispatch Cancelled Booking to Driver'
                                      : isDispatched
                                      ? '✅ Dispatched — Update / Re-Dispatch Driver 🔄'
                                      : '📢 Dispatch to Driver'}
                                  </button>
                                </div>
                              );
                            })()
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {b.status === 'CANCELLED' ? (
                            <div style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800 }}>
                              🔴 Booking Cancelled by Admin
                            </div>
                          ) : b.assignedDriverName ? (
                            <div
                              style={{
                                background:
                                  b.status === 'COMPLETED' || (b.finalMeterKm && b.finalMeterKm > 0)
                                    ? '#ECFDF5'
                                    : b.status === 'TRIP_STARTED'
                                    ? '#FFFBEB'
                                    : b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED'
                                    ? '#FEF2F2'
                                    : b.driverApprovalStatus === 'APPROVED' || b.status === 'DRIVER_APPROVED' || b.status === 'DRIVER_ASSIGNED'
                                    ? '#ECFDF5'
                                    : '#EFF6FF',
                                color:
                                  b.status === 'COMPLETED' || (b.finalMeterKm && b.finalMeterKm > 0)
                                    ? '#065F46'
                                    : b.status === 'TRIP_STARTED'
                                    ? '#92400E'
                                    : b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED'
                                    ? '#991B1B'
                                    : b.driverApprovalStatus === 'APPROVED' || b.status === 'DRIVER_APPROVED' || b.status === 'DRIVER_ASSIGNED'
                                    ? '#065F46'
                                    : '#1E40AF',
                                border:
                                  b.status === 'COMPLETED' || (b.finalMeterKm && b.finalMeterKm > 0)
                                    ? '1.5px solid #10B981'
                                    : b.status === 'TRIP_STARTED'
                                    ? '1.5px solid #FCD34D'
                                    : b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED'
                                    ? '1.5px solid #EF4444'
                                    : b.driverApprovalStatus === 'APPROVED' || b.status === 'DRIVER_APPROVED' || b.status === 'DRIVER_ASSIGNED'
                                    ? '1.5px solid #10B981'
                                    : '1.5px solid #93C5FD',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                              }}
                            >
                              <div style={{ marginBottom: '6px' }}>
                                {b.status === 'COMPLETED' || (b.finalMeterKm && b.finalMeterKm > 0) ? (
                                  <span style={{ fontSize: '11px', background: '#059669', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                                    🏁 Trip Completed & Verified
                                  </span>
                                ) : b.status === 'TRIP_STARTED' ? (
                                  <span style={{ fontSize: '11px', background: '#D97706', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                                    🚖 On Trip (Active Ride)
                                  </span>
                                ) : b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED' ? (
                                  <span style={{ fontSize: '11px', background: '#DC2626', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                                    🔴 Declined by Driver — Re-Dispatch Required!
                                  </span>
                                ) : b.driverApprovalStatus === 'APPROVED' || b.status === 'DRIVER_APPROVED' || b.status === 'DRIVER_ASSIGNED' ? (
                                  <span style={{ fontSize: '11px', background: '#10B981', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                                    ✅ Accepted by Driver
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', background: '#2563EB', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                                    ⌛ Sent to Driver — Pending Approval
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11.5px', fontWeight: 800 }}>
                                👨‍✈️ {b.assignedDriverName} (📞 {b.driverPhone})
                              </div>
                              <div style={{ fontSize: '10.5px', marginTop: '2px' }}>
                                🚗 Car: {b.vehicleModel || b.assignedVehicleReg} [{b.assignedVehicleReg}]
                              </div>
                              {b.status === 'COMPLETED' || (b.finalMeterKm && b.finalMeterKm > 0) ? (
                                <div style={{ fontSize: '9.5px', color: '#047857', marginTop: '4px', fontWeight: 700 }}>
                                  ✓ Trip completed. Final meter & route evidence audited.
                                </div>
                              ) : b.status === 'TRIP_STARTED' ? (
                                <div style={{ fontSize: '9.5px', color: '#B45309', marginTop: '4px', fontWeight: 700 }}>
                                  ⚡ Customer OTP verified. Driver actively executing trip en route.
                                </div>
                              ) : b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED' ? (
                                <div style={{ fontSize: '10px', color: '#7F1D1D', marginTop: '4px', fontWeight: 800, background: '#FEE2E2', padding: '4px 6px', borderRadius: '4px', border: '1px solid #FCA5A5' }}>
                                  ⚠️ Driver declined job. Select another driver on left & click Re-Dispatch!
                                </div>
                              ) : b.driverApprovalStatus === 'APPROVED' || b.status === 'DRIVER_APPROVED' || b.status === 'DRIVER_ASSIGNED' ? (
                                <div style={{ fontSize: '9.5px', color: '#059669', marginTop: '4px', fontWeight: 700 }}>
                                  ✓ Driver approved & accepted trip on driver dashboard!
                                </div>
                              ) : (
                                <div style={{ fontSize: '9.5px', color: '#1D4ED8', marginTop: '4px', fontStyle: 'italic', fontWeight: 600 }}>
                                  💡 Sent to driver portal — Awaiting driver swipe approval.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ background: '#F3F4F6', border: '1px solid #D1D5DB', color: '#4B5563', padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', background: '#6B7280', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginBottom: '4px' }}>
                                ⌛ Unassigned — Awaiting Dispatch
                              </span>
                              <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                                Assign driver on left column & click "Dispatch to Driver"
                              </div>
                            </div>
                          )}

                          {(b.initialMeterImage || b.finalMeterImage || b.initialMeterKm || b.startMeterReading || b.tollReceiptImage) && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMeterBookingId(b.bookingReference || b.id);
                                  setActiveTab('METER');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 10px',
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                                title="View complete Geotagged Odometer Evidence in Meter Evidence Console"
                              >
                                <span>📷</span>
                                <span>View Meter Evidence</span>
                                <span style={{ fontSize: '10px' }}>➔</span>
                              </button>
                            </div>
                          )}

                          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setInvoiceBooking(b)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: '#065F46',
                                color: '#fff',
                                borderRadius: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              }}
                            >
                              🧾 View & Send Invoice
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerDirectWhatsAppItinerary(b)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: '#059669',
                                color: '#fff',
                                borderRadius: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              }}
                              title="Directly Auto-Send Travel Itinerary via WhatsApp to Customer"
                            >
                              📲 WhatsApp Itinerary
                            </button>

                            {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelBookingModalTarget(b);
                                  setCancellationReasonInput('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  background: '#EF4444',
                                  color: '#fff',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                }}
                              >
                                🚫 Cancel Booking
                              </button>
                            )}

                            {b.status === 'CANCELLED' && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  background: '#FEE2E2',
                                  color: '#991B1B',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                }}
                              >
                                🔴 CANCELLED
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB: LIVE FLEET GPS MAP */}
        {activeTab === 'MAP' && <AdminLiveTrackingMap />}

        {/* TAB: METER EVIDENCE CONSOLE */}
        {activeTab === 'METER' && <AdminMeterVerificationConsole initialBookingId={selectedMeterBookingId} />}

        {/* TAB: COUPONS MANAGEMENT */}
        {activeTab === 'COUPONS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎟️ Admin Coupon & Promo Code Engine
                </h3>
                <p className="muted" style={{ fontSize: '12.5px', margin: '3px 0 0' }}>
                  Generate and manage discount coupon codes for customer bookings. Support for % percentage discount, flat ₹ discount, unlimited vs limited usage, minimum ride fare requirements, and max cap discount limits.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleToggleCouponSystem}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    background: couponSystemActive ? '#DCFCE7' : '#FEE2E2',
                    color: couponSystemActive ? '#15803D' : '#991B1B',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  {couponSystemActive ? '🟢 Coupon System: ENABLED' : '🔴 Coupon System: DISABLED'}
                </button>
                <Button
                  onClick={() => {
                    setShowAddCouponModal(true);
                    setCouponActionMsg(null);
                  }}
                  variant="accent"
                  style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  ➕ Generate New Coupon Code
                </Button>
              </div>
            </div>

            {couponActionMsg && (
              <div
                style={{
                  background: couponActionMsg.startsWith('⚠️') ? '#FEE2E2' : '#D1FAE5',
                  color: couponActionMsg.startsWith('⚠️') ? '#991B1B' : '#065F46',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-m)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{couponActionMsg}</span>
                <button
                  type="button"
                  onClick={() => setCouponActionMsg(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Coupons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {coupons.map((c) => {
                const isUnl = c.isUnlimited || c.totalUsageLimit >= 99999;
                const isExpired = c.endDate && new Date(c.endDate).getTime() < Date.now();

                return (
                  <Card key={c.id} padded style={{ background: '#fff', border: c.isActive ? '1px solid #E2E8F0' : '1px solid #CBD5E1', opacity: c.isActive ? 1 : 0.8, boxShadow: 'var(--sh-s)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'inline-block', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 900, fontSize: '16px', padding: '4px 10px', borderRadius: '6px', letterSpacing: '0.05em', border: '1px dashed var(--accent)' }}>
                          🎟️ {c.code}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: c.isActive ? '#DCFCE7' : '#F1F5F9',
                            color: c.isActive ? '#166534' : '#64748B',
                          }}
                        >
                          {c.isActive ? '🟢 Active' : '⚪ Inactive'}
                        </span>
                        {isExpired && (
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', background: '#FEE2E2', color: '#991B1B' }}>
                            ⏰ Expired
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                      </div>
                      {c.discountType === 'PERCENTAGE' && c.maxDiscount ? (
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          Max Discount Cap: <b>₹{c.maxDiscount}</b>
                        </div>
                      ) : null}
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Redemption Status:</span>
                        <span style={{ fontWeight: 800, color: isUnl ? '#047857' : '#1E40AF' }}>
                          {isUnl ? '♾️ Unlimited Redemptions' : `🔢 ${c.totalUses} / ${c.totalUsageLimit} Redemptions Used`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Minimum Ride Fare:</span>
                        <span style={{ fontWeight: 700 }}>₹{c.minBookingAmount || 0}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Valid Category:</span>
                        <span style={{ fontWeight: 700 }}>All Trip Modes</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleCouponActive(c)}
                        style={{
                          background: c.isActive ? '#FEE2E2' : '#DCFCE7',
                          color: c.isActive ? '#991B1B' : '#166534',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {c.isActive ? 'Pause Promo' : 'Activate Promo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCouponSubmit(c.code)}
                        style={{
                          background: 'transparent',
                          color: '#EF4444',
                          border: '1px solid #FCA5A5',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Generate Coupon Modal */}
            {showAddCouponModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                }}
                onClick={() => setShowAddCouponModal(false)}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    maxWidth: '520px',
                    width: '100%',
                    padding: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                      🎟️ Generate New Promo Coupon Code
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddCouponModal(false)}
                      style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleGenerateCouponSubmit}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                        Coupon Code / Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SUMMER20, FESTIVE15, KANDY100"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                          Discount Type
                        </label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as any)}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                        >
                          <option value="PERCENTAGE">Percentage (% Off)</option>
                          <option value="FIXED">Flat Amount (₹ Off)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                          Discount Value ({newCouponType === 'PERCENTAGE' ? '% Percentage' : '₹ Amount'}) *
                        </label>
                        <input
                          type="number"
                          placeholder={newCouponType === 'PERCENTAGE' ? 'e.g. 15 for 15%' : 'e.g. 200 for ₹200'}
                          value={newCouponValue}
                          onChange={(e) => setNewCouponValue(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                        Usage Limitation *
                      </label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: newCouponLimitType === 'UNLIMITED' ? 800 : 400 }}>
                          <input
                            type="radio"
                            name="couponLimitType"
                            value="UNLIMITED"
                            checked={newCouponLimitType === 'UNLIMITED'}
                            onChange={() => setNewCouponLimitType('UNLIMITED')}
                            style={{ accentColor: '#2563EB' }}
                          />
                          ♾️ Unlimited Redemptions
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: newCouponLimitType === 'LIMITED' ? 800 : 400 }}>
                          <input
                            type="radio"
                            name="couponLimitType"
                            value="LIMITED"
                            checked={newCouponLimitType === 'LIMITED'}
                            onChange={() => setNewCouponLimitType('LIMITED')}
                            style={{ accentColor: '#2563EB' }}
                          />
                          🔢 Limited Redemption Count
                        </label>
                      </div>
                    </div>

                    {newCouponLimitType === 'LIMITED' && (
                      <div style={{ marginBottom: '14px', background: '#EFF6FF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #93C5FD' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#1E40AF' }}>
                          Total Usage Limit (Max Allowed Redemptions)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          value={newCouponMaxUses}
                          onChange={(e) => setNewCouponMaxUses(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #60A5FA', background: '#fff' }}
                          required
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                          Min Ride Fare (₹ INR)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={newCouponMinFare}
                          onChange={(e) => setNewCouponMinFare(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                          Max Discount Cap (₹ INR)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 300"
                          value={newCouponMaxCap}
                          onChange={(e) => setNewCouponMaxCap(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <Button type="button" onClick={() => setShowAddCouponModal(false)} variant="ghost" style={{ fontSize: '13px', border: '1px solid #D1D5DB' }}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="accent" style={{ fontSize: '13px' }}>
                        🎟️ Generate Coupon Code
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 10: CUSTOMER PAYMENTS MANAGEMENT CONSOLE */}
        {activeTab === 'PAYMENTS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💳 Customer Payments & Financial Ledger Console
                </h3>
                <p className="muted" style={{ fontSize: '12.5px', margin: '3px 0 0' }}>
                  Audit online Razorpay deposits, advance payments, driver cash collections, FASTag toll gate fares, and customer payment statuses in real-time.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleExportPaymentsCsv}
                  variant="ghost"
                  style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #D1D5DB' }}
                >
                  📥 Export Payments CSV Report
                </Button>
                <Button
                  onClick={() => {
                    setShowRecordPaymentModal(true);
                    setPaymentActionMsg(null);
                  }}
                  variant="accent"
                  style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  ➕ Record Customer Payment
                </Button>
              </div>
            </div>

            {paymentActionMsg && (
              <div
                style={{
                  background: paymentActionMsg.startsWith('⚠️') ? '#FEE2E2' : '#D1FAE5',
                  color: paymentActionMsg.startsWith('⚠️') ? '#991B1B' : '#065F46',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-m)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{paymentActionMsg}</span>
                <button type="button" onClick={() => setPaymentActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                  ✕
                </button>
              </div>
            )}

            {/* Financial KPI Summary Cards */}
            {(() => {
              let totalRevenue = 0;
              let onlineAdvances = 0;
              let driverCollections = 0;
              let pendingBalances = 0;

              bookings.forEach((b) => {
                const advance = b.advancePaid || 0;
                const toll = b.tollCharges || 0;
                const totalFare = (b.estimatedFare || 0) + toll;
                const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, totalFare - advance);

                onlineAdvances += advance;
                const collectedRemaining = totalFare - remaining - advance;
                driverCollections += Math.max(0, collectedRemaining);
                totalRevenue += advance + Math.max(0, collectedRemaining);
                pendingBalances += remaining;
              });

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <Card padded style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', color: '#fff' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#A5B4FC' }}>
                      💰 Total Revenue Collected
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                      ₹{totalRevenue.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#C7D2FE', marginTop: '2px' }}>
                      Across online advances & driver collections
                    </div>
                  </Card>

                  <Card padded style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', color: '#fff' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6EE7B7' }}>
                      💳 Online Advance Deposits
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                      ₹{onlineAdvances.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#A7F3D0', marginTop: '2px' }}>
                      Razorpay UPI / Card online advance receipts
                    </div>
                  </Card>

                  <Card padded style={{ background: 'linear-gradient(135deg, #854D0E 0%, #B45309 100%)', color: '#fff' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#FDE68A' }}>
                      💵 Driver Cash/UPI Collections
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                      ₹{driverCollections.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#FEF3C7', marginTop: '2px' }}>
                      Settled balances & toll fares at destination
                    </div>
                  </Card>

                  <Card padded style={{ background: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)', color: '#fff' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#FCA5A5' }}>
                      ⏳ Outstanding Pending Balances
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                      ₹{pendingBalances.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#FECACA', marginTop: '2px' }}>
                      Uncollected remaining balance on active rides
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* Customer Search Bar & Status Filter Bar */}
            <Card padded style={{ background: '#fff', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: '1 1 320px' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '14px' }}>
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search by Customer Name, Phone (+91...), Booking Ref (KC-...), or Route..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      background: '#F9FAFB',
                      outline: 'none',
                    }}
                  />
                  {paymentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPaymentSearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '13px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px' }}>
                  {[
                    { id: 'ALL', label: '🌐 All Customer Payments' },
                    { id: 'ONLINE', label: '💳 Online Advance Deposits' },
                    { id: 'DRIVER_CASH', label: '🚗 Driver Collections' },
                    { id: 'PENDING', label: '⏳ Pending Balances' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPaymentFilterStatus(f.id as any)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: paymentFilterStatus === f.id ? '2px solid #2563EB' : '1px solid #E5E7EB',
                        background: paymentFilterStatus === f.id ? '#EFF6FF' : '#fff',
                        color: paymentFilterStatus === f.id ? '#1D4ED8' : '#4B5563',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Customer Payments Table */}
            <Card padded style={{ background: '#fff' }}>
              {(() => {
                const filtered = bookings.filter((b) => {
                  const q = paymentSearchQuery.toLowerCase().trim();
                  const matchesQuery =
                    !q ||
                    b.customerName.toLowerCase().includes(q) ||
                    b.customerPhone.toLowerCase().includes(q) ||
                    b.bookingReference.toLowerCase().includes(q) ||
                    b.pickupAddress.toLowerCase().includes(q) ||
                    b.dropAddress.toLowerCase().includes(q) ||
                    (b.assignedDriverName && b.assignedDriverName.toLowerCase().includes(q));

                  if (!matchesQuery) return false;

                  const advance = b.advancePaid || 0;
                  const toll = b.tollCharges || 0;
                  const total = (b.estimatedFare || 0) + toll;
                  const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, total - advance);

                  if (paymentFilterStatus === 'ONLINE' || paymentFilterStatus === 'ADVANCE') return advance > 0;
                  if (paymentFilterStatus === 'DRIVER_CASH') return b.status === 'COMPLETED' || remaining === 0;
                  if (paymentFilterStatus === 'PENDING') return remaining > 0;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
                      <h4 style={{ margin: 0, fontWeight: 700 }}>No Customer Payments Found</h4>
                      <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
                        {paymentSearchQuery ? `No matching payments for "${paymentSearchQuery}"` : 'No payment records match the selected status filter.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Booking Ref</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Trip Start & End Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Customer Details</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Trip Route</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Trip Fare & Tolls</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Online Advance</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Remaining Balance</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Overall Status</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((b) => {
                          const advance = b.advancePaid || 0;
                          const toll = b.tollCharges || 0;
                          const totalFare = (b.estimatedFare || 0) + toll;
                          const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, totalFare - advance);
                          const isFullyPaid = remaining === 0;

                          return (
                            <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '13px' }}>{b.bookingReference}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>
                                  Booked: {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Today'}
                                </div>
                                <div style={{ marginTop: '4px' }}>
                                  <span style={{ fontSize: '10px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>
                                    {b.tripMode || 'Outstation'}
                                  </span>
                                </div>
                              </td>

                              <td style={{ padding: '10px 12px', minWidth: '170px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🚀 <b>Start:</b> {b.tripStartedAt ? new Date(b.tripStartedAt).toLocaleDateString('en-IN') + ' ' + new Date(b.tripStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (b.pickupTime || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'))}
                                </div>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: b.status === 'COMPLETED' ? '#2563EB' : b.status === 'CANCELLED' ? '#DC2626' : '#D97706', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                  🏁 <b>End:</b> {b.tripCompletedAt ? new Date(b.tripCompletedAt).toLocaleDateString('en-IN') + ' ' + new Date(b.tripCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (b.status === 'COMPLETED' ? (b.tollEnteredAt ? new Date(b.tollEnteredAt).toLocaleDateString('en-IN') : 'Completed') : (b.status === 'CANCELLED' ? 'Cancelled' : 'Ongoing / Scheduled'))}
                                </div>
                              </td>

                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700, color: '#0F172A' }}>{b.customerName}</div>
                                <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  📞 <a href={`tel:${b.customerPhone}`} style={{ color: '#2563EB', textDecoration: 'none' }}>{b.customerPhone}</a>
                                </div>
                              </td>

                              <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                                <div style={{ fontSize: '11.5px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  🟢 {b.pickupAddress}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                  🔴 {b.dropAddress}
                                </div>
                              </td>

                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700 }}>₹{totalFare.toLocaleString('en-IN')}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>Base: ₹{(b.estimatedFare || 0).toLocaleString('en-IN')}</div>
                                {toll > 0 && (
                                  <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
                                    + Tolls: ₹{toll}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '10px 12px' }}>
                                {advance > 0 ? (
                                  <div>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>₹{advance.toLocaleString('en-IN')}</span>
                                    <div style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                                      💳 Razorpay Online
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>₹0 (No Advance)</span>
                                )}
                              </td>

                              <td style={{ padding: '10px 12px' }}>
                                {remaining === 0 ? (
                                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                    ✓ ₹0 (Cleared)
                                  </span>
                                ) : (
                                  <div>
                                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626' }}>₹{remaining.toLocaleString('en-IN')}</span>
                                    {b.assignedDriverName && (
                                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                                        Collector: 👨‍✈️ {b.assignedDriverName}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '10px 12px' }}>
                                {isFullyPaid ? (
                                  <span style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '11px', display: 'inline-block' }}>
                                    ✓ FULLY PAID
                                  </span>
                                ) : advance > 0 ? (
                                  <span style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '11px', display: 'inline-block' }}>
                                    💳 PARTIAL ADVANCE
                                  </span>
                                ) : (
                                  <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '11px', display: 'inline-block' }}>
                                    ⏳ UNPAID / PENDING
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPaymentDetail(b)}
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: '#EFF6FF',
                                      color: '#1D4ED8',
                                      border: '1px solid #BFDBFE',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      width: '110px',
                                    }}
                                  >
                                    👁️ Audit Ledger
                                  </button>
                                  {!isFullyPaid && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRecordPaymentBookingId(b.id);
                                        setRecordPaymentAmount(remaining.toString());
                                        setShowRecordPaymentModal(true);
                                        setPaymentActionMsg(null);
                                      }}
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: '#FEF3C7',
                                        color: '#B45309',
                                        border: '1px solid #FDE68A',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        width: '110px',
                                      }}
                                    >
                                      💵 Log Payment
                                    </button>
                                  )}
                                  {!isFullyPaid && (
                                    <button
                                      type="button"
                                      onClick={() => setOnlinePaymentBooking(b)}
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: '#047857',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        width: '110px',
                                      }}
                                    >
                                      💳 Pay Online
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}

        {/* TAB: AUDIT LOGS */}
        {activeTab === 'AUDIT' && (
          <Card padded style={{ background: '#fff' }}>
            <h3 className="h3" style={{ marginBottom: '14px' }}>Immutable Admin Audit Log Trail</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ background: 'var(--bg-soft)', padding: '10px 12px', borderRadius: 'var(--r-m)', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{log.action} — Target: {log.targetId}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>{log.details}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Admin: {log.adminName}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Fullscreen Lightbox Modal for Odometer Evidence */}
        {modalMeterImage && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setModalMeterImage(null)}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: '1px solid #E5E7EB',
                  background: '#F9FAFB',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                    📸 Odometer Evidence — {modalMeterImage.ref}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    Customer: <b>{modalMeterImage.customer}</b> · Driver: <b>{modalMeterImage.driver}</b> {modalMeterImage.km ? `· Meter Reading: ${modalMeterImage.km} KM` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMeterImage(null)}
                  style={{
                    background: '#EF4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close Preview
                </button>
              </div>

              {/* GPS Copy Coordinates & Google Maps Toolbar */}
              <div
                style={{
                  padding: '10px 20px',
                  background: '#EFF6FF',
                  borderBottom: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📍 GPS Location:
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${(modalMeterImage.lat ?? 12.84507).toFixed(5)}, ${(modalMeterImage.lng ?? 74.84997).toFixed(5)}`}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  title="Click to select GPS coordinates for easy copy"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: '#FFFFFF',
                    border: '1.5px solid #3B82F6',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    width: '180px',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const coords = `${(modalMeterImage.lat ?? 12.84507).toFixed(5)}, ${(modalMeterImage.lng ?? 74.84997).toFixed(5)}`;
                    navigator.clipboard.writeText(coords);
                    setCopyGpsSuccess(true);
                    setTimeout(() => setCopyGpsSuccess(false), 2000);
                  }}
                  style={{
                    background: copyGpsSuccess ? '#16A34A' : '#2563EB',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  {copyGpsSuccess ? '✓ Coordinates Copied!' : '📋 Copy GPS Coordinates'}
                </button>
                <a
                  href={`https://www.google.com/maps?q=${modalMeterImage.lat ?? 12.84507},${modalMeterImage.lng ?? 74.84997}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  🗺️ Open in Google Maps
                </a>
              </div>

              <div style={{ padding: '16px', textAlign: 'center', overflow: 'auto', maxHeight: '70vh' }}>
                <img
                  src={modalMeterImage.url}
                  alt={`Odometer reading for ${modalMeterImage.ref}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {invoiceBooking && (
          <CustomerInvoiceModal
            booking={invoiceBooking}
            onClose={() => setInvoiceBooking(null)}
          />
        )}

        {onlinePaymentBooking && (
          <OnlinePaymentModal
            booking={onlinePaymentBooking}
            onClose={() => setOnlinePaymentBooking(null)}
            onPaymentSuccess={() => {
              setBookings(getAdminBookings());
            }}
          />
        )}

        {/* Detailed Payment Audit Ledger Modal */}
        {selectedPaymentDetail && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setSelectedPaymentDetail(null)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                    💳 Customer Financial Ledger — {selectedPaymentDetail.bookingReference}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    Customer: <b>{selectedPaymentDetail.customerName}</b> ({selectedPaymentDetail.customerPhone})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetail(null)}
                  style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Financial Breakdown */}
              <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E5E7EB', fontSize: '13px' }}>
                  <span>Base Estimated Fare</span>
                  <span style={{ fontWeight: 700 }}>₹{(selectedPaymentDetail.estimatedFare || 0).toLocaleString('en-IN')}</span>
                </div>
                {selectedPaymentDetail.tollCharges ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E5E7EB', fontSize: '13px', color: '#B45309' }}>
                    <span>+ FASTag Toll Gate Fares</span>
                    <span style={{ fontWeight: 700 }}>₹{selectedPaymentDetail.tollCharges}</span>
                  </div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #D1D5DB', fontSize: '14px', fontWeight: 800 }}>
                  <span>Net Total Ride Charges</span>
                  <span>₹{((selectedPaymentDetail.estimatedFare || 0) + (selectedPaymentDetail.tollCharges || 0)).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E5E7EB', fontSize: '13px', color: '#047857' }}>
                  <span>Online Advance Deposit Paid (Razorpay)</span>
                  <span style={{ fontWeight: 700 }}>- ₹{(selectedPaymentDetail.advancePaid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '6px', fontSize: '15px', fontWeight: 900, color: (selectedPaymentDetail.remainingFare || 0) === 0 ? '#047857' : '#DC2626' }}>
                  <span>Remaining Outstanding Balance</span>
                  <span>
                    ₹{(selectedPaymentDetail.remainingFare !== undefined ? selectedPaymentDetail.remainingFare : Math.max(0, (selectedPaymentDetail.estimatedFare || 0) + (selectedPaymentDetail.tollCharges || 0) - (selectedPaymentDetail.advancePaid || 0))).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '16px' }}>
                <div>🚀 <b>Trip Start Date & Time:</b> {selectedPaymentDetail.tripStartedAt ? new Date(selectedPaymentDetail.tripStartedAt).toLocaleString('en-IN') : (selectedPaymentDetail.pickupTime || (selectedPaymentDetail.createdAt ? new Date(selectedPaymentDetail.createdAt).toLocaleDateString('en-IN') : 'N/A'))}</div>
                <div>🏁 <b>Trip End Date & Time:</b> {selectedPaymentDetail.tripCompletedAt ? new Date(selectedPaymentDetail.tripCompletedAt).toLocaleString('en-IN') : (selectedPaymentDetail.status === 'COMPLETED' ? (selectedPaymentDetail.tollEnteredAt ? new Date(selectedPaymentDetail.tollEnteredAt).toLocaleString('en-IN') : 'Completed') : (selectedPaymentDetail.status === 'CANCELLED' ? 'Cancelled' : 'Ongoing / Scheduled'))}</div>
                <div>📍 <b>Pickup Address:</b> {selectedPaymentDetail.pickupAddress}</div>
                <div>🏁 <b>Drop Destination:</b> {selectedPaymentDetail.dropAddress}</div>
                <div>👨‍✈️ <b>Assigned Chauffeur:</b> {selectedPaymentDetail.assignedDriverName || 'Not Dispatched'} {selectedPaymentDetail.driverPhone ? `(${selectedPaymentDetail.driverPhone})` : ''}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button
                  onClick={() => {
                    setInvoiceBooking(selectedPaymentDetail);
                    setSelectedPaymentDetail(null);
                  }}
                  variant="ghost"
                  style={{ fontSize: '12px', border: '1px solid #D1D5DB' }}
                >
                  🧾 View & Print Tax Invoice
                </Button>
                <Button
                  onClick={() => {
                    setOnlinePaymentBooking(selectedPaymentDetail);
                    setSelectedPaymentDetail(null);
                  }}
                  variant="accent"
                  style={{ fontSize: '12px' }}
                >
                  💳 Open Payment Modal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Record Manual Payment Modal */}
        {showRecordPaymentModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setShowRecordPaymentModal(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                maxWidth: '520px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                  💵 Log / Record Customer Payment
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordCustomerPaymentSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                    Select Customer Booking Reference
                  </label>
                  <select
                    value={recordPaymentBookingId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      setRecordPaymentBookingId(bId);
                      const target = bookings.find((b) => b.id === bId || b.bookingReference === bId);
                      if (target) {
                        const remaining = target.remainingFare !== undefined
                          ? target.remainingFare
                          : Math.max(0, (target.estimatedFare || 0) + (target.tollCharges || 0) - (target.advancePaid || 0));
                        setRecordPaymentAmount(remaining.toString());
                      }
                    }}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    required
                  >
                    <option value="">-- Choose Booking Reference --</option>
                    {bookings.map((b) => {
                      const remaining = b.remainingFare !== undefined
                        ? b.remainingFare
                        : Math.max(0, (b.estimatedFare || 0) + (b.tollCharges || 0) - (b.advancePaid || 0));
                      return (
                        <option key={b.id} value={b.id}>
                          {b.bookingReference} — {b.customerName} (Bal: ₹{remaining})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                      Payment Category
                    </label>
                    <select
                      value={recordPaymentType}
                      onChange={(e) => setRecordPaymentType(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    >
                      <option value="REMAINING_BALANCE">Remaining Ride Balance</option>
                      <option value="ADVANCE">Advance Deposit</option>
                      <option value="FULL_SETTLEMENT">Full Settlement</option>
                      <option value="MANUAL_ADJUSTMENT">Manual Fare Adjustment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                      Payment Mode
                    </label>
                    <select
                      value={recordPaymentMethod}
                      onChange={(e) => setRecordPaymentMethod(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    >
                      <option value="CASH_TO_DRIVER">💵 Cash Paid to Driver</option>
                      <option value="DIRECT_UPI">📱 Direct UPI / PhonePe / GPay</option>
                      <option value="RAZORPAY_ONLINE">💳 Razorpay Online Gateway</option>
                      <option value="BANK_TRANSFER">🏦 Direct Bank Transfer / NEFT</option>
                      <option value="OTHER">⚡ Other Settlement</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                      Amount Received (₹ INR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={recordPaymentAmount}
                      onChange={(e) => setRecordPaymentAmount(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                      Transaction Ref / UTR (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR123456789"
                      value={recordPaymentTxnRef}
                      onChange={(e) => setRecordPaymentTxnRef(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                    Audit Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Payment collected by driver Ramesh at Udupi destination"
                    value={recordPaymentNotes}
                    onChange={(e) => setRecordPaymentNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <Button type="button" onClick={() => setShowRecordPaymentModal(false)} variant="ghost" style={{ fontSize: '13px', border: '1px solid #D1D5DB' }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" style={{ fontSize: '13px' }}>
                    ✓ Record & Update Balance
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Cancellation Confirmation Modal */}
        {cancelBookingModalTarget && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setCancelBookingModalTarget(null)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                maxWidth: '480px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🚫 Cancel Customer Booking
                </h3>
                <button
                  type="button"
                  onClick={() => setCancelBookingModalTarget(null)}
                  style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12.5px', color: '#7F1D1D' }}>
                <div>Are you sure you want to cancel booking <b>{cancelBookingModalTarget.bookingReference}</b>?</div>
                <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
                  👤 Customer: <b>{cancelBookingModalTarget.customerName}</b> ({cancelBookingModalTarget.customerPhone})
                </div>
                <div style={{ fontSize: '11.5px' }}>
                  📍 Route: {cancelBookingModalTarget.pickupAddress} ➔ {cancelBookingModalTarget.dropAddress}
                </div>
              </div>

              <form onSubmit={handleConfirmCancelBooking}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                    Reason for Cancellation (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Customer requested cancellation / Duplicate booking / Vehicle unavailable"
                    value={cancellationReasonInput}
                    onChange={(e) => setCancellationReasonInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <Button type="button" onClick={() => setCancelBookingModalTarget(null)} variant="ghost" style={{ fontSize: '13px', border: '1px solid #D1D5DB' }}>
                    Keep Booking Active
                  </Button>
                  <Button type="submit" style={{ fontSize: '13px', background: '#DC2626', color: '#fff', border: 'none' }}>
                    🚫 Confirm & Cancel Booking
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};
