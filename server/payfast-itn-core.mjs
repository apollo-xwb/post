/**
 * Shared PayFast ITN validation + Firestore order updates (Express + Vercel).
 */
import crypto from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function encodePayFastValue(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, '+');
}

export function generateSignature(data, passphrase) {
  const keys = Object.keys(data)
    .filter((k) => k !== 'signature' && data[k] !== '' && data[k] != null)
    .sort();
  const paramString = keys.map((k) => `${k}=${encodePayFastValue(data[k])}`).join('&');
  const withPass = passphrase ? `${paramString}&passphrase=${encodePayFastValue(passphrase)}` : paramString;
  return md5(withPass);
}

export function getDb() {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required for ITN handler');
    }
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  return databaseId ? getFirestore(databaseId) : getFirestore();
}

/** Compare order total (ZAR) to PayFast ITN amount fields. */
export function amountsMatch(orderTotal, itnAmount) {
  const expected = Number(orderTotal);
  const received = parseFloat(String(itnAmount).trim().replace(',', '.'));
  if (!Number.isFinite(expected) || !Number.isFinite(received)) {
    return false;
  }
  return Math.abs(expected - received) < 0.01;
}

/**
 * @param {Record<string, string>} payload PayFast ITN POST fields
 * @returns {Promise<{ status: number; body: string }>}
 */
export async function handlePayFastItn(payload) {
  const passphrase = process.env.PAYFAST_PASSPHRASE || '';

  const signature = generateSignature(payload, passphrase);
  if (signature !== payload.signature) {
    console.warn('PayFast ITN: invalid signature');
    return { status: 400, body: 'Invalid signature' };
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  if (merchantId && payload.merchant_id !== merchantId) {
    return { status: 400, body: 'Invalid merchant' };
  }

  const orderId = payload.m_payment_id;
  const paymentStatus = payload.payment_status;
  const pfPaymentId = payload.pf_payment_id;

  if (!orderId) {
    return { status: 400, body: 'Missing m_payment_id' };
  }

  let paymentStatusField = 'pending';
  if (paymentStatus === 'COMPLETE') paymentStatusField = 'paid';
  else if (paymentStatus === 'CANCELLED') paymentStatusField = 'cancelled';
  else if (paymentStatus === 'FAILED') paymentStatusField = 'failed';

  try {
    const orderRef = getDb().collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      return { status: 404, body: 'Order not found' };
    }

    const orderData = snap.data() || {};

    if (paymentStatus === 'COMPLETE') {
      const itnAmount = payload.amount_gross ?? payload.amount;
      const orderTotal = orderData.totalPrice;
      if (
        orderTotal != null &&
        itnAmount != null &&
        String(itnAmount).trim() !== '' &&
        !amountsMatch(orderTotal, itnAmount)
      ) {
        console.warn('PayFast ITN: amount mismatch', {
          orderId,
          orderTotal,
          itnAmount,
        });
        return { status: 400, body: 'Amount mismatch' };
      }
    }

    const updates = {
      paymentStatus: paymentStatusField,
      paymentMethod: 'PayFast',
      payfastPaymentId: pfPaymentId || null,
      payfastItnStatus: paymentStatus,
      payfastItnAt: new Date().toISOString(),
    };

    if (paymentStatusField === 'paid') {
      updates.staffNote = `PayFast confirmed (Ref: ${pfPaymentId || 'n/a'})`;
    }

    await orderRef.update(updates);
    return { status: 200, body: 'OK' };
  } catch (err) {
    console.error('PayFast ITN handler error', err);
    return { status: 500, body: 'Server error' };
  }
}
