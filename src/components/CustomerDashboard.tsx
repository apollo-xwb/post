import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { UserProfile, Order, OrderFile, StatusHistory } from '../types';
import { 
  Printer, 
  FileText, 
  CheckCircle, 
  Clock, 
  Eye, 
  Download, 
  Info, 
  Share2, 
  FileCode, 
  MapPin, 
  Phone,
  Barcode,
  Calendar,
  Layers,
  Sparkles,
  ClipboardCheck,
  PackageOpen
} from 'lucide-react';

interface CustomerDashboardProps {
  user: UserProfile;
  onNavigateToBuilder: () => void;
  selectedOrderIdOnCreate?: string | null;
}

const STATUS_STEPS = [
  'Received',
  'File Review',
  'In Production',
  'Quality Check',
  'Ready for Collection',
  'Dispatched'
];

export default function CustomerDashboard({ user, onNavigateToBuilder, selectedOrderIdOnCreate }: CustomerDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderFiles, setSelectedOrderFiles] = useState<OrderFile[]>([]);
  const [selectedOrderLogs, setSelectedOrderLogs] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  // Read orders list matching the signed in customer
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'orders'), where('userId', '==', user.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersArr: Order[] = [];
      snapshot.forEach(doc => {
        ordersArr.push(doc.data() as Order);
      });
      // Sort newest first
      ordersArr.sort((a,b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setOrders(ordersArr);
      
      // Auto select current order on redirect or default to the most recent one
      if (selectedOrderIdOnCreate) {
        const found = ordersArr.find(o => o.id === selectedOrderIdOnCreate);
        if (found) setSelectedOrder(found);
      } else if (ordersArr.length > 0 && !selectedOrder) {
        setSelectedOrder(ordersArr[0]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id, selectedOrderIdOnCreate]);

  // Read subcollection of file entries and history logs for selected order
  useEffect(() => {
    if (!selectedOrder) return;
    
    // Order files snapshot
    const filesPath = `orders/${selectedOrder.id}/order_files`;
    const unsubscribeFiles = onSnapshot(collection(db, 'orders', selectedOrder.id, 'order_files'), (snap) => {
      const filesArr: OrderFile[] = [];
      snap.forEach(d => {
        filesArr.push(d.data() as OrderFile);
      });
      setSelectedOrderFiles(filesArr);
    }, (err) => {
      console.warn('Error reading order files subcollection:', err);
    });

    // History logs snapshot
    const historyPath = `orders/${selectedOrder.id}/status_history`;
    const unsubscribeHistory = onSnapshot(collection(db, 'orders', selectedOrder.id, 'status_history'), (snap) => {
      const logsArr: StatusHistory[] = [];
      snap.forEach(d => {
        logsArr.push(d.data() as StatusHistory);
      });
      // Newest status history first
      logsArr.sort((a,b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      setSelectedOrderLogs(logsArr);
    }, (err) => {
      console.warn('Error reading status history:', err);
    });

    return () => {
      unsubscribeFiles();
      unsubscribeHistory();
    };
  }, [selectedOrder]);

  const handleCopyShareLink = () => {
    if (!selectedOrder) return;
    setCopying(true);
    const trackingUrl = `${window.location.origin}/?track=${selectedOrder.id}`;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setTimeout(() => setCopying(false), 2000);
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'File Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Production':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Quality Check':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Ready for Collection':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Dispatched':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const renderActiveTracker = (currStatus: string) => {
    const activeIndex = STATUS_STEPS.indexOf(currStatus);
    return (
      <div className="py-6 px-4 bg-gradient-to-r from-zinc-900 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800">
        <p className="text-[10px] font-mono tracking-widest text-brand-cyan uppercase font-bold mb-4">
          Real-Time Workspace Tracker
        </p>
        
        {/* Progress Grid line representation */}
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-2 mt-4">
          
          {/* Base connect line */}
          <div className="absolute left-[15px] md:left-0 top-[20px] md:top-1/2 md:-translate-y-1/2 w-0.5 md:w-full h-full md:h-1 bg-zinc-800 z-0 hidden sm:block" />
          
          {STATUS_STEPS.map((stepName, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const isPending = index > activeIndex;

            return (
              <div key={stepName} className="flex md:flex-col items-center text-left md:text-center w-full relative z-10 space-x-3 md:space-x-0">
                
                {/* Visual Nodes */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                  isCompleted 
                    ? 'bg-brand-cyan text-slate-950 shadow-md ring-2 ring-brand-cyan/20' 
                    : isCurrent 
                    ? 'bg-brand-accent text-white ring-4 ring-brand-accent/30 shadow-md' 
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>

                <div className="md:mt-2 text-left md:text-center">
                  <p className={`text-[12px] font-bold ${
                    isCurrent ? 'text-brand-accent' : isCompleted ? 'text-zinc-200' : 'text-zinc-500'
                  }`}>
                    {stepName}
                  </p>
                  <p className="text-[9px] text-zinc-500 font-mono hidden md:block leading-tight">
                    {stepName === 'Received' && 'Order secured'}
                    {stepName === 'File Review' && 'Bleed checklist'}
                    {stepName === 'In Production' && 'Press running'}
                    {stepName === 'Quality Check' && 'Color alignment'}
                    {stepName === 'Ready for Collection' && 'Counter pickup'}
                    {stepName === 'Dispatched' && 'With courier'}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 fade-in">
      
      {/* Intro Summary Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-brand-dark flex items-center space-x-2">
            <ClipboardCheck className="h-6 w-6 text-brand-cyan" />
            <span>Customer Command Desk</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Submit designs, review quotation line items, and track machinery processing milestones
          </p>
        </div>

        <button
          onClick={onNavigateToBuilder}
          className="py-2.5 px-5 bg-brand-cyan hover:bg-brand-cyan/95 hover:scale-103 transition-all text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          <span>Launch New Print Job Spec</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Clock className="h-8 w-8 text-brand-blue animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-500 font-mono">RETRIEVING ORDER QUEUES SECURELY...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <PackageOpen className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No print jobs found</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-6">
            You currently have no active print orders. Configure specifications on our instant quote simulator to submit.
          </p>
          <button
            onClick={onNavigateToBuilder}
            className="py-2 px-4 bg-brand-blue text-white text-xs font-bold rounded-lg hover:bg-brand-blue/95 transition-all"
          >
            Create Your First Job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Side: Order history list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm h-[580px] overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono">
              Job Queue Feed ({orders.length})
            </p>
            <div className="space-y-2.5">
              {orders.map(o => {
                const isSelected = selectedOrder?.id === o.id;
                const formattedDate = o.createdAt?.toDate 
                  ? o.createdAt.toDate().toLocaleDateString('en-ZA') 
                  : new Date(o.createdAt).toLocaleDateString('en-ZA');

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-brand-cyan bg-brand-light ring-1 ring-brand-cyan' 
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-slate-700">{o.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getStatusBadgeStyle(o.status)}`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="flex justify-between font-medium">
                      <span className="text-slate-800">{o.productType}</span>
                      <span className="font-mono font-bold text-brand-blue">R{o.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-2 font-mono">
                      <span>{formattedDate}</span>
                      <span>Qty: {o.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Detailed tracking View */}
          {selectedOrder && (
            <div className="lg:col-span-2 space-y-6">
              
              {/* Tracker Panel */}
              {renderActiveTracker(selectedOrder.status)}

              {/* Order configuration card details */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                
                {/* Header overview controls */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-mono font-extrabold text-brand-dark">
                        {selectedOrder.id}
                      </span>
                      <span className="text-xs bg-slate-100 border text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase">
                        {selectedOrder.paymentMethod || 'PayFast'} PAID
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                      Registered on {selectedOrder.createdAt?.toDate 
                        ? selectedOrder.createdAt.toDate().toLocaleDateString('en-ZA') 
                        : new Date(selectedOrder.createdAt).toLocaleDateString('en-ZA')}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyShareLink}
                      className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1"
                      title="Copy sharable job link"
                    >
                      <Share2 className="h-3.5 w-3.5 text-brand-cyan" />
                      <span>{copying ? 'Copied!' : 'Share Tracking'}</span>
                    </button>
                  </div>
                </div>

                {/* Grid spec and invoices breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left subgrid specifications */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-400 flex items-center space-x-1 font-mono">
                      <Layers className="h-3.5 w-3.5 text-brand-cyan" />
                      <span>Specification Sheet</span>
                    </h4>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs">
                      <div className="flex justify-between border-b pb-1.5 border-slate-200">
                        <span className="text-zinc-500">Fine Product:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.productType}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-slate-200">
                        <span className="text-zinc-500">Dimensions:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.specs.paperSize}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-slate-200">
                        <span className="text-zinc-500">Paper Weight:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.specs.paperStock}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-slate-200">
                        <span className="text-zinc-500">Protective Coating:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.specs.finish}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-slate-200">
                        <span className="text-zinc-500">Print Sides:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.specs.printSides}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Quantity scale:</span>
                        <span className="font-bold text-brand-cyan">{selectedOrder.quantity} Units</span>
                      </div>
                    </div>

                    {/* Delivery information */}
                    <div className="bg-brand-light/30 border rounded-xl p-3 text-xs space-y-1.5">
                      <p className="font-bold text-brand-blue flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-brand-accent" />
                        <span>Fulfillment Handover</span>
                      </p>
                      <p className="text-zinc-600 font-semibold">{selectedOrder.collectionMethod}</p>
                      {selectedOrder.deliveryAddress && (
                        <p className="text-[11px] text-zinc-500 italic mt-0.5">{selectedOrder.deliveryAddress}</p>
                      )}
                    </div>
                  </div>

                  {/* Right subgrid financials & source files */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-400 flex items-center space-x-1 font-mono">
                      <FileCode className="h-3.5 w-3.5 text-brand-cyan" />
                      <span>Associated Blueprints</span>
                    </h4>

                    {selectedOrderFiles.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No files bound to order.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedOrderFiles.map(f => (
                          <div key={f.id} className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-xl text-xs">
                            <span className="font-semibold text-slate-700 truncate max-w-[150px] font-mono">{f.fileName}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{(f.fileSize / (1024*1024)).toFixed(2)} MB</span>
                            <a
                              href={f.fileUrl}
                              download
                              target="_blank"
                              rel="noreferrer referrerPolicy"
                              className="p-1 px-2 hover:bg-slate-200 rounded flex items-center space-x-1 text-slate-700 text-[10px]"
                            >
                              <Download className="h-3 w-3 text-brand-accent" />
                              <span>Get</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-400 flex items-center space-x-1 font-mono">
                        <Barcode className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>Tax Invoice Receipt (ZAR)</span>
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Subtotal (Excl. VAT):</span>
                          <span className="font-medium font-mono">R{selectedOrder.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VAT (15% Postnet collection):</span>
                          <span className="font-medium font-mono">R{selectedOrder.vat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-extrabold text-slate-800">
                          <span>Total Paid:</span>
                          <span className="text-brand-accent font-mono font-extrabold text-sm">R{selectedOrder.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Audit & internal activity logs list */}
                <div className="border-t pt-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-400 flex items-center space-x-1 mb-3 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-brand-cyan" />
                    <span>Real-time Operational logs</span>
                  </h4>

                  {selectedOrderLogs.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No processing changes submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedOrderLogs.map(log => {
                        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                        return (
                          <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-dashed text-xs space-y-1">
                            <div className="flex justify-between text-[10px] text-zinc-400 font-mono font-semibold">
                              <span className="text-brand-cyan">{log.fromStatus ? `${log.fromStatus} → ` : ''}{log.toStatus}</span>
                              <span>{logDate.toLocaleString('en-ZA')}</span>
                            </div>
                            <p className="text-slate-700 leading-normal">{log.note}</p>
                            <p className="text-[10px] text-zinc-400 font-mono italic">Submitted by: {log.changedByName}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
              
            </div>
          )}

        </div>
      )}

    </div>
  );
}
