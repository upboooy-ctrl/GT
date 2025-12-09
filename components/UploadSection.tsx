import React, { useState } from 'react';
import { Button } from './Button';
import { PowerUpType, SpecialId } from '../types';

interface UploadSectionProps {
  formData: {
    img1: string | null;
    img2: string | null;
    bulletImg: string | null;
    p1Name: string;
    p2Name: string;
    p1SpecialName: string;
    p2SpecialName: string;
    p1SpecialId: SpecialId;
    p2SpecialId: SpecialId;
    aimMode: 'MANUAL' | 'AUTO';
    initialHp: number;
    difficulty: number;
    bulletVelocity: number;
    selectedPowerUps: Set<PowerUpType>;
  };
  setFormData: (data: Partial<UploadSectionProps['formData']>) => void;
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
    bulletVelocity: number,
    difficulty: number
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
    formData,
    setFormData,
    onImagesReady, 
    onMultiplayerRequest, 
    coins, 
    unlockedAbilities, 
    onBuyAbility 
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: 'img1' | 'img2' | 'bulletImg') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size too large. Compressing...");
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Create an image to resize it for storage efficiency
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800; // Resize to max 800px width/height
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG 0.8
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            setFormData({ [key]: compressedBase64 });
            setError(null);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!formData.img1 && !DEFAULT_AVATAR_P1) { setError("Player 1 needs a face!"); return; }
    if (!formData.img2 && !DEFAULT_AVATAR_P2) { setError("Player 2 needs a face!"); return; }
    
    // Check if ability is locked
    if (!unlockedAbilities.includes(formData.p1SpecialId)) {
        setError(`Unlock ${POWER_OPTIONS.find(p => p.id === formData.p1SpecialId)?.label} first!`);
        return;
    }

    onImagesReady(
      formData.img1 || DEFAULT_AVATAR_P1,
      formData.img2 || DEFAULT_AVATAR_P2,
      formData.bulletImg,
      formData.p1SpecialName,
      formData.p2SpecialName,
      formData.p1SpecialId,
      formData.p2SpecialId,
      formData.p1Name,
      formData.p2Name,
      formData.aimMode,
      formData.initialHp,
      Array.from(formData.selectedPowerUps),
      formData.bulletVelocity,
      formData.difficulty
    );
  };

  const handleMultiplayer = () => {
      if (!formData.img1 && !DEFAULT_AVATAR_P1) { setError("Setup your player first!"); return; }
      if (!unlockedAbilities.includes(formData.p1SpecialId)) {
          setError(`Unlock ${POWER_OPTIONS.find(p => p.id === formData.p1SpecialId)?.label} first!`);
          return;
      }

      onMultiplayerRequest({
          imageSrc: formData.img1 || DEFAULT_AVATAR_P1,
          name: formData.p1Name || "Player 1",
          specialName: formData.p1SpecialName,
          specialId: formData.p1SpecialId,
          bulletImg: formData.bulletImg,
          bulletVelocity: formData.bulletVelocity
      });
  };

  const togglePowerUp = (type: PowerUpType) => {
      const newSet = new Set(formData.selectedPowerUps);
      if (newSet.has(type)) newSet.delete(type);
      else newSet.add(type);
      setFormData({ selectedPowerUps: newSet });
  };

  const attemptBuy = (id: SpecialId, price: number) => {
      if (onBuyAbility(id, price)) {
          setError(null); // Clear errors on success
      } else {
          setError("Not enough coins!");
      }
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center w-full h-full max-w-7xl gap-4 p-4 lg:p-8 animate-fade-in">
      
      {/* Left Column: Fighter Setup (65%) */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
          <div className="text-center space-y-2 mb-4 lg:mb-0">
            <h2 className="text-4xl lg:text-6xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg tracking-tight">
              LEGENDS OF GT
            </h2>
            <p className="text-slate-400 text-sm lg:text-base">Upload your fighters. Configure your destiny.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {/* Player 1 Upload */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-purple-500/30 backdrop-blur-sm transition-all hover:border-purple-500/60 shadow-xl group">
              <div className="relative w-full aspect-square mb-2 bg-slate-800 rounded-lg overflow-hidden border-2 border-dashed border-slate-600 group-hover:border-purple-500 transition-colors">
                {formData.img1 ? (
                  <img src={formData.img1} alt="P1" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                    <span className="text-xs font-medium">Upload P1</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'img1')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <input 
                type="text" 
                placeholder="Name" 
                value={formData.p1Name} 
                onChange={e => setFormData({ p1Name: e.target.value })} 
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:border-purple-500 outline-none"
              />
            </div>

            {/* Player 2 Upload */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-red-500/30 backdrop-blur-sm transition-all hover:border-red-500/60 shadow-xl group">
              <div className="relative w-full aspect-square mb-2 bg-slate-800 rounded-lg overflow-hidden border-2 border-dashed border-slate-600 group-hover:border-red-500 transition-colors">
                {formData.img2 ? (
                  <img src={formData.img2} alt="P2" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                    <span className="text-xs font-medium">Upload P2</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'img2')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <input 
                type="text" 
                placeholder="Name" 
                value={formData.p2Name} 
                onChange={e => setFormData({ p2Name: e.target.value })} 
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:border-red-500 outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg animate-bounce text-center text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
              <Button onClick={handleSubmit} className="flex-1 text-lg py-3 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                BATTLE
              </Button>
              <Button onClick={handleMultiplayer} variant="secondary" className="flex-1 py-3">
                 MULTIPLAYER
              </Button>
          </div>
      </div>

      {/* Right Column: Shop & Config (35%) - Persistent Sidebar */}
      <div className="w-full lg:w-96 bg-slate-900/90 border border-slate-700 rounded-xl p-4 lg:p-6 overflow-y-auto max-h-[80vh] custom-scrollbar shadow-2xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700">
             <h3 className="text-xl font-bold font-cinzel text-slate-200">The Armory</h3>
             <span className="text-yellow-400 font-mono text-sm">{coins} 🪙</span>
          </div>
          
          <div className="space-y-6">
              {/* Your Ability Shop */}
              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-2 block">Select Your Power</label>
                <div className="space-y-2">
                    {POWER_OPTIONS.map((opt) => {
                        const isLocked = !unlockedAbilities.includes(opt.id);
                        const isSelected = formData.p1SpecialId === opt.id;
                        return (
                            <div 
                                key={opt.id} 
                                className={`relative flex flex-col p-2 rounded border transition-all ${isSelected ? 'bg-purple-900/40 border-purple-500' : 'bg-slate-800 border-slate-700'} ${isLocked ? 'opacity-80' : 'cursor-pointer hover:bg-slate-700'}`}
                                onClick={() => !isLocked && setFormData({ p1SpecialId: opt.id, p1SpecialName: opt.label })}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`text-sm font-bold ${isSelected ? 'text-purple-300' : 'text-slate-300'}`}>{opt.label}</span>
                                    {isLocked && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); attemptBuy(opt.id, opt.price); }}
                                            className="bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow"
                                        >
                                            BUY {opt.price}
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">{opt.desc}</p>
                            </div>
                        );
                    })}
                </div>
              </div>

              {/* Game Settings */}
              <div className="space-y-3 pt-4 border-t border-slate-700">
                  <label className="text-xs uppercase font-bold text-slate-500 block">Enemy Config</label>
                  <select 
                        value={formData.p2SpecialId}
                        onChange={(e) => {
                            const val = e.target.value as SpecialId;
                            const label = POWER_OPTIONS.find(p => p.id === val)?.label || "";
                            setFormData({ p2SpecialId: val, p2SpecialName: label });
                        }}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:border-slate-400 outline-none"
                  >
                        {POWER_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                  
                  <div className="flex gap-2">
                       <div className="flex-1">
                           <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">HP</label>
                           <input type="number" value={formData.initialHp} onChange={e => setFormData({ initialHp: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" />
                       </div>
                       <div className="flex-1">
                           <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Diff</label>
                           <div className="flex gap-1">
                            {[1, 1.5, 2].map(d => (
                                <button 
                                    key={d}
                                    onClick={() => setFormData({ difficulty: d })}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded ${formData.difficulty === d ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                >
                                    {d === 1 ? 'NM' : d === 1.5 ? 'HD' : 'GD'}
                                </button>
                            ))}
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};