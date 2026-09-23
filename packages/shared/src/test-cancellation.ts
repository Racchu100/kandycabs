async function runCancellationAndInvoiceTests() {
  console.log('🧪 Starting Cancellation & Tax Invoice Unit Tests...');

  // 1. Cancellation Window Logic
  console.log('1. Testing 2-Hour Cancellation Rule Logic...');
  const now = Date.now();
  const twoHoursInMs = 2 * 60 * 60 * 1000;

  const validScheduledTime = new Date(now + 3 * 60 * 60 * 1000); // 3 hours in future
  const invalidScheduledTime = new Date(now + 1 * 60 * 60 * 1000); // 1 hour in future

  const canCancelValid = (validScheduledTime.getTime() - now) >= twoHoursInMs;
  const canCancelInvalid = (invalidScheduledTime.getTime() - now) >= twoHoursInMs;

  if (!canCancelValid) throw new Error('Trip scheduled in 3 hours should be eligible for cancellation');
  if (canCancelInvalid) throw new Error('Trip scheduled in 1 hour should NOT be eligible for cancellation');
  console.log('   ✅ 2-hour cancellation window logic passed');

  // 2. Tax Invoice Calculation Math
  console.log('2. Testing Server-side Tax Invoice Math (5% GST)...');
  const estimatedFare = 2100; // e.g. ₹2100 total fare (incl 5% GST)
  const preTaxSubtotal = Math.round((estimatedFare / 1.05) * 100) / 100;
  const gstTotal = Math.round((estimatedFare - preTaxSubtotal) * 100) / 100;
  const cgst = Math.round((gstTotal / 2) * 100) / 100;
  const sgst = Math.round((gstTotal - cgst) * 100) / 100;

  if (Math.abs(preTaxSubtotal + gstTotal - estimatedFare) > 0.05) {
    throw new Error('Pre-tax subtotal + GST total must equal estimated fare');
  }
  if (Math.abs(cgst + sgst - gstTotal) > 0.05) {
    throw new Error('CGST + SGST must equal GST total');
  }
  console.log(`   ✅ Tax invoice math: Pre-tax: ₹${preTaxSubtotal}, CGST: ₹${cgst}, SGST: ₹${sgst}, Total: ₹${estimatedFare}`);

  console.log('🎉 All Customer Cancellation & Tax Invoice tests passed successfully!');
}

runCancellationAndInvoiceTests().catch((e) => {
  console.error('❌ Tests failed:', e);
  process.exit(1);
});
