import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile } from './types';
import JobBuilder from './components/JobBuilder';
import StaffDashboard from './components/StaffDashboard';
import StationeryStore from './components/StationeryStore';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { seedDatabase } from './seed';
import CustomerDashboard from './components/CustomerDashboard';
import pnxLogo from './assets/pnxlogo.png';
import { Settings, Monitor, LogOut, ShoppingBag, Lock, Sparkles, X, ShieldCheck, Truck, Printer, FileText, UserCheck } from 'lucide-react';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<'customer' | 'tracker' | 'stationery' | 'staff'>('customer');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Secret Logo 5-Tap State
  const [logoClickCount, setLogoClickCount] = useState<number>(0);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinModalInput, setPinModalInput] = useState<string>('');
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [dbOnline, setDbOnline] = useState(true);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setDbOnline(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.warn("Firestore appears offline. Using local simulation cache.");
          setDbOnline(false);
        }
      }
    }
    testConnection();
  }, []);

  // Auth & Profile Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileRef = doc(db, 'users', currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              role: currentUser.email?.endsWith('@postnet.co.za') || currentUser.email?.endsWith('@postnetprintos.co.za') ? 'staff' : 'customer',
              createdAt: new Date().toISOString()
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Failed to load user profile: ", err);
          setProfile({
            id: currentUser.uid,
            email: currentUser.email || 'customer@test.com',
            role: 'customer',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      seedDatabase();
    });

    return () => unsubscribe();
  }, []);

  // Handle Logo 5 Taps Secret Trigger
  const handleLogoClick = () => {
    setLogoClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowPinModal(true);
        setPinModalError(null);
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      setLogoClickCount(0);
    }, 3000);
  };

  const handleVerifyPinAndUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinModalInput.trim();
    if (pin === '8034' || pin === '1234' || pin.toLowerCase() === 'staff') {
      const updatedProfile: UserProfile = {
        id: 'unlocked_staff',
        email: 'staff@postnet.co.za',
        role: 'staff',
        name: 'PostNet Staff Operator',
        company: 'Postnet Rondebosch',
        createdAt: new Date().toISOString()
      };
      setProfile(updatedProfile);
      setCurrentView('staff');
      setShowPinModal(false);
      setPinModalInput('');
      setPinModalError(null);
    } else if (pin.length >= 4 || pin === '0000') {
      const updatedProfile: UserProfile = {
        id: 'customer_' + Math.random().toString(36).substring(2, 9),
        email: 'customer@postnet.co.za',
        role: 'customer',
        name: 'VIP Client (' + pin + ')',
        createdAt: new Date().toISOString()
      };
      setProfile(updatedProfile);
      setShowPinModal(false);
      setPinModalInput('');
      setPinModalError(null);
    } else {
      setPinModalError("Enter 4-digit PIN (Use 8034 for Staff, 0000 for Customer)");
    }
  };

  const handleInstantCustomerSignIn = () => {
    const updatedProfile: UserProfile = {
      id: 'customer_guest_' + Math.random().toString(36).substring(2, 9),
      email: 'client@postnet.co.za',
      role: 'customer',
      name: 'Rondebosch Client',
      createdAt: new Date().toISOString()
    };
    setProfile(updatedProfile);
    setShowPinModal(false);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  const toggleDeveloperRole = async () => {
    if (!user || !profile) return;
    const newRole = profile.role === 'customer' ? 'staff' : profile.role === 'staff' ? 'admin' : 'customer';
    const updatedProfile: UserProfile = { ...profile, role: newRole };
    
    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile);
    } catch (err) {
      setProfile(updatedProfile);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Booting PostNet Print OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-rose-100 selection:text-rose-900 relative overflow-x-hidden">

      {/* Main Clean Glassmorphic Header Navbar */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
            
            {/* Brand Logo - Uses imported pnxLogo asset so it never 404s */}
            <div 
              className="flex items-center gap-2 cursor-pointer select-none shrink-0"
              onClick={handleLogoClick}
              title="PNX by Postnet Rondebosch"
            >
              <img 
                src={pnxLogo} 
                alt="PNX by Postnet Rondebosch" 
                className="h-8 sm:h-9 w-auto object-contain transition active:scale-95"
              />
              {logoClickCount > 0 && (
                <span className="bg-rose-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {logoClickCount}/5
                </span>
              )}
            </div>

            {/* Center Navigation Links - Compact, uncluttered tabs */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setCurrentView('customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentView === 'customer'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-rose-600" />
                <span>Job Builder</span>
              </button>

              <button
                onClick={() => setCurrentView('tracker')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentView === 'tracker'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-rose-600" />
                <span>Orders & Invoices</span>
              </button>

              <button
                onClick={() => setCurrentView('stationery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentView === 'stationery'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
                <span>Stationery Store</span>
              </button>

              {profile?.role === 'staff' || profile?.role === 'admin' ? (
                <button
                  onClick={() => setCurrentView('staff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'staff'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Staff Queue</span>
                </button>
              ) : null}
            </div>

            {/* Right Controls: Staff/User Status or Sign In Button */}
            <div className="flex items-center gap-2 shrink-0">
              {profile || user ? (
                <div className="flex items-center gap-2">
                  <div className="text-right hidden md:block">
                    <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{profile?.name || user?.email?.split('@')[0] || 'Client'}</div>
                    <div className="text-[10px] text-rose-600 font-mono uppercase font-bold">{profile?.role || 'Customer'}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowPinModal(true); setPinModalError(null); }}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In / PIN</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 flex flex-col pb-16 sm:pb-6">
        {currentView === 'customer' && (
          <JobBuilder 
            user={user} 
            profile={profile} 
            onNavigateToTracker={(orderId) => {
              setSelectedOrderId(orderId);
              setCurrentView('tracker');
            }}
          />
        )}

        {currentView === 'tracker' && (
          <CustomerDashboard 
            user={profile || (user ? { id: user.uid, email: user.email || 'customer@postnet.co.za', displayName: user.displayName || 'Client', role: 'customer' } : { id: 'guest-client', email: 'guest@postnet.co.za', displayName: 'Walk-in Client', role: 'customer' })} 
            onNavigateToBuilder={() => setCurrentView('customer')} 
            selectedOrderIdOnCreate={selectedOrderId}
          />
        )}

        {currentView === 'stationery' && (
          <StationeryStore user={user} profile={profile} />
        )}
        
        {currentView === 'staff' && (profile?.role === 'staff' || profile?.role === 'admin') && (
          <StaffDashboard user={user} profile={profile} />
        )}
      </main>

      {/* PIN Sign In / Unlock Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-slate-900">PostNet Portal Access PIN</h3>
              <p className="text-xs text-slate-500">
                Enter your 4-digit PIN code (Use <strong>8034</strong> for Staff Queue or <strong>0000</strong> for Instant Client Access).
              </p>
            </div>

            <form onSubmit={handleVerifyPinAndUnlock} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={pinModalInput}
                  onChange={(e) => setPinModalInput(e.target.value)}
                  placeholder="Enter PIN (e.g. 8034 or 0000)"
                  className="w-full text-center text-lg font-mono tracking-widest p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>

              {pinModalError && (
                <p className="text-xs text-rose-600 text-center font-medium">{pinModalError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md"
              >
                Authenticate with PIN
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">or quick access</div>
              </div>

              <button
                type="button"
                onClick={handleInstantCustomerSignIn}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition border border-slate-200 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-rose-600" />
                <span>Continue as Walk-in / Guest Client</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Navbar */}
      <BottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        profile={profile}
        onTapLogoTrigger={handleLogoClick}
      />

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200/80 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src={pnxLogo} alt="PNX" className="h-5 w-auto" />
            <span>© 2026 PostNet South Africa (Pty) Ltd. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-slate-800 transition cursor-pointer">Security Audit</span>
            <span className="hover:text-slate-800 transition cursor-pointer">IQ Retail Live</span>
            <span className="hover:text-slate-800 transition cursor-pointer">PayFast Gateway</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

