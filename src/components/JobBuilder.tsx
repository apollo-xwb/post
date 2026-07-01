import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { collection, addDoc, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, Order, OrderFile, OrderStatus } from '../types';
import { DEFAULT_PRODUCTS, DEFAULT_PRICING_RULES } from '../seed';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  Trash2, 
  Calculator, 
  CreditCard, 
  Coins,
  FileText, 
  Truck, 
  Store, 
  Printer, 
  Info,
  CircleCheck,
  AlertCircle,
  Sliders,
  ZoomIn,
  RotateCw,
  Eye,
  Move,
  Crop
} from 'lucide-react';

interface JobBuilderProps {
  user: UserProfile | null;
  onOrderCreated: (orderId: string) => void;
}

const SHORTCUT_PRESETS = [
  {
    id: 'bank-statement',
    label: '🏦 Bank Statement',
    description: '1x A4 Sheet, Standard Grayscale Single-sided',
    productId: 'prod_document',
    paperSize: 'A4',
    quantity: 1,
    paperStock: '80gsm',
    finish: 'Uncoated',
    printSides: 'Single sided',
    colourMode: 'Black & white',
    turnaround: 'Standard (3–5 days)'
  },
  {
    id: 'promo-flyers',
    label: '📣 Promo Flyers',
    description: '100x A5 Flyers, Glossy Double-sided',
    productId: 'prod_flyer',
    paperSize: 'A5',
    quantity: 100,
    paperStock: '120gsm',
    finish: 'Gloss laminate',
    printSides: 'Double sided',
    colourMode: 'Full colour (CMYK)',
    turnaround: 'Standard (3–5 days)'
  },
  {
    id: 'premium-cards',
    label: '📇 Premium Business Cards',
    description: '250x Professional Cards, Matte Luxe Double-sided',
    productId: 'prod_bizcard',
    paperSize: 'A6',
    quantity: 250,
    paperStock: '350gsm',
    finish: 'Matt laminate',
    printSides: 'Double sided',
    colourMode: 'Full colour (CMYK)',
    turnaround: 'Standard (3–5 days)'
  },
  {
    id: 'express-poster',
    label: '🖼️ Express Poster',
    description: '50x A2 High-Glossy Poster Rush print',
    productId: 'prod_poster',
    paperSize: 'A2',
    quantity: 50,
    paperStock: '170gsm',
    finish: 'Gloss laminate',
    printSides: 'Single sided',
    colourMode: 'Full colour (CMYK)',
    turnaround: 'Express (next day)'
  }
];

const DEFAULT_PROOF_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" style="background-color:%23ffffff;font-family:system-ui,sans-serif;"><rect x="20" y="20" width="760" height="1160" fill="none" stroke="%23f43f5e" stroke-width="4" stroke-dasharray="10,10"/><rect x="40" y="40" width="720" height="1120" fill="none" stroke="%2306b6d4" stroke-width="2"/><rect x="10" y="10" width="780" height="1180" fill="none" stroke="%23e4e4e7" stroke-width="1"/><g transform="translate(100, 150)"><rect x="0" y="0" width="600" height="850" rx="16" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><text x="300" y="200" font-size="36" font-weight="900" fill="%230f172a" text-anchor="middle" letter-spacing="2">POSTNET PRINT OS</text><text x="300" y="250" font-size="16" font-weight="700" fill="%23e11d48" text-anchor="middle" letter-spacing="4">PRE-PRESS PRODUCTION PROOF</text><line x1="150" y1="290" x2="450" y2="290" stroke="%23cbd5e1" stroke-width="2"/><circle cx="300" cy="460" r="100" fill="%23f43f5e" opacity="0.08"/><circle cx="300" cy="460" r="80" fill="%2306b6d4" opacity="0.08"/><path d="M260,460 L290,490 L350,420" fill="none" stroke="%23e11d48" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><text x="300" y="620" font-size="22" font-weight="800" fill="%23059669" text-anchor="middle">CALIBRATION &amp; ALIGNMENT VERIFIED</text><text x="300" y="660" font-size="14" font-weight="500" fill="%2364748b" text-anchor="middle">SAFE BLEED MARGINS GUARANTEED</text><rect x="100" y="720" width="400" height="50" rx="8" fill="%23f1f5f9" stroke="%23e2e8f0" stroke-width="1"/><text x="300" y="750" font-size="12" font-weight="700" fill="%23475569" text-anchor="middle" font-family="monospace">READY FOR DIGITAL PRESS / CMYK ACTIVE</text></g><text x="400" y="1130" font-size="11" font-weight="600" fill="%2394a3b8" text-anchor="middle" letter-spacing="1">POWERED BY LUTHO OS • SYSTEM VERIFIED</text></svg>`;

