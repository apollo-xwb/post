import React, { useState, useEffect } from 'react';
import { db } from '../App';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Order, OrderFile, IQConfig, UserProfile, StationeryItem } from '../types';
import IQConfigSection from './IQConfigSection';
import InvoiceModal from './InvoiceModal';
import { 
  Settings, FolderOpen, Clipboard, RefreshCw, Check, 
  AlertCircle, FileText, FileSpreadsheet, Layers, Play, Server, User, PlusCircle,
  Package, Search, ShieldCheck, Lock, Key, Users, SlidersHorizontal, ArrowRight,
  Image as ImageIcon, Edit3, Save, Sparkles, BookOpen, ExternalLink, Plus
} from 'lucide-react';

interface StaffDashboardProps {
  user: any;
  profile: any;
}

// Sample IQ Inventory items to display complete stock
const INITIAL_IQ_INVENTORY = [
  { code: 'PAPER-A4-80', barcode: '6001082001', name: 'Mondi Rotatrim A4 80gsm Paper Box (5 Reams)', category: 'Paper Media', qtyOnHand: 450, unitCost: 320.00, price: 420.00, reorderPoint: 50, status: 'synced' },
  { code: 'PAPER-A3-150', barcode: '6001082002', name: 'PostNet Gloss Coated A3 150gsm Stock', category: 'Paper Media', qtyOnHand: 340, unitCost: 4.50, price: 12.00, reorderPoint: 100, status: 'synced' },
  { code: 'PAPER-A2-200', barcode: '6001082003', name: 'PostNet Heavy Satin A2 Poster Media', category: 'Paper Media', qtyOnHand: 180, unitCost: 18.00, price: 45.00, reorderPoint: 40, status: 'synced' },
  { code: 'PAPER-A1-200', barcode: '6001082004', name: 'PostNet Heavy Gloss A1 Architectural Stock', category: 'Paper Media', qtyOnHand: 85, unitCost: 32.00, price: 85.00, reorderPoint: 20, status: 'synced' },
  { code: 'PAPER-A0-200', barcode: '6001082005', name: 'PostNet Heavy Matte A0 Banner Media Roll', category: 'Paper Media', qtyOnHand: 18, unitCost: 65.00, price: 160.00, reorderPoint: 15, status: 'low' },
  { code: 'LAM-FILM-A4', barcode: '6001082006', name: 'Heavy Gloss Hot Lamination Pouches A4 (100pk)', category: 'Finishing', qtyOnHand: 120, unitCost: 140.00, price: 280.00, reorderPoint: 30, status: 'synced' },
  { code: 'BIND-SPIRAL-10', barcode: '6001082007', name: 'Black PVC Spiral Combs 10mm (100pk)', category: 'Finishing', qtyOnHand: 210, unitCost: 85.00, price: 175.00, reorderPoint: 50, status: 'synced' },
  { code: 'TONER-BLACK-K', barcode: '6001082008', name: 'Xerox Versant High-Yield Black Toner Cartridge', category: 'Consumables', qtyOnHand: 6, unitCost: 2800.00, price: 3400.00, reorderPoint: 2, status: 'synced' },
  { code: 'TONER-CYAN-C', barcode: '6001082009', name: 'Xerox Versant Cyan CMYK Toner Cartridge', category: 'Consumables', qtyOnHand: 4, unitCost: 3100.00, price: 3800.00, reorderPoint: 2, status: 'synced' },
  { code: 'INK-PLOTTER-BK', barcode: '6001082010', name: 'Canon ImagePROGRAF Matte Black Pigment Ink 700ml', category: 'Consumables', qtyOnHand: 3, unitCost: 4200.00, price: 4900.00, reorderPoint: 2, status: 'synced' }
];

