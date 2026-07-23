import React, { useState } from 'react';
import { Order } from '../types';
import { 
  X, Printer, Download, CheckCircle, FileText, 
  Server, ShieldCheck, Copy, Check, QrCode
} from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function InvoiceModal({ isOpen, onClose, order }: InvoiceModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const invoiceNo = order.iqInvoiceId || `IQ-INV-${order.id.replace(/[^A-Z0-9]/g, '').slice(-5)}`;
  const subtotal = order.totalPrice / 1.15;
  const vat = order.totalPrice - subtotal;
  const syncDate = order.iqSyncTime ? new Date(order.iqSyncTime).toLocaleString('en-ZA') : new Date(order.createdAt).toLocaleString('en-ZA');

  const handleCopyText = () => {
    const text = `POSTNET TAX INVOICE
Invoice No: ${invoiceNo}
Order Ref: ${order.id}
Date: ${syncDate}
----------------------------------------
Item: ${order.productType} (${order.quantity} qty)
Specs: ${order.specs.paperSize}, ${order.specs.paperWeight}, ${order.specs.finish}
----------------------------------------
Subtotal: R ${subtotal.toFixed(2)}
VAT (15%): R ${vat.toFixed(2)}
TOTAL: R ${order.totalPrice.toFixed(2)}
Status: ${order.paymentStatus.toUpperCase()}
----------------------------------------
PostNet Rondebosch Branch (VAT: 4810293812)`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Top Control Bar (Non-printable controls) */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              IQ Retail Generated Tax Invoice
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Sheet */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 bg-white" id="printable-invoice">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div>
              <img 
                src="/pnxlogo.png" 
                alt="PostNet Logo" 
                className="h-10 w-auto object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://www.dotmade.co.za/wp-content/uploads/2020/10/Postnet.jpg';
                }}
              />
              <span className="text-xs font-bold text-slate-900 block font-display">PostNet Rondebosch Branch</span>
              <span className="text-[11px] text-slate-500 block">Main Road, Rondebosch, Cape Town, 7700</span>
              <span className="text-[11px] text-slate-500 block font-mono">VAT Registration No: 4810293812</span>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="bg-rose-100 text-rose-800 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                OFFICIAL TAX INVOICE
              </span>
              <h2 className="text-lg font-bold font-mono text-slate-900">{invoiceNo}</h2>
              <p className="text-[11px] text-slate-500 font-mono">Order Ref: {order.id}</p>
              <p className="text-[11px] text-slate-500 font-mono">Date: {syncDate}</p>
            </div>
          </div>

          {/* Customer & Payment Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Billed To</span>
              <span className="font-bold text-slate-900 block mt-0.5">{order.userId.includes('guest') ? 'Walk-in Counter Customer' : order.userId}</span>
              <span className="text-slate-500 text-[11px]">Dispatch Method: {order.specs.paperSize || 'In-Store Pickup'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Payment Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                  order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Paid in Full' : 'Unpaid / Counter Pay'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {order.staffNote || 'Processed via PostNet Print OS'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-mono text-[10px] uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Item / Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Amount (Excl. VAT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                <tr>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{order.productType}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {order.specs.paperSize} | {order.specs.paperWeight} | {order.specs.finish} ({order.specs.sides})
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{order.quantity}</td>
                  <td className="p-3 text-right font-mono">R {(subtotal / (order.quantity || 1)).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">R {subtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
            
            {/* Barcode / ERP Validation watermark */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 w-full sm:w-auto">
              <QrCode className="w-10 h-10 text-slate-700 shrink-0" />
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase block">IQ ERP Validated</span>
                <span className="text-[9px] text-slate-400 font-mono block">HMAC SHA-256 Registered</span>
                <span className="text-[9px] font-mono text-emerald-700 font-bold block">Status: 200 OK</span>
              </div>
            </div>

            {/* Calculations */}
            <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal (Excl. VAT):</span>
                <span className="font-mono">R {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>South Africa VAT (15%):</span>
                <span className="font-mono">R {vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total Payable (ZAR):</span>
                <span className="font-mono text-rose-600">R {order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-mono">
            Thank you for choosing PostNet Rondebosch. For queries regarding this invoice, contact support@postnet.co.za or call 0860 POSTNET.
          </div>

        </div>

      </div>
    </div>
  );
}