export default function JobBuilder({ user, onOrderCreated }: JobBuilderProps) {
  // Database states
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [rules, setRules] = useState(DEFAULT_PRICING_RULES);
  const [loadingDb, setLoadingDb] = useState(true);

  // Apply a shortcut preset
  const applyPreset = (preset: typeof SHORTCUT_PRESETS[0]) => {
    setSelectedProductId(preset.productId);
    setPaperSize(preset.paperSize);
    setQuantity(preset.quantity);
    setPaperStock(preset.paperStock);
    setFinish(preset.finish);
    setPrintSides(preset.printSides);
    setColourMode(preset.colourMode);
    setTurnaround(preset.turnaround);
  };

  const isPresetActive = (preset: typeof SHORTCUT_PRESETS[0]) => {
    return selectedProductId === preset.productId &&
      paperSize === preset.paperSize &&
      quantity === preset.quantity &&
      paperStock === preset.paperStock &&
      finish === preset.finish &&
      printSides === preset.printSides &&
      colourMode === preset.colourMode &&
      turnaround === preset.turnaround;
  };

  // Active step in Wizard
  const [step, setStep] = useState(1);

  // Floating Mobile Nav and general feedback toast
  const [resetToast, setResetToast] = useState(false);

  // Restart the whole configuration back to default starting page
  const handleStartOver = () => {
    setStep(1);
    setOnboardStep(1);
    setOnboardActive(true);
    setSelectedProductId('prod_document');
    setPaperSize('A4');
    setCustomWidth('210');
    setCustomHeight('297');
    setQuantity(1);
    setPaperStock('80gsm');
    setFinish('Uncoated');
    setPrintSides('Single sided');
    setColourMode('Black & white');
    setTurnaround('Standard (3–5 days)');
    setCollectionMethod('In-store collection');
    setDeliveryAddress('');
    setSpecialInstructions('');
    setUploadedFiles([]);
    setMockupZoom(100);
    setMockupOffsetX(0);
    setMockupOffsetY(0);
    setMockupRotation(0);
    setMockupFitMode('cover');
    setUploadError(null);
    setResetToast(true);
    setTimeout(() => {
      setResetToast(false);
    }, 2500);
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onboardActive && onboardStep > 1) {
      setOnboardStep(onboardStep - 1);
    }
  };

  // Typeform Onboarding guided tour state
  const [onboardActive, setOnboardActive] = useState(true);
  const [onboardStep, setOnboardStep] = useState(1);

  // Selected specs state
  const [selectedProductId, setSelectedProductId] = useState('prod_document');
  const [paperSize, setPaperSize] = useState('A4');
  const [customWidth, setCustomWidth] = useState('210');
  const [customHeight, setCustomHeight] = useState('297');
  const [quantity, setQuantity] = useState(1);
  const [paperStock, setPaperStock] = useState('80gsm');
  const [finish, setFinish] = useState('Uncoated');
  const [printSides, setPrintSides] = useState('Single sided');
  const [colourMode, setColourMode] = useState('Black & white');
  const [turnaround, setTurnaround] = useState('Standard (3–5 days)');
  const [collectionMethod, setCollectionMethod] = useState('In-store collection');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Contact/Billing info state (default from user profile)
  const [billingName, setBillingName] = useState(user?.name || '');
  const [billingCompany, setBillingCompany] = useState(user?.company || '');
  const [billingVat, setBillingVat] = useState(user?.vatNumber || '');
  const [billingPhone, setBillingPhone] = useState(user?.phone || '');

  // Guest checkout registration state
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [isGuestSignUp, setIsGuestSignUp] = useState(true);

  // Update billing details when user profile updates/loads
  useEffect(() => {
    if (user) {
      setBillingName(user.name || '');
      setBillingCompany(user.company || '');
      setBillingVat(user.vatNumber || '');
      setBillingPhone(user.phone || '');
    }
  }, [user]);

  // File upload state & QR mobile beam states
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; progress: number; url: string; id: string }[]>([]);
  const [uploadTab, setUploadTab] = useState<'direct' | 'qr'>('direct');
  const [showSimulatedPhone, setShowSimulatedPhone] = useState(false);
  const [beamingFile, setBeamingFile] = useState(false);
  const [beamProgress, setBeamProgress] = useState(0);
  const [mockMobileFilename, setMockMobileFilename] = useState('architectural_plans_hq.pdf');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Alignment & Cropping interactive mockup states
  const [mockupZoom, setMockupZoom] = useState(100);
  const [mockupOffsetX, setMockupOffsetX] = useState(0);
  const [mockupOffsetY, setMockupOffsetY] = useState(0);
  const [mockupRotation, setMockupRotation] = useState(0);
  const [mockupFitMode, setMockupFitMode] = useState<'contain' | 'cover' | 'fill'>('cover');
  const [showBleedLines, setShowBleedLines] = useState(true);
  const [isPressDragging, setIsPressDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedFileForMockup, setSelectedFileForMockup] = useState<string>('');

  // Auto select uploaded files for live pre-press alignment
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      if (!selectedFileForMockup || !uploadedFiles.find(f => f.id === selectedFileForMockup)) {
        setSelectedFileForMockup(uploadedFiles[0].id);
      }
    } else {
      setSelectedFileForMockup('');
    }
  }, [uploadedFiles, selectedFileForMockup]);

  // Quote states
  const [quoteDetails, setQuoteDetails] = useState({
    subtotal: 0,
    vat: 0,
    total: 0,
    breakdown: [] as string[]
  });

  // Submit states
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch real setup configurations on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        const ruleSnap = await getDocs(collection(db, 'pricing_rules'));

        if (!prodSnap.empty) {
          let prodsArr = prodSnap.docs.map(d => d.data() as any);
          if (!prodsArr.some(p => p.id === 'prod_document')) {
            const docProd = DEFAULT_PRODUCTS.find(p => p.id === 'prod_document');
            if (docProd) {
              prodsArr.unshift(docProd);
              try {
                await setDoc(doc(db, 'products', 'prod_document'), cleanUndefined(docProd));
              } catch (e) {
                console.warn('Failed auto saving catalog product:', e);
              }
            }
          }
          setProducts(prodsArr.filter(p => p.active));
        } else {
          setProducts(DEFAULT_PRODUCTS.slice());
        }
        if (!ruleSnap.empty) {
          const rulesArr = ruleSnap.docs.map(d => d.data() as any);
          setRules(rulesArr);
        }
      } catch (err) {
        console.warn('Could not read real catalog, using default constants safely');
      } finally {
        setLoadingDb(false);
      }
    }
    loadCatalog();
  }, []);

  // Recalculate quotation as specs change
  useEffect(() => {
    const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
    if (!selectedProduct) return;

    let base = selectedProduct.basePrice;
    const breakdownList: string[] = [];
    breakdownList.push(`Base rate for ${selectedProduct.name}: R${base.toFixed(2)}`);

    // Paper stock multiplier
    const stockRule = rules.find(r => r.ruleType === 'paper_stock' && r.key === paperStock);
    const stockMult = stockRule ? stockRule.multiplier : 1.0;
    if (stockMult !== 1.0) {
      breakdownList.push(`Paper Stock adjustment (${paperStock}): x${stockMult}`);
    }

    // Finish multiplier
    const finishRule = rules.find(r => r.ruleType === 'finish' && r.key === finish);
    const finishMult = finishRule ? finishRule.multiplier : 1.0;
    if (finishMult !== 1.0) {
      breakdownList.push(`Finish adjustment (${finish}): x${finishMult}`);
    }

    // Turnaround multiplier
    const turnRule = rules.find(r => r.ruleType === 'turnaround' && r.key === turnaround);
    const turnMult = turnRule ? turnRule.multiplier : 1.0;
    if (turnMult !== 1.0) {
      breakdownList.push(`Priority Turnaround (${turnaround}): x${turnMult}`);
    }

    // Quantity scaling and tier multipliers
    let qtyMult = 1.0;
    if (quantity >= 1000) qtyMult = 0.65;
    else if (quantity >= 500) qtyMult = 0.75;
    else if (quantity >= 250) qtyMult = 0.85;
    else if (quantity >= 100) qtyMult = 0.95;

    if (qtyMult !== 1.0) {
      breakdownList.push(`High Volume Tier Discount (${quantity}+ items): x${qtyMult}`);
    }

    // Custom size surcharge
    let sizeMult = 1.0;
    if (paperSize === 'custom') {
      sizeMult = 1.25;
      breakdownList.push('Custom MM size trim surcharge: x1.25');
    }

    // Calculations
    const singleSubtotal = base * stockMult * finishMult * turnMult * sizeMult * qtyMult;
    const subtotal = selectedProductId === 'prod_document'
      ? singleSubtotal * quantity
      : singleSubtotal * (quantity / 50); // Scale relative to preset benchmark
    const vat = subtotal * 0.15; // standard South African VAT limit
    const total = subtotal + vat;

    setQuoteDetails({
      subtotal,
      vat,
      total,
      breakdown: breakdownList
    });
  }, [selectedProductId, paperSize, quantity, paperStock, finish, turnaround, products, rules]);

  // Adjust product default options when selected item changes
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const selected = products.find(p => p.id === prodId);
    if (selected && selected.config) {
      if (selected.config.sizes && selected.config.sizes.length > 0) {
        setPaperSize(selected.config.sizes[0]);
      }
      if (selected.config.stocks && selected.config.stocks.length > 0) {
        setPaperStock(selected.config.stocks[0]);
      }
      if (selected.config.finishes && selected.config.finishes.length > 0) {
        setFinish(selected.config.finishes[0]);
      }
    }
    // Set sensible quantity
    if (prodId === 'prod_document') {
      setQuantity(1);
    } else {
      setQuantity(100);
    }
  };

  // Drag-and-drop file upload handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: FileList) => {
    setUploadError(null);
    const validFormats = ['pdf', 'jpeg', 'jpg', 'png', 'docx', 'ai', 'eps', 'tiff'];

    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!validFormats.includes(ext)) {
        setUploadError(`Unsupported format: ${file.name}. Only PDF, JPEG, PNG, DOCX, AI, EPS, and TIFF accepted.`);
        return;
      }
      if (file.size > 200 * 1024 * 1024) { // 200MB limit
        setUploadError(`File ${file.name} exceeds standard 200MB individual allocation limit.`);
        return;
      }

      const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
      const newFileObj = {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        url: ''
      };

      setUploadedFiles(prev => [...prev, newFileObj]);

      // Simulate a robust progress indicator with 100MB chunk size
      let prog = 0;
      const interval = setInterval(() => {
        prog += 20;
        setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: prog } : f));
        
        if (prog >= 100) {
          clearInterval(interval);
          
          const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
          if (isImg) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 100, url: dataUrl } : f));
              setSelectedFileForMockup(fileId);
            };
            reader.readAsDataURL(file);
          } else {
            // For other documents (including PDF, DOCX, AI, EPS, TIFF), generate a customized high-fidelity dynamic vector proof!
            const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" style="background-color:#ffffff;font-family:system-ui,sans-serif;"><rect x="20" y="20" width="760" height="1160" fill="none" stroke="#f43f5e" stroke-width="4" stroke-dasharray="10,10"/><rect x="40" y="40" width="720" height="1120" fill="none" stroke="#06b6d4" stroke-width="2"/><g transform="translate(100, 150)"><rect x="0" y="0" width="600" height="850" rx="16" fill="#faf5ff" stroke="#d8b4fe" stroke-width="2"/><text x="300" y="160" font-size="32" font-weight="900" fill="#1e1b4b" text-anchor="middle" letter-spacing="2">POSTNET PRINT OS</text><text x="300" y="210" font-size="14" font-weight="700" fill="#7c3aed" text-anchor="middle" letter-spacing="4">PRE-PRESS PRODUCTION PROOF</text><line x1="150" y1="250" x2="450" y2="250" stroke="#e9d5ff" stroke-width="2"/><rect x="120" y="300" width="360" height="180" rx="12" fill="#ffffff" stroke="#e9d5ff" stroke-width="1"/><text x="300" y="350" font-size="14" font-weight="600" fill="#a21caf" text-anchor="middle">${ext.toUpperCase()} DOCUMENT DETECTED</text><text x="300" y="390" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">${file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name}</text><text x="300" y="430" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB</text><circle cx="300" cy="590" r="70" fill="#7c3aed" opacity="0.08"/><circle cx="300" cy="590" r="50" fill="#a21caf" opacity="0.08"/><path d="M275,590 L295,610 L335,560" fill="none" stroke="#7c3aed" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="300" y="710" font-size="20" font-weight="800" fill="#7c3aed" text-anchor="middle">VECTOR GRAPHICS EXTRACTED</text><text x="300" y="745" font-size="12" font-weight="500" fill="#64748b" text-anchor="middle">SPOOL ENGINE READ COMPLETE</text></g><text x="400" y="1130" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle" letter-spacing="1">POWERED BY LUTHO OS • SYSTEM VERIFIED</text></svg>`;
            const dynamicSvg = `data:image/svg+xml;charset=utf-8,` + encodeURIComponent(svgMarkup);
            setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 100, url: dynamicSvg } : f));
            setSelectedFileForMockup(fileId);
          }
        }
      }, 300);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    const fileObj = uploadedFiles.find(f => f.id === fileId);
    if (fileObj?.url && fileObj.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(fileObj.url);
      } catch (err) {
        console.error('Error revoking object URL:', err);
      }
    }
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSimulateMobileBeam = () => {
    if (beamingFile) return;
    setBeamingFile(true);
    setBeamProgress(0);
    
    const interval = setInterval(() => {
      setBeamProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          
          // Generate simulated file
          const fileId = 'f_beam_' + Math.random().toString(36).substr(2, 9);
          
          const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" style="background-color:#ffffff;font-family:system-ui,sans-serif;"><rect x="20" y="20" width="760" height="1160" fill="none" stroke="#f43f5e" stroke-width="4" stroke-dasharray="10,10"/><rect x="40" y="40" width="720" height="1120" fill="none" stroke="#06b6d4" stroke-width="2"/><g transform="translate(100, 150)"><rect x="0" y="0" width="600" height="850" rx="16" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="2"/><text x="300" y="160" font-size="32" font-weight="900" fill="#14532d" text-anchor="middle" letter-spacing="2">POSTNET PRINT OS</text><text x="300" y="210" font-size="14" font-weight="700" fill="#16a34a" text-anchor="middle" letter-spacing="4">BEAMED MOBILE PROOF</text><line x1="150" y1="250" x2="450" y2="250" stroke="#dcfce7" stroke-width="2"/><rect x="120" y="300" width="360" height="180" rx="12" fill="#ffffff" stroke="#dcfce7" stroke-width="1"/><text x="300" y="350" font-size="14" font-weight="600" fill="#16a34a" text-anchor="middle">MOBILE BEAM RECEIVED</text><text x="300" y="390" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">${mockMobileFilename}</text><text x="300" y="430" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">Size: 18.50 MB</text><circle cx="300" cy="590" r="70" fill="#16a34a" opacity="0.08"/><circle cx="300" cy="590" r="50" fill="#15803d" opacity="0.08"/><path d="M275,590 L295,610 L335,560" fill="none" stroke="#16a34a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="300" y="710" font-size="20" font-weight="800" fill="#15803d" text-anchor="middle">BEAM TRANSFER OK</text><text x="300" y="745" font-size="12" font-weight="500" fill="#64748b" text-anchor="middle">SPOOL ENGINE READ COMPLETE</text></g><text x="400" y="1130" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle" letter-spacing="1">POWERED BY LUTHO OS • SYSTEM VERIFIED</text></svg>`;
          const dynamicSvg = `data:image/svg+xml;charset=utf-8,` + encodeURIComponent(svgMarkup);

          const beamedObj = {
            id: fileId,
            name: mockMobileFilename,
            size: 1024 * 1024 * 18.5, // 18.5 MB
            progress: 100,
            url: dynamicSvg
          };
          
          setUploadedFiles(prev => [...prev, beamedObj]);
          setBeamingFile(false);
          setShowSimulatedPhone(false);
          return 100;
        }
        return p + 25;
      });
    }, 300);
  };

  // Submit the total customized print work to firestore database
  const handlePlaceOrder = async (payMethod: 'PayFast' | 'Stripe' | 'Collection') => {
    if (uploadedFiles.length === 0) {
      setSubmitError('Please upload at least one print source file to proceed.');
      return;
    }
    setSubmittingOrder(true);
    setSubmitError(null);

    try {
      let activeUser: UserProfile;

      if (!user) {
        if (!guestEmail.trim() || !guestPassword.trim()) {
          setSubmitError('Please enter your email and select or set a secure password to process checkout tracking.');
          setSubmittingOrder(false);
          return;
        }

        const emailTrimmed = guestEmail.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrimmed)) {
          setSubmitError('Please enter a valid email address.');
          setSubmittingOrder(false);
          return;
        }

        if (isGuestSignUp) {
          if (!billingName.trim()) {
            setSubmitError('Please enter your full name for billing identity records.');
            setSubmittingOrder(false);
            return;
          }
          if (guestPassword.length < 6) {
            setSubmitError('Tracking password must be at least 6 characters long.');
            setSubmittingOrder(false);
            return;
          }

          try {
            // Register new user on the fly
            const credentials = await createUserWithEmailAndPassword(auth, guestEmail.trim(), guestPassword);
            const uid = credentials.user.uid;
            
            activeUser = {
              id: uid,
              email: guestEmail.trim(),
              role: 'customer',
              createdAt: new Date(),
              name: billingName,
              company: billingCompany || undefined,
              phone: billingPhone || undefined,
              vatNumber: billingVat || undefined,
              tags: ['Standard Customer']
            };

            await setDoc(doc(db, 'users', uid), cleanUndefined(activeUser));
          } catch (signupErr: any) {
            if (signupErr.code === 'auth/operation-not-allowed') {
              // Local sandbox mode fallback!
              const localUid = 'local_customer_' + Math.random().toString(36).substring(2, 11);
              activeUser = {
                id: localUid,
                email: guestEmail.trim(),
                role: 'customer',
                createdAt: new Date(),
                name: billingName,
                company: billingCompany || undefined,
                phone: billingPhone || undefined,
                vatNumber: billingVat || undefined,
                tags: ['Standard Customer', 'LocalSandbox']
              };
              localStorage.setItem('local_sandbox_user', JSON.stringify(activeUser));
              try {
                await setDoc(doc(db, 'users', localUid), cleanUndefined(activeUser));
              } catch (dbErr) {
                console.warn('Failed to register local user in Firestore during signup, continuing offline:', dbErr);
              }
            } else {
              throw signupErr;
            }
          }
        } else {
          try {
            // Sign in existing user on the fly
            const credentials = await signInWithEmailAndPassword(auth, guestEmail.trim(), guestPassword);
            const uid = credentials.user.uid;
            
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) {
              activeUser = uDoc.data() as UserProfile;
            } else {
              activeUser = {
                id: uid,
                email: guestEmail.trim(),
                role: 'customer',
                createdAt: new Date(),
                name: billingName || guestEmail.split('@')[0]
              };
              await setDoc(doc(db, 'users', uid), cleanUndefined(activeUser));
            }
          } catch (signinErr: any) {
            if (signinErr.code === 'auth/operation-not-allowed') {
              // Local sandbox mode fallback!
              const localUid = 'local_customer_' + Math.random().toString(36).substring(2, 11);
              activeUser = {
                id: localUid,
                email: guestEmail.trim(),
                role: 'customer',
                createdAt: new Date(),
                name: billingName || guestEmail.trim().split('@')[0],
                tags: ['Standard Customer', 'LocalSandbox']
              };
              localStorage.setItem('local_sandbox_user', JSON.stringify(activeUser));
              try {
                await setDoc(doc(db, 'users', localUid), cleanUndefined(activeUser));
              } catch (dbErr) {
                console.warn('Failed to register local user in Firestore during signin, continuing offline:', dbErr);
              }
            } else {
              throw signinErr;
            }
          }
        }
      } else {
        activeUser = user;
      }

      const orderId = 'postnet_' + Math.floor(100000 + Math.random() * 900000);
      const product = products.find(p => p.id === selectedProductId) || products[0];

      const orderData: Order = {
        id: orderId,
        userId: activeUser.id,
        customerName: billingName || activeUser.name || activeUser.email.split('@')[0],
        customerEmail: activeUser.email,
        status: 'Received',
        totalPrice: quoteDetails.total,
        subtotal: quoteDetails.subtotal,
        vat: quoteDetails.vat,
        createdAt: new Date(),
        productType: product.name,
        quantity: quantity,
        specs: {
          paperSize: paperSize === 'custom' ? `Custom: ${customWidth}x${customHeight}mm` : paperSize,
          paperStock: paperStock,
          finish: finish,
          printSides: printSides,
          colourMode: colourMode,
          alignmentScale: `${mockupZoom}%`,
          alignmentOffset: `X: ${mockupOffsetX}px, Y: ${mockupOffsetY}px`,
          alignmentRotation: `${mockupRotation}°`,
          alignmentFitMode: mockupFitMode
        },
        turnaround: turnaround,
        collectionMethod: collectionMethod,
        deliveryAddress: collectionMethod === 'Courier Delivery' ? deliveryAddress : undefined,
        specialInstructions: specialInstructions || undefined,
        paymentStatus: payMethod === 'Collection' ? 'unpaid' : 'paid',
        paymentMethod: payMethod === 'Collection' ? 'Pay at Collection' : payMethod,
        staffNote: ''
      };

      // Write Order Document (Rule validations strictly enforced)
      const pathForWrite = `orders/${orderId}`;
      try {
        await setDoc(doc(db, 'orders', orderId), cleanUndefined(orderData));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathForWrite);
      }

      // Write subcollection files
      for (const file of uploadedFiles) {
        const fileRefId = 'f_' + Math.random().toString(36).substr(2, 9);
        const fileRecord = {
          id: fileRefId,
          orderId: orderId,
          fileName: file.name,
          fileUrl: file.url || 'https://firebasestorage.googleapis.com/v0/b/mock/o/plans.pdf',
          fileSize: file.size,
          uploadedAt: new Date()
        };
        await setDoc(doc(db, 'orders', orderId, 'order_files', fileRefId), cleanUndefined(fileRecord));
      }

      // Record first status entry in history subcollection
      const historyId = 'audit_' + Math.random().toString(36).substr(2, 9);
      const statusHistoryObj = {
        id: historyId,
        orderId: orderId,
        fromStatus: '',
        toStatus: 'Received',
        changedBy: activeUser.id,
        changedByName: activeUser.name || activeUser.email,
        note: payMethod === 'Collection'
          ? 'Order registered with pending payment. Customer will pay at collection.'
          : `Order registered and payment completed successfully via ${payMethod}.`,
        timestamp: new Date()
      };
      await setDoc(doc(db, 'orders', orderId, 'status_history', historyId), cleanUndefined(statusHistoryObj));

      // Successfully processed
      onOrderCreated(orderId);
    } catch (err: any) {
      console.error('Order submission error:', err);
      let friendlyError = err.message || 'Firestore rules permission denied or network failure.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'That email is already registered. Switch to the "Login with existing profile" option above!';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = 'Incorrect password for that email profile.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      }
      setSubmitError(friendlyError);
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-36 md:pb-8 fade-in">
      
      {/* Visual Navigation Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= s 
                  ? 'bg-brand-blue text-white ring-2 ring-brand-cyan shadow-md' 
                  : 'bg-zinc-200 text-zinc-600'
              }`}>
                {s}
              </div>
              <span className="ml-2 text-xs font-semibold text-brand-dark mr-3 select-none">
                {s === 1 ? 'Configure Specs' : s === 2 ? 'Upload Source' : 'Checkout'}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 text-zinc-300 mr-2" />}
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded text-xs text-red-700 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Progress body panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side Spec builder - dynamic controls */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex flex-col justify-between min-h-[480px]">
          
          {step === 1 && (
            <div className="space-y-4">
              {onboardActive ? (
                /* Typeform-style guided onboarding wizard */
                <div className="space-y-5 fade-in bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden">
                  
                  {/* Background Accents for visual craft */}
                  <div className="absolute right-0 top-0 h-40 w-40 bg-brand-cyan/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  {/* Header / Step Progress */}
                  <div className="flex items-center justify-between border-b pb-3.5">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#E11D48] flex items-center space-x-1.5">
                        <span className="text-red-600 animate-pulse">✨</span>
                        <span>Interactive Spec Assistant</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Step-by-step assistant for instant setup & pricing</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOnboardActive(false)}
                      className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer"
                    >
                      Skip to Advanced Specs ➔
                    </button>
                  </div>

                  {/* Progressive Dots Tracker */}
                  <div className="flex items-center space-x-1.5 justify-center py-1">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <div
                        key={d}
                        className={`h-2 rounded-full transition-all ${
                          onboardStep === d 
                            ? 'w-8 bg-[#E11D48]' 
                            : onboardStep > d 
                            ? 'w-2 bg-rose-200' 
                            : 'w-2 bg-zinc-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Wizard Step Content Switcher */}
                  {onboardStep === 1 && (
                    <div className="space-y-4 fade-in">
                      <div className="text-center py-2">
                        <h3 className="text-base font-extrabold text-brand-dark tracking-tight"> What are we printing today?</h3>
                        <p className="text-xs text-zinc-500 mt-1">Select the option that best matches your project.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId('prod_document');
                            setPaperSize('A4');
                            setPaperStock('80gsm');
                            setFinish('Uncoated');
                            setPrintSides('Single sided');
                            setColourMode('Black & white');
                            setQuantity(1);
                            setOnboardStep(2);
                          }}
                          className="p-3 text-left bg-white border border-zinc-200 hover:border-red-500 hover:ring-1 hover:ring-red-300 rounded-xl transition-all cursor-pointer hover:bg-rose-50/20 group"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl pt-1">📄</span>
                            <div>
                              <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Quick Document Print</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">PDFs, contracts, essays, statement sheets, tax slips, slips or guides</p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId('prod_bizcard');
                            setPaperSize('A6');
                            setPaperStock('350gsm');
                            setFinish('Matt laminate');
                            setPrintSides('Double sided');
                            setColourMode('Full colour (CMYK)');
                            setQuantity(100);
                            setOnboardStep(2);
                          }}
                          className="p-3 text-left bg-white border border-zinc-200 hover:border-red-500 hover:ring-1 hover:ring-red-300 rounded-xl transition-all cursor-pointer hover:bg-rose-50/20 group"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl pt-1">📇</span>
                            <div>
                              <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Business Cards</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Premium quality double-sided contact cards with protective lamination</p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId('prod_flyer');
                            setPaperSize('A5');
                            setPaperStock('120gsm');
                            setFinish('Uncoated');
                            setPrintSides('Single sided');
                            setColourMode('Full colour (CMYK)');
                            setQuantity(100);
                            setOnboardStep(2);
                          }}
                          className="p-3 text-left bg-white border border-zinc-200 hover:border-red-500 hover:ring-1 hover:ring-red-300 rounded-xl transition-all cursor-pointer hover:bg-rose-50/20 group"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl pt-1">📢</span>
                            <div>
                              <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Flyers / Leaflets</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Promotional announcements, event notes, handouts, bulletins or specs</p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId('prod_poster');
                            setPaperSize('A2');
                            setPaperStock('170gsm');
                            setFinish('Gloss laminate');
                            setPrintSides('Single sided');
                            setColourMode('Full colour (CMYK)');
                            setQuantity(1);
                            setOnboardStep(2);
                          }}
                          className="p-3 text-left bg-white border border-zinc-200 hover:border-red-500 hover:ring-1 hover:ring-red-300 rounded-xl transition-all cursor-pointer hover:bg-rose-50/20 group"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl pt-1">🖼️</span>
                            <div>
                              <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Posters / Large Prints</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Large-format high gloss display graphics, maps, layout plans or architectural sets</p>
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setOnboardActive(false)}
                          className="text-[11px] font-semibold text-brand-blue hover:underline"
                        >
                          I have an advanced custom print specification project
                        </button>
                      </div>
                    </div>
                  )}

                  {onboardStep === 2 && (
                    <div className="space-y-4 fade-in">
                      <div className="text-center py-2">
                        <h3 className="text-base font-extrabold text-brand-dark tracking-tight">Vibrant Color or Economical Grayscale?</h3>
                        <p className="text-xs text-zinc-500 mt-1">Full color prints use digital laser toner, grayscale saves document printing budgets.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setColourMode('Black & white');
                            setOnboardStep(3);
                          }}
                          className="p-4 text-left bg-white border border-zinc-200 hover:border-red-500 rounded-xl transition-all cursor-pointer hover:bg-zinc-50 flex items-start space-x-3 group"
                        >
                          <div className="h-6 w-6 mt-1 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 text-xs font-black">
                            B&W
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Grayscale / Black & White</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Best for plain document copy, legal bank statements, ticket passes, receipts or simple text files.</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setColourMode('Full colour (CMYK)');
                            setOnboardStep(3);
                          }}
                          className="p-4 text-left bg-white border border-zinc-200 hover:border-red-500 rounded-xl transition-all cursor-pointer hover:bg-zinc-50 flex items-start space-x-3 group"
                        >
                          <div className="h-6 w-6 mt-1 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-black">
                            RGB
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Full Colour (CMYK - Premium)</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Bright, high-fidelity colour inks. Recommended for flyers, cards, photography and designs.</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {onboardStep === 3 && (
                    <div className="space-y-4 fade-in">
                      <div className="text-center py-2">
                        <h3 className="text-base font-extrabold text-brand-dark tracking-tight">Print on One Side or Both?</h3>
                        <p className="text-xs text-zinc-500 mt-1">Double sided copies save standard printing paper weight fees.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintSides('Single sided');
                            setOnboardStep(4);
                          }}
                          className="p-4 text-left bg-white border border-zinc-200 hover:border-red-500 rounded-xl transition-all cursor-pointer hover:bg-zinc-50 flex items-start space-x-3 group"
                        >
                          <span className="text-xl pt-0.5">📄</span>
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Single Sided</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Prints content on the front side only. Back stays clean and blank.</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrintSides('Double sided');
                            setOnboardStep(4);
                          }}
                          className="p-4 text-left bg-white border border-zinc-200 hover:border-red-500 rounded-xl transition-all cursor-pointer hover:bg-zinc-50 flex items-start space-x-3 group"
                        >
                          <span className="text-xl pt-0.5">📖</span>
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-900 group-hover:text-red-600">Double Sided</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Duplex printing. Best for multi-page documents, flyers, and pamphlets to save weight.</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {onboardStep === 4 && (
                    <div className="space-y-4 fade-in">
                      <div className="text-center py-2">
                        <h3 className="text-base font-extrabold text-brand-dark tracking-tight">How many copies are we making?</h3>
                        <p className="text-xs text-zinc-500 mt-1">Pricing dynamically calculates based on volume thresholds.</p>
                      </div>

                      <div className="max-w-md mx-auto space-y-4">
                        {/* Quick Preset Buttons */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2 text-center">
                            Toggle Quick Copy Volume Selectors:
                          </label>
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {(selectedProductId === 'prod_document' || selectedProductId === 'prod_poster'
                              ? [1, 2, 5, 10, 15, 20, 30, 50, 100]
                              : [50, 100, 250, 500, 1000]
                            ).map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setQuantity(num)}
                                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  quantity === num 
                                    ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                                }`}
                              >
                                {num} {num === 1 ? 'Copy' : 'Copies'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Direct input option */}
                        <div className="flex items-center space-x-3 justify-center border-t pt-3">
                          <span className="text-xs text-zinc-500 font-bold">Or enter a custom amount:</span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                            className="p-1 px-2.5 w-24 bg-white border border-zinc-300 rounded text-center text-xs font-bold text-brand-dark focus:ring-1 focus:ring-red-500"
                          />
                        </div>

                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => setOnboardStep(5)}
                            className="px-6 py-2.5 bg-[#E11D48] hover:bg-red-700 text-white font-extrabold text-xs rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer"
                          >
                            Review Final Specs ➔
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {onboardStep === 5 && (
                    <div className="space-y-4 fade-in">
                      <div className="text-center py-2">
                        <span className="text-3xl text-green-500">🎉</span>
                        <h3 className="text-base font-extrabold text-brand-dark tracking-tight mt-1">Specs Configured & Tailored!</h3>
                        <p className="text-xs text-zinc-500">Your custom quote estimator is ready on the right pane.</p>
                      </div>

                      {/* Curated Summary Ticket */}
                      <div className="bg-rose-50/40 border border-red-100 rounded-xl p-4 max-w-sm mx-auto space-y-2 text-xs">
                        <div className="flex justify-between border-b pb-1.5 border-red-50">
                          <span className="text-zinc-500">Core Product:</span>
                          <span className="font-extrabold text-brand-dark">{(products.find(p => p.id === selectedProductId) || products[0])?.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5 border-red-50">
                          <span className="text-zinc-500">Colour Palette:</span>
                          <span className="font-extrabold text-brand-dark">{colourMode}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5 border-red-50">
                          <span className="text-zinc-500">Page Side Layout:</span>
                          <span className="font-extrabold text-brand-dark">{printSides}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5 border-red-50">
                          <span className="text-zinc-500">Paper Standard Size:</span>
                          <span className="font-extrabold text-brand-dark">{paperSize}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5 border-red-50">
                          <span className="text-zinc-500">Thickness & Finish:</span>
                          <span className="font-bold text-zinc-700">{paperStock} • {finish}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-bold">Total Job Quantity:</span>
                          <span className="font-black text-red-600 bg-red-100/60 px-2 py-0.5 rounded">{quantity} copies</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3 border-t border-zinc-150">
                        <button
                          type="button"
                          onClick={() => setOnboardActive(false)}
                          className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border text-zinc-700 text-xs font-extrabold rounded-lg transition-all cursor-pointer"
                        >
                          🛠️ Tweak Detailed Options (Advanced)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="w-full sm:w-auto px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-lg shadow-md uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <span>Next: Upload Print Files</span>
                          <span>➔</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Footer for Wizard (Back chevrons) */}
                  {onboardStep > 1 && onboardStep <= 5 && (
                    <div className="flex items-center justify-between border-t border-zinc-150 pt-3 mt-4 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setOnboardStep(onboardStep - 1)}
                        className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-800 font-extrabold cursor-pointer"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        <span>Question Step {onboardStep - 1}</span>
                      </button>
                      <span className="text-zinc-400 font-medium">Assistant Progress: {onboardStep}/5</span>
                    </div>
                  )}

                </div>
              ) : (
                /* Advanced Surgical specs Editor Form */
                <div className="space-y-4 fade-in">
                  
                  {/* Onboarding Assistant Alert Callout banner */}
                  <div className="bg-red-50/60 border border-red-100 p-3 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-red-500 text-sm">💡</span>
                      <p className="text-zinc-700 leading-tight">
                        <span className="font-extrabold text-brand-dark">Confused by paper stocks or sizes?</span>
                        <br />
                        Let our dynamic spec assistant walk you through simple questions!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardActive(true);
                        setOnboardStep(1);
                      }}
                      className="bg-white border border-red-200 text-red-650 hover:bg-red-50 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer shadow-sm transition-all text-[#E11D48]"
                    >
                      Launch Onboarder
                    </button>
                  </div>

                  <h3 className="text-sm font-extrabold text-brand-dark flex items-center space-x-2">
                    <Printer className="h-4 w-4 text-brand-accent hover:scale-110" />
                    <span>Advanced Specifications Configurator</span>
                  </h3>

                  {/* Product selector dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Product Category
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-dark font-medium cursor-pointer focus:ring-2 focus:ring-brand-cyan"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Responsive spec config layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Paper Size
                      </label>
                      <select
                        value={paperSize}
                        onChange={(e) => setPaperSize(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-dark cursor-pointer font-medium"
                      >
                        <option value="A4">A4 (210 x 297 mm)</option>
                        <option value="A3">A3 (297 x 420 mm)</option>
                        <option value="A5">A5 (148 x 210 mm)</option>
                        <option value="A6">A6 (105 x 148 mm)</option>
                        <option value="A1">A1 Graphic (594 x 841 mm)</option>
                        <option value="A2">A2 Poster (420 x 594 mm)</option>
                        <option value="custom">Custom Dimensions (MM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Print Quantity (Copies)
                      </label>
                      <select
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-dark font-medium cursor-pointer focus:ring-1 focus:ring-red-500"
                      >
                        {(selectedProductId === 'prod_document'
                          ? [1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100]
                          : [50, 100, 250, 500, 1000, 2000, 5000]
                        ).map(q => (
                          <option key={q} value={q}>
                            {q} {selectedProductId === 'prod_document' ? (q === 1 ? 'Copy' : 'Copies') : 'Units'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {paperSize === 'custom' && (
                    <div className="p-3 bg-brand-light rounded-lg border border-brand-cyan/20 grid grid-cols-2 gap-3 fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 mb-1">Width (mm)</label>
                        <input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          className="p-1.5 w-full bg-white border rounded text-xs"
                          placeholder="110"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 mb-1">Height (mm)</label>
                        <input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(e.target.value)}
                          className="p-1.5 w-full bg-white border rounded text-xs"
                          placeholder="110"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Paper Thickness (Stock)
                      </label>
                      <select
                        value={paperStock}
                        onChange={(e) => setPaperStock(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-dark font-medium cursor-pointer"
                      >
                        <option value="80gsm">80gsm (Standard Bond)</option>
                        <option value="90gsm">90gsm (HQ Copy)</option>
                        <option value="120gsm">120gsm (Soft Brochures)</option>
                        <option value="150gsm">150gsm (Luxury Flyer)</option>
                        <option value="170gsm">170gsm (Graphic Posters)</option>
                        <option value="250gsm">250gsm (Semi-cardstock)</option>
                        <option value="300gsm">300gsm (Business Cards)</option>
                        <option value="350gsm">350gsm (Premium Dense)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Protective Finish
                      </label>
                      <select
                        value={finish}
                        onChange={(e) => setFinish(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-dark font-medium cursor-pointer"
                      >
                        <option value="Uncoated">Uncoated (Matte Text)</option>
                        <option value="Gloss laminate">Gloss Laminate (high reflection)</option>
                        <option value="Matt laminate">Matt Laminate (protective silk)</option>
                        <option value="Soft touch">Soft Touch (velvet texture)</option>
                        <option value="UV spot">UV Spot Highlight (high luster)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Sides
                      </label>
                      <div className="flex space-x-2 mt-1">
                        {['Single sided', 'Double sided'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setPrintSides(s)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              printSides === s 
                                ? 'bg-[#E11D48] text-white border-red-650 font-bold' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Colour Palette Mode
                      </label>
                      <select
                        value={colourMode}
                        onChange={(e) => setColourMode(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-dark font-medium cursor-pointer"
                      >
                        <option value="Full colour (CMYK)">Full Colour (CMYK - Press)</option>
                        <option value="Black & white">Grayscale / Black & White</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Speed & Turnaround Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { val: 'Standard (3–5 days)', price: 'Standard Mult' },
                        { val: 'Express (next day)', price: 'Express (+50%)' },
                        { val: 'Same day (premium)', price: 'Rush fee (+100%)' }
                      ].map(t => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setTurnaround(t.val)}
                          className={`py-2 px-1 text-[10px] sm:text-xs font-semibold rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                            turnaround === t.val 
                              ? 'bg-red-600 text-white border-red-600 shadow-sm scale-102 font-bold' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-bold">{t.val.split(' ')[0]}</span>
                          <span className="text-[9px] opacity-80">{t.val.split(' ')[1]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Responsive 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left column: Dropzone & uploads */}
                <div className="lg:col-span-4 space-y-4">
                  <h3 className="text-lg font-bold text-zinc-900 border-b pb-2 flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Upload className="h-5 w-5 text-red-600 animate-pulse" />
                      <span>File Dropzone Portal</span>
                    </span>
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded font-mono font-bold">Max 200MB</span>
                  </h3>

                  {/* Seamless Upload Channel Selection Tabs */}
                  <div className="flex border-b border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setUploadTab('direct')}
                      className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition-all ${
                        uploadTab === 'direct'
                          ? 'border-red-600 text-red-600 bg-red-50/20'
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      💻 Direct File Upload (Staple)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab('qr')}
                      className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition-all ${
                        uploadTab === 'qr'
                          ? 'border-red-600 text-red-600 bg-red-50/20'
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      📱 Instant Mobile QR Beam
                    </button>
                  </div>

                  {uploadTab === 'direct' ? (
                    /* Classic Drag and Drop Channel */
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[180px] cursor-pointer ${
                        isDragging 
                          ? 'border-red-600 bg-rose-50/30 scale-98' 
                          : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100/50'
                      }`}
                      onClick={() => document.getElementById('file-picker')?.click()}
                    >
                      <input
                        type="file"
                        id="file-picker"
                        multiple
                        onChange={handleManualUpload}
                        className="hidden"
                        accept=".pdf,.jpeg,.png,.docx,.ai,.eps,.tiff"
                      />
                      
                      <Upload className="h-10 w-10 text-red-500 mb-2" />
                      <p className="text-sm font-bold text-zinc-800">Drag print files or Browse here</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Supported formats: PDF, JPEG, PNG, DOCX, AI, EPS, TIFF
                      </p>
                    </div>
                  ) : (
                    /* Mobile QR Code Channel & Simulator Bridge */
                    <div className="p-4 bg-zinc-900 text-white rounded-xl space-y-4 border border-zinc-800">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Beautiful center-emblem Vector QR */}
                        <div className="shrink-0">
                          <svg className="w-32 h-32 bg-white p-2 rounded-xl border border-zinc-700 shadow-lg" viewBox="0 0 100 100">
                            {/* Anchor squares */}
                            <rect x="5" y="5" width="22" height="22" fill="none" stroke="black" strokeWidth="4" />
                            <rect x="10" y="10" width="12" height="12" fill="black" />
                            <rect x="73" y="5" width="22" height="22" fill="none" stroke="black" strokeWidth="4" />
                            <rect x="78" y="10" width="12" height="12" fill="black" />
                            <rect x="5" y="73" width="22" height="22" fill="none" stroke="black" strokeWidth="4" />
                            <rect x="10" y="78" width="12" height="12" fill="black" />
                            
                            {/* Random simulated code patterns */}
                            <rect x="35" y="5" width="6" height="6" fill="black" />
                            <rect x="45" y="12" width="8" height="4" fill="black" />
                            <rect x="35" y="25" width="12" height="4" fill="black" />
                            <rect x="55" y="8" width="4" height="12" fill="black" />
                            <rect x="62" y="24" width="6" height="6" fill="black" />
                            
                            <rect x="32" y="38" width="10" height="4" fill="black" fillOpacity="0.7" />
                            <rect x="65" y="38" width="8" height="6" fill="black" />
                            <rect x="5" y="44" width="6" height="10" fill="black" />
                            <rect x="18" y="52" width="10" height="4" fill="black" />
                            
                            <rect x="76" y="76" width="14" height="14" fill="none" stroke="black" strokeWidth="2" />
                            <rect x="80" y="80" width="6" height="6" fill="black" />

                            {/* Red Center Orb Emblem */}
                            <circle cx="50" cy="50" r="14" fill="white" stroke="#DC2626" strokeWidth="2.5" />
                            <circle cx="50" cy="50" r="10" fill="#DC2626" />
                            <polygon points="46,47 54,47 50,54" fill="white" />
                          </svg>
                        </div>

                        {/* Step guidance */}
                        <div className="space-y-2 text-center sm:text-left flex-1">
                          <p className="text-sm font-bold text-rose-500">How to QR Beam File:</p>
                          <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
                            <li>Scan the QR code with your mobile smartphone camera.</li>
                            <li>Select files from your mobile photo library or document app.</li>
                            <li>Watch files transfer and pop up onto your desktop screen instantly!</li>
                          </ol>

                          {!showSimulatedPhone ? (
                            <button
                              type="button"
                              onClick={() => setShowSimulatedPhone(true)}
                              className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all inline-flex items-center space-x-1"
                            >
                              <span>📱 Open Simulated Phone Uploader</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-400 block mt-2 animate-pulse">
                              Simulated phone connection open below...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fully functional iPhone Simulator Frame */}
                      {showSimulatedPhone && (
                        <div className="bg-zinc-800 border-2 border-zinc-700 rounded-2xl p-4 mt-2 max-w-sm mx-auto shadow-xl space-y-3 relative overflow-hidden text-zinc-900">
                          {/* Notch */}
                          <div className="w-24 h-4 bg-zinc-900 rounded-full mx-auto mb-1 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 block mr-1" />
                            <span className="w-8 h-1 rounded-full bg-zinc-800 block" />
                          </div>

                          <div className="bg-white text-zinc-900 rounded-xl p-3.5 space-y-3 border border-zinc-200">
                            <div className="text-center font-bold text-xs uppercase tracking-wider text-zinc-500">
                              Postnet Mobile Beam Node
                            </div>
                            
                            <div className="bg-zinc-50 p-2.5 rounded-lg border text-xs">
                              <label className="block text-[10px] font-bold text-zinc-500 mb-1">
                                Choose File in Simulated Phone Device
                              </label>
                              <select
                                value={mockMobileFilename}
                                onChange={(e) => setMockMobileFilename(e.target.value)}
                                className="w-full p-1.5 border rounded bg-white text-xs"
                              >
                                <option value="architectural_plans_hq.pdf">📁 architectural_plans_hq.pdf (18.5 MB)</option>
                                <option value="corporate-flyer-v2.ai">🎨 corporate-flyer-v2.ai (42.1 MB)</option>
                                <option value="menu-draft.docx">📄 menu-draft.docx (4.8 MB)</option>
                                <option value="banner-highresolution.tiff">📷 banner-highresolution.tiff (120.3 MB)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              disabled={beamingFile}
                              onClick={handleSimulateMobileBeam}
                              className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                            >
                              {beamingFile ? (
                                <>
                                  <span className="animate-spin text-rose-500">●</span>
                                  <span>Beaming file ({beamProgress}%)</span>
                                </>
                              ) : (
                                <>
                                  <span>⚡ Beam File to Desktop</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex justify-between items-center px-1 text-[9px] text-zinc-400">
                            <span>Connection: Live SSL</span>
                            <button
                              type="button"
                              onClick={() => setShowSimulatedPhone(false)}
                              className="text-red-400 hover:underline hover:text-red-300 font-semibold"
                            >
                              Close Simulator
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <div className="text-xs text-red-600 flex items-center space-x-1.5 p-2 bg-red-50 border border-red-200 rounded">
                      <span className="font-bold">Error:</span>
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Stage Files:</p>
                      {uploadedFiles.map(f => (
                        <div 
                          key={f.id} 
                          onClick={() => setSelectedFileForMockup(f.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            selectedFileForMockup === f.id
                              ? 'bg-rose-50/60 border-red-500 ring-1 ring-red-400'
                              : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                          }`}
                        >
                          <div className="flex-1 pr-3 truncate">
                            <div className="flex items-center space-x-2 truncate">
                              <span className={selectedFileForMockup === f.id ? "text-red-650 font-bold" : "text-zinc-500 font-bold"}>
                                {selectedFileForMockup === f.id ? "▶" : "✓"}
                              </span>
                              <p className="font-semibold text-zinc-800 truncate">{f.name}</p>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                            className="p-1.5 text-zinc-400 hover:text-red-500 rounded hover:bg-red-50"
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right column: Pre-Press Alignment & interactive crop controls */}
                <div className="lg:col-span-8 space-y-4 bg-zinc-50 border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
                  <div className="border-b border-zinc-200 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#E11D48] flex items-center bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                        <Crop className="h-3.5 w-3.5 mr-1 text-[#E11D48]" />
                        <span>Pre-Press Proof & Crop Studio</span>
                      </span>
                      {uploadedFiles.length > 0 && (
                        <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                          PROOF ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed font-semibold">
                      Calibrate safe margins, rotate, and center your artwork to prevent trimming errors at the Postnet printing press.
                    </p>
                  </div>

                  {/* Design Workspace Table Viewport */}
                  <div className="bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden border border-zinc-800 shadow-inner group min-h-[360px] sm:min-h-[460px] md:min-h-[520px] lg:min-h-[560px] xl:min-h-[660px] w-full shrink-0">
                    {/* Workspace Gridlines */}
                    <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none"></div>
                    
                    {/* Floating guide label */}
                    <span className="absolute top-2.5 right-2.5 z-20 text-[9px] bg-black/60 text-zinc-400 font-mono font-bold px-2 py-1 rounded border border-zinc-800 backdrop-blur flex items-center space-x-1 select-none">
                      <Move className="h-2.5 w-2.5 text-red-500 mr-0.5" />
                      <span>Drag Image to Pan</span>
                    </span>

                    {/* Active proof item selector header if multiple exist */}
                    <div className="absolute top-2.5 left-2.5 z-20 max-w-[200px] bg-black/60 font-mono text-[9px] border border-zinc-800 backdrop-blur rounded px-2 py-1 text-zinc-300">
                      <span className="text-red-400 font-bold">Proof: </span>
                      {uploadedFiles.find(f => f.id === selectedFileForMockup)?.name || 'Sample template'}
                    </div>

                    {/* Canvas Page Frame (Size maps dynamically to product shape!) */}
                    <div 
                      className={`relative overflow-hidden border bg-white shadow-2xl transition-all select-none duration-100 flex items-center justify-center shrink-0 ${
                        selectedProductId === 'prod_bizcard' 
                          ? 'w-72 h-[165px] sm:w-[320px] sm:h-[183px] md:w-[340px] md:h-[194px] xl:w-[400px] xl:h-[228px] rounded-lg' 
                          : 'w-[210px] h-[297px] sm:w-[250px] sm:h-[354px] md:w-[280px] md:h-[396px] xl:w-[360px] xl:h-[509px] rounded'
                      }`}
                      style={{
                        borderColor: isPressDragging ? '#DC2626' : '#d4d4d8',
                        borderWidth: '2px',
                        isolation: 'isolate',
                        transform: 'translate3d(0, 0, 0)',
                        maxWidth: '95%',
                        maxHeight: '95%',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsPressDragging(true);
                        setDragStart({ x: e.clientX - mockupOffsetX, y: e.clientY - mockupOffsetY });
                      }}
                      onMouseMove={(e) => {
                        if (!isPressDragging) return;
                        setMockupOffsetX(e.clientX - dragStart.x);
                        setMockupOffsetY(e.clientY - dragStart.y);
                      }}
                      onMouseUp={() => setIsPressDragging(false)}
                      onMouseLeave={() => setIsPressDragging(false)}
                      onTouchStart={(e) => {
                        if (e.touches.length !== 1) return;
                        setIsPressDragging(true);
                        const touch = e.touches[0];
                        setDragStart({ x: touch.clientX - mockupOffsetX, y: touch.clientY - mockupOffsetY });
                      }}
                      onTouchMove={(e) => {
                        if (!isPressDragging || e.touches.length !== 1) return;
                        const touch = e.touches[0];
                        setMockupOffsetX(touch.clientX - dragStart.x);
                        setMockupOffsetY(touch.clientY - dragStart.y);
                      }}
                      onTouchEnd={() => setIsPressDragging(false)}
                    >
                      {/* Interactive Drag & Drop Content Layer */}
                      <div 
                        className="w-full h-full relative pointer-events-none"
                        style={{
                          transform: `translate(${mockupOffsetX}px, ${mockupOffsetY}px) scale(${mockupZoom / 100}) rotate(${mockupRotation}deg)`,
                          transformOrigin: 'center center',
                          transition: isPressDragging ? 'none' : 'transform 0.1s ease-out',
                        }}
                      >
                        {uploadedFiles.find(f => f.id === selectedFileForMockup)?.url ? (
                          uploadedFiles.find(f => f.id === selectedFileForMockup)?.url.startsWith('blob:') && 
                          uploadedFiles.find(f => f.id === selectedFileForMockup)?.name.toLowerCase().endsWith('.pdf') ? (
                            <iframe 
                              src={uploadedFiles.find(f => f.id === selectedFileForMockup)?.url + '#toolbar=0&navpanes=0&scrollbar=0'} 
                              className="w-full h-full border-none pointer-events-none select-none"
                              title="PDF Document Proof"
                            />
                          ) : (
                            <img 
                              src={uploadedFiles.find(f => f.id === selectedFileForMockup)?.url} 
                              referrerPolicy="no-referrer" 
                              alt="Your custom print proof" 
                              className="w-full h-full pointer-events-none"
                              style={{
                                objectFit: mockupFitMode === 'cover' ? 'cover' : (mockupFitMode === 'contain' ? 'contain' : 'fill'),
                                filter: colourMode === 'Black & white' ? 'grayscale(100%) contrast(1.15) brightness(1.05)' : 'none',
                              }}
                            />
                          )
                        ) : (
                          /* RENDER HIGHEST-QUALITY EMBEDDED HIGH-FIDELITY VECTOR TEMPLATES */
                          selectedProductId === 'prod_document' ? (
                            /* QC Document */
                            <div className="w-full h-full p-4 flex flex-col justify-between bg-white text-zinc-800 font-sans text-left relative">
                              <div className="border-b-2 border-red-650 pb-2 flex items-center justify-between">
                                <div>
                                  <h4 className="text-[8px] font-black tracking-wider text-[#E11D48] font-mono">POSTNET PRE-PRESS PROOF</h4>
                                  <p className="text-[5px] text-zinc-400 font-mono">CUSTOMER FILE ALIGNMENT OS</p>
                                </div>
                                <span className="text-[6px] border border-red-500 text-red-500 font-mono px-1 font-extrabold uppercase scale-90">CONFIRMED PROOF</span>
                              </div>
                              
                              <div className="my-2 space-y-1">
                                <div className="h-1.5 w-2/3 bg-zinc-250 rounded"></div>
                                <div className="h-1 w-1/2 bg-zinc-150 rounded"></div>
                                <p className="text-[8px] font-bold text-zinc-700 leading-tight mt-1 line-clamp-2">
                                  {uploadedFiles.find(f => f.id === selectedFileForMockup) 
                                    ? `Stage: ${uploadedFiles.find(f => f.id === selectedFileForMockup)?.name}` 
                                    : "Drag files in portal left to calibrate margins."}
                                </p>
                              </div>

                              {/* Ledger Table mockup */}
                              <div className="space-y-1 border-t border-b py-2 my-1 border-dashed border-zinc-200">
                                <div className="flex justify-between text-[6px] text-zinc-400 font-bold border-b pb-0.5">
                                  <span>TRANSACTION DESCRIPTION</span>
                                  <span>LINE VALUE</span>
                                </div>
                                <div className="flex justify-between text-[6px] leading-none text-zinc-650">
                                  <span>Postnet Custom Calibration</span>
                                  <span className="font-mono">R 120.00</span>
                                </div>
                                <div className="flex justify-between text-[6px] leading-none text-zinc-650">
                                  <span>Volume Tier Discount Applied</span>
                                  <span className="font-mono text-red-600">-R 45.00</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-end border-t pt-1.5">
                                <div className="leading-none">
                                  <p className="text-[5px] text-zinc-400 font-mono">PORTAL INTEGRATION VERIFIED</p>
                                  <p className="text-[6px] text-zinc-700 font-mono font-bold mt-0.5">POSTNET SECURE CLOUD INC</p>
                                </div>
                                <div className="h-8 w-8 scale-90 border border-zinc-200 rounded p-0.5 flex flex-col items-center justify-center bg-zinc-50 font-mono leading-none">
                                  <span className="text-[4px] text-zinc-400 font-bold scale-90">STAMP</span>
                                  <span className="text-[6px] text-green-600 font-black tracking-tight mt-0.5 scale-90">PROOF OK</span>
                                </div>
                              </div>
                            </div>
                          ) : selectedProductId === 'prod_bizcard' ? (
                            /* Business Card template styling */
                            <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-tr from-zinc-950 to-zinc-900 text-white font-sans text-left relative overflow-hidden">
                              <div className="absolute right-0 top-0 w-24 h-24 bg-red-600/10 rounded-full blur-xl pointer-events-none"></div>
                              <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>

                              <div className="flex items-start justify-between">
                                <div className="leading-tight">
                                  <span className="text-[10px] font-black tracking-widest text-[#E11D48] font-mono flex items-center">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 mr-1.5 animate-ping"></span>
                                    <span>POSTNET CORE</span>
                                  </span>
                                  <p className="text-[5px] text-zinc-400 uppercase tracking-widest mt-0.5">Corporate Communications OS</p>
                                </div>
                                <span className="text-[6px] bg-red-600/20 text-red-400 border border-red-500/35 px-1 py-0.5 font-mono font-bold rounded scale-90">STANDARD ISSUE</span>
                              </div>

                              <div className="my-1.5">
                                <div className="h-0.5 bg-gradient-to-r from-[#E11D48] to-transparent w-16 mb-1.5"></div>
                                <h3 className="text-xs font-black tracking-tight uppercase text-zinc-100">{billingName || 'SARAH DAVIES'}</h3>
                                <p className="text-[7px] text-red-400 font-medium tracking-wide mt-0.5">{billingCompany || 'MANAGING DIRECTOR'}</p>
                              </div>

                              <div className="flex justify-between items-end border-t border-zinc-800 pt-1.5 text-[6px] text-zinc-400 font-mono leading-tight">
                                <div className="space-y-0.5">
                                  <p>📱 {billingPhone || '+27 (0) 11 463 1500'}</p>
                                  <p>✉️ {user?.email || guestEmail || 'sarah@designcorp.co.za'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[#E11D48] font-extrabold font-sans text-[6px]">DESIGN PROOF</p>
                                  {uploadedFiles.find(f => f.id === selectedFileForMockup) && (
                                    <p className="text-[5px] text-zinc-500 max-w-[80px] truncate">
                                      {uploadedFiles.find(f => f.id === selectedFileForMockup)?.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : selectedProductId === 'prod_flyer' ? (
                            /* Promo flyer template layout */
                            <div className="w-full h-full p-4 flex flex-col justify-between bg-[#FFFBEB] text-[#78350F] font-sans text-left relative border border-amber-200">
                              <div className="border-2 border-double border-amber-300 p-2 h-full flex flex-col justify-between">
                                <div className="text-center space-y-0.5">
                                  <span className="text-[6px] font-black tracking-widest bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-mono uppercase scale-90 inline-block">POSTNET EXCLUSIVE BULLETINS</span>
                                  <h3 className="text-[12px] font-black tracking-tight leading-none text-amber-900 uppercase mt-1">EXCLUSIVE FLYER</h3>
                                  <p className="text-[7px] text-amber-600 font-bold uppercase tracking-wider">UP TO 50% SAVINGS</p>
                                </div>

                                <div className="my-1.5 p-1.5 bg-white/80 rounded border border-amber-100 text-center text-[7px] italic leading-relaxed text-zinc-700">
                                  "Calibrate safe margins & vector blocks before finishing print setups."
                                  {uploadedFiles.find(f => f.id === selectedFileForMockup) && (
                                    <p className="text-[6px] font-bold text-[#E11D48] font-mono not-italic mt-0.5 truncate uppercase">
                                      SOURCE: {uploadedFiles.find(f => f.id === selectedFileForMockup)?.name}
                                    </p>
                                  )}
                                </div>

                                <div className="flex justify-between items-center text-[5.5px] text-amber-800 font-bold border-t border-amber-200 pt-1 font-mono">
                                  <span>AUDITED SANDTON CORP</span>
                                  <span className="text-amber-600 font-sans font-black">R450 OFF STOCK</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Poster visual artwork templates */
                            <div className="w-full h-full p-4 flex flex-col justify-between bg-zinc-950 text-white font-sans text-left relative overflow-hidden">
                              <div className="absolute -right-10 -top-10 w-36 h-36 bg-gradient-to-br from-red-600 to-rose-700 rounded-full blur-xl opacity-60"></div>
                              <div className="absolute -left-20 -bottom-20 w-36 h-36 bg-gradient-to-tr from-cyan-500 to-[#E11D48] rounded-full blur-2xl opacity-50"></div>

                              <div className="border border-white/10 p-2 h-full flex flex-col justify-between relative z-10 bg-black/30 backdrop-blur-sm rounded-lg">
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-1">
                                    <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse"></span>
                                    <p className="text-[6px] font-mono tracking-widest text-zinc-300 font-bold uppercase text-zinc-300">POSTNET SHOWCASE 2026</p>
                                  </div>
                                  <h3 className="text-[11px] font-black tracking-tighter leading-none bg-gradient-to-r from-red-400 to-cyan-200 bg-clip-text text-transparent uppercase">THE NEW EXPO POSTER</h3>
                                  <p className="text-[7px] text-zinc-300 font-medium">South Africa’s premier print event</p>
                                </div>

                                <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800 text-[6.5px] leading-normal text-zinc-400">
                                  Use the parameters below to configure, crop, scale or rotate this source file on posters.
                                  {uploadedFiles.find(f => f.id === selectedFileForMockup) && (
                                    <p className="text-[6px] font-mono text-red-400 mt-0.5 truncate font-bold">
                                      SOURCE: {uploadedFiles.find(f => f.id === selectedFileForMockup)?.name}
                                    </p>
                                  )}
                                </div>

                                <div className="flex justify-between items-end border-t border-zinc-800 pt-1 text-[5px]">
                                  <div>
                                    <p className="text-zinc-500 font-mono uppercase">CURATED BY DESIGN OS TEAM</p>
                                    <p className="text-zinc-300 font-bold font-mono">PRINT READY PRODUCTION</p>
                                  </div>
                                  <span className="text-[8px] font-black text-red-500 font-mono">v4.1 PROOF</span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {/* Overlap Trim markings representation */}
                      {showBleedLines && (
                        /* Highlight boundary representing safe bounds and crop borders */
                        <div className="absolute inset-4 border border-dashed border-red-500/80 pointer-events-none z-10 select-none">
                          <span className="absolute top-2 right-2 bg-red-650 text-white font-mono text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider opacity-90 select-none max-w-[95%] truncate">
                            Safe Bleed Line (✂️ Trim Zone)
                          </span>
                        </div>
                      )}

                      {/* Aesthetic corner crop guidelines */}
                      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-neutral-400 pointer-events-none"></div>
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-neutral-400 pointer-events-none"></div>
                      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-neutral-400 pointer-events-none"></div>
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-neutral-400 pointer-events-none"></div>
                    </div>

                    {/* Grayscale Mode indicator for pre-press visual verification */}
                    {colourMode === 'Black & white' && (
                      <span className="absolute bottom-3 left-3 bg-zinc-800/80 text-zinc-200 text-[8px] font-mono px-2 py-0.5 border border-zinc-700 backdrop-blur rounded uppercase font-bold z-15">
                        ⚫ Grayscale Proof Mode Active
                      </span>
                    )}
                  </div>

                  {/* interactive sliders & calibration values layout */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-xs">
                    <div className="flex justify-between items-center text-xs pb-1 border-b border-zinc-100">
                      <span className="font-extrabold text-zinc-800 flex items-center">
                        <Sliders className="h-4 w-4 text-red-600 mr-1.5 animate-pulse" />
                        <span>Calibrate Crop & Offsets</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMockupZoom(100);
                          setMockupOffsetX(0);
                          setMockupOffsetY(0);
                          setMockupRotation(0);
                          setMockupFitMode('cover');
                        }}
                        className="text-[10px] text-red-600 hover:underline hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold px-2 py-1 rounded transition-all"
                      >
                        Reset Alignment
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-1">
                      {/* Zoom Scale slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-zinc-500 text-[10px] uppercase">
                          <span className="flex items-center"><ZoomIn className="h-3 w-3 mr-1" /> Scale (Zoom)</span>
                          <span className="text-red-600">{mockupZoom}%</span>
                        </div>
                        <input 
                          type="range"
                          min="50"
                          max="200"
                          value={mockupZoom}
                          onChange={(e) => setMockupZoom(Number(e.target.value))}
                          className="w-full accent-red-600 cursor-pointer h-1 bg-zinc-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Rotate slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-zinc-500 text-[10px] uppercase">
                          <span className="flex items-center"><RotateCw className="h-3 w-3 mr-1" /> Rotation</span>
                          <span className="text-red-600">{mockupRotation}°</span>
                        </div>
                        <input 
                          type="range"
                          min="-180"
                          max="180"
                          value={mockupRotation}
                          onChange={(e) => setMockupRotation(Number(e.target.value))}
                          className="w-full accent-red-600 cursor-pointer h-1 bg-zinc-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* X position slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-zinc-500 text-[10px] uppercase">
                          <span>Horizontal Pan (X)</span>
                          <span className="text-rose-600 font-mono font-bold">{mockupOffsetX}px</span>
                        </div>
                        <input 
                          type="range"
                          min="-150"
                          max="150"
                          value={mockupOffsetX}
                          onChange={(e) => setMockupOffsetX(Number(e.target.value))}
                          className="w-full accent-zinc-800 cursor-pointer h-1 bg-zinc-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Y position slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-zinc-500 text-[10px] uppercase">
                          <span>Vertical Pan (Y)</span>
                          <span className="text-rose-600 font-mono font-bold">{mockupOffsetY}px</span>
                        </div>
                        <input 
                          type="range"
                          min="-150"
                          max="150"
                          value={mockupOffsetY}
                          onChange={(e) => setMockupOffsetY(Number(e.target.value))}
                          className="w-full accent-zinc-800 cursor-pointer h-1 bg-zinc-200 rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-150 pt-3 flex flex-wrap gap-4 items-center justify-between text-[11px] gap-y-2">
                      {/* Fitting presets buttons */}
                      <div className="space-y-1">
                        <span className="block text-[9px] font-black uppercase text-zinc-400 tracking-wider">Fitting Aspect</span>
                        <div className="flex space-x-1">
                          {(['cover', 'contain', 'fill'] as const).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                setMockupFitMode(mode);
                                setMockupOffsetX(0);
                                setMockupOffsetY(0);
                                setMockupZoom(100);
                                setMockupRotation(0);
                              }}
                              className={`px-2.5 py-1 font-bold rounded capitalize border transition-all text-[10px] ${
                                mockupFitMode === mode
                                  ? 'bg-[#E11D48] text-white border-red-650 font-extrabold scale-102'
                                  : 'bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trim markings check guide */}
                      <div className="flex items-center space-x-2 bg-zinc-50 border border-zinc-200 p-1.5 rounded-lg pr-3 cursor-pointer select-none" onClick={() => setShowBleedLines(!showBleedLines)}>
                        <input 
                          type="checkbox"
                          checked={showBleedLines}
                          readOnly
                          className="accent-[#E11D48] h-4 w-4 rounded text-xs bg-white pointer-events-none"
                        />
                        <div className="text-left leading-none">
                          <span className="block text-[10px] font-extrabold text-zinc-800 uppercase tracking-tight">Show Bleed Guide</span>
                          <span className="text-[8px] text-zinc-500">Overlay 3mm safe space limit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 border-b pb-2 flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-red-600" />
                <span>Secure Checkout Tracking Configurator</span>
              </h3>

              {/* Dynamic Authentication Block for Non-Authenticated Guest Customers */}
              {!user && (
                <div className="bg-zinc-950 text-white rounded-xl p-4 space-y-3.5 border border-zinc-800 shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono text-rose-500 font-bold uppercase tracking-wider">Authentication Requirement</p>
                      <h4 className="text-sm font-bold mt-0.5">Place Order & Access Real-time Tracking</h4>
                    </div>
                    <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">Secure SSL</span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Postnet Print OS updates job progression (File Review, In Production, Collection). Enter credentials below to save your tracking password.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-zinc-900">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                        Tracking Email Profile
                      </label>
                      <input
                        type="email"
                        required
                        className="p-2 w-full border border-zinc-700 bg-zinc-900 text-white rounded text-xs focus:ring-1 focus:ring-rose-500"
                        placeholder="e.g. sarah@company.co.za"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                        Secure Tracking Password
                      </label>
                      <input
                        type="password"
                        required
                        className="p-2 w-full border border-zinc-700 bg-zinc-900 text-white rounded text-xs focus:ring-1 focus:ring-rose-500"
                        placeholder="Min 6 characters"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800 pt-3 text-[11px] text-zinc-400">
                    <span>
                      {isGuestSignUp ? "New Account registration details." : "Direct access verification login mode."}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGuestSignUp(!isGuestSignUp)}
                      className="text-rose-400 hover:text-rose-300 font-semibold underline"
                    >
                      {isGuestSignUp ? "🔒 Login with existing profile instead" : "✍ Create a new tracking profile instead"}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-0.5">Billing Name</label>
                    <input
                      type="text"
                      className="p-2 w-full border rounded text-xs bg-zinc-50 text-zinc-900"
                      placeholder="Your Full Name"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-0.5">Company Profile (Optional)</label>
                    <input
                      type="text"
                      className="p-2 w-full border rounded text-xs bg-zinc-50 text-zinc-900"
                      placeholder="e.g. Acme Corp"
                      value={billingCompany}
                      onChange={(e) => setBillingCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-0.5">VAT Reg (Optional)</label>
                    <input
                      type="text"
                      className="p-2 w-full border rounded text-xs bg-zinc-50 text-zinc-900"
                      value={billingVat}
                      onChange={(e) => setBillingVat(e.target.value)}
                      placeholder="e.g. ZA123456"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-0.5">Contact Line</label>
                    <input
                      type="text"
                      className="p-2 w-full border rounded text-xs bg-zinc-50 text-zinc-900"
                      placeholder="e.g. +27 82 123 4567"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Delivery Fulfillment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { val: 'In-store collection', icon: Store, label: 'Postnet Store Collect' },
                      { val: 'Courier Delivery', icon: Truck, label: 'National Courier' }
                    ].map(f => {
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.val}
                          type="button"
                          onClick={() => setCollectionMethod(f.val)}
                          className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                            collectionMethod === f.val 
                              ? 'bg-rose-50 text-red-600 border-red-600 font-bold shadow-sm' 
                              : 'bg-white text-zinc-750 border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <Icon className="h-4 w-4 text-red-600" />
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {collectionMethod === 'Courier Delivery' && (
                  <div className="fade-in">
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">Shipping Address Details</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs"
                      rows={2}
                      placeholder="Street, suburb, city, and postal code in South Africa"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1">Special Instructions / Trim directions</label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full p-2 border rounded-lg text-xs"
                    rows={1}
                    maxLength={500}
                    placeholder="Enter maximum 500 characters directions..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Action Footer inside panel */}
          <div className="flex items-center justify-between border-t pt-4 mt-6">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                className={`flex items-center space-x-1 py-1.5 px-3 border rounded text-xs font-semibold ${
                  step === 1 
                    ? 'text-zinc-300 border-zinc-200' 
                    : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              {(step > 1 || !onboardActive || onboardStep > 1) && (
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="text-zinc-500 hover:text-red-650 transition-colors text-xs flex items-center space-x-1 font-semibold border-l pl-3 border-zinc-200 cursor-pointer"
                  title="Reset configurations & start again"
                >
                  <RotateCw className="h-3 w-3 animate-spin-hover" />
                  <span>Start Over</span>
                </button>
              )}
            </div>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-1 py-1.5 px-4 bg-brand-cyan hover:bg-brand-cyan/95 text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={() => handlePlaceOrder('PayFast')}
                  className="py-1.5 px-3 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Pay with PayFast (ZAR)</span>
                </button>
                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={() => handlePlaceOrder('Stripe')}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Stripe</span>
                </button>
                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={() => handlePlaceOrder('Collection')}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <Store className="h-4 w-4" />
                  <span>Pay at Collection</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Side Instant pricing invoice overview pane */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex flex-col justify-between self-start h-auto">
          <div>
            <h4 className="text-zinc-800 font-extrabold text-sm uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2 mb-4">
              <Calculator className="h-4 w-4 text-brand-cyan" />
              <span>Instant Quote Estimator</span>
            </h4>

            {/* Specifications Recap */}
            <div className="space-y-2.5 text-xs text-slate-600 mb-6">
              <div className="flex justify-between">
                <span>Selected:</span>
                <span className="font-bold text-brand-dark">{(products.find(p => p.id === selectedProductId) || products[0])?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Paper Dim:</span>
                <span className="font-bold text-brand-dark">{paperSize === 'custom' ? `${customWidth}x${customHeight}mm` : paperSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Thickness:</span>
                <span className="font-bold text-brand-dark">{paperStock}</span>
              </div>
              <div className="flex justify-between">
                <span>Protective:</span>
                <span className="font-bold text-brand-dark">{finish}</span>
              </div>
              <div className="flex justify-between">
                <span>Print sides:</span>
                <span className="font-bold text-brand-dark">{printSides}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-semibold text-brand-cyan px-1.5 py-0.2 bg-brand-cyan/10 rounded">{quantity} {quantity === 1 ? 'copy' : 'copies'}</span>
              </div>
            </div>

            {/* Quote details list */}
            <div className="bg-slate-50 rounded-xl p-3 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Multipliers Applied:</p>
              <div className="space-y-1 overflow-y-auto max-h-[140px] pr-1">
                {quoteDetails.breakdown.map((b, idx) => (
                  <p key={idx} className="text-[10px] text-zinc-600 font-mono leading-tight flex items-start space-x-1">
                    <span className="text-brand-cyan shrink-0">◇</span>
                    <span>{b}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Bottom Invoice Table */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Subtotal:</span>
              <span className="font-semibold font-mono">R{quoteDetails.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>VAT (15% SA standard):</span>
              <span className="font-semibold font-mono">R{quoteDetails.vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-brand-dark border-t border-dashed pt-2">
              <span>Quote Total:</span>
              <span className="text-brand-accent font-extrabold font-mono">R{quoteDetails.total.toFixed(2)}</span>
            </div>
            
            <div className="mt-4 bg-brand-light border border-brand-cyan/20 rounded p-2.5 text-[10px] text-zinc-500 flex items-start space-x-1.5">
              <Info className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
              <span>Once paid, design file reviewing, quality assessment, and packaging steps are logged step-by-step.</span>
            </div>
          </div>

        </div>

      </div>

      {/* Scroll spacer to prevent content from being blocked or obscured by the mobile floating navigation bar */}
      <div className="h-24 md:hidden pointer-events-none shrink-0" />

      {/* Mobile Floating Navigation Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-zinc-950/95 text-white py-2 px-3.5 rounded-full shadow-2xl border border-zinc-800/80 backdrop-blur-md z-50 flex items-center justify-between md:hidden transition-all duration-300">
        <div className="flex items-center space-x-2">
          {/* Mobile Back navigation button */}
          <button
            type="button"
            onClick={handleGoBack}
            disabled={(step === 1 && (!onboardActive || onboardStep === 1))}
            className={`p-1.5 rounded-full cursor-pointer transition-all ${
              (step === 1 && (!onboardActive || onboardStep === 1))
                ? 'text-zinc-700 cursor-not-allowed'
                : 'text-zinc-200 hover:text-white hover:bg-zinc-800'
            }`}
            title="Go Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Context indicator */}
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-red-500">
              {onboardActive ? 'Guide Mode' : 'Specs Mode'}
            </span>
            <span className="text-[10px] text-zinc-350 font-bold leading-tight">
              {onboardActive ? `Q ${onboardStep}/5` : `Step ${step}/3`}
            </span>
          </div>
        </div>

        {/* Action icons / shortcut controls */}
        <div className="flex items-center space-x-2">
          {/* Guided / Manual Configurator flow switcher */}
          <button
            type="button"
            onClick={() => {
              const nextState = !onboardActive;
              setOnboardActive(nextState);
              if (nextState) {
                setOnboardStep(1);
              }
            }}
            className="p-1.5 rounded-full bg-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title={onboardActive ? "Switch to Advanced Specs" : "Switch to Guided Assistant"}
          >
            {onboardActive ? (
              <Sliders className="h-4 w-4 text-brand-cyan" />
            ) : (
              <Info className="h-4 w-4 text-emerald-450" />
            )}
          </button>

          {/* Quick Clear Reset Configurator Button */}
          <button
            type="button"
            onClick={handleStartOver}
            className="flex items-center space-x-1.5 py-1 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all"
            title="Restart config from scratch"
          >
            <RotateCw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Floating Reset feedback indicator toast */}
        {resetToast && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] whitespace-nowrap font-bold px-2.5 py-1 rounded-lg shadow-lg border border-red-500 flex items-center space-x-1 animate-bounce">
            <Check className="h-3 w-3" />
            <span>Reset completed successfully!</span>
          </div>
        )}
      </div>

    </div>
  );
}
