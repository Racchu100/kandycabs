'use client';

import React, { useState } from 'react';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';

import { downloadItineraryPdfFile, shareItineraryViaWhatsAppWithPdf } from '@/lib/pdfItineraryExporter';

interface CustomerItineraryModalProps {
  booking: any;
  onClose: () => void;
}

export const CustomerItineraryModal: React.FC<CustomerItineraryModalProps> = ({ booking, onClose }) => {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // Form State initialized with booking data (with exact fallbacks matching sample PDF)
  const [bookingId, setBookingId] = useState<string>(
    booking?.bookingReference || booking?.id || '# 2026/KCMLR/0209(SEDAN-ETIOS)02-OWD'
  );
  const [itineraryDate, setItineraryDate] = useState<string>(
    booking?.bookingDate
      ? new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' })
      : '2nd Sep, Wed 2026'
  );

  // Trip Details
  const [pickupDate, setPickupDate] = useState<string>(booking?.pickupDate || '2nd September 2026 (Wed)');
  const [pickupTime, setPickupTime] = useState<string>(booking?.pickupTime || '03:30 PM');
  const [reportingTime, setReportingTime] = useState<string>(booking?.reportingTime || '03:15 AM (Chauffeur should report at this time)');
  const [tripType, setTripType] = useState<string>(
    booking?.serviceType || booking?.tripMode || booking?.tripType || 'Mangaluru Airport → Yermal, Udupi (Outstation – One Way Drop)'
  );
  const [vehicleType, setVehicleType] = useState<string>(
    booking?.vehicleType || booking?.vehicleName || booking?.vehicleModel || 'Exclusive Toyota Etios (A/C) 4+1 Seater'
  );

  // Passenger Details
  const [passengerName, setPassengerName] = useState<string>(booking?.customerName || 'Mr. Nikunj Berlia');
  const [passengerContact, setPassengerContact] = useState<string>(booking?.customerPhone || '+919830707643');

  // Pick-up & Drop Details
  const [pickupAddress, setPickupAddress] = useState<string>(
    booking?.pickupAddress || booking?.pickupLocation || 'Mangaluru International Airport, Bajpe Main Rd, Kenjar, Mangaluru, Karnataka 574142.'
  );
  const [pickupLocationUrl, setPickupLocationUrl] = useState<string>(
    booking?.pickupMapsUrl || 'https://share.google/q2dI2j1uEfJliNNHS'
  );
  const [dropAddress, setDropAddress] = useState<string>(
    booking?.dropAddress || booking?.dropLocation || 'Yermal Drop off: Magical shores, Fisheries Road, Yermal, Bada, Karnataka 574119.'
  );
  const [dropLocationUrl, setDropLocationUrl] = useState<string>(
    booking?.dropMapsUrl || 'https://maps.app.goo.gl/waD63yzL6BZJVsRm6?g_st=aw'
  );

  // Chauffeur & Car Details
  const [chauffeurName, setChauffeurName] = useState<string>(
    booking?.assignedDriverName || booking?.driverName || 'Abeed'
  );
  const [chauffeurContact, setChauffeurContact] = useState<string>(
    booking?.assignedDriverPhone || booking?.driverPhone || '9844939498'
  );
  const [carNumber, setCarNumber] = useState<string>(
    booking?.assignedVehicleNo || booking?.assignedVehicleReg || booking?.vehicleNumber || 'KA20 AC 3541'
  );
  const [carType, setCarType] = useState<string>(
    booking?.carType || 'KIA Carens (AC) 6+1 (White)'
  );

  // Important Note & Payment Info
  const [importantNote, setImportantNote] = useState<string>(
    'For safety reasons, customers are requested not to make cash payments to the chauffeur. Payments should be made online only after receiving the tax invoice.'
  );
  const [upiDetails, setUpiDetails] = useState<string>(
    'Google pay | PhonePe - Number: 9008090090 "KANDY CABS"'
  );
  const [bankAccountDetails, setBankAccountDetails] = useState<string>(
    'Name: "KANDY CABS", Bank: State Bank of India, Account No.: 41599687095 Branch: Chotamangalore, IFSC: SBIN0003669. Account type: Current'
  );
  const [assistanceContacts, setAssistanceContacts] = useState<string>(
    '9900887777 | 9008090090 | Email: kandycabsmlr@gmail.com'
  );

  const handlePrint = () => {
    const cleanId = (bookingId || '').replace(/[^a-zA-Z0-9-]/g, '');
    downloadItineraryPdfFile('modal-pdf-itinerary-sheet', `KandyCabs_Itinerary_${cleanId}.pdf`);
  };

  const handleOpenStandaloneView = () => {
    const cleanId = encodeURIComponent(bookingId.replace(/[^a-zA-Z0-9-]/g, ''));
    if (typeof window !== 'undefined') {
      window.open(`/itinerary/${cleanId}?pdf=true`, '_blank');
    }
  };

  const handleSendWhatsApp = () => {
    shareItineraryViaWhatsAppWithPdf(
      {
        ...booking,
        bookingReference: bookingId,
        customerName: passengerName,
        customerPhone: passengerContact,
        pickupAddress,
        dropAddress,
        pickupTime,
        serviceType: tripType,
        vehicleName: carType,
        assignedVehicleReg: carNumber,
        assignedDriverName: chauffeurName,
        driverPhone: chauffeurContact,
      },
      'modal-pdf-itinerary-sheet'
    );
  };

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto"
      style={{ zIndex: 99999 }}
    >
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

      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden print-full-width my-4 border border-slate-300 text-slate-800">
        
        {/* TOP ADMIN ACTION BAR (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded tracking-wider uppercase">
              PDF ITINERARY
            </span>
            <h2 className="font-bold text-base text-blue-300">📄 Travel Itinerary Document Generator</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  mode === 'preview' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                👁️ View Document PDF
              </button>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  mode === 'edit' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                ✏️ Edit Fields
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenStandaloneView}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
              title="Open full page PDF view on website"
            >
              🌐 Open Website PDF Page
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            >
              📲 Send PDF via WhatsApp
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            >
              🖨️ Download / Print PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* EDIT FORM MODE */}
        {mode === 'edit' && (
          <div className="no-print p-6 bg-slate-50 border-b border-slate-200 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-950 font-medium">
              💡 <strong>Edit Mode:</strong> Modify any field below. Changes instantly update the visual PDF document preview and WhatsApp message generator.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Booking ID</label>
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Itinerary Date Header</label>
                <input
                  type="text"
                  value={itineraryDate}
                  onChange={(e) => setItineraryDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>

            {/* TRIP DETAILS EDIT */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-blue-800 uppercase tracking-wide border-b border-slate-100 pb-1">
                Trip Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Pickup Date</label>
                  <input
                    type="text"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Pickup Time & Reporting Time</label>
                  <input
                    type="text"
                    value={`${pickupTime} | Reporting: ${reportingTime}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.split('|');
                      if (parts[0]) setPickupTime(parts[0].trim());
                      if (parts[1]) setReportingTime(parts[1].replace('Reporting:', '').trim());
                    }}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Trip Type / Route</label>
                  <input
                    type="text"
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Vehicle Type Requested</label>
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* PASSENGER & CHAUFFEUR EDIT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-blue-800 uppercase tracking-wide border-b border-slate-100 pb-1">
                  Passenger Details
                </h4>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Passenger Name</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={passengerContact}
                    onChange={(e) => setPassengerContact(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-blue-800 uppercase tracking-wide border-b border-slate-100 pb-1">
                  Chauffeur & Car Details
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={chauffeurName}
                      onChange={(e) => setChauffeurName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Driver Contact</label>
                    <input
                      type="text"
                      value={chauffeurContact}
                      onChange={(e) => setChauffeurContact(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Car Registration No.</label>
                    <input
                      type="text"
                      value={carNumber}
                      onChange={(e) => setCarNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Car Model & Type</label>
                    <input
                      type="text"
                      value={carType}
                      onChange={(e) => setCarType(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ROUTE ADDRESSES EDIT */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-blue-800 uppercase tracking-wide border-b border-slate-100 pb-1">
                Pick-up & Drop Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mangaluru Pick-up Address</label>
                  <textarea
                    rows={2}
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Location URL (Google Maps)"
                    value={pickupLocationUrl}
                    onChange={(e) => setPickupLocationUrl(e.target.value)}
                    className="w-full p-1.5 mt-1 border border-slate-300 rounded font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Drop off Address</label>
                  <textarea
                    rows={2}
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Location URL (Google Maps)"
                    value={dropLocationUrl}
                    onChange={(e) => setDropLocationUrl(e.target.value)}
                    className="w-full p-1.5 mt-1 border border-slate-300 rounded font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2 rounded-lg shadow"
              >
                View Updated PDF Document ➔
              </button>
            </div>
          </div>
        )}

        {/* PIXEL-PERFECT PDF DOCUMENT CANVAS (Matches User Sample Image Exactly) */}
        <div id="modal-pdf-itinerary-sheet" className="p-6 sm:p-10 bg-white text-slate-900 font-sans space-y-5">
          
          {/* HEADER SEPARATOR ROW */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-center justify-between gap-4">
            
            {/* LOGO & ADDRESS */}
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
              Date: {itineraryDate}
            </div>
          </div>

          {/* BLUE BOOKING ID BANNER */}
          <div className="bg-blue-600 text-white py-2.5 px-4 rounded-none sm:rounded font-bold text-sm sm:text-base text-left tracking-wide shadow-xs">
            Booking ID: {bookingId.startsWith('#') ? bookingId : `# ${bookingId}`}
          </div>

          {/* TRIP DETAILS SECTION */}
          <div className="space-y-1 text-xs leading-relaxed">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Trip Detaills:</h3>
            <p><span className="font-semibold text-slate-900">Pickup Date:</span> {pickupDate}</p>
            <p><span className="font-semibold text-slate-900">Pickup Time:</span> {pickupTime} | <span className="font-semibold text-slate-900">Reporting Time:</span> {reportingTime}</p>
            <p><span className="font-semibold text-slate-900">Trip Type:</span> {tripType}</p>
            <p><span className="font-semibold text-slate-900">Vehicle Type:</span> {vehicleType}</p>
          </div>

          {/* PASSENGER DETAILS SECTION */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Passenger Details:</h3>
            <p><span className="font-semibold text-slate-900">Name:</span> {passengerName}</p>
            <p><span className="font-semibold text-slate-900">Contact:</span> {passengerContact}</p>
          </div>

          {/* PICK-UP & DROP DETAILS SECTION */}
          <div className="space-y-2 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Pick-up & Drop Details:</h3>
            
            <div>
              <p><span className="font-semibold text-slate-900">Mangaluru Pick-up Address:</span> {pickupAddress}</p>
              {pickupLocationUrl && (
                <p>
                  <span className="font-semibold text-slate-900">Location:</span>{' '}
                  <a href={pickupLocationUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">
                    {pickupLocationUrl}
                  </a>
                </p>
              )}
            </div>

            <div>
              <p><span className="font-semibold text-slate-900">Drop off Address:</span> {dropAddress}</p>
              {dropLocationUrl && (
                <p>
                  <span className="font-semibold text-slate-900">Location:</span>{' '}
                  <a href={dropLocationUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">
                    {dropLocationUrl}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* CHAUFFEUR & CAR DETAILS SECTION */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Chauffeur & Car Details:</h3>
            <p><span className="font-semibold text-slate-900">Name:</span> {chauffeurName}</p>
            <p><span className="font-semibold text-slate-900">Contact:</span> {chauffeurContact}</p>
            <p><span className="font-semibold text-slate-900">Car No.:</span> {carNumber}</p>
            <p><span className="font-semibold text-slate-900">Car type:</span> {carType}</p>
          </div>

          {/* IMPORTANT NOTE (RED HEADING) */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-red-600 text-sm mb-1">Important Note:</h3>
            <p className="text-slate-800 font-normal">
              {importantNote}
            </p>
          </div>

          {/* MODE OF PAYMENT SECTION */}
          <div className="space-y-1 text-xs leading-relaxed pt-2">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Mode of payment:</h3>
            <p><span className="font-bold text-blue-700">UPI:</span> {upiDetails}</p>
            <p><span className="font-bold text-blue-700">Bank Account Details:</span> {bankAccountDetails}</p>
          </div>

          {/* 24x7 ASSISTANCE */}
          <div className="text-xs pt-2">
            <p className="font-normal text-slate-800">
              <span className="font-bold italic">For 24×7 Assistance:</span> {assistanceContacts}
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

      </div>
    </div>
  );
};
