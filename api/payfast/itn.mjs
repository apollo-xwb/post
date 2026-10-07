/**
 * Vercel serverless PayFast ITN — POST /api/payfast/itn
 *
 * Required Vercel environment variables (Project → Settings → Environment Variables):
 * - FIREBASE_SERVICE_ACCOUNT_JSON — Firebase service account JSON (single-line string)
 * - PAYFAST_PASSPHRASE — must match PayFast merchant passphrase (same as VITE_PAYFAST_PASSPHRASE)
 * - PAYFAST_MERCHANT_ID — optional; when set, ITN merchant_id must match
 * - FIRESTORE_DATABASE_ID — optional non-default Firestore database id
 *
 * Client build (Vite): set VITE_PAYFAST_NOTIFY_URL=https://pnx.lutho.app/api/payfast/itn
 * Other VITE_PAYFAST_* vars remain client-side only.
 */
import querystring from 'querystring';
import { handlePayFastItn } from '../../server/payfast-itn-core.mjs';

function normalizePayload(body) {
  if (body == null) return {};
  if (typeof body === 'string') {
    return querystring.parse(body);
  }
  if (Buffer.isBuffer(body)) {
    return querystring.parse(body.toString('utf8'));
  }
  if (typeof body === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(body)) {
      out[k] = v == null ? '' : String(v);
    }
    return out;
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error('PayFast ITN: FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
    return res.status(500).send('Server error');
  }

  const payload = normalizePayload(req.body);
  const { status, body } = await handlePayFastItn(payload);
  return res.status(status).send(body);
}
