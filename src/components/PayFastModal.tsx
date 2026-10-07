import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, ExternalLink } from 'lucide-react';
import {
  buildPayFastPaymentFields,
  getPayFastConfig,
  getPayFastProcessUrl,
  isPayFastConfigured,
} from '../lib/payfast';

interface PayFastModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  orderId: string;
  payerEmail?: string;
  payerName?: string;
}

export default function PayFastModal({
  isOpen,
  onClose,
  amount,
  description,
  orderId,
  payerEmail,
  payerName,
}: PayFastModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [redirecting, setRedirecting] = useState(false);

  const configured = isPayFastConfigured();
  const config = configured ? getPayFastConfig(orderId) : null;
  const sandbox = import.meta.env.VITE_PAYFAST_SANDBOX !== 'false';

  useEffect(() => {
    if (!isOpen) {
      setRedirecting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRedirectToPayFast = () => {
    if (!config || !formRef.current) return;
    setRedirecting(true);
    formRef.current.submit();
  };

  const fields =
    config &&
    buildPayFastPaymentFields({
      config,
      orderId,
      amount,
      itemName: description,
      email: payerEmail,
      nameFirst: payerName,
    });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs font-mono">
              PF
            </div>
            <div>
              <h3 className="text-sm font-bold font-display">PayFast Gateway</h3>
              <span className="text-[10px] text-slate-400 font-mono block">
                {configured
                  ? sandbox
                    ? 'Sandbox mode'
                    : 'Live merchant'
                  : 'Not configured'}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!configured || !config || !fields ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Online payment unavailable</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                PayFast merchant credentials are not configured for this environment. Printing can only start after
                confirmed online payment — please contact the branch or try again later.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{orderId}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Description:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]">{description}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Payable Amount (incl. VAT):</span>
                  <span className="font-mono text-rose-600 text-lg">R {amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-[11px] text-slate-600 bg-sky-50/80 p-3 rounded-xl border border-sky-100">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-950 font-semibold block">Secure PayFast checkout</strong>
                  <span>
                    You will be redirected to PayFast to complete payment. Your order is confirmed as paid only after
                    PayFast notifies us (ITN) and you return to this site.
                  </span>
                </div>
              </div>

              <form
                ref={formRef}
                method="POST"
                action={getPayFastProcessUrl(config.sandbox)}
                className="hidden"
              >
                {Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
              </form>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRedirectToPayFast}
                  disabled={redirecting}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {redirecting ? (
                    <span>Redirecting to PayFast…</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Continue to PayFast</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={redirecting}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-3 text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-200">
          <span>PCI-DSS Level 1 Certified</span>
          <span>South Africa Regional Node</span>
        </div>
      </div>
    </div>
  );
}
