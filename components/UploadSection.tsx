import React, { useState } from 'react';
import { Button } from './Button';
import { PowerUpType, SpecialId } from '../types';

interface UploadSectionProps {
  onImagesReady: (
    img1: string, 
    img2: string, 
    bulletImg: string | null, 
    p1SpecialName: string, 
    p2SpecialName: string,
    p1SpecialId: SpecialId,
    p2SpecialId: SpecialId,
    p1Name: string,
    p2Name: string,
    aimMode: 'MANUAL' | 'AUTO',
    initialHp: number,
    allowedPowerUps: PowerUpType[],
    bulletVelocity: number
  ) => void;
  onMultiplayerRequest: (p1Data: any) => void;
  coins: number;
  unlockedAbilities: SpecialId[];
  onBuyAbility: (id: SpecialId, cost: number) => boolean;
}

const DEFAULT_AVATAR_P1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSJub25lIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZDEiIHgxPSIwIiB5MT0iMCIgeDI9IjIwMCIgeTI9IjIwMCI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNDcyYjYiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2RiMjdlNyIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQxKSIgcng9IjIwIiAvPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI1MCIgZmlsbD0iIzFmMjkzNyIgLz4KICA8cGF0aCBkPSJNMTAwIDE0MCBDNjAgMTQwIDMwIDIwMCAzMCAyMDAgTDE3MCAyMDAgQzE3MCAyMDAgMTQwIDE0MCAxMDAgMTQwIFoiIGZpbGw9IiMxZjI5MzciIC8+CiAgPGNpcmNsZSBjeT0iODAiIGN5PSI3MCIgcj0iNSIgZmlsbD0iI2ZmZmZmZiIgLz4KICA8Y2lyY2xlIGN4PSIxMjAiIGN5PSI3MCIgcj0iNSIgZmlsbD0iI2ZmZmZmZiIgLz4KICA8cGF0aCBkPSJNNzAgMTAwIFExMDAgMTMwIDEzMCAxMDAiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiAvPgo8L3N2Zz4=";

const DEFAULT_AVATAR_P2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSJub25lIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZDIiIHgxPSIwIiB5MT0iMCIgeDI9IjIwMCIgeTI9IjIwMCI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwNjRZTNiIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMjJjMjIiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idXJsKCNncmFkMikiIHJ4PSIyMCIgLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiIGZpbGw9IiMxZjI5MzciIC8+CiAgPHBhdGggZD0iTTEwMCAxNDAgQzYwIDE0MCAzMCAyMDAgMzAgMjAwIEwxNzAgMjAwIEMxNzAgMjAwIDE0MCAxNDAgMTAwIDE0MCBaIiBmaWxsPSIjMWYyOTM3IiAvPgogIDxjaXJjbGUgY3g9IjgwIiBjeT0iNzAiIHI9IjUiIGZpbGw9IiNmY2E1YTUiIC8+CiAgPGNpcmNsZSBjeT0iMTIwIiBjeT0iNzAiIHI9IjUiIGZpbGw9IiNmY2E1YTUiIC8+CiAgPHBhdGggZD0iTTcwIDEwMCBRMTAwIDkwIDEzMCAxMDAiIHN0cm9rZT0iI2ZjYTVhNSIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiAvPgo8L3N2Zz4=";

const POWER_OPTIONS: {id: SpecialId, label: string, desc: string, price: number}[] = [
    { id: 'GMASTI', label: 'Gmasti (Fireball)', desc: 'Shoots a massive fireball. Simple, high damage.', price: 0 },
    { id: '6FTBADDIE', label: '6Ft Baddie (Ice)', desc: 'Fires an Ice Bolt. Freezes and slows the opponent.', price: 100 },
    { id: 'ROHANMOB', label: 'Rohan Mob (Shield)', desc: 'White Shield: Grants Total Invulnerability for 5s.', price: 200 },
    { id: 'LAMBARDAAR', label: 'Lambardaar (Giant)', desc: 'HEALS 50 HP + Giant Size + 1.25x Damage.', price: 300 },
    { id: 'SINGH', label: 'Singh (Tuff)', desc: 'Immortal Will: 90% Dmg Reduc + 2x Dmg + Regen.', price: 400 },
    { id: 'ABHAY', label: 'Abhay (Magnet)', desc: 'Gravity Well: Pulls opponent in & deals contact dmg.', price: 500 },
    { id: 'MANAN', label: 'Manan (Curse)', desc: 'Beam Attack. Curses Enemy (-10HP/s). You Shrink.', price: 600 },
    { id: 'PAL', label: 'Pal (Lovely)', desc: 'Peace Mode. No damage dealt. Both players Heal.', price: 700 },
    { id: 'GT_MODE', label: 'GT Mode (Ultimate)', desc: 'UNLEASHED: Rapid Fire + 3-Way Shot + 2x Speed.', price: 800 },
    { id: 'SONI', label: 'Soni (God Mode)', desc: 'BROKEN: Touch=1/2 HP + Void Beam + God Mode.', price: 1000 },
];

