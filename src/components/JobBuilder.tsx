import React, { useState, useEffect, useRef } from 'react';
import { db } from '../App';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Order, OrderFile } from '../types';
import PayFastModal from './PayFastModal';
import { 
  FileText, Image as ImageIcon, Sliders, UploadCloud, CheckCircle, 
  ChevronRight, ChevronLeft, Sparkles, RefreshCw, AlertCircle, ShoppingBag,
  CreditCard, Store, Lock, ArrowRight, RotateCw, ZoomIn, Info, HelpCircle
} from 'lucide-react';

interface JobBuilderProps {
  user: any;
  profile: any;
  onNavigateToTracker?: (orderId: string) => void;
}

// Interactive Print Insight Card Component
const PrintInsightCard = ({ title, content }: { title: string; content: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 my-3 transition-all text-xs">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-semibold text-slate-800 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
            i
          </span>
          <span className="text-slate-900 font-bold">{title}</span>
        </div>
        <span className="text-[10px] text-rose-700 font-mono font-bold underline bg-white/80 px-2 py-0.5 rounded border border-rose-200">
          {isOpen ? 'Hide Guidance' : 'Helpful Guidance'}
        </span>
      </button>
      {isOpen && (
        <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 text-slate-700 leading-relaxed space-y-1.5 animate-in fade-in duration-150 font-sans">
          {content}
        </div>
      )}
    </div>
  );
};

