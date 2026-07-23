import React, { useState, useEffect } from 'react';
import { db } from '../App';
import { doc, setDoc } from 'firebase/firestore';
import { StationeryItem, CartItem, Order } from '../types';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, CheckCircle2, 
  Truck, Store, ShieldCheck, Tag, ArrowRight, X, AlertCircle, ShoppingCart
} from 'lucide-react';

const STATIONERY_CATALOG: StationeryItem[] = [
  {
    id: 'stat_paper_a4_80',
    sku: 'PN-PAP-A4-80',
    name: 'A4 White Bond Paper Ream (80gsm)',
    category: 'Paper & Media',
    price: 95.00,
    stock: 450,
    description: 'High-whiteness premium 80gsm laser paper. Ideal for high-speed double-sided printing and crisp black-and-white or color documents (500 sheets).',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_box_med',
    sku: 'PN-BOX-MED-02',
    name: 'PostNet Courier Box - Medium',
    category: 'Packaging & Postal',
    price: 28.50,
    stock: 200,
    description: 'Heavy-duty 3-layer corrugated courier box (300 x 200 x 150mm) engineered for safe domestic parcel shipping and transit durability.',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_tape_heavy',
    sku: 'PN-TAPE-HVY-50',
    name: 'Heavy-Duty Packaging Tape (48mm x 50m)',
    category: 'Packaging & Postal',
    price: 32.00,
    stock: 350,
    description: 'High-tack acrylic adhesive brown packaging tape. Holds firmly on cardboard boxes and heavy parcel wraps under all humidity conditions.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_bubble_roll',
    sku: 'PN-BUB-500-10',
    name: 'Bubble Wrap Cushioning Roll (500mm x 10m)',
    category: 'Packaging & Postal',
    price: 65.00,
    stock: 120,
    description: '10mm air-bubble protective shock-absorption wrap for fragile electronics, glassware, and valuable parcel shipments.',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_mailers_a4',
    sku: 'PN-ENV-BUB-A4',
    name: 'Padded Bubble Mailers A4 (Pack of 10)',
    category: 'Packaging & Postal',
    price: 85.00,
    stock: 180,
    description: 'Self-sealing kraft paper envelopes lined with interior air bubble lining. Ideal for document and small goods protection.',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_pens_gel',
    sku: 'PN-PEN-GEL-BLK',
    name: 'Executive Gel Pens - Black (Box of 12)',
    category: 'Office Supplies',
    price: 145.00,
    stock: 95,
    description: 'Smooth 0.7mm quick-drying waterproof gel ink pens with comfortable ergonomic rubber grip for extended signature signing.',
    image: 'https://images.unsplash.com/photo-1585336261026-61e778929b28?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_file_arch',
    sku: 'PN-FIL-ARCH-70',
    name: 'Lever Arch File Heavy-Duty 70mm',
    category: 'Filing & Storage',
    price: 52.00,
    stock: 140,
    description: 'Durable polypropylene covered board with reinforced metal bottom edges and easy locking mechanism for archive filing.',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'stat_sleeves_100',
    sku: 'PN-SLV-A4-100',
    name: 'A4 Clear Document Sleeves (Pack of 100)',
    category: 'Filing & Storage',
    price: 78.00,
    stock: 210,
    description: 'Copy-safe acid-free polypropylene punched pocket sleeves designed to fit standard 2-ring and 4-ring lever arch binders.',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60'
  }
];

interface StationeryStoreProps {
  user: any;
  profile: any;
}

