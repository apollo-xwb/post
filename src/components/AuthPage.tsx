import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { Mail, Lock, User, Terminal, Loader2, Landmark, Check, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [isStaffRole, setIsStaffRole] = useState(false); // Demo Helper
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set up high-contrast premium demo logins for testing
  const handleQuickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    const demoEmail = role === 'staff' ? 'staff@postnet.co.za' : 'customer@company.co.za';
    const demoPassword = 'Password123!';
    const name = role === 'staff' ? 'Thabo (Operations Staff)' : 'Sarah (Marketing Manager)';
    const companyName = role === 'staff' ? 'Postnet HQ' : 'Sarah Marketing Corp';

    try {
      // First try to sign in
      let credentials;
      try {
        credentials = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (signinErr: any) {
        if (signinErr.code === 'auth/user-not-found' || signinErr.code === 'auth/invalid-credential') {
          // If demo user doesn't exist yet, register them
          credentials = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } else {
          throw signinErr;
        }
      }

      const uid = credentials.user.uid;
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let profile: UserProfile;

      if (!userSnap.exists()) {
        profile = {
          id: uid,
          email: demoEmail,
          role: role,
          createdAt: new Date(),
          name: name,
          company: companyName,
          phone: '+27 82 123 4567',
          vatNumber: role === 'customer' ? 'ZA123456789' : undefined,
          tags: role === 'customer' ? ['VIP'] : ['Print Operator']
        };
        await setDoc(userRef, profile);
      } else {
        profile = userSnap.data() as UserProfile;
        // Safety lock: ensure role matches demo click
        if (profile.role !== role) {
          profile.role = role;
          await setDoc(userRef, { ...profile, role }, { merge: true });
        }
      }

      onAuthSuccess(profile);
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError(err.message || 'Verification failure under demo login simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password');
      return;
    }
    if (!isLogin && !fullName) {
      setError('Please provide your full name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        // Authenticate user
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const uid = credentials.user.uid;
        
        // Fetch profile
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          onAuthSuccess(userSnap.data() as UserProfile);
        } else {
          // Provision fallback profile
          const fallbackProfile: UserProfile = {
            id: uid,
            email: email,
            role: 'customer',
            createdAt: new Date(),
            name: email.split('@')[0],
          };
          await setDoc(userRef, fallbackProfile);
          onAuthSuccess(fallbackProfile);
        }
      } else {
        // Create account
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credentials.user.uid;
        
        const newProfile: UserProfile = {
          id: uid,
          email: email,
          role: isStaffRole ? 'staff' : 'customer',
          createdAt: new Date(),
          name: fullName,
          company: company || undefined,
          phone: phone || undefined,
          vatNumber: vatNumber || undefined,
          tags: isStaffRole ? ['Print Operator'] : ['Standard Customer']
        };

        // Write directly to Firestore using our strict blueprint guidelines
        await setDoc(doc(db, 'users', uid), newProfile);
        setSuccess('Account created successfully! Auto-launching...');
        setTimeout(() => {
          onAuthSuccess(newProfile);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Email password submit error:', err);
      let errMsg = err.message || 'Authentication error';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email address is already registered.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'The password is too weak. Must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email or password combination.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const credentials = await signInWithPopup(auth, provider);
      const uid = credentials.user.uid;
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let profile: UserProfile;
      if (!userSnap.exists()) {
        profile = {
          id: uid,
          email: credentials.user.email || '',
          role: 'customer',
          createdAt: new Date(),
          name: credentials.user.displayName || credentials.user.email?.split('@')[0] || 'User',
          phone: credentials.user.phoneNumber || undefined,
        };
        await setDoc(userRef, profile);
      } else {
        profile = userSnap.data() as UserProfile;
      }
      onAuthSuccess(profile);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Cancelled Google Popup credentials check');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-zinc-100 relative">
        
        {/* Brand Banner */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-lg">
            <Landmark className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-dark">
            POSTNET PRINT OS
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Professional print ordering and production workspace
          </p>
        </div>

        {/* Demo Account Helper Quick-tabs (High UI Craftsmanship) */}
        <div className="bg-brand-light border border-brand-cyan/20 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-brand-blue font-mono">
            <Terminal className="h-4 w-4 text-brand-cyan" />
            <span>ONE-CLICK DEMO AUTHENTICATION:</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Jump securely into the system under both role paradigms to review specific permissions and dashboards:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => handleQuickDemoLogin('customer')}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-white border border-brand-blue/10 rounded-lg text-xs font-bold text-brand-blue hover:bg-slate-50 shadow-sm transition-all"
              id="demo-customer-btn"
            >
              <span>Customer Portal</span>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('staff')}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-brand-blue rounded-lg text-xs font-bold text-white hover:bg-brand-blue/90 shadow-sm transition-all"
              id="demo-staff-btn"
            >
              <span>Staff Operator</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-teal-50 border-l-4 border-teal-500 p-3 rounded text-xs text-teal-700 flex items-start space-x-2">
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Manual Formulary Input */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:bg-white transition-all text-brand-dark"
                    placeholder="Sarah Jenkins"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Company (Opt)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="p-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:bg-white text-brand-dark"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Phone (Opt)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="p-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:bg-white text-brand-dark"
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  VAT ID Number (Opt)
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="p-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:bg-white text-brand-dark"
                  placeholder="ZA4500123456"
                />
              </div>

              {/* Staff Signup Admin Bypass for ease of demonstration */}
              <div className="flex items-center space-x-2 pt-2 pb-1 bg-slate-50 p-2 rounded border border-dashed border-slate-200">
                <input
                  type="checkbox"
                  id="staff-check"
                  checked={isStaffRole}
                  onChange={(e) => setIsStaffRole(e.target.checked)}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <label htmlFor="staff-check" className="text-xs text-brand-blue font-bold cursor-pointer">
                  Register as Staff / Print Operator Account
                </label>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Email address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 pr-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:bg-white text-brand-dark"
                placeholder="sarah@corp.co.za"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:bg-white text-brand-dark"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-cyan hover:bg-brand-cyan/95 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              id="submit-auth-btn"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>{isLogin ? 'Sign In to Workspace' : 'Create Account'}</span>
              )}
            </button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400 font-mono">Or continue with</span>
          </div>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
          id="google-siginin-btn"
        >
          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign In with Google</span>
        </button>

        <div className="text-center mt-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-bold text-brand-cyan hover:underline"
            id="toggle-auth-btn"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

      </div>
    </div>
  );
}