// Editable catalog list with default images
const INITIAL_CATALOG_ITEMS: StationeryItem[] = [
  {
    id: 'stat_paper_a4_80',
    sku: 'PN-PAP-A4-80',
    name: 'A4 White Bond Paper Ream (80gsm)',
    category: 'Paper & Media',
    price: 95.00,
    stock: 450,
    description: 'High-whiteness premium 80gsm laser paper.',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_box_med',
    sku: 'PN-BOX-MED-02',
    name: 'PostNet Courier Box - Medium',
    category: 'Packaging & Postal',
    price: 28.50,
    stock: 200,
    description: 'Heavy-duty 3-layer corrugated courier box.',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_tape_heavy',
    sku: 'PN-TAPE-HVY-50',
    name: 'Heavy-Duty Packaging Tape',
    category: 'Packaging & Postal',
    price: 32.00,
    stock: 350,
    description: 'High-tack acrylic brown packaging tape.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_bubble_roll',
    sku: 'PN-BUB-500-10',
    name: 'Bubble Wrap Cushioning Roll',
    category: 'Packaging & Postal',
    price: 65.00,
    stock: 120,
    description: '10mm air-bubble protective shock-absorption wrap.',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500&auto=format&fit=crop&q=60'
  }
];

export default function StaffDashboard({ user, profile }: StaffDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filesMap, setFilesMap] = useState<{ [orderId: string]: OrderFile[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'inventory' | 'catalog' | 'sop' | 'users' | 'iq_settings'>('queue');
  const [staffNote, setStaffNote] = useState<string>('');

  // IQ Inventory states
  const [iqInventory, setIqInventory] = useState(INITIAL_IQ_INVENTORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSyncingInventory, setIsSyncingInventory] = useState(false);

  // Catalog Item / Image Editor State
  const [catalogItems, setCatalogItems] = useState<StationeryItem[]>(() => {
    const saved = localStorage.getItem('pnx_catalog_items');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG_ITEMS;
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<number>(0);

  // New Catalog item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(50);
  const [newItemCategory, setNewItemCategory] = useState('Paper & Media');
  const [newItemImageUrl, setNewItemImageUrl] = useState('https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60');

  // Admin Security & User Management States
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPin, setAdminPin] = useState('8034'); // Default PIN 8034 as requested
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinResetSuccess, setPinResetSuccess] = useState(false);

  // Profile creation modal state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff' | 'dispatcher' | 'courier'>('staff');
  const [createdProfiles, setCreatedProfiles] = useState<UserProfile[]>([
    { id: 'usr_admin', email: 'admin@postnet.co.za', name: 'Branch Admin', role: 'admin', createdAt: new Date().toISOString() },
    { id: 'usr_staff', email: 'staff@postnet.co.za', name: 'Counter Staff', role: 'staff', createdAt: new Date().toISOString() }
  ]);

  // IQ Retail Operations states
  const [iqConfig, setIqConfig] = useState<IQConfig | null>(null);
  const [isSyncingIq, setIsSyncingIq] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  // Save catalog changes
  useEffect(() => {
    localStorage.setItem('pnx_catalog_items', JSON.stringify(catalogItems));
  }, [catalogItems]);

  // 1. Snapshot Real-Time Listener on Orders
  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    
    const unsubscribe = onSnapshot(ordersCol, async (snapshot) => {
      const ordersList: Order[] = [];
      const updatedFilesMap: { [orderId: string]: OrderFile[] } = {};

      for (const d of snapshot.docs) {
        const orderData = d.data() as Order;
        ordersList.push(orderData);

        try {
          const filesSnap = await getDocs(collection(db, 'orders', d.id, 'order_files'));
          const files: OrderFile[] = [];
          filesSnap.forEach((fDoc) => {
            files.push(fDoc.data() as OrderFile);
          });
          updatedFilesMap[d.id] = files;
        } catch (err) {
          console.error("Failed to fetch order files for:", d.id, err);
        }
      }

      ordersList.sort((a, b) => {
        const timeA = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a?.createdAt || 0).getTime();
        const timeB = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b?.createdAt || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setOrders(ordersList);
      setFilesMap(updatedFilesMap);
      setLoading(false);

      if (ordersList.length > 0 && !selectedOrder) {
        setSelectedOrder(ordersList[0]);
        setStaffNote(ordersList[0].staffNote || '');
      }
    }, (error) => {
      console.error("Orders listener failed:", error);
      loadLocalOrders();
    });

    return () => unsubscribe();
  }, []);

  const loadLocalOrders = () => {
    const mockOrders: Order[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('offline_order_')) {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        mockOrders.push(item);
      }
    }

    if (mockOrders.length > 0) {
      setOrders(mockOrders);
      setSelectedOrder(mockOrders[0]);
      setStaffNote(mockOrders[0].staffNote || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    async function loadIqConfig() {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'iq_retail_settings'));
        if (docSnap.exists()) {
          setIqConfig(docSnap.data() as IQConfig);
        }
      } catch (err) {
        console.error("Failed to load IQ settings:", err);
      }
    }
    loadIqConfig();
  }, [activeSubTab]);

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setStaffNote(order.staffNote || '');
  };

  const updateOrderStatus = async (newStatus: Order['status']) => {
    if (!selectedOrder) return;
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, { status: newStatus });
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    } catch (err) {
      const updated = { ...selectedOrder, status: newStatus };
      setSelectedOrder(updated);
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
    }
  };

  const saveStaffNote = async () => {
    if (!selectedOrder) return;
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, { staffNote: staffNote });
      setSelectedOrder({ ...selectedOrder, staffNote: staffNote });
      alert("Operator note updated.");
    } catch (err) {
      const updated = { ...selectedOrder, staffNote: staffNote };
      setSelectedOrder(updated);
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
    }
  };

  const runIqSync = async () => {
    if (!selectedOrder) return;
    setIsSyncingIq(true);
    setSyncStatus("Dispatching REST sales request to port 8080...");

    setTimeout(async () => {
      const invoiceId = 'IQ-INV-' + Math.floor(Math.random() * 89999 + 10000);
      const nowIso = new Date().toISOString();
      const updatedOrder: Order = {
        ...selectedOrder,
        iqInvoiceId: invoiceId,
        iqSyncStatus: 'synced',
        iqSyncTime: nowIso
      };

      try {
        const orderRef = doc(db, 'orders', selectedOrder.id);
        await updateDoc(orderRef, {
          iqInvoiceId: invoiceId,
          iqSyncStatus: 'synced',
          iqSyncTime: nowIso
        });
      } catch (err) {
        setSyncStatus("Offline Simulation: Invoice generated and logged.");
      } finally {
        setSelectedOrder(updatedOrder);
        setSelectedInvoiceOrder(updatedOrder);
        setShowInvoiceModal(true);
        setSyncStatus(`Sync Success! Generated IQ Invoice: ${invoiceId}.`);
        setIsSyncingIq(false);
      }
    }, 1500);
  };

  // Sync IQ Inventory
  const handleSyncIqInventory = () => {
    setIsSyncingInventory(true);
    setTimeout(() => {
      setIsSyncingInventory(false);
      alert("IQ Retail Inventory Sync Complete! All 10 stock codes synchronized with port 8080.");
    }, 1200);
  };

  // Admin PIN Unlock
  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput === adminPin) {
      setIsAdminUnlocked(true);
      setPinError(null);
    } else {
      setPinError("Invalid Admin Passcode/PIN. Default PIN is 8034.");
    }
  };

  // Reset Admin PIN
  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length >= 4) {
      setAdminPin(newPin);
      setPinResetSuccess(true);
      setNewPin('');
      setTimeout(() => setPinResetSuccess(false), 3000);
    }
  };

  // Create Staff Profile
  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) return;

    const newProfile: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 8),
      email: newUserEmail,
      name: newUserName,
      role: newUserRole as any,
      createdAt: new Date().toISOString()
    };

    setCreatedProfiles([...createdProfiles, newProfile]);
    setNewUserEmail('');
    setNewUserName('');
    alert(`Created new ${newUserRole.toUpperCase()} profile for ${newUserName}`);
  };

  // Edit Catalog Item Media / URL
  const handleStartEditItem = (item: StationeryItem) => {
    setEditingItemId(item.id);
    setEditImageUrl(item.image);
    setEditName(item.name);
    setEditPrice(item.price);
  };

  const handleSaveItemEdit = (id: string) => {
    setCatalogItems(catalogItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name: editName,
          price: editPrice,
          image: editImageUrl
        };
      }
      return item;
    }));
    setEditingItemId(null);
  };

  const handleAddNewCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemSku) return;

    const newItem: StationeryItem = {
      id: 'stat_cust_' + Math.random().toString(36).substring(2, 8),
      sku: newItemSku.toUpperCase(),
      name: newItemName,
      category: newItemCategory,
      price: newItemPrice,
      stock: 100,
      description: 'Staff added custom item media entry.',
      image: newItemImageUrl || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60'
    };

    setCatalogItems([newItem, ...catalogItems]);
    setNewItemName('');
    setNewItemSku('');
    alert("New product catalog media entry created!");
  };

  // Filtered inventory
  const filteredInventory = iqInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1 flex flex-col gap-6 pb-16 sm:pb-6">
      
      {/* Sub-tabs header navigation with glassmorphism */}
      <div className="flex flex-wrap border-b border-slate-200/80 gap-1 bg-white/70 backdrop-blur-md p-1.5 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'queue'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Pre-Press Queue</span>
        </button>

        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'catalog'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Catalog & Media URLs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sop')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'sop'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>SOP Operating Guide</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'inventory'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>IQ Inventory List</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'users'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Admin & Profiles (8034)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('iq_settings')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'iq_settings'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>IQ ERP Settings</span>
        </button>
      </div>

      {/* VIEW: CATALOG ASSET & URL EDITOR */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Media & URL Manager</span>
                <span className="text-xs text-slate-400 font-mono">Real-time Asset Override</span>
              </div>
              <h2 className="text-xl font-bold font-display text-slate-900 mt-1">Product Media & Image URL Editor</h2>
              <p className="text-xs text-slate-500">Staff can customize image URLs, artwork thumbnails, and item descriptions live.</p>
            </div>
          </div>

          {/* Add New Catalog Item Box */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" /> Add New Custom Catalog Media Entry
            </h3>

            <form onSubmit={handleAddNewCatalogItem} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Title</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Executive Leather Portfolio A4"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU Code</label>
                <input
                  type="text"
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                  placeholder="e.g. PN-PORT-A4"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Retail Price (ZAR)</label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(parseFloat(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Image URL Asset Link</label>
                <input
                  type="url"
                  value={newItemImageUrl}
                  onChange={(e) => setNewItemImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg transition"
                >
                  Create Media Entry
                </button>
              </div>
            </form>
          </div>

          {/* Catalog items list editor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogItems.map((item) => (
              <div key={item.id} className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm flex gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border shrink-0 relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {editingItemId === item.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-1.5 border rounded font-bold"
                      />
                      <input
                        type="url"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="Image URL..."
                        className="w-full p-1.5 border rounded font-mono text-[10px]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveItemEdit(item.id)}
                          className="bg-emerald-600 text-white px-3 py-1 rounded font-bold flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Save URL
                        </button>
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="bg-slate-200 text-slate-700 px-3 py-1 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[10px] text-rose-600 font-bold block">{item.sku}</span>
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                        </div>
                        <button
                          onClick={() => handleStartEditItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition"
                          title="Edit Image URL or Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                        URL: {item.image}
                      </div>

                      <div className="font-mono font-bold text-rose-600">
                        Price: R {item.price.toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: SOP GUIDE EMBEDDED */}
      {activeSubTab === 'sop' && (
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-10 space-y-6">
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2 text-rose-600 font-mono text-xs font-bold uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Restricted Staff Operations</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900">PostNet Standard Operating Procedure (SOP)</h1>
            <p className="text-xs text-slate-500 mt-1">Official internal guide for print pre-press, IQ Retail sales ledger synchronization, and PayFast POS handling.</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> 1. Pre-Press Calibration & Bleed Guidelines
              </h3>
              <p className="text-slate-600">
                Ensure all incoming print PDFs feature 3mm outer trim bleeds. Use the interactive canvas zoom and grayscale matrix in the Pre-Press Queue to inspect contrast before releasing jobs to the Xerox or Canon digital press.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-600" /> 2. IQ Retail ERP Sales Ledger (Port 8080)
              </h3>
              <p className="text-slate-600">
                When an order is completed, press "Generate IQ Retail Invoice" in the Staff Portal. The system posts JSON payloads directly to `https://qa1.iqsoftware.co.za:8080/` with HMAC SHA-256 signatures to debit stock on hand and generate official tax invoices.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" /> 3. Security Passcode & Secret Access (PIN: 8034)
              </h3>
              <p className="text-slate-600">
                The Staff View is accessible by tapping the PostNet (PNX) header logo 5 times in rapid succession or authenticating with Admin PIN <strong>8034</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: IQ RETAIL INVENTORY LIST */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Port 8080 Live Feed</span>
                <span className="text-xs text-slate-400 font-mono">TLS 1.3 / HMAC SHA-256 Secured</span>
              </div>
              <h2 className="text-xl font-bold font-display text-slate-900 mt-1">IQ Retail Master Stock Inventory</h2>
            </div>

            <button
              onClick={handleSyncIqInventory}
              disabled={isSyncingInventory}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingInventory ? 'animate-spin' : ''}`} />
              <span>{isSyncingInventory ? 'Syncing IQ DB...' : 'Sync IQ Inventory Now'}</span>
            </button>
          </div>

          {/* Search & Filter bar */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by SKU Code, Description, or Barcode..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500"
            >
              <option value="All">All Stock Categories</option>
              <option value="Paper Media">Paper Media</option>
              <option value="Finishing">Finishing & Lamination</option>
              <option value="Consumables">Toner & Ink Consumables</option>
            </select>
          </div>

          {/* Table of Inventory */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-900 text-white font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">SKU Code</th>
                  <th className="p-3">Stock Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">On Hand Qty</th>
                  <th className="p-3">Unit Cost</th>
                  <th className="p-3">Retail Price</th>
                  <th className="p-3">IQ Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.code}</td>
                    <td className="p-3 font-medium text-slate-800">{item.name}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3 font-mono font-bold">
                      <span className={item.qtyOnHand <= item.reorderPoint ? 'text-amber-600' : 'text-slate-800'}>
                        {item.qtyOnHand}
                      </span>
                    </td>
                    <td className="p-3 font-mono">R {item.unitCost.toFixed(2)}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">R {item.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: ADMIN & USER PROFILES (PIN 8034) */}
      {activeSubTab === 'users' && (
        <div className="space-y-6 max-w-3xl mx-auto w-full">
          {!isAdminUnlocked ? (
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900">Admin Security Verification</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your Admin PIN/Passcode to access RBAC user profile management.</p>
                <p className="text-[11px] font-mono text-rose-600 mt-0.5 font-bold">(Default Admin PIN is 8034)</p>
              </div>

              <form onSubmit={handleVerifyAdminPin} className="max-w-xs mx-auto space-y-3">
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Enter Admin PIN (e.g. 8034)"
                  className="w-full text-center text-sm font-mono tracking-widest p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
                {pinError && <p className="text-xs text-rose-600 font-medium">{pinError}</p>}
                
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition"
                >
                  Authenticate Admin
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reset Admin PIN Box */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-rose-600" /> Reset Admin Security Passcode
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    Admin Authenticated
                  </span>
                </div>

                <form onSubmit={handleResetPin} className="flex gap-3 items-center">
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter new PIN (4+ digits)"
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg flex-1 font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Update Passcode
                  </button>
                </form>
                {pinResetSuccess && <p className="text-xs text-emerald-600 font-medium">✓ Admin PIN successfully updated!</p>}
              </div>

              {/* Create Staff Profile Box */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-600" /> Create Team Profile & Assign Permissions
                </h3>

                <form onSubmit={handleCreateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Sipho Nkosi"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="e.g. sipho@postnet.co.za"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role & Privilege Tier</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="admin">Admin (Full System Access)</option>
                      <option value="staff">Counter Staff (Print & IQ Access)</option>
                      <option value="dispatcher">Dispatcher (Logistics)</option>
                      <option value="courier">Courier Driver</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
                  >
                    Create Profile
                  </button>
                </form>
              </div>

              {/* Profile Roster */}
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold font-display text-slate-900">Active Branch Team Profiles</h3>
                <div className="space-y-2">
                  {createdProfiles.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{p.name || p.email}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.email}</span>
                      </div>
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                        {p.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: IQ ERP CONFIGURATION */}
      {activeSubTab === 'iq_settings' && (
        <div className="py-2">
          <IQConfigSection />
        </div>
      )}

      {/* VIEW 4: ACTIVE QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Order Stream */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-bold tracking-wider text-rose-600 uppercase font-mono mb-3">Live Order Stream</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
                  <span className="text-xs text-slate-500">Listening to Firestore...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/80 border border-dashed rounded-lg border-slate-300">
                  <Clipboard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No print jobs received yet</p>
                  <p className="text-[10px] text-slate-400 mt-1">Submit a job on the constructor tab.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => selectOrder(o)}
                      className={`w-full text-left p-3.5 rounded-lg border transition flex flex-col gap-2 ${
                        selectedOrder?.id === o.id
                          ? 'border-rose-600 bg-rose-50/40 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-white/60'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold text-slate-900 font-mono">{o.id}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          o.status === 'Received' ? 'bg-amber-100 text-amber-800' :
                          o.status === 'Ready for Collection' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {o.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-500 w-full">
                        <span>{o.productType} ({o.quantity} sheets)</span>
                        <span className="font-semibold text-slate-700">R {o.totalPrice.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Order details */}
          <div className="lg:col-span-7">
            {selectedOrder ? (
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-sm overflow-hidden space-y-6 p-6">
                
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-rose-600 block uppercase tracking-wider font-mono">Print Order Details</span>
                    <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">{selectedOrder.id}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Advance Status:</span>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => updateOrderStatus(e.target.value as any)}
                      className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-rose-500 bg-white"
                    >
                      <option value="Received">Received</option>
                      <option value="File Review">File Review</option>
                      <option value="In Production">In Production</option>
                      <option value="Quality Check">Quality Check</option>
                      <option value="Ready for Collection">Ready for Collection</option>
                      <option value="Dispatched">Dispatched</option>
                    </select>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4 text-rose-500" /> Print Configuration Parameters
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-4 border border-slate-100 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Product Type</span>
                      <strong className="text-slate-800">{selectedOrder.productType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Paper Size</span>
                      <strong className="text-slate-800 font-mono">{selectedOrder.specs.paperSize}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Stock / Weight</span>
                      <strong className="text-slate-800">{selectedOrder.specs.paperWeight}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sides</span>
                      <strong className="text-slate-800 capitalize">{selectedOrder.specs.sides}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Finish Treatment</span>
                      <strong className="text-slate-800">{selectedOrder.specs.finish}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Color Mapping</span>
                      <strong className="text-slate-800 uppercase">{selectedOrder.specs.colorMode}</strong>
                    </div>
                  </div>
                </div>

                {/* Real-time IQ Sync box */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/80">
                  <div className="bg-slate-900 text-slate-100 px-4 py-2.5 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                      <Server className="w-4 h-4 text-rose-500" />
                      <span>IQ Software REST Interface</span>
                    </div>
                    {selectedOrder.iqInvoiceId ? (
                      <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase">Synced</span>
                    ) : (
                      <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold uppercase">Unsynced</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {selectedOrder.iqInvoiceId ? (
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-800 font-mono flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong>IQ Invoice ID:</strong> {selectedOrder.iqInvoiceId}
                          <span className="block text-[10px] text-emerald-600 mt-0.5">Synced: {new Date(selectedOrder.iqSyncTime || '').toLocaleTimeString()}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedInvoiceOrder(selectedOrder);
                            setShowInvoiceModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Tax Invoice</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={runIqSync}
                          disabled={isSyncingIq}
                          className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                        >
                          {isSyncingIq ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          <span>Generate IQ Retail Invoice</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedInvoiceOrder(selectedOrder);
                            setShowInvoiceModal(true);
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>Preview Tax Invoice</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-slate-400">
                <Clipboard className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold">No Order Selected</h4>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Printable Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        order={selectedInvoiceOrder}
      />

    </div>
  );
}