export default function StationeryStore({ user, profile }: StationeryStoreProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'courier'>('pickup');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  // Filter items
  const categories = ['All', 'Paper & Media', 'Packaging & Postal', 'Office Supplies', 'Filing & Storage'];

  const filteredItems = STATIONERY_CATALOG.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (item: StationeryItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prevCart.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      } else {
        return [...prevCart, { item, quantity: 1 }];
      }
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((ci) => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((ci) => ci.item.id !== itemId));
  };

  // Pricing calculations
  const itemsSubtotal = cart.reduce((acc, ci) => acc + ci.item.price * ci.quantity, 0);
  const shippingFee = fulfillment === 'courier' && cart.length > 0 ? 99.00 : 0.00;
  const subtotalWithShipping = itemsSubtotal + shippingFee;
  const vatTax = subtotalWithShipping * 0.15; // 15% South African VAT
  const grandTotal = subtotalWithShipping + vatTax;
  const totalItemCount = cart.reduce((acc, ci) => acc + ci.quantity, 0);

  // Submit Order
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    const orderId = 'STAT_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const guestUserId = user ? user.uid : 'local_guest_' + Math.random().toString(36).substring(2, 8);

    const itemsSummary = cart.map(ci => `${ci.item.name} (${ci.quantity}x)`).join(', ');

    const newOrder: Order = {
      id: orderId,
      userId: guestUserId,
      status: 'Received',
      totalPrice: parseFloat(grandTotal.toFixed(2)),
      createdAt: new Date().toISOString(),
      productType: `Stationery: ${cart.length} item(s)`,
      quantity: totalItemCount,
      specs: {
        paperSize: fulfillment === 'pickup' ? 'In-Store Pickup' : 'Courier Door Delivery',
        paperWeight: 'Standard Pack',
        finish: 'Stationery Goods',
        sides: 'single',
        colorMode: 'color',
        turnaround: 'standard'
      },
      paymentStatus: 'unpaid',
      iqSyncStatus: 'pending',
      staffNote: `Items ordered: ${itemsSummary}. Fulfillment: ${fulfillment === 'pickup' ? 'Branch Pickup' : 'PostNet Courier Door-to-Door'}`
    };

    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);
      setOrderComplete(orderId);
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.warn("Offline fallback for stationery checkout:", err);
      localStorage.setItem(`offline_order_${orderId}`, JSON.stringify(newOrder));
      setOrderComplete(orderId);
      setCart([]);
      setIsCartOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-8 flex-1 flex flex-col gap-6 overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-rose-500 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1.5">
            <ShoppingBag className="w-4 h-4" />
            <span>PostNet Stationery & Packaging Portal</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold font-display tracking-tight text-white leading-tight">
            Essential Office Supplies & Postal Packaging
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Order certified PostNet shipping boxes, bubble wraps, paper reams, and executive office stationery for fast branch collection or direct courier delivery.
          </p>
        </div>

        {/* Decorative subtle background accents */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {orderComplete ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm my-8">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900">Stationery Order Placed!</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your stationery order has been logged into PostNet Print OS and routed to the counter dispatch queue.
          </p>
          
          <div className="bg-slate-50 rounded-lg p-4 my-6 text-left border border-slate-200 font-mono text-xs text-slate-700 space-y-1.5">
            <div><strong>Order ID:</strong> {orderComplete}</div>
            <div><strong>Status:</strong> Ready for Processing</div>
            <div><strong>Fulfillment:</strong> {fulfillment === 'pickup' ? 'Branch Counter Pickup' : 'PostNet Courier Delivery'}</div>
          </div>

          <button
            onClick={() => setOrderComplete(null)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold transition"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          {/* Controls Bar: Search & Categories */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-slate-200 pb-4">
            
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search + Cart Drawer Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products or SKU..."
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 bg-white"
                />
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
              >
                <ShoppingCart className="w-4 h-4 text-rose-400" />
                <span>Cart</span>
                {totalItemCount > 0 && (
                  <span className="bg-rose-600 text-white font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold ml-1">
                    {totalItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group"
              >
                {/* Image */}
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded backdrop-blur">
                    {item.sku}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-rose-600 text-white text-xs font-mono font-bold px-2 py-1 rounded shadow-sm">
                    R {item.price.toFixed(2)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-rose-600 uppercase tracking-wider block">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                      In Stock ({item.stock})
                    </span>

                    <button
                      onClick={() => addToCart(item)}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cart Drawer / Slide-Over Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold font-display">Your Stationery Cart ({totalItemCount})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Item List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Your cart is empty</p>
                  <p className="text-[10px] mt-1 text-slate-400">Browse the catalog to add stationery items.</p>
                </div>
              ) : (
                cart.map((ci) => (
                  <div
                    key={ci.item.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50 gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{ci.item.name}</h4>
                      <span className="text-slate-500 font-mono text-[11px]">R {ci.item.price.toFixed(2)} each</span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                      <button
                        onClick={() => updateQuantity(ci.item.id, -1)}
                        className="text-slate-500 hover:text-rose-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold w-5 text-center">{ci.quantity}</span>
                      <button
                        onClick={() => updateQuantity(ci.item.id, 1)}
                        className="text-slate-500 hover:text-rose-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 font-mono block">
                        R {(ci.item.price * ci.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(ci.item.id)}
                        className="text-slate-400 hover:text-rose-600 mt-1 inline-block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer & Checkout */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
                
                {/* Fulfillment Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Fulfillment Choice</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFulfillment('pickup')}
                      className={`p-2 rounded border text-left flex items-center gap-2 transition ${
                        fulfillment === 'pickup'
                          ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Store className="w-4 h-4 shrink-0 text-rose-600" />
                      <div>
                        <span className="text-[11px] block">Branch Pickup</span>
                        <span className="text-[9px] text-slate-500 font-normal">Free Collection</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillment('courier')}
                      className={`p-2 rounded border text-left flex items-center gap-2 transition ${
                        fulfillment === 'courier'
                          ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Truck className="w-4 h-4 shrink-0 text-rose-600" />
                      <div>
                        <span className="text-[11px] block">PostNet Courier</span>
                        <span className="text-[9px] text-slate-500 font-normal">+ R 99.00 Door Fee</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200 pt-3">
                  <div className="flex justify-between">
                    <span>Items Total:</span>
                    <span>R {itemsSubtotal.toFixed(2)}</span>
                  </div>
                  {fulfillment === 'courier' && (
                    <div className="flex justify-between">
                      <span>Courier Shipping:</span>
                      <span>R 99.00</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>S.A. VAT (15%):</span>
                    <span>R {vatTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-rose-600">R {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <span>Processing Order...</span>
                  ) : (
                    <>
                      <span>Place Stationery Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
