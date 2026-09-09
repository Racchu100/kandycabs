'use client';

export const downloadItineraryPdfFile = async (elementId: string, filename: string) => {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Dynamically load html2pdf.js if not already present
  if (!(window as any).html2pdf) {
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    } catch {
      window.print();
      return;
    }
  }

  if ((window as any).html2pdf) {
    try {
      const opt = {
        margin: [0.15, 0.15, 0.15, 0.15],
        filename: filename || 'KandyCabs_Travel_Itinerary.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await (window as any).html2pdf().set(opt).from(element).save();
    } catch {
      window.print();
    }
  } else {
    window.print();
  }
};

export const shareItineraryViaWhatsAppWithPdf = async (booking: any, elementId?: string) => {
  const bId = booking.bookingReference || booking.id || 'KC-1001';
  const cleanId = encodeURIComponent(bId.replace(/[^a-zA-Z0-9-]/g, ''));
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const pdfUrl = `${origin}/itinerary/${cleanId}?pdf=true`;

  let cleanPhone = (booking.customerPhone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  const cName = booking.customerName || 'Valued Guest';
  const sType = booking.serviceType || booking.tripMode || 'Outstation Cab Service';
  const pTime = booking.pickupTime || booking.pickupDate || 'As Scheduled';
  const pick = booking.pickupAddress || booking.pickupLocation || 'Mangaluru';
  const drop = booking.dropAddress || booking.dropLocation || 'Destination';
  const vName = booking.vehicleName || booking.vehicleModel || booking.vehicleType || 'Swift Dzire';
  const vReg = booking.assignedVehicleReg || booking.assignedVehicleNo || 'KA 19 C 4829';
  const dName = booking.assignedDriverName || booking.driverName || 'Suresh Gowda';
  const dPhone = booking.driverPhone || booking.assignedDriverPhone || '9900887777';
  const estFare = booking.estimatedFare || booking.estimatedPrice || 0;
  const advPaid = booking.advancePaid !== undefined ? booking.advancePaid : (booking.advanceAmount || 0);
  const balDue = booking.remainingFare !== undefined ? booking.remainingFare : Math.max(0, estFare - advPaid);

  // 1. Download actual PDF file to user's device
  if (elementId) {
    try {
      await downloadItineraryPdfFile(elementId, `KandyCabs_Itinerary_${cleanId}.pdf`);
    } catch {}
  }

  // 2. Format WhatsApp PDF message
  const textMsg = `*📄 KANDY CABS - OFFICIAL TRAVEL ITINERARY (PDF FORMAT)*
----------------------------------------
*Booking ID:* ${bId}
*Passenger Name:* ${cName}

*📥 VIEW / DOWNLOAD OFFICIAL ITINERARY PDF:*
${pdfUrl}

----------------------------------------
*📍 TRIP DETAILS*
*Service:* ${sType}
*Reporting Time:* ${pTime}
*Pickup:* ${pick}
*Drop:* ${drop}

*🚙 VEHICLE & CHAUFFEUR*
*Car:* ${vName} (${vReg})
*Chauffeur:* ${dName} (${dPhone})

----------------------------------------
*💰 FARE BREAKDOWN*
*Total Fare:* ₹${estFare.toLocaleString('en-IN')}
*Advance Paid:* ₹${advPaid.toLocaleString('en-IN')}
*Balance Payable to Driver:* ₹${balDue.toLocaleString('en-IN')}

----------------------------------------
*📞 24x7 Assistance:* +91 96068 53535 / +91 90080 90090
Thank you for choosing *KANDY CABS*!`;

  // 3. Native Device Web Share API (Android / iOS natively passes to WhatsApp app)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Kandy Cabs Travel Itinerary - ${bId}`,
        text: textMsg,
        url: pdfUrl,
      });
      return;
    } catch {}
  }

  // 4. Redirect to WhatsApp Web / App
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }
};
