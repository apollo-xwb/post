/**
 * PayFast ITN handler — run with: node server/payfast-itn.mjs
 * Set VITE_PAYFAST_NOTIFY_URL (or PAYFAST_NOTIFY_URL) to https://your-host/api/payfast/itn
 *
 * Requires: firebase-admin, FIREBASE_SERVICE_ACCOUNT_JSON (service account JSON string)
 */
import express from 'express';
import crypto from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PORT = process.env.PAYFAST_ITN_PORT || 8787;

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function encodePayFastValue(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, '+');
}

function generateSignature(data, passphrase) {
  const keys = Object.keys(data)
    .filter((k) => k !== 'signature' && data[k] !== '' && data[k] != null)
    .sort();
  const paramString = keys.map((k) => `${k}=${encodePayFastValue(data[k])}`).join('&');
  const withPass = passphrase ? `${paramString}&passphrase=${encodePayFastValue(passphrase)}` : paramString;
  return md5(withPass);
}

function getDb() {
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

const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/api/payfast/itn', async (req, res) => {
  const payload = req.body || {};
  const passphrase = process.env.PAYFAST_PASSPHRASE || '';

  const signature = generateSignature(payload, passphrase);
  if (signature !== payload.signature) {
    console.warn('PayFast ITN: invalid signature');
    return res.status(400).send('Invalid signature');
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  if (merchantId && payload.merchant_id !== merchantId) {
    return res.status(400).send('Invalid merchant');
  }

  const orderId = payload.m_payment_id;
  const paymentStatus = payload.payment_status;
  const pfPaymentId = payload.pf_payment_id;

  if (!orderId) {
    return res.status(400).send('Missing m_payment_id');
  }

  let paymentStatusField = 'pending';
  if (paymentStatus === 'COMPLETE') paymentStatusField = 'paid';
  else if (paymentStatus === 'CANCELLED') paymentStatusField = 'cancelled';
  else if (paymentStatus === 'FAILED') paymentStatusField = 'failed';

  try {
    const orderRef = getDb().collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      return res.status(404).send('Order not found');
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
    return res.status(200).send('OK');
  } catch (err) {
    console.error('PayFast ITN handler error', err);
    return res.status(500).send('Server error');
  }
});

app.get('/health', (_req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`PayFast ITN listening on :${PORT}/api/payfast/itn`);
});
