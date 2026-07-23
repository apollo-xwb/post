import React, { useEffect, useState } from 'react';
import PNXLogo from './PNXLogo';
import { ArrowRight, ShieldCheck, Cpu, Truck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('Initializing PostNet Core Engine...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(35);
      setStageText('Connecting IQ Retail API (Port 8080)...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(70);
      setStageText('Calibrating Pre-Press Bleed Engine...');
    }, 900);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStageText('PostNet Print OS Ready!');
    }, 1400);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col items-center justify-between p-8 overflow-hidden select-none animate-in fade-in duration-300">
      
      {/* Background Decorative Lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Bar */}
      <div className="w-full max-w-2xl flex justify-between items-center text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>BRANCH_TERMINAL_ONLINE</span>
        </div>
        <span>v2.4.0-PROD</span>
      </div>

      {/* Main Center Stage */}
      <div className="flex flex-col items-center text-center max-w-md w-full space-y-6 my-auto">
        <div className="scale-125 transform transition duration-500">
          <PNXLogo size="xl" showSubtitle={false} />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
            PostNet Print OS
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Pre-Press • IQ Retail • Express Logistics
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 w-full pt-2">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <Cpu className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <span className="text-[10px] font-semibold text-slate-300 block">Pre-Press Matrix</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <ShieldCheck className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <span className="text-[10px] font-semibold text-slate-300 block">IQ Sync (8080)</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <Truck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="text-[10px] font-semibold text-slate-300 block">PostNet Courier</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2 pt-4">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-sky-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>{stageText}</span>
            <span className="font-bold text-rose-400">{progress}%</span>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-4 text-xs font-semibold text-slate-400 hover:text-white underline underline-offset-4 transition flex items-center gap-1"
        >
          <span>Skip to Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer Credentials */}
      <div className="w-full max-w-2xl text-center text-[10px] text-slate-500 font-mono">
        © 2026 PostNet South Africa (Pty) Ltd. Official Franchise System.
      </div>

    </div>
  );
}
