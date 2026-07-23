/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYFAST_MERCHANT_ID?: string;
  readonly VITE_PAYFAST_MERCHANT_KEY?: string;
  readonly VITE_PAYFAST_PASSPHRASE?: string;
  readonly VITE_PAYFAST_SANDBOX?: string;
  readonly VITE_IQ_BASE_URL?: string;
  readonly VITE_IQ_COMPANY_ID?: string;
  readonly VITE_IQ_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
