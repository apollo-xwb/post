/**
 * PayFast ITN handler — run with: node server/payfast-itn.mjs
 * Set VITE_PAYFAST_NOTIFY_URL (or PAYFAST_NOTIFY_URL) to https://your-host/api/payfast/itn
 *
 * Requires: firebase-admin, FIREBASE_SERVICE_ACCOUNT_JSON (service account JSON string)
 * Production: prefer Vercel route api/payfast/itn.mjs on pnx.lutho.app (same env vars as below).
 */
import express from 'express';
import { handlePayFastItn } from './payfast-itn-core.mjs';

const PORT = process.env.PAYFAST_ITN_PORT || 8787;

const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/api/payfast/itn', async (req, res) => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error('PayFast ITN: FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
    return res.status(500).send('Server error');
  }

  const payload = req.body || {};
  const { status, body } = await handlePayFastItn(payload);
  return res.status(status).send(body);
});

app.get('/health', (_req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`PayFast ITN listening on :${PORT}/api/payfast/itn`);
});
