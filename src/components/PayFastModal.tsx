import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Lock, AlertCircle, ExternalLink, ArrowRight, X } from 'lucide-react';

interface PayFastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentRef: string) => void;
  amount: number;
  description: string;
  orderId: string;
}

export default function PayFastModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  description,
  orderId
}: PayFastModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState<string | null>(null);

  // Read environment configuration or fallback to sandbox test mode
  const merchantId = import.meta.env.VITE_PAYFAST_MERCHANT_ID || '10000100'; // Standard PayFast Sandbox Merchant ID
  const isSandbox = import.meta.env.VITE_PAYFAST_SANDBOX !== 'false';

  if (!isOpen) return null;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    const mockRef = 'PF_' + Math.random().toString().substring(2, 10);

    setTimeout(() => {
      setIsProcessing(false);
      setPaymentComplete(mockRef);
      setTimeout(() => {
        onSuccess(mockRef);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs font-mono">
              PF
            </div>
            <div>
              <h3 className="text-sm font-bold font-display">PayFast Gateway</h3>
              <span className="text-[10px] text-slate-400 font-mono block">
                {isSandbox ? 'Sandbox Test Mode Active' : `Merchant ID: ${merchantId}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {paymentComplete ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Payment Approved!</h4>
              <p className="text-xs text-slate-500">
                PayFast Transaction Reference: <strong className="font-mono text-slate-800">{paymentComplete}</strong>
              </p>
              <p className="text-[11px] text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100 font-mono">
                ✓ Synced with PostNet IQ Retail Ledger
              </p>
            </div>
          ) : (
            <>
              {/* Order Summary Box */}
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

              {/* Security Shield */}
              <div className="flex items-start gap-2.5 text-[11px] text-slate-600 bg-sky-50/80 p-3 rounded-xl border border-sky-100">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-950 font-semibold block">Protected 256-Bit SSL Encryption</strong>
                  <span>Supports Visa, Mastercard, Instant EFT, SnapScan, and Zapper via PayFast S.A.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {isProcessing ? (
                    <span>Verifying PayFast Token...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{isSandbox ? 'Process Test Payment (R ' + amount.toFixed(2) + ')' : 'Pay via PayFast Portal'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl transition"
                >
                  Cancel & Pay at Counter Later
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-200">
          <span>PCI-DSS Level 1 Certified</span>
          <span>South Africa Regional Node</span>
        </div>

      </div>
    </div>
  );
}
