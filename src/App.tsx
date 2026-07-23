import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
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
import { Settings, Monitor, LogIn, LogOut, ShoppingBag, Lock, Sparkles, X, ShieldCheck, Truck, Printer, FileText } from 'lucide-react';

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

  const handleVerifyPinAndUnlockStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinModalInput === '8034' || pinModalInput === '1234') {
      const updatedProfile: UserProfile = profile
        ? { ...profile, role: 'staff' }
        : {
            id: 'unlocked_staff',
            email: 'staff@postnet.co.za',
            role: 'staff',
            createdAt: new Date().toISOString()
          };
      setProfile(updatedProfile);
      setCurrentView('staff');
      setShowPinModal(false);
      setPinModalInput('');
      setPinModalError(null);
    } else {
      setPinModalError("Invalid Staff PIN. Enter 8034 to access.");
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed: ", err);
    }
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
      {/* Upper Dev Notification Toolbar */}
      <div className="bg-slate-900/95 text-slate-300 py-1.5 px-4 text-[11px] flex flex-wrap justify-between items-center gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dbOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
          <span>Database: {dbOnline ? 'Cloud Ingress Active' : 'Local Sandbox Mode'}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {user && profile && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Role: <strong className="text-rose-400 capitalize">{profile.role}</strong></span>
              <button 
                onClick={toggleDeveloperRole}
                className="bg-slate-800 hover:bg-slate-700 text-white px-2 py-0.5 rounded text-[10px] border border-slate-700 transition"
              >
                Switch Role
              </button>
            </div>
          )}
          <span className="hidden sm:inline">PNX Print OS v2.1.0</span>
        </div>
      </div>

      {/* Main Glassmorphic Header Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none group"
              onClick={handleLogoClick}
              title="Tap PNX Logo 5 times for Staff Access PIN"
            >
              <div className="relative">
                <img 
                  src="/pnxlogo.png" 
                  alt="PostNet Logo" 
                  className="h-9 w-auto object-contain transition group-active:scale-95"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://www.dotmade.co.za/wp-content/uploads/2020/10/Postnet.jpg';
                  }}
                />
                {logoClickCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-600 text-white font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-ping">
                    {logoClickCount}
                  </span>
                )}
              </div>

              <div className="hidden md:block">
                <span className="text-xs tracking-widest text-rose-600 font-mono font-bold block uppercase">PNX PRINT OS</span>
                <span className="text-xs font-semibold text-slate-800 font-display -mt-1 block">Pre-Press & Commerce Engine</span>
              </div>
            </div>

            {/* Desktop Navigation - Clean Client Interface */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setCurrentView('customer')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                  currentView === 'customer'
                    ? 'bg-rose-50 text-rose-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Monitor className="w-4 h-4 text-rose-600" />
                <span>Job Constructor</span>
              </button>

              <button
                onClick={() => setCurrentView('tracker')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                  currentView === 'tracker'
                    ? 'bg-rose-50 text-rose-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Truck className="w-4 h-4 text-rose-600" />
                <span>Track Orders & Invoices</span>
              </button>

              <button
                onClick={() => setCurrentView('stationery')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                  currentView === 'stationery'
                    ? 'bg-rose-50 text-rose-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-rose-600" />
                <span>Stationery Store</span>
              </button>

              <div className="border-l border-slate-200/80 h-6 mx-1"></div>

              {/* Direct Print Invoice Utility Button */}
              <button
                onClick={() => setCurrentView('tracker')}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                title="Search and print Tax Invoices"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span>Print Tax Invoice</span>
              </button>

              {user ? (
                <div className="flex items-center gap-3 ml-1">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{user.displayName || user.email}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{profile?.role || 'customer'}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100/80 rounded-xl transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
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

      {/* Secret PIN Entry Modal for 5-Tap Unlock */}
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
              <h3 className="text-lg font-bold font-display text-slate-900">Staff Portal Secret Unlock</h3>
              <p className="text-xs text-slate-500">
                You triggered the 5-tap logo shortcut. Enter the staff passcode PIN to access the Staff Dashboard and SOP Guide.
              </p>
            </div>

            <form onSubmit={handleVerifyPinAndUnlockStaff} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={pinModalInput}
                  onChange={(e) => setPinModalInput(e.target.value)}
                  placeholder="Enter Passcode (Default: 8034)"
                  className="w-full text-center text-lg font-mono tracking-widest p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>

              {pinModalError && (
                <p className="text-xs text-rose-600 text-center font-medium">{pinModalError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition shadow-md"
              >
                Unlock Staff View
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
            <img src="/pnxlogo.png" alt="PNX" className="h-5 w-auto" />
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

