import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
  Info
} from 'lucide-react';

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
      await updateDoc(orderRef, {
        status: newStatus as any,
        staffNote: staffPrivateNote
      });

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
      await setDoc(doc(db, 'orders', orderId, 'status_history', auditRefId), auditObj);

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
      await setDoc(doc(db, 'notifications', notificationId), emailRecord);

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
        await updateDoc(orderRef, { status: bulkStatus as any });

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
        await setDoc(doc(db, 'orders', id, 'status_history', auditId), auditRecord);
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
      await updateDoc(docRef, { basePrice: Number(editingBasePrice) });
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
      await updateDoc(docRef, { multiplier: Number(editingMultiplier) });
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
                            <div key={f.id} className="p-2 bg-slate-50 border rounded-xl flex items-center justify-between text-xs font-mono">
                              <span className="truncate max-w-[140px] font-semibold">{f.fileName}</span>
                              <a
                                href={f.fileUrl}
                                download
                                target="_blank"
                                rel="noreferrer referrerPolicy"
                                className="text-[10px] text-brand-accent hover:underline flex items-center"
                              >
                                <Download className="h-3 w-3 mr-0.5" />
                                <span>{(f.fileSize / (1024*1024)).toFixed(1)}M</span>
                              </a>
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

    </div>
  );
}
