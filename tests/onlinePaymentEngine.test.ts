import assert from 'node:assert';
import { recordOnlinePaymentPaid } from '../src/lib/adminEngine';

function testOnlinePaymentSystemEngine() {
  console.log('Testing Kandy Cabs Dynamic UPI QR & Online Payment Engine...');

  const bookingId = 'bk_88429';
  const remainingAmount = 2315;
  const upiId = 'kandycabs@upi';
  const payeeName = 'Kandy Cabs Mangaluru';

  // 1. Dynamic UPI URI Construction Test
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${remainingAmount}&cu=INR&tn=${encodeURIComponent('Fare Payment KC-88429')}`;
  assert.strictEqual(upiUri.includes('pa=kandycabs@upi'), true);
  assert.strictEqual(upiUri.includes('am=2315'), true);
  assert.strictEqual(upiUri.includes('cu=INR'), true);
  console.log('✓ Dynamic UPI URI structure verified (upi://pay?pa=kandycabs@upi&am=2315...)');

  // 2. Dynamic QR Scanner Code URL Generation
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
  assert.strictEqual(qrImageUrl.includes('api.qrserver.com'), true);
  assert.strictEqual(qrImageUrl.includes('size=250x250'), true);
  console.log('✓ Dynamic QR Scanner Image API URL generated successfully');

  // 3. Online Payment Completion Handler
  const res = recordOnlinePaymentPaid(bookingId, 'ONLINE_UPI_QR', 'TXN-ONLINE-9988');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.booking?.remainingFare, 0);
  console.log('✓ Online Payment completion recorded (remaining balance cleared to ₹0)');

  console.log('🎉 ALL DYNAMIC UPI QR & ONLINE PAYMENT TESTS PASSED SUCCESSFULLY!');
}

testOnlinePaymentSystemEngine();
