'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';

import { downloadItineraryPdfFile, shareItineraryViaWhatsAppWithPdf } from '@/lib/pdfItineraryExporter';

function ItineraryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = (params?.id as string) || '';
  const isAutoPdf = searchParams?.get('pdf') === 'true' || searchParams?.get('print') === 'true';

  const [booking, setBooking] = useState<any | null>(null);

  const queryDriver = searchParams?.get('driver');
  const queryPhone = searchParams?.get('phone');
  const queryCar = searchParams?.get('car');
  const queryModel = searchParams?.get('model');

  useEffect(() => {
    let resolvedBooking: any = null;

    try {
      // 1. Check live dispatch edits
      const storedEdits = localStorage.getItem('kc_live_dispatch_edits');
      if (storedEdits) {
        const parsedEdits = JSON.parse(storedEdits);
        const editMatch =
          parsedEdits[rawId] ||
          Object.values(parsedEdits).find(
            (e: any) =>
              e.bookingReference?.toLowerCase() === rawId.toLowerCase() ||
              e.id?.toLowerCase() === rawId.toLowerCase() ||
              e.bookingReference?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === rawId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          );
        if (editMatch) {
          resolvedBooking = editMatch;
        }
      }

      // 2. Check admin bookings array if no edit match
      if (!resolvedBooking) {
        const storedBookings = localStorage.getItem('kc_admin_bookings');
        if (storedBookings) {
          const parsed = JSON.parse(storedBookings);
          const match = parsed.find(
            (b: any) =>
              b.bookingReference?.toLowerCase() === rawId.toLowerCase() ||
              b.id?.toLowerCase() === rawId.toLowerCase() ||
              b.bookingReference?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === rawId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          );
          if (match) {
            resolvedBooking = match;
          }
        }
      }
    } catch {}

    // 3. Fallback sample data matching booking KC-73744
    if (!resolvedBooking) {
      resolvedBooking = {
        id: rawId || 'KC-73744',
        bookingReference: rawId || 'KC-73744',
        bookingDate: '2026-09-08',
        pickupDate: '8th September 2026',
        pickupTime: '08:00 AM',
        reportingTime: '07:45 AM (Chauffeur should report at this time)',
        serviceType: 'Mangaluru City → Dharmasthala Sri Manjunatha Temple (One-Way Outstation)',
        vehicleType: 'Swift Dzire (AC Sedan) 4+1 Seater',
        customerName: 'graphitex',
        customerPhone: '9187336058',
        pickupAddress: 'Mangaluru City, Karnataka',
        pickupMapsUrl: 'https://maps.google.com/?q=Mangaluru+City',
        dropAddress: 'Dharmasthala Sri Manjunatha Temple, Karnataka',
        dropMapsUrl: 'https://maps.google.com/?q=Dharmasthala+Temple',
        assignedDriverName: 'Suresh Gowda',
        assignedDriverPhone: '9900887777',
        assignedVehicleNo: 'KA 19 C 4829',
        carType: 'Maruti Suzuki Swift Dzire (AC)',
        estimatedFare: 1478,
        advancePaid: 296,
        remainingFare: 1182,
      };
    }

    // Override with any live URL query parameters passed
    if (queryDriver || queryPhone || queryCar || queryModel) {
      resolvedBooking = {
        ...resolvedBooking,
        assignedDriverName: queryDriver || resolvedBooking.assignedDriverName,
        assignedDriverPhone: queryPhone || resolvedBooking.assignedDriverPhone || resolvedBooking.driverPhone,
        driverPhone: queryPhone || resolvedBooking.driverPhone || resolvedBooking.assignedDriverPhone,
        assignedVehicleNo: queryCar || resolvedBooking.assignedVehicleNo || resolvedBooking.assignedVehicleReg,
        assignedVehicleReg: queryCar || resolvedBooking.assignedVehicleReg || resolvedBooking.assignedVehicleNo,
        vehicleType: queryModel || resolvedBooking.vehicleType || resolvedBooking.vehicleModel,
        carType: queryModel || resolvedBooking.carType || resolvedBooking.vehicleModel,
      };
    }

    setBooking(resolvedBooking);
  }, [rawId, queryDriver, queryPhone, queryCar, queryModel]);

  // Auto trigger browser PDF print viewer if ?pdf=true is present
  useEffect(() => {
    if (booking && isAutoPdf && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        downloadItineraryPdfFile('pdf-itinerary-sheet', `KandyCabs_Itinerary_${rawId}.pdf`);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [booking, isAutoPdf, rawId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-600 font-bold">
        Loading PDF Travel Itinerary...
      </div>
    );
  }

  const handleDownloadPdf = () => {
    downloadItineraryPdfFile('pdf-itinerary-sheet', `KandyCabs_Itinerary_${booking.bookingReference || booking.id}.pdf`);
  };

  const handleWhatsAppShare = () => {
    shareItineraryViaWhatsAppWithPdf(booking, 'pdf-itinerary-sheet');
  };

  return (
    <main className="min-h-screen bg-slate-200 py-6 px-2 sm:px-4 print:p-0 print:bg-white text-slate-900">
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <Container>
        {/* TOP PDF ACTION BAR */}
        <div className="no-print bg-slate-900 text-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KandyCabsLogo className="h-8 w-auto text-amber-500" />
            <div>
              <h1 className="font-black text-sm sm:text-base text-amber-400">KANDY CABS — TRAVEL ITINERARY PDF</h1>
              <p className="text-xs text-slate-300">Document Reference: {booking.bookingReference || booking.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-all flex items-center gap-1.5"
            >
              📥 Download PDF File
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-all flex items-center gap-1.5"
            >
              📲 Redirect & Share PDF via WhatsApp
            </button>
          </div>
        </div>

        {/* PIXEL-PERFECT A4 PDF SHEET (Matches User Sample Image Exactly) */}
        <div id="pdf-itinerary-sheet" className="bg-white max-w-4xl mx-auto rounded-none sm:rounded-xl shadow-2xl overflow-hidden print-full-width border border-slate-300 p-6 sm:p-10 space-y-5 text-slate-900 font-sans">
          
          {/* HEADER SEPARATOR ROW */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KandyCabsLogo className="h-16 w-auto text-amber-500" />
              <div className="text-xs text-slate-800 leading-tight">
                <p className="font-normal">Inland Impala, Vidyaranyanagar, Ullala - 575020</p>
                <p className="font-medium mt-0.5">9900887777 / 9008090090</p>
                <p className="font-bold text-slate-900 mt-0.5">GSTIN : 29AIEPR4688PIZ4</p>
              </div>
            </div>
          </div>

          {/* TITLE & DATE ROW */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-blue-700 tracking-wide mx-auto pl-12 uppercase">
              TRAVEL ITINERARY
            </h1>
            <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Date: {booking.bookingDate || '8th Sep 2026'}
            </div>
          </div>

          {/* BLUE BOOKING ID BANNER */}
          <div className="bg-blue-600 text-white py-2.5 px-4 rounded-none sm:rounded font-bold text-sm sm:text-base text-left tracking-wide shadow-xs">
            Booking ID: {booking.bookingReference || booking.id || '# 2026/KCMLR/0209(SEDAN-ETIOS)02-OWD'}
          </div>

          {/* TRIP DETAILS SECTION */}
          <div className="space-y-1 text-xs leading-relaxed">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Trip Detaills:</h3>
            <p><span className="font-semibold text-slate-900">Pickup Date:</span> {booking.pickupDate || '8th September 2026'}</p>
            <p><span className="font-semibold text-slate-900">Pickup Time:</span> {booking.pickupTime || '08:00 AM'} | <span className="font-semibold text-slate-900">Reporting Time:</span> {booking.reportingTime || '07:45 AM (Chauffeur should report at this time)'}</p>
            <p><span className="font-semibold text-slate-900">Trip Type:</span> {booking.serviceType || 'Mangaluru City → Dharmasthala Sri Manjunatha Temple'}</p>
            <p><span className="font-semibold text-slate-900">Vehicle Type:</span> {booking.vehicleType || 'Swift Dzire (AC Sedan) 4+1 Seater'}</p>
          </div>

          {/* PASSENGER DETAILS SECTION */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Passenger Details:</h3>
            <p><span className="font-semibold text-slate-900">Name:</span> {booking.customerName || 'graphitex'}</p>
            <p><span className="font-semibold text-slate-900">Contact:</span> {booking.customerPhone || '9187336058'}</p>
          </div>

          {/* PICK-UP & DROP DETAILS SECTION */}
          <div className="space-y-2 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Pick-up & Drop Details:</h3>
            
            <div>
              <p><span className="font-semibold text-slate-900">Mangaluru Pick-up Address:</span> {booking.pickupAddress || 'Mangaluru City, Karnataka'}</p>
              {booking.pickupMapsUrl && (
                <p>
                  <span className="font-semibold text-slate-900">Location:</span>{' '}
                  <a href={booking.pickupMapsUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">
                    {booking.pickupMapsUrl}
                  </a>
                </p>
              )}
            </div>

            <div>
              <p><span className="font-semibold text-slate-900">Drop off Address:</span> {booking.dropAddress || 'Dharmasthala Sri Manjunatha Temple, Karnataka'}</p>
              {booking.dropMapsUrl && (
                <p>
                  <span className="font-semibold text-slate-900">Location:</span>{' '}
                  <a href={booking.dropMapsUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">
                    {booking.dropMapsUrl}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* CHAUFFEUR & CAR DETAILS SECTION */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Chauffeur & Car Details:</h3>
            <p><span className="font-semibold text-slate-900">Name:</span> {booking.assignedDriverName || 'Suresh Gowda'}</p>
            <p><span className="font-semibold text-slate-900">Contact:</span> {booking.assignedDriverPhone || booking.driverPhone || '9900887777'}</p>
            <p><span className="font-semibold text-slate-900">Car No.:</span> {booking.assignedVehicleNo || booking.assignedVehicleReg || 'KA 19 C 4829'}</p>
            <p><span className="font-semibold text-slate-900">Car type:</span> {booking.carType || 'Swift Dzire (AC) 4+1 (White)'}</p>
          </div>

          {/* IMPORTANT NOTE (RED HEADING) */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-red-600 text-sm mb-1">Important Note:</h3>
            <p className="text-slate-800 font-normal">
              For safety reasons, customers are requested not to make cash payments to the chauffeur. Payments should be made online only after receiving the tax invoice.
            </p>
          </div>

          {/* MODE OF PAYMENT SECTION */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Mode of payment:</h3>
            <p><span className="font-bold text-blue-700">UPI:</span> Google pay | PhonePe - Number: 9008090090 &ldquo;KANDY CABS&rdquo;</p>
            <p><span className="font-bold text-blue-700">Bank Account Details:</span> Name: &ldquo;KANDY CABS&rdquo;, Bank: State Bank of India, Account No.: 41599687095 Branch: Chotamangalore, IFSC: SBIN0003669. Account type: Current</p>
          </div>

          {/* 24x7 ASSISTANCE */}
          <div className="text-xs pt-2">
            <p className="font-normal text-slate-800">
              <span className="font-bold italic">For 24×7 Assistance:</span> 9900887777 | 9008090090 | Email: kandycabsmlr@gmail.com
            </p>
          </div>

          {/* SIGNATURE & JOURNEY WISH */}
          <div className="pt-8 flex items-end justify-between gap-4 text-xs">
            <div className="font-semibold text-slate-800">
              Have a safe and pleasant journey!
            </div>

            <div className="text-center">
              <div className="border border-slate-300 rounded p-1 mb-1 bg-slate-50/50 text-[10px] text-slate-600 font-serif italic">
                For KANDY CABS<br />
                <span className="font-bold text-slate-800">AUTHORIZED SIGNATORY</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                AUTHORISED SIGNATORY
              </span>
            </div>
          </div>

          {/* BOTTOM BLUE BANNER */}
          <div className="bg-blue-600 text-white py-2.5 px-4 text-center font-bold text-base tracking-wide rounded-none sm:rounded mt-6">
            Thank you for Choosing <span className="text-amber-300">&ldquo;KANDY CABS&rdquo;</span>
          </div>

        </div>
      </Container>
    </main>
  );
}

export default function StandaloneItineraryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-600 font-bold">Loading PDF...</div>}>
      <ItineraryContent />
    </Suspense>
  );
}