export default function JobBuilder({ user, profile, onNavigateToTracker }: JobBuilderProps) {
  // Typeform Flow Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Specs State
  const [selectedProduct, setSelectedProduct] = useState<'document' | 'poster' | 'flyer' | 'booklet'>('document');
  const [paperSize, setPaperSize] = useState<string>('A4');
  const [paperWeight, setPaperWeight] = useState<string>('80gsm');
  const [finish, setFinish] = useState<string>('None');
  const [sides, setSides] = useState<'single' | 'double'>('single');
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
  const [turnaround, setTurnaround] = useState<'standard' | 'express' | 'rush'>('standard');
  const [quantity, setQuantity] = useState<number>(50);

  // Pre-press Canvas Matrix State
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isGrayscaleFilter, setIsGrayscaleFilter] = useState<boolean>(false);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string; type?: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Payment Modal
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSubmitted, setOrderSubmitted] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [isPayFastOpen, setIsPayFastOpen] = useState<boolean>(false);
  const [pendingOrderId, setPendingOrderId] = useState<string>('');
  const [prices, setPrices] = useState({ subtotal: 0, vat: 0, total: 0 });

  // Reset sizing and options based on product type choice
  useEffect(() => {
    if (selectedProduct === 'poster') {
      setPaperSize('A2');
      setPaperWeight('150gsm Matte');
      setFinish('None');
      setSides('single'); // Locked to single for posters
    } else if (selectedProduct === 'flyer') {
      setPaperSize('A5');
      setPaperWeight('120gsm Gloss');
      setFinish('None');
      setSides('single');
    } else if (selectedProduct === 'booklet') {
      setPaperSize('A4');
      setPaperWeight('120gsm');
      setFinish('Spiral Bound');
      setSides('double');
    } else {
      setPaperSize('A4');
      setPaperWeight('80gsm');
      setFinish('None');
      setSides('single');
    }
  }, [selectedProduct]);

  // Price Calculation Engine
  useEffect(() => {
    let basePrice = 1.50; // Documents
    let sizeMultiplier = 1.0;
    let weightMultiplier = 1.0;
    let finishMultiplier = 1.0;
    let turnMultiplier = 1.0;

    if (selectedProduct === 'poster') {
      basePrice = 45.00;
      if (paperSize === 'A3') sizeMultiplier = 1.0;
      if (paperSize === 'A2') sizeMultiplier = 1.5;
      if (paperSize === 'A1') sizeMultiplier = 2.2;
      if (paperSize === 'A0') sizeMultiplier = 3.5;

      if (paperWeight.includes('200gsm')) weightMultiplier = 1.4;
      if (finish === 'Laminated') finishMultiplier = 1.5;
    } else if (selectedProduct === 'flyer') {
      basePrice = 2.20;
      if (paperSize === 'A4') sizeMultiplier = 1.4;
      if (paperSize === 'A5') sizeMultiplier = 1.0;
      if (paperSize === 'A6') sizeMultiplier = 0.8;

      if (paperWeight.includes('170gsm')) weightMultiplier = 1.3;
      if (finish === 'UV Coated') finishMultiplier = 1.5;
    } else if (selectedProduct === 'booklet') {
      basePrice = 12.50;
      if (paperSize === 'A4') sizeMultiplier = 1.2;
      if (paperSize === 'A5') sizeMultiplier = 1.0;
      if (finish === 'Spiral Bound') finishMultiplier = 1.5;
    } else {
      // Documents
      if (paperSize === 'A4') sizeMultiplier = 1.0;
      if (paperSize === 'A5') sizeMultiplier = 0.8;
      if (paperSize === 'letter') sizeMultiplier = 1.1;

      if (paperWeight.includes('120gsm')) weightMultiplier = 1.5;
      if (finish === 'Stapled') finishMultiplier = 1.1;
      if (finish === 'Spiral Bound') finishMultiplier = 2.0;
    }

    const sidesMultiplier = sides === 'double' ? 1.7 : 1.0;

    if (turnaround === 'express') turnMultiplier = 1.3;
    if (turnaround === 'rush') turnMultiplier = 1.6;

    let qtyDiscount = 1.0;
    if (quantity >= 500) qtyDiscount = 0.8;
    else if (quantity >= 200) qtyDiscount = 0.9;

    const calculatedSubtotal = Math.max(0, basePrice * sizeMultiplier * weightMultiplier * finishMultiplier * sidesMultiplier * turnMultiplier * qtyDiscount * quantity);
    const vatAmount = calculatedSubtotal * 0.15; // 15% SA VAT
    const calculatedTotal = calculatedSubtotal + vatAmount;

    setPrices({
      subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
      vat: parseFloat(vatAmount.toFixed(2)),
      total: parseFloat(calculatedTotal.toFixed(2))
    });
  }, [selectedProduct, paperSize, paperWeight, finish, sides, colorMode, turnaround, quantity]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setUploadedFile({
        name: file.name,
        size: file.size,
        url: url,
        type: file.type
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      setUploadedFile({
        name: file.name,
        size: file.size,
        url: url,
        type: file.type
      });
    }
  };

  const resetCanvas = () => {
    setZoom(100);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setIsGrayscaleFilter(false);
  };

  // Submit Order Routine
  const createOrderRecord = async (isPaidDirect: boolean, payRef?: string) => {
    setIsSubmitting(true);
    const orderId = pendingOrderId || 'PNX_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const guestUserId = user ? user.uid : 'local_guest_' + Math.random().toString(36).substring(2, 8);

    const newOrder: Order = {
      id: orderId,
      userId: guestUserId,
      status: 'Received',
      totalPrice: prices.total,
      createdAt: new Date().toISOString(),
      productType: selectedProduct.toUpperCase(),
      quantity: quantity,
      specs: {
        paperSize,
        paperWeight,
        finish,
        sides,
        colorMode,
        turnaround,
        alignment: {
          scale: zoom / 100,
          offsetX,
          offsetY,
          rotation,
          grayscale: isGrayscaleFilter
        }
      },
      paymentStatus: isPaidDirect ? 'paid' : 'unpaid',
      iqSyncStatus: 'pending',
      staffNote: isPaidDirect ? `PayFast Approved (Ref: ${payRef})` : 'Awaiting counter payment'
    };

    const newFile: OrderFile = {
      id: 'file_' + Math.random().toString(36).substring(2, 11),
      orderId: orderId,
      fileName: uploadedFile ? uploadedFile.name : 'Sample_Artwork.pdf',
      fileUrl: uploadedFile ? uploadedFile.url : '',
      fileSize: uploadedFile ? uploadedFile.size : 102400,
      uploadedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);
      await setDoc(doc(db, 'orders', orderId, 'order_files', newFile.id), newFile);
      setOrderSubmitted(orderId);
      if (payRef) setPaymentRef(payRef);
    } catch (err) {
      console.warn("Offline order fallback:", err);
      localStorage.setItem(`offline_order_${orderId}`, JSON.stringify({ ...newOrder, file: newFile }));
      setOrderSubmitted(orderId);
      if (payRef) setPaymentRef(payRef);
    } finally {
      setIsSubmitting(false);
      setIsPayFastOpen(false);
    }
  };

  const handleInitiatePayFast = () => {
    const generatedId = 'PNX_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setPendingOrderId(generatedId);
    setIsPayFastOpen(true);
  };

  const totalSteps = 6;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1 flex flex-col justify-between pb-28 sm:pb-12">
      
      {/* PayFast Gateway Modal */}
      <PayFastModal
        isOpen={isPayFastOpen}
        onClose={() => setIsPayFastOpen(false)}
        onSuccess={(ref) => createOrderRecord(true, ref)}
        amount={prices.total}
        description={`${quantity}x ${selectedProduct.toUpperCase()} (${paperSize}, ${paperWeight})`}
        orderId={pendingOrderId}
      />

      {orderSubmitted ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900">Print Job Transmitted!</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your specs and pre-press calibration matrix have been logged to PostNet Print OS.
          </p>
          
          <div className="bg-slate-50 rounded-xl p-4 my-6 text-left border border-slate-200 font-mono text-xs text-slate-700 space-y-2">
            <div><strong>Order ID:</strong> {orderSubmitted}</div>
            <div><strong>Product:</strong> {quantity}x {selectedProduct.toUpperCase()} ({paperSize})</div>
            <div><strong>Quotation:</strong> R {prices.total.toFixed(2)} (incl. VAT)</div>
            <div>
              <strong>Payment Status:</strong> {' '}
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${paymentRef ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {paymentRef ? `Paid via PayFast (${paymentRef})` : 'Pay at Branch Counter'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onNavigateToTracker && (
              <button
                onClick={() => onNavigateToTracker(orderSubmitted)}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 px-4 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Track Order & Print Invoice</span>
              </button>
            )}

            <button
              onClick={() => {
                setOrderSubmitted(null);
                setUploadedFile(null);
                setCurrentStep(1);
                setPaymentRef(null);
                resetCanvas();
              }}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Construct Another Job
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Top Progress Bar */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 font-mono font-bold">
              <span className="text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> TYPEFORM PRE-PRESS FLOW
              </span>
              <span>STEP {currentStep} OF {totalSteps}</span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-600 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* STEP CARDS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 flex-1 flex flex-col justify-between my-2 transition-all">
            
            {/* STEP 1: PRODUCT CATEGORY */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">Question 1</span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">What type of print job are you building today?</h2>
                  <p className="text-xs text-slate-500 mt-1">Select your primary print media archetype to set up calibrated bleed templates.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'document', label: 'Documents & Reports', desc: 'A4/A5 stapled manuals, invoices, & executive bond papers.', icon: FileText },
                    { id: 'poster', label: 'High-Gloss Posters', desc: 'A2, A1, A0 & A3 wide-format architectural/marketing prints.', icon: ImageIcon },
                    { id: 'flyer', label: 'Promo Flyers & Handouts', desc: 'A5/A6 glossy promo flyers and promotional leaflets.', icon: Sparkles },
                    { id: 'booklet', label: 'Bound Booklets', desc: 'Multi-page booklets with heavy cover stock and spiral binding.', icon: ShoppingBag },
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProduct(p.id as any)}
                        className={`p-5 rounded-xl border text-left flex items-start gap-4 transition ${
                          selectedProduct === p.id
                            ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-600/20 text-rose-950 font-bold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg shrink-0 ${selectedProduct === p.id ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold block">{p.label}</span>
                          <span className="text-xs font-normal text-slate-500 mt-0.5 block leading-relaxed">{p.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: TRIM SIZE & STOCK WEIGHT */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">Question 2</span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">Choose paper trim size and stock density</h2>
                  <p className="text-xs text-slate-500 mt-1">Sizing & GSM weights are tailored for selected product: <strong className="text-rose-600">{selectedProduct.toUpperCase()}</strong>.</p>
                </div>

                <PrintInsightCard 
                  title="Understanding Paper Sizing & GSM Stock Density"
                  content={
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>80gsm Bond (Laser)</strong>: Standard multi-page office copy paper. Light, flexible, cost-effective.</li>
                      <li><strong>120gsm Executive / Matte</strong>: Premium smooth texture for formal proposals, letters, and resumes.</li>
                      <li><strong>150gsm / 170gsm Silk & Gloss</strong>: Heavier satin paper ideal for double-sided promotional flyers & leaflets.</li>
                      <li><strong>200gsm Heavy Cardstock</strong>: Rigid, opaque weight for high-gloss posters, covers, and framed graphics.</li>
                    </ul>
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 flex justify-between items-center">
                      <span>Paper Trim Size</span>
                      <span className="text-[10px] text-rose-600 font-mono font-bold uppercase">Required</span>
                    </label>
                    <div className="space-y-2">
                      {(selectedProduct === 'poster' 
                        ? ['A2 (420 x 594 mm)', 'A1 (594 x 841 mm)', 'A0 (841 x 1189 mm)', 'A3 (297 x 420 mm)']
                        : selectedProduct === 'flyer'
                        ? ['A5 (148 x 210 mm)', 'A4 (210 x 297 mm)', 'A6 (105 x 148 mm)']
                        : ['A4 (210 x 297 mm)', 'A5 (148 x 210 mm)', 'Letter (215 x 279 mm)']
                      ).map((sz) => {
                        const code = sz.split(' ')[0];
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setPaperSize(code)}
                            className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition flex items-center justify-between ${
                              paperSize === code
                                ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <span>{sz}</span>
                            {paperSize === code && <CheckCircle className="w-4 h-4 text-rose-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 flex justify-between items-center">
                      <span>Stock Density & Weight (GSM)</span>
                      <span className="text-[10px] text-rose-600 font-mono font-bold uppercase">Required</span>
                    </label>
                    <div className="space-y-2">
                      {(selectedProduct === 'poster'
                        ? ['150gsm Matte', '200gsm Glossy']
                        : selectedProduct === 'flyer'
                        ? ['120gsm Gloss', '170gsm Silk']
                        : ['80gsm Bond (Laser)', '120gsm Executive Matte']
                      ).map((wt) => (
                        <button
                          key={wt}
                          type="button"
                          onClick={() => setPaperWeight(wt)}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition flex items-center justify-between ${
                            paperWeight === wt
                              ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <span>{wt}</span>
                          {paperWeight === wt && <CheckCircle className="w-4 h-4 text-rose-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FINISHINGS & PRINT MODES */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">Question 3</span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">Select finishing treatment & color modes</h2>
                </div>

                <PrintInsightCard 
                  title="Choosing Finishing Treatments & Palette Modes"
                  content={
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Plain / Unfinished</strong>: Standard clean guillotine trim with no secondary binding.</li>
                      <li><strong>Stapled / Spiral Bound</strong>: Corner staple or heavy plastic coil coil-binding with protective clear acetate front covers.</li>
                      <li><strong>Laminated / UV Coated</strong>: Gloss liquid or heat-sealed plastic coating providing water, tear, and fading protection.</li>
                      <li><strong>CMYK Full Color</strong>: Vibrant 4-color high-definition laser printing for graphics, photos, and artwork.</li>
                      <li><strong>Monochrome (B&W)</strong>: Fast laser grayscale output, ideal for text-heavy invoices & manuals.</li>
                    </ul>
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Finishing Options</label>
                    <div className="space-y-2">
                      {(selectedProduct === 'poster'
                        ? ['None', 'Laminated']
                        : selectedProduct === 'flyer'
                        ? ['None', 'UV Coated']
                        : ['None', 'Stapled', 'Spiral Bound']
                      ).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFinish(f)}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition flex items-center justify-between ${
                            finish === f
                              ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <span>{f === 'None' ? 'Plain / Unfinished' : f}</span>
                          {finish === f && <CheckCircle className="w-4 h-4 text-rose-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Printing Sides & Color</label>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Print Sides:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSides('single')}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                              sides === 'single' ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200 bg-white'
                            }`}
                          >
                            Single Sided
                          </button>
                          <button
                            type="button"
                            disabled={selectedProduct === 'poster'}
                            onClick={() => setSides('double')}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                              sides === 'double' ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200 bg-white'
                            } ${selectedProduct === 'poster' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Double Sided
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Color Palette:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setColorMode('color')}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                              colorMode === 'color' ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200 bg-white'
                            }`}
                          >
                            Full Color CMYK
                          </button>
                          <button
                            type="button"
                            onClick={() => setColorMode('grayscale')}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                              colorMode === 'grayscale' ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200 bg-white'
                            }`}
                          >
                            Monochrome
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: VOLUME & TURNAROUND */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">Question 4</span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">How many copies and how fast do you need it?</h2>
                </div>

                <PrintInsightCard 
                  title="Production Turnarounds & Quantity Tier Discounts"
                  content={
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Standard (2-3 Days)</strong>: Our best value rate for standard print scheduling.</li>
                      <li><strong>Express (24 Hours)</strong>: Next-day dispatch priority for urgent meetings.</li>
                      <li><strong>Rush Priority (3 Hours)</strong>: Emergency counter queue at PostNet Rondebosch.</li>
                      <li><strong>Volume Tier Discounts</strong>: 200+ copies receive 10% off; 500+ copies receive 20% off automatically!</li>
                    </ul>
                  }
                />

                <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-800">Print Volume Quantity</label>
                      <span className="font-mono text-sm font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                        {quantity} copies
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Bulk tier discount: 200+ (10% off), 500+ (20% off).</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">Turnaround Speed</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'standard', label: 'Standard (2-3 Days)', surge: 'Standard Rate' },
                        { id: 'express', label: 'Express (24 Hours)', surge: '+30% Surge' },
                        { id: 'rush', label: 'Rush Priority (3 Hours)', surge: '+60% Priority' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTurnaround(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                            turnaround === t.id
                              ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-xs block font-bold">{t.label}</span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{t.surge}</span>
                          </div>
                          {turnaround === t.id && <CheckCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: FILE UPLOAD & PRE-PRESS CANVAS */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">Question 5</span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">Upload design file & calibrate safe bleed</h2>
                </div>

                <PrintInsightCard 
                  title="3mm Trim Bleed & Safe Margin Guidelines"
                  content={
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Trim Bleed Margin</strong>: Extending your background color 3mm past the edge prevents white slivers after cutting.</li>
                      <li><strong>Safe Box Limit</strong>: Keep all text, contact numbers, and logos inside the inner margin guide.</li>
                      <li><strong>Accepted File Types</strong>: PDF, PNG, JPG, EPS or TIFF vector assets.</li>
                    </ul>
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Upload Drop Zone */}
                  <div>
                    {!uploadedFile ? (
                      <div className="space-y-3">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 min-h-[200px] ${
                            isDragging ? 'border-rose-600 bg-rose-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                          }`}
                        >
                          <UploadCloud className="w-10 h-10 text-rose-600" />
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Click or Drag & Drop File</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">PDF, JPG, PNG vector assets (up to 50MB)</span>
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="application/pdf,image/*"
                          />
                        </div>

                        {/* Quick Sample File Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFile({
                              name: 'PostNet_Sample_Design_Proof.pdf',
                              size: 1024 * 350,
                              url: '/pnxlogo.png',
                              type: 'application/pdf'
                            });
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border border-slate-200"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                          <span>Attach Test Artwork Proof</span>
                        </button>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">{uploadedFile.name}</span>
                          </div>
                          <button
                            onClick={() => { setUploadedFile(null); resetCanvas(); }}
                            className="text-xs text-rose-600 font-bold underline hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">File Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                  </div>

                  {/* Pre-Press Preview Canvas */}
                  <div className="bg-slate-950 rounded-xl p-4 text-white flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden bg-dark-grid">
                    <div className="absolute top-2 left-2 text-[8px] font-mono font-bold text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded z-10 bg-slate-950/80">
                      3MM TRIM BLEED GUIDES
                    </div>

                    {uploadedFile ? (
                      <div className="flex flex-col items-center space-y-4 w-full">
                        <div
                          style={{
                            transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${zoom / 100})`,
                            filter: isGrayscaleFilter || colorMode === 'grayscale' ? 'grayscale(100%)' : 'none'
                          }}
                          className="w-36 h-48 bg-white text-slate-900 rounded-lg p-2 flex flex-col items-center justify-between shadow-2xl transition duration-75 overflow-hidden relative border border-slate-300"
                        >
                          {uploadedFile.type?.startsWith('image/') || uploadedFile.name.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? (
                            <img src={uploadedFile.url} alt="Uploaded Artwork Proof" className="w-full h-full object-contain rounded" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-between p-2 text-center bg-slate-50 border border-slate-200 rounded">
                              <div className="w-full flex justify-between items-center border-b border-slate-200 pb-1">
                                <span className="text-[8px] font-mono font-bold text-rose-600">POSTNET</span>
                                <span className="text-[7px] font-mono bg-rose-100 text-rose-800 px-1 rounded uppercase font-bold">PDF PROOF</span>
                              </div>
                              <FileText className="w-10 h-10 text-rose-600 my-auto" />
                              <div className="w-full space-y-0.5">
                                <span className="text-[9px] font-bold block text-slate-900 truncate">{uploadedFile.name}</span>
                                <span className="text-[8px] text-slate-500 font-mono block">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive Canvas Adjustment Controls */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800 text-[10px] w-full">
                          <button
                            type="button"
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded flex items-center gap-1"
                          >
                            <RotateCw className="w-3 h-3 text-rose-400" /> Rotate 90°
                          </button>

                          <button
                            type="button"
                            onClick={() => setZoom((z) => Math.min(150, z + 10))}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded flex items-center gap-1"
                          >
                            <ZoomIn className="w-3 h-3 text-rose-400" /> Zoom +
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsGrayscaleFilter(!isGrayscaleFilter)}
                            className={`px-2.5 py-1 rounded flex items-center gap-1 font-bold ${
                              isGrayscaleFilter ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            B&W Proof
                          </button>

                          <button
                            type="button"
                            onClick={resetCanvas}
                            className="text-slate-400 hover:text-white px-2 py-1"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                        <span className="text-xs text-slate-400 block font-mono">Upload file to view live pre-press proofing</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & CHECKOUT */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-wider block mb-1">Step 6: Final Review</span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">Review Quotation & Select Payment Method</h2>
                </div>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs space-y-3">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700">Product Specification:</span>
                    <span className="font-mono">{quantity}x {selectedProduct.toUpperCase()} ({paperSize}, {paperWeight})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700">Finish & Color:</span>
                    <span className="font-mono">{finish} | {colorMode.toUpperCase()} ({sides})</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>R {prices.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SA VAT (15%):</span>
                    <span>R {prices.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span className="font-mono text-rose-600 text-base">R {prices.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleInitiatePayFast}
                    disabled={isSubmitting || !uploadedFile}
                    className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white p-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Now via PayFast Gateway</span>
                  </button>

                  <button
                    onClick={() => createOrderRecord(false)}
                    disabled={isSubmitting || !uploadedFile}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white p-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Store className="w-4 h-4" />
                    <span>Order & Pay at Branch Counter</span>
                  </button>
                </div>

                {!uploadedFile && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center font-medium">
                    Please go back to Step 5 to attach your print design file first.
                  </p>
                )}
              </div>
            )}

            {/* STEP NAVIGATION BUTTONS */}
            <div className="pt-8 border-t border-slate-100 flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 flex items-center gap-1.5 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 5 && !uploadedFile) {
                      setUploadedFile({
                        name: 'PostNet_Sample_Design_Proof.pdf',
                        size: 1024 * 350,
                        url: '/pnxlogo.png',
                        type: 'application/pdf'
                      });
                    }
                    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
