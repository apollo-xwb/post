import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc 
} from 'firebase/firestore';
import { UserProfile, Order, OrderFile, StatusHistory, Product, PricingRule } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Check, 
  User, 
  Printer, 
  DollarSign, 
  Calendar, 
  Clock, 
  Database, 
  Settings, 
  TrendingUp, 
  Users, 
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Send,
  Info,
  Eye,
  ExternalLink
} from 'lucide-react';

const handleDirectPrint = (order: Order, files: OrderFile[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print directly.');
    return;
  }
  
  const filesHtml = files.map(f => `<li>${f.fileName} (${(f.fileSize / (1024*1024)).toFixed(2)} MB)</li>`).join('') || '<li>No source files uploaded</li>';
  
  printWindow.document.write(`
    <html>
      <head>
        <title>LUTHO OS - PRINT TICKET #${order.id}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            padding: 30px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .brand {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.05em;
            color: #ef4444;
            text-transform: uppercase;
          }
          .subbrand {
            font-size: 10px;
            color: #6b7280;
            font-weight: bold;
            margin-top: 1px;
            letter-spacing: 0.05em;
          }
          .ticket-title {
            font-size: 22px;
            font-weight: 800;
            text-align: right;
            margin: 0;
            color: #111827;
            letter-spacing: -0.03em;
          }
          .order-id {
            font-family: monospace;
            font-size: 16px;
            color: #4b5563;
            font-weight: bold;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
            margin-bottom: 10px;
            font-weight: 800;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
          }
          .info-label {
            color: #4b5563;
          }
          .info-value {
            font-weight: 700;
            color: #111827;
          }
          .specs-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 25px;
          }
          .specs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .spec-item {
            border-bottom: 1px dashed #e5e7eb;
            padding-bottom: 6px;
          }
          .spec-label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: bold;
          }
          .spec-value {
            font-size: 13px;
            font-weight: 800;
            color: #111827;
            margin-top: 1px;
          }
          .file-list {
            margin-top: 8px;
            padding-left: 20px;
            font-size: 12px;
            color: #374151;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            font-size: 10px;
            color: #9ca3af;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Lutho OS</div>
            <div class="subbrand">POWERED BY LUTHO OS</div>
          </div>
          <div>
            <h1 class="ticket-title">PRINT JOB TICKET</h1>
            <div class="order-id" style="text-align: right;">ID: #${order.id}</div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="section-title">Customer Details</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${order.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${order.customerEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fulfillment:</span>
              <span class="info-value">${order.collectionMethod}</span>
            </div>
          </div>
          <div>
            <div class="section-title">Order Info</div>
            <div class="info-row">
              <span class="info-label">Product Type:</span>
              <span class="info-value">${order.productType}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Turnaround:</span>
              <span class="info-value">${order.turnaround}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Status:</span>
              <span class="info-value" style="text-transform: uppercase; color: ${order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b'};">
                ${order.paymentStatus} (${order.paymentMethod || 'None'})
              </span>
            </div>
          </div>
        </div>

        <div class="section-title">Job Print Specifications</div>
        <div class="specs-card">
          <div class="specs-grid">
            <div class="spec-item">
              <div class="spec-label">Paper Size</div>
              <div class="spec-value">${order.specs?.paperSize || 'N/A'}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Paper Stock</div>
              <div class="spec-value">${order.specs?.paperStock || 'N/A'}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Coat & Finish</div>
              <div class="spec-value">${order.specs?.finish || 'N/A'}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Duplex Sides</div>
              <div class="spec-value">${order.specs?.printSides || 'N/A'}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Colour Mode</div>
              <div class="spec-value" style="color: ${order.specs?.colourMode?.toLowerCase().includes('colour') ? '#ef4444' : '#111827'};">
                ${order.specs?.colourMode || 'N/A'}
              </div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Quantity</div>
              <div class="spec-value" style="font-size: 15px; color: #ef4444;">
                ${order.quantity} ${order.quantity === 1 ? 'copy' : 'copies'}
              </div>
            </div>
          </div>
          
          ${order.specs?.alignmentScale ? `
            <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px; font-size: 11px;">
              <div>
                <span style="color: #6b7280; font-weight: bold; text-transform: uppercase; display: block; font-size: 9px;">Artwork Alignment Scale</span>
                <span style="font-weight: 800; color: #111827;">${order.specs.alignmentScale}</span>
              </div>
              <div>
                <span style="color: #6b7280; font-weight: bold; text-transform: uppercase; display: block; font-size: 9px;">Rotation & Positioning Offsets</span>
                <span style="font-weight: 800; color: #111827;">${order.specs.alignmentRotation || '0°'} | ${order.specs.alignmentOffset || 'None'} (${order.specs.alignmentFitMode || 'Cover'})</span>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="section-title">Files to Print</div>
        <ul class="file-list">
          ${filesHtml}
        </ul>

        ${order.specialInstructions ? `
          <div style="margin-top: 20px;">
            <div class="section-title">Customer Special Instructions</div>
            <div style="padding: 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 12px; color: #78350f; font-weight: 500;">
              ${order.specialInstructions}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <span>Printed on: ${new Date().toLocaleString()}</span>
          <span>Powered by Lutho OS • Professional Print Infrastructure</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const handlePrintDocument = (fileUrl: string, fileName: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the file.');
    return;
  }
  
  const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(fileName) || fileUrl.includes('image');
  
  if (isImage) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Print - ${fileName}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            @media print {
              body { margin: 0; }
              img { max-width: 100%; max-height: 100%; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <img src="${fileUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    // For PDFs or other files, embed an iframe and trigger print
    printWindow.document.write(`
      <html>
        <head>
          <title>Print - ${fileName}</title>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${fileUrl}" id="pdf-iframe"></iframe>
          <script>
            const iframe = document.getElementById('pdf-iframe');
            iframe.onload = function() {
              setTimeout(function() {
                try {
                  iframe.contentWindow.focus();
                  iframe.contentWindow.print();
                } catch(e) {
                  window.print();
                }
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};

interface StaffDashboardProps {
  user: UserProfile;
  activeView: 'staff-queue' | 'staff-catalog' | 'staff-reports';
}

const ALL_STATUSES = [
  'Received',
  'File Review',
  'In Production',
  'Quality Check',
  'Ready for Collection',
  'Dispatched'
];

export default function StaffDashboard({ user, activeView }: StaffDashboardProps) {
  // DB states
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');

  // Multi-select for bulk status updates
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');

  // Selected Order Detail inspect modal/overlay pane
  const [inspectOrderId, setInspectOrderId] = useState<string | null>(null);
  const [inspectOrderFiles, setInspectOrderFiles] = useState<OrderFile[]>([]);
  const [inspectOrderHistory, setInspectOrderHistory] = useState<StatusHistory[]>([]);
  const [newLogNote, setNewLogNote] = useState('');
  const [newStatusValue, setNewStatusValue] = useState('');
  const [staffPrivateNote, setStaffPrivateNote] = useState('');

  // Editing Catalog States
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingBasePrice, setEditingBasePrice] = useState<number>(0);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingMultiplier, setEditingMultiplier] = useState<number>(1);

  // Loading indicator for action
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<OrderFile | null>(null);

  // 1. Fetch orders in real time
  useEffect(() => {
    setLoading(true);
    // Real-time snapshot listening on orders
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersArr: Order[] = [];
      snapshot.forEach(doc => {
        ordersArr.push(doc.data() as Order);
      });

      // Sort by Priority (Same Day first, then Express, then Standard), and then newest creation date
      ordersArr.sort((a,b) => {
        const getPriorityScore = (o: Order) => {
          if (o.turnaround.includes('Same day')) return 3;
          if (o.turnaround.includes('Express')) return 2;
          return 1;
        };
        const scoreDiff = getPriorityScore(b) - getPriorityScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      setOrders(ordersArr);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    // Real-time snapshot for products catalog
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const prodArr: Product[] = [];
      snap.forEach(d => prodArr.push(d.data() as Product));
      setProducts(prodArr);
    });

    // Real-time snapshot for pricing rules
    const unsubscribeRules = onSnapshot(collection(db, 'pricing_rules'), (snap) => {
      const ruleArr: PricingRule[] = [];
      snap.forEach(d => ruleArr.push(d.data() as PricingRule));
      setRules(ruleArr);
    });

    // Feed client profiles list for details search
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const usersArr: UserProfile[] = [];
      snap.forEach(d => usersArr.push(d.data() as UserProfile));
      setCustomers(usersArr);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeRules();
      unsubscribeUsers();
    };
  }, []);

  // 2. Fetch specific details for inspected order in real time
  useEffect(() => {
    if (!inspectOrderId) return;

    const filesUnsub = onSnapshot(collection(db, 'orders', inspectOrderId, 'order_files'), (snap) => {
      const arr: OrderFile[] = [];
      snap.forEach(d => arr.push(d.data() as OrderFile));
      setInspectOrderFiles(arr);
    });

    const historyUnsub = onSnapshot(collection(db, 'orders', inspectOrderId, 'status_history'), (snap) => {
      const arr: StatusHistory[] = [];
      snap.forEach(d => arr.push(d.data() as StatusHistory));
      arr.sort((a,b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      setInspectOrderHistory(arr);
    });

    const activeInspectOrder = orders.find(o => o.id === inspectOrderId);
    if (activeInspectOrder) {
      setNewStatusValue(activeInspectOrder.status);
      setStaffPrivateNote(activeInspectOrder.staffNote || '');
    }

    return () => {
      filesUnsub();
      historyUnsub();
    };
  }, [inspectOrderId, orders]);

  // Handle single status updates
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, logNote: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    setActionLoading(true);
    setSuccessMsg(null);
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Update order status field & staff note
      await updateDoc(orderRef, cleanUndefined({
        status: newStatus as any,
        staffNote: staffPrivateNote
      }));

      // Write status history subcollection record for audit integrity
      const auditRefId = 'audit_' + Math.random().toString(36).substr(2, 9);
      const auditObj = {
        id: auditRefId,
        orderId: orderId,
        fromStatus: targetOrder.status,
        toStatus: newStatus,
        changedBy: user.id,
        changedByName: user.name || user.email,
        note: logNote || `Job status updated: ${targetOrder.status} → ${newStatus}.`,
        timestamp: new Date()
      };
      await setDoc(doc(db, 'orders', orderId, 'status_history', auditRefId), cleanUndefined(auditObj));

      // Save notification log record to satisfy PRD
      const notificationId = 'notif_' + Math.random().toString(36).substr(2, 9);
      const emailRecord = {
        id: notificationId,
        userId: targetOrder.userId,
        orderId: orderId,
        channel: 'email',
        content: `Postnet system automatic alert: Your order ${orderId} has transitioned to: ${newStatus}`,
        sentAt: new Date()
      };
      await setDoc(doc(db, 'notifications', notificationId), cleanUndefined(emailRecord));

      setSuccessMsg(`Status for order ${orderId} successfully shifted to ${newStatus}`);
      setNewLogNote('');
    } catch (err) {
      console.error(err);
      alert('Fail to update order status. Enforce firewall policies.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle mass/bulk updates for multiple selected checklist checkboxes
  const handleBulkStatusSubmission = async () => {
    if (selectedOrderIds.length === 0 || !bulkStatus) return;
    setActionLoading(true);
    setSuccessMsg(null);

    try {
      for (const id of selectedOrderIds) {
        const orderToChange = orders.find(o => o.id === id);
        if (!orderToChange) continue;

        const orderRef = doc(db, 'orders', id);
        await updateDoc(orderRef, cleanUndefined({ status: bulkStatus as any }));

        const auditId = 'audit_' + Math.random().toString(36).substr(2, 9);
        const auditRecord = {
          id: auditId,
          orderId: id,
          fromStatus: orderToChange.status,
          toStatus: bulkStatus,
          changedBy: user.id,
          changedByName: user.name || user.email,
          note: `Mass status shift batch operation.`,
          timestamp: new Date()
        };
        await setDoc(doc(db, 'orders', id, 'status_history', auditId), cleanUndefined(auditRecord));
      }

      setSuccessMsg(`Bulk operation succeeded! ${selectedOrderIds.length} orders updated to ${bulkStatus}.`);
      setSelectedOrderIds([]);
      setBulkStatus('');
    } catch (err) {
      console.error(err);
      alert('Bulk adjustments refused. Check privileges.');
    } finally {
      setActionLoading(false);
    }
  };

  // Modify Base Price Catalog directly
  const handleUpdateBasePrice = async (prodId: string) => {
    try {
      const docRef = doc(db, 'products', prodId);
      await updateDoc(docRef, cleanUndefined({ basePrice: Number(editingBasePrice) }));
      setEditingProductId(null);
      setSuccessMsg('Base product price adjusted successfully');
    } catch (err) {
      console.error(err);
    }
  };

  // Modify individual multiplier rules
  const handleUpdateMultiplierRule = async (ruleId: string) => {
    try {
      const docRef = doc(db, 'pricing_rules', ruleId);
      await updateDoc(docRef, cleanUndefined({ multiplier: Number(editingMultiplier) }));
      setEditingRuleId(null);
      setSuccessMsg('Multiplier rules adjusted successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Order checkboxes for bulk
  const handleToggleOrderSelection = (ordId: string) => {
    if (selectedOrderIds.includes(ordId)) {
      setSelectedOrderIds(prev => prev.filter(id => id !== ordId));
    } else {
      setSelectedOrderIds(prev => [...prev, ordId]);
    }
  };

  const handleSelectAllOrders = (filtered: Order[]) => {
    if (selectedOrderIds.length === filtered.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filtered.map(o => o.id));
    }
  };

  // Pure-JS client-side CSV generator to extract revenue summaries
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    
    const headers = ['Order ID', 'Customer Email', 'Customer Name', 'Product Type', 'Quantity', 'Status', 'Fulfillment', 'Subtotal', 'VAT', 'Total Price', 'Creation Date'];
    const rows = orders.map(o => {
      const formattedDate = o.createdAt?.toDate 
        ? o.createdAt.toDate().toISOString() 
        : new Date(o.createdAt).toISOString();
      return [
        o.id,
        o.customerEmail,
        o.customerName,
        o.productType,
        o.quantity,
        o.status,
        o.collectionMethod,
        o.subtotal.toFixed(2),
        o.vat.toFixed(2),
        o.totalPrice.toFixed(2),
        formattedDate
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Postnet_Print_OS_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Multiplier key descriptions
  const getProductCountByStatus = (status: string) => {
    return orders.filter(o => o.status === status).length;
  };

  // Search and Filter logical execution
  const filteredOrders = orders.filter(o => {
    const userProfile = customers.find(c => c.id === o.userId);
    const companyName = userProfile?.company || '';

    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchesProduct = productFilter === 'All' || o.productType === productFilter;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  // Reporting Math
  const totalRevenue = orders.reduce((acc, o) => acc + o.totalPrice, 0);
  const orderCount = orders.length;
  const averageValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  const inProductionCount = orders.filter(o => o.status === 'In Production').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 fade-in text-brand-dark">
      
      {/* Upper Action Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-brand-cyan shrink-0" />
            <span>Staff Administration Deck</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Internal Operations console. Allocate jobs, set pricing matrices, inspect blueprints, and run revenue reports.
          </p>
        </div>

        {activeView === 'staff-queue' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow flex items-center space-x-2 transition-colors cursor-pointer"
              title="Download CSV database tracking"
              id="btn-export-csv"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV Database</span>
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="mb-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded text-xs text-teal-700 flex justify-between items-center">
          <span className="font-semibold">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-teal-900 border px-1.5 py-0.5 rounded text-[10px] uppercase font-bold hover:bg-teal-100">Dismiss</button>
        </div>
      )}

      {/* VIEW PANEL 1: JOB OPERATIONS QUEUE */}
      {activeView === 'staff-queue' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border p-4 flex items-center space-x-3.5 shadow-sm">
              <div className="bg-brand-light p-3 rounded-xl text-brand-blue">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-400 font-bold font-mono">Gross Volume</p>
                <p className="text-lg font-extrabold text-brand-blue font-mono">R{totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4 flex items-center space-x-3.5 shadow-sm">
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-400 font-bold font-mono">In Production</p>
                <p className="text-lg font-extrabold text-slate-800 font-mono">{inProductionCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4 flex items-center space-x-3.5 shadow-sm">
              <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-400 font-bold font-mono">Avg Value</p>
                <p className="text-lg font-extrabold text-slate-800 font-mono">R{averageValue.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4 flex items-center space-x-3.5 shadow-sm">
              <div className="bg-green-50 p-3 rounded-xl text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-400 font-bold font-mono">Client List</p>
                <p className="text-lg font-extrabold text-slate-800 font-mono">{customers.length}</p>
              </div>
            </div>
          </div>

          {/* Filtering and Bulk operations header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              
              {/* Searching customer details */}
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search by Order#, Customer Name, Company Profile, Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full bg-slate-50 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-cyan text-brand-dark"
                />
              </div>

              {/* Status categories */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border rounded-lg text-xs bg-slate-50 font-bold text-slate-600"
              >
                <option value="All">All statuses (Filter)</option>
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Product types */}
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="p-2 border rounded-lg text-xs bg-slate-50 font-bold text-slate-600"
              >
                <option value="All">All products (Filter)</option>
                <option value="Business Cards">Business Cards</option>
                <option value="Flyers">Flyers</option>
                <option value="Brochures">Brochures</option>
                <option value="Banners">Banners</option>
                <option value="Posters">Posters</option>
                <option value="Letterheads">Letterheads</option>
                <option value="NCR Books">NCR Books</option>
                <option value="Custom Prints">Custom Prints</option>
              </select>
            </div>

            {/* Mass operations bar (visible if checklist is active) */}
            {selectedOrderIds.length > 0 && (
              <div className="bg-brand-light border border-brand-cyan/20 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3 fade-in">
                <span className="text-xs font-bold text-brand-blue">
                  {selectedOrderIds.length} job orders checked checklist
                </span>

                <div className="flex items-center space-x-2">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="p-1 px-2 border rounded bg-white text-xs font-bold text-slate-700"
                  >
                    <option value="">Apply Status Block Change</option>
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkStatusSubmission}
                    disabled={actionLoading || !bulkStatus}
                    className="py-1 px-3 bg-brand-cyan hover:bg-brand-cyan/95 text-white font-bold rounded text-xs shadow cursor-pointer"
                  >
                    Run Mass Order Process
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Orders Feed Block */}
            <div className="xl:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-extrabold text-slate-500 uppercase font-mono border-b">
                      <th className="p-4 text-center select-none w-10">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                          onChange={() => handleSelectAllOrders(filteredOrders)}
                          className="rounded text-brand-blue border-zinc-300"
                        />
                      </th>
                      <th className="p-4">Order / Name</th>
                      <th className="p-4">Delivery Turnaround</th>
                      <th className="p-4">Collection Fulfillment</th>
                      <th className="p-4">Cost</th>
                      <th className="p-4 text-center">Operation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 italic">
                          No matching active print jobs in queues.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => {
                        const isSelected = inspectOrderId === o.id;
                        const userProfile = customers.find(c => c.id === o.userId);
                        const companyStr = userProfile?.company ? ` • ${userProfile.company}` : '';

                        return (
                          <tr
                            key={o.id}
                            className={`border-b transition-colors cursor-pointer ${
                              isSelected ? 'bg-brand-light/40 border-brand-cyan' : 'hover:bg-slate-50/50'
                            }`}
                            onClick={() => setInspectOrderId(o.id)}
                          >
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(o.id)}
                                onChange={() => handleToggleOrderSelection(o.id)}
                                className="rounded text-brand-blue border-zinc-300"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-mono font-bold text-slate-700">{o.id}</p>
                              <p className="font-bold text-slate-800 mt-0.5">{o.productType}</p>
                              <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                                {o.customerName}{companyStr}
                              </p>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`inline-block py-1 px-2 text-[10px] font-bold rounded ${
                                o.turnaround.includes('Same day') 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : o.turnaround.includes('Express') 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {o.turnaround}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-slate-700">{o.collectionMethod}</p>
                              <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{o.deliveryAddress || 'Pick-up Counter'}</p>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <p className="font-mono font-bold text-brand-blue">R{o.totalPrice.toFixed(2)}</p>
                              <span className={`inline-block text-[9px] px-1.5 py-0.2 uppercase font-extrabold rounded ${
                                o.status === 'Ready for Collection' || o.status === 'Dispatched'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-zinc-100 text-zinc-500'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                className="p-1.5 bg-slate-100 hover:bg-brand-blue hover:text-white rounded text-slate-600 transition-colors"
                                title="Inspect spec blueprints"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inspect Side Drawer */}
            <div className="bg-white rounded-2xl border p-6 shadow-sm self-start h-[580px] overflow-y-auto">
              {inspectOrderId ? (
                (() => {
                  const o = orders.find(ord => ord.id === inspectOrderId);
                  if (!o) return <p className="text-xs text-zinc-500">Order not loaded.</p>;

                  const userProfile = customers.find(c => c.id === o.userId);

                  return (
                    <div className="space-y-5 fade-in">
                      
                      {/* Job Header Info */}
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-lg font-mono font-extrabold text-slate-700">{o.id}</span>
                          <button
                            onClick={() => setInspectOrderId(null)}
                            className="text-xs font-bold text-zinc-400 hover:text-slate-800"
                          >
                            Close
                          </button>
                        </div>
                        <p className="text-sm font-extrabold text-brand-dark">{o.productType}</p>
                        <p className="text-xs text-zinc-400 font-mono">
                          User ID: <span className="font-bold text-slate-600">{o.userId.substring(0, 8)}...</span>
                        </p>
                      </div>

                      {/* Customer context profile card details */}
                      <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border">
                        <p className="font-bold text-brand-blue flex items-center mb-1">
                          <User className="h-3.5 w-3.5 mr-1" />
                          <span>Customer context info</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-zinc-500 block">Name:</span>
                            <span className="font-bold text-slate-800">{o.customerName}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Company Profile:</span>
                            <span className="font-bold text-slate-800">{userProfile?.company || 'Personal account'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-zinc-500 block">Email address:</span>
                            <span className="font-bold text-slate-800 font-mono text-[10px]">{o.customerEmail}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Vat number:</span>
                            <span className="font-bold text-slate-800">{userProfile?.vatNumber || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Contact Line:</span>
                            <span className="font-bold text-slate-800 font-mono">{userProfile?.phone || 'No phone'}</span>
                          </div>
                        </div>

                        {/* Customer Tags segment */}
                        <div className="pt-2 border-t mt-2 flex flex-wrap gap-1">
                          <span className="text-[9px] uppercase font-bold bg-amber-500/20 text-amber-800 px-1.5 py-0.2 rounded">
                            {userProfile?.tags?.[0] || 'Standard'}
                          </span>
                        </div>
                      </div>

                      {/* Job specifications retaining all config details */}
                      <div className="bg-zinc-900 text-zinc-100 rounded-xl p-4 text-xs space-y-3 border border-zinc-800 shadow-lg">
                        <p className="font-extrabold text-red-500 uppercase tracking-wider text-[10px] flex items-center">
                          <Printer className="h-3.5 w-3.5 mr-1 text-red-500 animate-pulse" />
                          <span>Job Print Specifications</span>
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11px]">
                          <div className="border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Paper Size:</span>
                            <span className="font-bold text-white">{o.specs?.paperSize || 'N/A'}</span>
                          </div>
                          <div className="border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Paper Stock:</span>
                            <span className="font-bold text-white">{o.specs?.paperStock || 'N/A'}</span>
                          </div>
                          <div className="border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Coat & Finish:</span>
                            <span className="font-bold text-white">{o.specs?.finish || 'N/A'}</span>
                          </div>
                          <div className="border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Duplex Sides:</span>
                            <span className="font-bold text-yellow-500">{o.specs?.printSides || 'N/A'}</span>
                          </div>
                          <div className="border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Colour Mode:</span>
                            <span className={`font-bold ${o.specs?.colourMode?.toLowerCase().includes('colour') ? 'text-red-400' : 'text-zinc-400'}`}>
                              {o.specs?.colourMode || 'N/A'}
                            </span>
                          </div>
                          <div className="border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold">Quantity:</span>
                            <span className="font-bold text-emerald-450">{o.quantity} {o.quantity === 1 ? 'copy' : 'copies'}</span>
                          </div>
                        </div>

                        {o.specs?.alignmentScale && (
                          <div className="pt-2 border-t border-zinc-850 text-[10px] space-y-1 bg-zinc-950/40 p-2 rounded">
                            <span className="text-zinc-500 block text-[9px] uppercase font-bold font-mono">Alignment & Scaling:</span>
                            <div className="text-zinc-300 font-mono flex flex-wrap gap-x-2">
                              <span>Scale: <strong>{o.specs.alignmentScale}</strong></span>
                              <span>Rot: <strong>{o.specs.alignmentRotation || '0°'}</strong></span>
                              <span>Fit: <strong>{o.specs.alignmentFitMode || 'Cover'}</strong></span>
                            </div>
                            <div className="text-zinc-400 font-mono text-[9px] truncate">
                              Offset: <strong>{o.specs.alignmentOffset || 'None'}</strong>
                            </div>
                          </div>
                        )}

                        {o.specialInstructions && (
                          <div className="bg-amber-950/40 border border-amber-900/50 p-2 rounded-lg text-[10px]">
                            <span className="text-amber-500 font-bold block mb-0.5 font-mono uppercase text-[9px]">Customer Note:</span>
                            <p className="text-amber-200 leading-normal">{o.specialInstructions}</p>
                          </div>
                        )}

                        {/* Direct Print Button Action inside Staff view */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleDirectPrint(o, inspectOrderFiles)}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black rounded-lg text-xs tracking-wide uppercase shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer hover:shadow-red-900/30 hover:-translate-y-0.5 active:translate-y-0 duration-150"
                          >
                            <Printer className="h-4 w-4 text-white" />
                            <span>Direct Print Job Ticket</span>
                          </button>
                        </div>
                      </div>

                      {/* Blueprints file attachments list */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center">
                          <Layers className="h-3 w-3 mr-1 text-brand-cyan" />
                          <span>Customer source file specifications</span>
                        </p>
                        {inspectOrderFiles.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic p-2 bg-slate-50 rounded border">No uploaded files registered.</p>
                        ) : (
                          inspectOrderFiles.map(f => (
                            <div key={f.id} className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border rounded-xl flex flex-col space-y-2 text-xs font-mono transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="truncate font-semibold text-slate-700 block max-w-[170px]" title={f.fileName}>
                                  {f.fileName}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {(f.fileSize / (1024*1024)).toFixed(2)} MB
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-end space-x-1.5 pt-1 border-t border-slate-250">
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(f)}
                                  className="py-1 px-2 bg-brand-light text-brand-blue hover:bg-brand-blue hover:text-white rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                                  title="Open visual document preview"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Preview</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePrintDocument(f.fileUrl, f.fileName)}
                                  className="py-1 px-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                                  title="Direct print this document"
                                >
                                  <Printer className="h-3 w-3" />
                                  <span>Print</span>
                                </button>

                                <a
                                  href={f.fileUrl}
                                  download
                                  target="_blank"
                                  rel="noreferrer referrerPolicy"
                                  className="py-1 px-2 bg-slate-200 text-slate-700 hover:bg-slate-700 hover:text-white rounded text-[10px] font-bold flex items-center space-x-1 transition-all"
                                  title="Download file to local storage"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Save</span>
                                </a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Action state logs triggers */}
                      <div className="border-t pt-4 space-y-3">
                        <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider font-mono">Shift Status Milestone</h4>
                        
                        <div className="space-y-2">
                          <select
                            value={newStatusValue}
                            onChange={(e) => setNewStatusValue(e.target.value)}
                            className="p-2 w-full border bg-slate-50 rounded-lg text-xs font-bold text-slate-700"
                          >
                            {ALL_STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-500 mb-1">Status audit note (Client visible)</label>
                            <input
                              type="text"
                              value={newLogNote}
                              onChange={(e) => setNewLogNote(e.target.value)}
                              className="p-2 w-full border rounded-lg text-xs"
                              placeholder="e.g. Artwork specs verified, printing is active."
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-500 mb-1">Administrative notes (Internal private log)</label>
                            <input
                              type="text"
                              value={staffPrivateNote}
                              onChange={(e) => setStaffPrivateNote(e.target.value)}
                              className="p-2 w-full border rounded-lg text-xs bg-slate-50"
                              placeholder="Internal private references..."
                            />
                          </div>

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleUpdateOrderStatus(o.id, newStatusValue, newLogNote)}
                            className="w-full py-2 bg-brand-blue hover:bg-brand-blue/95 text-white font-bold rounded-lg text-xs shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Commit Status & alert client</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-20 text-zinc-400">
                  <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold font-mono">SELECT A JOB RECORD TO INSPECT</p>
                  <p className="text-[11px] mt-1">Review dimensions, downloads, contact phone, and dispatch orders.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* VIEW PANEL 2: CATALOG & MULTIPLIERS */}
      {activeView === 'staff-catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Products catalog list with direct inline edits */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-brand-dark flex items-center border-b pb-2 mb-4">
              <Printer className="h-5 w-5 mr-1.5 text-brand-cyan" />
              <span>Catalog Base Price Manager</span>
            </h3>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {products.map(p => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-zinc-400 font-mono">Product ID: {p.id}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {editingProductId === p.id ? (
                      <div className="flex items-center space-x-1 fade-in">
                        <span className="font-sans font-bold text-zinc-500">R</span>
                        <input
                          type="number"
                          value={editingBasePrice}
                          onChange={(e) => setEditingBasePrice(Number(e.target.value))}
                          className="p-1 w-16 bg-white border rounded font-mono font-bold text-xs"
                        />
                        <button
                          onClick={() => handleUpdateBasePrice(p.id)}
                          className="p-1 bg-brand-cyan text-white rounded hover:bg-brand-cyan/90"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingProductId(null)}
                          className="p-1 text-zinc-400 hover:text-slate-800 text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono font-extrabold text-brand-blue">R{p.basePrice.toFixed(2)}</span>
                        <button
                          onClick={() => { setEditingProductId(p.id); setEditingBasePrice(p.basePrice); }}
                          className="p-1.5 bg-slate-100 hover:bg-brand-blue hover:text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Multipliers section */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-brand-dark flex items-center border-b pb-2 mb-4">
              <Settings className="h-5 w-5 mr-1.5 text-brand-accent" />
              <span>Multipliers Adjustments Engine</span>
            </h3>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {rules.map(r => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-200/50 px-1.5 py-0.2 rounded mr-1.5">
                      {r.ruleType.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-slate-800 font-mono">{r.key}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {editingRuleId === r.id ? (
                      <div className="flex items-center space-x-1 fade-in">
                        <span className="font-sans font-bold text-zinc-400">x</span>
                        <input
                          type="number"
                          step="0.05"
                          value={editingMultiplier}
                          onChange={(e) => setEditingMultiplier(Number(e.target.value))}
                          className="p-1 w-16 bg-white border rounded font-mono font-bold text-xs"
                        />
                        <button
                          onClick={() => handleUpdateMultiplierRule(r.id)}
                          className="p-1 bg-brand-cyan text-white rounded hover:bg-brand-cyan/90"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingRuleId(null)}
                          className="p-1 text-zinc-400 hover:text-slate-800 text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono font-extrabold text-brand-accent">x{r.multiplier.toFixed(2)}</span>
                        <button
                          onClick={() => { setEditingRuleId(r.id); setEditingMultiplier(r.multiplier); }}
                          className="p-1.5 bg-slate-100 hover:bg-brand-blue hover:text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW PANEL 3: REPORTS & STATS */}
      {activeView === 'staff-reports' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Status counts table list */}
            <div className="bg-white rounded-2xl border p-6 shadow-sm xl:col-span-2">
              <h3 className="text-base font-extrabold text-brand-dark border-b pb-2 mb-4">
                Operational Status Allocation Breakdown
              </h3>
              
              <div className="space-y-3 mt-4">
                {ALL_STATUSES.map(stat => {
                  const count = getProductCountByStatus(stat);
                  const sharePercent = orderCount > 0 ? (count / orderCount) * 100 : 0;
                  return (
                    <div key={stat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{stat}</span>
                        <span>{count} orders ({sharePercent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                        <div 
                          className="bg-brand-cyan h-full transition-all" 
                          style={{ width: `${sharePercent}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reports info sidebar */}
            <div className="bg-white rounded-2xl border p-6 shadow-sm self-start space-y-4">
              <h3 className="text-base font-extrabold text-brand-dark flex items-center border-b pb-2 mb-2">
                <Info className="h-4 w-4 mr-1 text-brand-cyan" />
                <span>Auditing Insights</span>
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600">
                <p>
                  This reporting metric runs direct calculations across all orders submitted over standard Firestore database instances.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border leading-relaxed">
                  <span className="font-bold text-brand-blue">Database Security Notice:</span>
                  <p className="mt-1 text-[11px]">
                    To maintain strict Postnet specifications compliance, always check that customer source files are backed up securely before setting order milestones to `Ready for Collection` or `Dispatched`.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="preview-modal">
          <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border flex flex-col h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-extrabold text-brand-dark truncate max-w-[500px]">
                  Document Preview: {previewFile.fileName}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Size: {(previewFile.fileSize / (1024*1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePrintDocument(previewFile.fileUrl, previewFile.fileName)}
                  className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow transition-all cursor-pointer"
                  title="Direct print this document"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Direct Print File</span>
                </button>
                <a
                  href={previewFile.fileUrl}
                  download
                  target="_blank"
                  rel="noreferrer referrerPolicy"
                  className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all"
                  title="Download document file"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 bg-zinc-250 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs transition-all cursor-pointer font-bold"
                  title="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content / Preview Frame */}
            <div className="p-6 flex-1 bg-zinc-100 flex items-center justify-center overflow-auto">
              {(() => {
                const isImg = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(previewFile.fileName) || previewFile.fileUrl.includes('image');
                const isPdf = /\.pdf$/i.test(previewFile.fileName) || previewFile.fileUrl.includes('.pdf');

                if (isImg) {
                  return (
                    <img
                      src={previewFile.fileUrl}
                      alt={previewFile.fileName}
                      referrerPolicy="no-referrer"
                      className="max-h-[60vh] max-w-full object-contain mx-auto rounded-lg shadow border bg-white"
                    />
                  );
                } else if (isPdf) {
                  return (
                    <iframe
                      src={previewFile.fileUrl}
                      className="w-full h-full rounded-lg shadow border bg-white"
                      title={previewFile.fileName}
                    />
                  );
                } else {
                  return (
                    <div className="text-center p-8 bg-white rounded-xl shadow max-w-md border">
                      <p className="text-zinc-500 text-xs font-semibold mb-3">
                        Inline web preview is not supported for this file format. You can still print or download the original file directly.
                      </p>
                      <div className="flex justify-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handlePrintDocument(previewFile.fileUrl, previewFile.fileName)}
                          className="py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow"
                        >
                          <Printer className="h-4 w-4" />
                          <span>Print File anyway</span>
                        </button>
                        <a
                          href={previewFile.fileUrl}
                          target="_blank"
                          rel="noreferrer referrerPolicy"
                          className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open in New Tab</span>
                        </a>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
