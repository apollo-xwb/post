import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { seedDatabaseIfEmpty } from './seed';
import Navbar from './components/Navbar';
import AuthPage from './components/AuthPage';
import CustomerDashboard from './components/CustomerDashboard';
import JobBuilder from './components/JobBuilder';
import StaffDashboard from './components/StaffDashboard';
import { Loader2, Printer, Search, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

interface PublicOrderTrack {
  id: string;
  customerName: string;
  productType: string;
  status: string;
  totalPrice: number;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Tab/Screen state
  const [activeTab, setActiveTab] = useState<string>('job-builder');
  const [selectedOrderIdOnCreate, setSelectedOrderIdOnCreate] = useState<string | null>(null);

  // Authentication sliding dialog modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Standalone public tracking states (for URL sharing without login required)
  const [publicTrackId, setPublicTrackId] = useState('');
  const [publicOrder, setPublicOrder] = useState<any | null>(null);
  const [publicSearchError, setPublicSearchError] = useState<string | null>(null);
  const [searchingPublic, setSearchingPublic] = useState(false);

  // Invoke automatic database seed and listen to auth changes
  useEffect(() => {
    // Seed on startup if empty
    seedDatabaseIfEmpty();

    // Parse search parameters for shareable URL tracking
    const searchParams = new URLSearchParams(window.location.search);
    const trackParam = searchParams.get('track');
    if (trackParam) {
      setPublicTrackId(trackParam);
      handleFetchPublicTrack(trackParam);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            setUser(profile);
            
            // Route operator/staff straight to operations queue
            if (profile.role === 'staff' || profile.role === 'admin') {
              setActiveTab('staff-queue');
            } else {
              setActiveTab('order-tracker');
            }
          } else {
            // Provision customer profile fallback
            const fallback: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'customer',
              createdAt: new Date(),
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              tags: ['Standard Customer']
            };
            setUser(fallback);
            setActiveTab('order-tracker');
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUser(null);
        setActiveTab('job-builder');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFetchPublicTrack = async (orderIdToFetch: string) => {
    if (!orderIdToFetch.trim()) return;
    setSearchingPublic(true);
    setPublicSearchError(null);
    setPublicOrder(null);
    try {
      const docRef = doc(db, 'orders', orderIdToFetch.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPublicOrder(docSnap.data());
      } else {
        setPublicSearchError('Could not find corresponding Postnet tracking ticket ID.');
      }
    } catch (err: any) {
      console.error(err);
      setPublicSearchError('Could not fetch tracking details. Ensure correct configuration.');
    } finally {
      setSearchingPublic(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setActiveTab('job-builder');
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Helper routine for custom workflow routing on order creation
  const handleOrderCreatedWorkflow = (orderId: string) => {
    setSelectedOrderIdOnCreate(orderId);
    setActiveTab('order-tracker');
  };

  const clearPublicTracker = () => {
    setPublicOrder(null);
    setPublicTrackId('');
    setPublicSearchError(null);
    // Clear URL parameter
    window.history.pushState({}, document.title, window.location.pathname);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-10 w-10 text-red-600 animate-spin mb-3" />
        <p className="text-xs font-bold font-mono tracking-widest text-zinc-400 uppercase">
          Initializing Print OS Environments...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 text-zinc-900 font-sans">
      
      {/* Header and navbar */}
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onAuthTrigger={() => setIsAuthModalOpen(true)}
      />

      {/* Main Body view routes list */}
      <main className="flex-grow">
        {user ? (
          <div>
            {/* Customer Panel routes */}
            {user.role === 'customer' ? (
              <>
                {activeTab === 'order-tracker' && (
                  <CustomerDashboard 
                    user={user} 
                    onNavigateToBuilder={() => setActiveTab('job-builder')} 
                    selectedOrderIdOnCreate={selectedOrderIdOnCreate}
                  />
                )}
                {activeTab === 'job-builder' && (
                  <JobBuilder 
                    user={user} 
                    onOrderCreated={handleOrderCreatedWorkflow} 
                  />
                )}
              </>
            ) : (
              /* Administrative staff panel routes */
              <>
                {(activeTab === 'staff-queue' || activeTab === 'staff-catalog' || activeTab === 'staff-reports') && (
                  <StaffDashboard 
                    user={user} 
                    activeView={activeTab as any} 
                  />
                )}
                {activeTab === 'job-builder' && (
                  <div className="bg-zinc-100 py-4">
                    <p className="text-center font-bold text-xs bg-red-600 text-white p-2 mb-2 font-mono">
                      STAFF PREVIEW: PREVIEWING CUSTOMER ORDER CONFIGURATOR FOR TESTING
                    </p>
                    <JobBuilder 
                      user={user} 
                      onOrderCreated={handleOrderCreatedWorkflow} 
                    />
                  </div>
                )}
                {activeTab === 'order-tracker' && (
                  <CustomerDashboard 
                    user={user} 
                    onNavigateToBuilder={() => setActiveTab('job-builder')} 
                    selectedOrderIdOnCreate={selectedOrderIdOnCreate}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          /* Guest Experience Mode (No Login Wall!) */
          <div className="fade-in">
            {activeTab === 'job-builder' && (
              <JobBuilder 
                user={null} 
                onOrderCreated={handleOrderCreatedWorkflow} 
              />
            )}

            {activeTab === 'order-tracker' && (
              <div className="max-w-xl mx-auto px-4 py-16 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">
                    Self-Service Ticket Tracker
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Enter your live shareable tracking key/ticket ID below to query status benchmarks.
                  </p>
                </div>

                {/* Public tracking search form */}
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-md space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={publicTrackId}
                      onChange={(e) => setPublicTrackId(e.target.value)}
                      placeholder="e.g. postnet_123456"
                      className="p-3 border border-zinc-350 rounded-xl text-xs bg-zinc-50 font-bold focus:outline-none focus:ring-1 focus:ring-red-500 flex-grow text-zinc-900 font-mono tracking-wider"
                    />
                    <button
                      onClick={() => handleFetchPublicTrack(publicTrackId)}
                      disabled={searchingPublic}
                      className="py-3 px-5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs shadow-sm flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      <span>Query Status</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {searchingPublic && <Loader2 className="h-4 w-4 text-red-600 animate-spin mx-auto mt-2" />}

                  {publicSearchError && (
                    <p className="text-xs text-red-600 font-mono font-medium text-center bg-red-50 p-2.5 rounded border border-red-100">
                      ⚠ {publicSearchError}
                    </p>
                  )}

                  {/* Tracking search details summary */}
                  {publicOrder && (
                    <div className="p-4 bg-zinc-950 text-white rounded-xl border border-zinc-800 space-y-3.5 mt-3 fade-in">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="text-xs font-mono font-extrabold text-red-500 tracking-wider">
                          Ticket ID: {publicOrder.id}
                        </span>
                        <button
                          onClick={clearPublicTracker}
                          className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3.5 text-xs">
                        <div>
                          <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Product specs</span>
                          <span className="font-bold text-zinc-200">{publicOrder.productType}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Fulfillment Bench</span>
                          <span className="font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 inline-block mt-0.5">
                            {publicOrder.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Custom Config</span>
                          <span className="font-mono text-zinc-300 text-[11px]">
                            {publicOrder.specs?.paperSize} • {publicOrder.specs?.paperStock}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Invoice Subtotal</span>
                          <span className="font-bold font-mono text-zinc-200">
                            R{publicOrder.totalPrice?.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-zinc-800 text-[10px] text-zinc-400 leading-snug flex items-start space-x-1.5">
                        <CheckCircle className="h-4 w-4 text-red-600 shrink-0" />
                        <span>Ticket queries represent read-only status telemetry. High fidelity history is authenticated.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating sliding login backdrop overlay card */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-in-fast">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative border border-zinc-200">
            {/* Corner Close trigger */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 font-bold p-1 hover:bg-zinc-100 rounded-full transition-all text-xs"
              title="Close Panel"
            >
              ✕ Close
            </button>
            <div className="pt-8 pb-4 px-4 bg-zinc-950 text-white rounded-t-2xl text-center">
              <img 
                src="https://www.dotmade.co.za/wp-content/uploads/2020/10/Postnet.jpg" 
                alt="Postnet" 
                className="h-14 w-14 object-cover mx-auto rounded-xl border border-zinc-700 shadow mb-2"
                referrerPolicy="no-referrer"
              />
              <h3 className="text-sm font-black tracking-widest font-mono text-red-600 uppercase">
                Enterprise Login / Sign Up
              </h3>
            </div>
            <div className="p-4">
              <AuthPage 
                onAuthSuccess={(profile) => {
                  setUser(profile);
                  setIsAuthModalOpen(false);
                  if (profile.role === 'staff' || profile.role === 'admin') {
                    setActiveTab('staff-queue');
                  } else {
                    setActiveTab('order-tracker');
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer corporate bar details */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-zinc-500 gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-bold text-zinc-400">PostNet Print OS Operations Portal</p>
            <p className="text-[11px] text-zinc-500">VAT Reg: 4500123456 • Sovereign Print Production Infrastructure</p>
          </div>
          <p className="font-mono text-[10px] text-zinc-600 text-center md:text-right">
            Securely Managed with Integrated Cloud Firestore Protocols • Confidentially Restricted Environment
          </p>
        </div>
      </footer>

    </div>
  );
}