export const UploadSection: React.FC<UploadSectionProps> = ({ 
    onImagesReady, 
    onMultiplayerRequest, 
    coins, 
    unlockedAbilities, 
    onBuyAbility 
}) => {
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);
  const [bulletImg, setBulletImg] = useState<string | null>(null);
  
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p1SpecialName, setP1SpecialName] = useState("GMASTI");
  const [p2SpecialName, setP2SpecialName] = useState("6FTBADDIE");
  
  const [p1SpecialId, setP1SpecialId] = useState<SpecialId>('GMASTI');
  const [p2SpecialId, setP2SpecialId] = useState<SpecialId>('6FTBADDIE');

  const [aimMode, setAimMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [initialHp, setInitialHp] = useState(150);
  const [difficulty, setDifficulty] = useState(1);
  const [bulletVelocity, setBulletVelocity] = useState(12); // Default 12
  const [selectedPowerUps, setSelectedPowerUps] = useState<Set<PowerUpType>>(new Set(['HEAL', 'SPEED', 'POWER', 'BLACK_HOLE']));
  
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large. Keep it under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleDefaultP1 = () => {
    setImg1(DEFAULT_AVATAR_P1);
    setP1Name("KUNAL THE BDAY BADDIE");
    setP1SpecialName("CAKE SMASH");
    setP1SpecialId('GMASTI');
    setError(null);
  };

  const handleDefaultP2 = () => {
    setImg2(DEFAULT_AVATAR_P2);
    setP2Name("GT ka DALAL");
    setP2SpecialName("SCAM 2025");
    setP2SpecialId('SONI');
    setError(null);
  };

  const togglePowerUp = (type: PowerUpType) => {
      const newSet = new Set(selectedPowerUps);
      if (newSet.has(type)) {
          newSet.delete(type);
      } else {
          newSet.add(type);
      }
      setSelectedPowerUps(newSet);
  };

  const isAbilityLocked = (id: SpecialId) => !unlockedAbilities.includes(id);

  const handleStartWithDifficulty = () => {
      if(isAbilityLocked(p1SpecialId)) {
          setError(`Unlock Player 1's ability (${p1SpecialId}) first!`);
          return;
      }

      if (img1 && img2) {
          // @ts-ignore
          onImagesReady(img1, img2, bulletImg, p1SpecialName, p2SpecialName, p1SpecialId, p2SpecialId, p1Name, p2Name, aimMode, initialHp, Array.from(selectedPowerUps), bulletVelocity, difficulty);
      } else {
          setError("Please choose fighters for both slots.");
      }
  }

  const handlePlayOnline = () => {
      if(isAbilityLocked(p1SpecialId)) {
          setError(`Unlock your ability (${p1SpecialId}) first!`);
          return;
      }

      if (!img1) {
          setError("Please upload YOUR fighter (Player 1) to play online.");
          return;
      }
      
      const p1Data = {
          imageSrc: img1,
          name: p1Name,
          specialName: p1SpecialName,
          specialId: p1SpecialId,
          bulletImg,
          bulletVelocity
      };
      
      onMultiplayerRequest(p1Data);
  };

  const attemptBuy = (id: SpecialId) => {
      const opt = POWER_OPTIONS.find(o => o.id === id);
      if(!opt) return;
      
      const success = onBuyAbility(id, opt.price);
      if (!success) {
          setError(`Not enough coins! Need ${opt.price}, have ${coins}.`);
      } else {
          setError(null);
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-6xl mx-auto p-6 animate-fade-in pb-20">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-6xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-4 drop-shadow-lg">
          CHOOSE YOUR LEGENDS
        </h2>
        <p className="text-slate-400 text-lg">Customize your warriors and enter the arena.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-10 items-start">
        {/* Player 1 Input */}
        <div className="flex flex-col gap-4">
            <div className="group relative bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center transition-all hover:border-purple-500 hover:bg-slate-900/80 aspect-square">
            {img1 ? (
                <div className="relative w-full h-full">
                <img src={img1} alt="Player 1" className="w-full h-full object-cover rounded-lg shadow-2xl" />
                <button 
                    onClick={() => setImg1(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                >
                    ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-sm font-bold text-purple-400">PLAYER 1</div>
                </div>
            ) : (
                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, setImg1)}
                />
                <div className="w-16 h-16 mb-2 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-slate-300 font-bold text-sm">Upload Player 1</span>
                </label>
            )}
            </div>
            {!img1 && (
                <button onClick={handleDefaultP1} className="text-xs text-purple-400 hover:text-purple-300 underline uppercase tracking-wide -mt-2">
                    Use Default: Kunal
                </button>
            )}
            <div className="flex flex-col gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Name (Optional)</label>
                    <input 
                        type="text" 
                        value={p1Name} 
                        onChange={(e) => setP1Name(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:border-purple-500 focus:outline-none placeholder-slate-600"
                        placeholder="Enter P1 Name..."
                        maxLength={25}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                        <span>Special Power Type</span>
                        {isAbilityLocked(p1SpecialId) && <span className="text-red-400">🔒 LOCKED</span>}
                    </label>
                    <select 
                        value={p1SpecialId} 
                        onChange={(e) => {
                            setP1SpecialId(e.target.value as SpecialId);
                            const opt = POWER_OPTIONS.find(o => o.id === e.target.value);
                            if(opt) setP1SpecialName(opt.label.split(' (')[0]);
                        }}
                        className={`bg-slate-800 border rounded p-2 text-white text-sm focus:outline-none ${isAbilityLocked(p1SpecialId) ? 'border-red-500 text-red-100' : 'border-slate-600 focus:border-purple-500'}`}
                    >
                        {POWER_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>
                                {isAbilityLocked(opt.id) ? `🔒 ${opt.label} (${opt.price})` : `✅ ${opt.label}`}
                            </option>
                        ))}
                    </select>
                    
                    {isAbilityLocked(p1SpecialId) && (
                        <div className="mt-1">
                            <button 
                                onClick={() => attemptBuy(p1SpecialId)}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold py-1 px-2 rounded flex items-center justify-center gap-2"
                            >
                                <span>🛒 Unlock for {POWER_OPTIONS.find(o=>o.id===p1SpecialId)?.price}</span>
                            </button>
                        </div>
                    )}
                    
                     <p className="text-[10px] text-slate-400 italic leading-tight mt-1">{POWER_OPTIONS.find(o => o.id === p1SpecialId)?.desc}</p>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Move Name</label>
                    <input 
                        type="text" 
                        value={p1SpecialName} 
                        onChange={(e) => setP1SpecialName(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:border-purple-500 focus:outline-none placeholder-slate-500"
                        maxLength={15}
                    />
                </div>
            </div>
        </div>

         {/* Center Settings */}
         <div className="flex flex-col gap-4 md:mt-0">
             {/* Custom Bullet */}
            <div className="group relative bg-slate-900/30 border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center transition-all hover:border-yellow-500 hover:bg-slate-900/50 aspect-square h-32 w-full md:w-40 mx-auto">
                {bulletImg ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                    <img src={bulletImg} alt="Bullet" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                    <button 
                        onClick={() => setBulletImg(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors w-6 h-6 flex items-center justify-center"
                    >
                        ✕
                    </button>
                    </div>
                ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, setBulletImg)}
                    />
                    <div className="w-8 h-8 mb-2 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="text-slate-400 font-bold text-[10px] text-center">Custom Bullet</span>
                    </label>
                )}
            </div>

            {/* Bullet Velocity Slider */}
             <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase text-center flex justify-between">
                    <span>Bullet Velocity</span>
                    <span className="text-yellow-400">{bulletVelocity}</span>
                 </label>
                 <input 
                    type="range" 
                    min="5" 
                    max="25" 
                    value={bulletVelocity} 
                    onChange={(e) => setBulletVelocity(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                 />
                 <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                     <span>Slow</span>
                     <span>Fast</span>
                     <span>Hyper</span>
                 </div>
            </div>

            {/* Difficulty */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase text-center">Difficulty</label>
                 <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(parseFloat(e.target.value))}
                    className="bg-slate-800 border border-slate-600 rounded p-1 text-white text-[10px] focus:outline-none"
                 >
                     <option value={0.5}>EASY (50% Boss Dmg)</option>
                     <option value={1.0}>NORMAL</option>
                     <option value={1.5}>HARD (1.5x Boss Dmg)</option>
                     <option value={2.0}>GOD (2x Boss Dmg)</option>
                 </select>
            </div>

            {/* HP Selection */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase text-center">Initial HP</label>
                 <div className="flex justify-between gap-1">
                     {[100, 200, 300, 500].map(hp => (
                         <button
                            key={hp}
                            onClick={() => setInitialHp(hp)}
                            className={`flex-1 py-1 text-[10px] font-bold rounded transition-all ${initialHp === hp ? 'bg-green-600 text-white shadow' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                         >
                             {hp}
                         </button>
                     ))}
                 </div>
            </div>

            {/* Aim Mode Toggle */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase text-center">Aim Mode</label>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setAimMode('MANUAL')}
                        className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${aimMode === 'MANUAL' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Mouse
                    </button>
                    <button 
                        onClick={() => setAimMode('AUTO')}
                        className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${aimMode === 'AUTO' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Auto
                    </button>
                </div>
            </div>

             {/* PowerUps Toggle */}
             <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase text-center">Power Ups</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'HEAL', label: 'Heal', color: 'text-green-400' },
                        { id: 'SPEED', label: 'Speed', color: 'text-blue-400' },
                        { id: 'POWER', label: 'Power', color: 'text-red-400' },
                        { id: 'BLACK_HOLE', label: 'Void', color: 'text-purple-400' },
                    ].map((p) => (
                         <button 
                            key={p.id}
                            onClick={() => togglePowerUp(p.id as PowerUpType)}
                            className={`py-1 px-2 text-[10px] font-bold uppercase rounded border transition-all flex items-center justify-center gap-1
                                ${selectedPowerUps.has(p.id as PowerUpType) 
                                    ? `bg-slate-800 border-slate-600 ${p.color} opacity-100` 
                                    : 'bg-slate-900/50 border-slate-800 text-slate-600 opacity-50'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${selectedPowerUps.has(p.id as PowerUpType) ? 'bg-current' : 'bg-slate-700'}`}></span>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Player 2 Input */}
        <div className="flex flex-col gap-4">
            <div className="group relative bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center transition-all hover:border-indigo-500 hover:bg-slate-900/80 aspect-square">
            {img2 ? (
                <div className="relative w-full h-full">
                <img src={img2} alt="Player 2" className="w-full h-full object-cover rounded-lg shadow-2xl" />
                <button 
                    onClick={() => setImg2(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                >
                    ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-sm font-bold text-indigo-400">PLAYER 2</div>
                </div>
            ) : (
                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, setImg2)}
                />
                <div className="w-16 h-16 mb-2 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-slate-300 font-bold text-sm">Upload Player 2</span>
                </label>
            )}
            </div>
             {!img2 && (
                <button onClick={handleDefaultP2} className="text-xs text-indigo-400 hover:text-indigo-300 underline uppercase tracking-wide -mt-2">
                    Use Default: GT
                </button>
            )}
             <div className="flex flex-col gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Name (Optional)</label>
                    <input 
                        type="text" 
                        value={p2Name} 
                        onChange={(e) => setP2Name(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                        placeholder="Enter P2 Name..."
                        maxLength={25}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Special Power Type</label>
                     <select 
                        value={p2SpecialId} 
                        onChange={(e) => {
                            setP2SpecialId(e.target.value as SpecialId);
                             const opt = POWER_OPTIONS.find(o => o.id === e.target.value);
                             if(opt) setP2SpecialName(opt.label.split(' (')[0]);
                        }}
                        className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        {POWER_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400 italic leading-tight mt-1">{POWER_OPTIONS.find(o => o.id === p2SpecialId)?.desc}</p>
                </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Move Name</label>
                    <input 
                        type="text" 
                        value={p2SpecialName} 
                        onChange={(e) => setP2SpecialName(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-500"
                        maxLength={15}
                    />
                </div>
            </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-500/50 rounded text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={handleStartWithDifficulty} disabled={!img1 || !img2 || !!error} className="w-full md:w-auto text-xl py-4 flex-1">
            Play Local 1v1
        </Button>
        <Button onClick={handlePlayOnline} disabled={!img1 || !!error} variant="secondary" className="w-full md:w-auto text-xl py-4 flex-1 border-blue-500 text-blue-300">
            Play Online (Multiplayer)
        </Button>
      </div>
    </div>
  );
};