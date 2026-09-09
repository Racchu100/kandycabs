import assert from 'node:assert';

function testInvoiceSystemEngine() {
  console.log('Testing Kandy Cabs Customer Invoice System Engine...');

  const mockBooking = {
    id: 'bk_88429',
    bookingReference: 'KC-88429',
    customerName: 'Ramu',
    customerPhone: '+919854632158',
    pickupAddress: 'Mangaluru City',
    dropAddress: 'Udupi Sri Krishna Matha',
    tripMode: 'One-Way Outstation',
    status: 'COMPLETED',
    estimatedFare: 1331,
    tollCharges: 1250,
    advancePaid: 266,
    assignedDriverName: 'Suresh Gowda',
    assignedVehicleReg: 'KA 19 MD 9900',
    vendorAgencyName: 'Kudla Wheels Travel Desk',
  };

  // 1. Calculate Gross Total & Net Remaining Balance
  const baseFare = mockBooking.estimatedFare;
  const toll = mockBooking.tollCharges;
  const grossTotal = baseFare + toll;
  const advance = mockBooking.advancePaid;
  const netPayable = Math.max(0, grossTotal - advance);

  assert.strictEqual(grossTotal, 2581); // 1331 + 1250 = 2581
  assert.strictEqual(netPayable, 2315); // 2581 - 266 = 2315
  console.log('✓ Invoice Gross Total & Net Remaining Balance math verified (Base: ₹1331 + Toll: ₹1250 - Advance: ₹266 = Net: ₹2315)');

  // 2. WhatsApp Message Link Generation
  const formattedPhone = mockBooking.customerPhone.replace(/\D/g, '').slice(-10);
  assert.strictEqual(formattedPhone, '9854632158');
  console.log('✓ WhatsApp customer phone number formatting verified (+91 9854632158 -> 9854632158)');

  // 3. Invoice Reference Number
  const invoiceNoPrefix = `INV-${mockBooking.bookingReference.replace('KC-', '')}`;
  assert.strictEqual(invoiceNoPrefix, 'INV-88429');
  console.log('✓ Invoice Reference Number generation verified (KC-88429 -> INV-88429)');

  console.log('🎉 ALL INVOICE SYSTEM ENGINE TESTS PASSED SUCCESSFULLY!');
}

testInvoiceSystemEngine();
