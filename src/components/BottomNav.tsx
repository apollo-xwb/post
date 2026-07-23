import React from 'react';
import { Monitor, ShoppingBag, Truck, FileText } from 'lucide-react';
import { UserProfile } from '../types';

interface BottomNavProps {
  currentView: 'customer' | 'tracker' | 'stationery' | 'staff';
  setCurrentView: (view: 'customer' | 'tracker' | 'stationery' | 'staff') => void;
  profile: UserProfile | null;
  onTapLogoTrigger?: () => void;
}

export default function BottomNav({ currentView, setCurrentView, profile, onTapLogoTrigger }: BottomNavProps) {
  return (
    <div className="fixed bottom-3 left-3 right-3 sm:hidden z-40 bg-slate-900/90 backdrop-blur-xl text-white rounded-2xl border border-white/20 shadow-2xl p-1.5 flex items-center justify-around ring-1 ring-black/10">
      <button
        onClick={() => setCurrentView('customer')}
        className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-xl transition-all duration-200 ${
          currentView === 'customer'
            ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 scale-102'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Monitor className="w-4 h-4" />
        <span className="text-[10px] mt-1 font-semibold">Print Jobs</span>
      </button>

      <button
        onClick={() => setCurrentView('tracker')}
        className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-xl transition-all duration-200 ${
          currentView === 'tracker'
            ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 scale-102'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Truck className="w-4 h-4" />
        <span className="text-[10px] mt-1 font-semibold">Track & Invoices</span>
      </button>

      <button
        onClick={() => setCurrentView('stationery')}
        className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-xl transition-all duration-200 ${
          currentView === 'stationery'
            ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 scale-102'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <ShoppingBag className="w-4 h-4" />
        <span className="text-[10px] mt-1 font-semibold">Stationery</span>
      </button>
    </div>
  );
}


