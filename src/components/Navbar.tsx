import React from 'react';
import { UserProfile } from '../types';
import { LogOut, User, ShieldCheck, Printer, FileText, BarChart3, Settings } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAuthTrigger: () => void;
}

export default function Navbar({ user, onLogout, activeTab, setActiveTab, onAuthTrigger }: NavbarProps) {
  const isInternal = user?.role === 'staff' || user?.role === 'admin';

  return (
    <nav className="bg-zinc-950 text-white border-b border-zinc-800 shadow-xl px-4 sm:px-6 py-2.5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo & Brand - Using direct URL as explicitly requested */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('job-builder')}>
          <div className="p-1 flex items-center justify-center">
            <img 
              src="https://wp.logos-download.com/wp-content/uploads/2021/01/Postnet_Logo-700x102.png" 
              alt="Postnet" 
              className="h-8 w-auto object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden sm:block text-left">
            <span className="font-extrabold tracking-widest text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-mono">
              PRINT OS
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Accessible to customers, guests, and administrative operators) */}
        <div className="flex items-center space-x-1 font-medium text-xs sm:text-sm">
          {!user || !isInternal ? (
            <>
              <button
                onClick={() => setActiveTab('job-builder')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeTab === 'job-builder'
                    ? 'bg-red-600 text-white font-extrabold shadow-md'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Configure Specs</span>
              </button>
              <button
                onClick={() => setActiveTab('order-tracker')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'order-tracker'
                    ? 'bg-zinc-900 text-red-600 border border-zinc-800 font-bold'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Track My Ticket</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('staff-queue')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'staff-queue'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-100" />
                <span>Job Operations Queue</span>
              </button>
              <button
                onClick={() => setActiveTab('staff-catalog')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'staff-catalog'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Specs Catalog</span>
              </button>
              <button
                onClick={() => setActiveTab('staff-reports')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'staff-reports'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Reports & Stats</span>
              </button>
            </>
          )}
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold font-mono tracking-tight text-red-500 uppercase">
                  {user.role} Profile
                </p>
                <p className="text-xs font-semibold text-zinc-300 truncate max-w-[120px]">
                  {user.name || user.email}
                </p>
              </div>
              
              <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 border border-zinc-700">
                <User className="h-3.5 w-3.5" />
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                title="Log Out"
                id="btn-logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthTrigger}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all shadow-md flex items-center space-x-1 border border-red-700 cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
