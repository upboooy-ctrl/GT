import React, { useEffect, useState } from 'react';
import { FighterData } from '../types';
import { Button } from './Button';

interface VersusScreenProps {
  p1: FighterData;
  p2: FighterData;
  onStartGame: () => void;
}

export const VersusScreen: React.FC<VersusScreenProps> = ({ p1, p2, onStartGame }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simple enter animation delay
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const StatBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="flex items-center gap-2 mb-1 w-full">
      <span className="w-16 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: ready ? `${Math.min(100, (value / max) * 100)}%` : '0%' }}
        />
      </div>
      <span className="w-8 text-xs font-mono text-right">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black font-cinzel text-white/5 select-none pointer-events-none">
        VS
      </div>

      <h2 className="text-3xl font-cinzel text-white mb-8 tracking-[0.2em] animate-pulse">BATTLE DATA ANALYZED</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl z-10">
        
        {/* Player 1 Card */}
        <div className={`transform transition-all duration-700 ${ready ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'} bg-slate-900/80 border border-purple-500/30 rounded-2xl overflow-hidden backdrop-blur-sm shadow-[0_0_50px_rgba(168,85,247,0.15)]`}>
          <div className="h-64 overflow-hidden relative group">
            <img src={p1.imageSrc} alt={p1.stats.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <h3 className="text-3xl font-black font-cinzel text-white leading-none">{p1.stats.name}</h3>
              <p className="text-purple-400 font-bold uppercase tracking-wider text-sm">{p1.stats.title}</p>
            </div>
          </div>
          <div className="p-6">
            <p className="italic text-slate-400 mb-6 text-sm border-l-2 border-purple-500 pl-3">"{p1.stats.quote}"</p>
            <StatBar label="HP" value={p1.stats.hp} max={150} color="bg-green-500" />
            <StatBar label="Power" value={p1.stats.power} max={10} color="bg-red-500" />
            <StatBar label="Speed" value={p1.stats.speed} max={10} color="bg-blue-500" />
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-500 uppercase">Special Move</span>
              <p className="font-bold text-lg text-purple-300">{p1.stats.specialMove}</p>
              <p className="text-xs text-slate-400 mt-1">{p1.stats.description}</p>
            </div>
          </div>
        </div>

        {/* Player 2 Card */}
        <div className={`transform transition-all duration-700 delay-100 ${ready ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'} bg-slate-900/80 border border-indigo-500/30 rounded-2xl overflow-hidden backdrop-blur-sm shadow-[0_0_50px_rgba(99,102,241,0.15)]`}>
          <div className="h-64 overflow-hidden relative group">
            <img src={p2.imageSrc} alt={p2.stats.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            <div className="absolute bottom-4 right-4 text-right">
              <h3 className="text-3xl font-black font-cinzel text-white leading-none">{p2.stats.name}</h3>
              <p className="text-indigo-400 font-bold uppercase tracking-wider text-sm">{p2.stats.title}</p>
            </div>
          </div>
          <div className="p-6">
            <p className="italic text-slate-400 mb-6 text-sm text-right border-r-2 border-indigo-500 pr-3">"{p2.stats.quote}"</p>
            <StatBar label="HP" value={p2.stats.hp} max={150} color="bg-green-500" />
            <StatBar label="Power" value={p2.stats.power} max={10} color="bg-red-500" />
            <StatBar label="Speed" value={p2.stats.speed} max={10} color="bg-blue-500" />
            <div className="mt-6 pt-4 border-t border-slate-800 text-right">
              <span className="text-xs text-slate-500 uppercase">Special Move</span>
              <p className="font-bold text-lg text-indigo-300">{p2.stats.specialMove}</p>
              <p className="text-xs text-slate-400 mt-1">{p2.stats.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-12 transition-opacity duration-1000 delay-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <Button onClick={onStartGame} className="text-2xl px-12 py-4 shadow-[0_0_40px_rgba(124,58,237,0.6)] animate-bounce-slow">
          ENTER ARENA
        </Button>
      </div>
    </div>
  );
};
