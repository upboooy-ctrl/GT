
import React, { useState, useEffect, useRef } from 'react';
import { UploadSection } from './components/UploadSection';
import { VersusScreen } from './components/VersusScreen';
import { GameCanvas } from './components/GameCanvas';
import { analyzeFighters } from './services/geminiService';
import { AppState, FighterData, GameResult, PowerUpType, SpecialId, MultiplayerConfig } from './types';
import { Button } from './components/Button';

// Initial Form State
const INITIAL_FORM_DATA = {
    img1: null as string | null,
    img2: null as string | null,
    bulletImg: null as string | null,
    p1Name: "",
    p2Name: "",
    p1SpecialName: "GMASTI",
    p2SpecialName: "6FTBADDIE",
    p1SpecialId: 'GMASTI' as SpecialId,
    p2SpecialId: '6FTBADDIE' as SpecialId,
    aimMode: 'MANUAL' as 'MANUAL' | 'AUTO',
    initialHp: 150,
    difficulty: 1,
    bulletVelocity: 12,
    selectedPowerUps: new Set(['HEAL', 'SPEED', 'POWER', 'BLACK_HOLE']) as Set<PowerUpType>
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  
  // Persistent Form Data
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [p1Data, setP1Data] = useState<FighterData | null>(null);
  const [p2Data, setP2Data] = useState<FighterData | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [loadingText, setLoadingText] = useState("Summoning the spirits...");
  const [gameId, setGameId] = useState(0); 
  
  // Economy State
  const [coins, setCoins] = useState<number>(0);
  const [unlockedAbilities, setUnlockedAbilities] = useState<SpecialId[]>(['GMASTI']); // Default unlocked

  // Multiplayer State
  const [mpConfig, setMpConfig] = useState<MultiplayerConfig | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [peerStatus, setPeerStatus] = useState<string>('');
  const peerRef = useRef<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [localP1DataForMp, setLocalP1DataForMp] = useState<any>(null);

  // Initial Cleanup & Load Data
  useEffect(() => {
    // Load Coins and Unlocked items
    const savedCoins = localStorage.getItem('gt_legends_coins');
    const savedAbilities = localStorage.getItem('gt_legends_abilities');
    const savedFormData = localStorage.getItem('gt_legends_form_data');

    if (savedCoins) setCoins(parseInt(savedCoins));
    else setCoins(100); // Starter bonus

    if (savedAbilities) setUnlockedAbilities(JSON.parse(savedAbilities));
    else setUnlockedAbilities(['GMASTI']);

    if (savedFormData) {
        try {
            const parsed = JSON.parse(savedFormData);
            // Rehydrate Set for selectedPowerUps
            if (parsed.selectedPowerUps) {
                parsed.selectedPowerUps = new Set(parsed.selectedPowerUps);
            }
            setFormData(prev => ({ ...prev, ...parsed }));
        } catch(e) {
            console.error("Failed to load saved form data", e);
        }
    }

    return () => {
        if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Save Data on Change
  useEffect(() => {
      localStorage.setItem('gt_legends_coins', coins.toString());
      localStorage.setItem('gt_legends_abilities', JSON.stringify(unlockedAbilities));
  }, [coins, unlockedAbilities]);

  // Save Form Data on Change (Debounced)
  useEffect(() => {
      const timer = setTimeout(() => {
        try {
            const toSave = { ...formData, selectedPowerUps: Array.from(formData.selectedPowerUps) };
            localStorage.setItem('gt_legends_form_data', JSON.stringify(toSave));
        } catch (e) {
            console.warn("Storage quota exceeded. Cannot save images as default.", e);
        }
      }, 1000);
      return () => clearTimeout(timer);
  }, [formData]);

  const handleBuyAbility = (id: SpecialId, cost: number) => {
      if (coins >= cost && !unlockedAbilities.includes(id)) {
          setCoins(prev => prev - cost);
          setUnlockedAbilities(prev => [...prev, id]);
          return true;
      }
      return false;
  };

  const handleUpdateForm = (updates: Partial<typeof INITIAL_FORM_DATA>) => {
      setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleImagesReady = async (
    img1: string, 
    img2: string, 
    bulletImg: string | null, 
    p1Special: string, 
    p2Special: string, 
    p1SpecialId: SpecialId,
    p2SpecialId: SpecialId,
    p1Name: string,
    p2Name: string,
    mode: 'MANUAL' | 'AUTO',
    initialHp: number,
    powerUps: PowerUpType[],
    velocity: number,
    diff: number
  ) => {
    // Save state implicitly via handleUpdateForm called in UploadSection, but ensuring here
    setAppState(AppState.ANALYZING);
    setLoadingText("Analyzing Bio-Data...");
    
    try {
      const stats = await analyzeFighters(img1, img2);
      
      // Override data with user input if provided
      if (p1Special) stats.player1.specialMove = p1Special;
      if (p2Special) stats.player2.specialMove = p2Special;
      if (p1Name) stats.player1.name = p1Name;
      if (p2Name) stats.player2.name = p2Name;

      // Force Selected HP
      stats.player1.hp = initialHp;
      stats.player2.hp = initialHp;

      setP1Data({
        id: 'player1',
        imageSrc: img1,
        stats: stats.player1,
        specialId: p1SpecialId
      });
      
      setP2Data({
        id: 'player2',
        imageSrc: img2,
        stats: stats.player2,
        specialId: p2SpecialId
      });

      setAppState(AppState.VERSUS);
    } catch (e) {
      console.error(e);
      setAppState(AppState.UPLOAD);
      alert("The ritual failed (Analysis Error). Try again.");
    }
  };

  const handleStartGame = () => {
    setAppState(AppState.PLAYING);
  };

  const handleGameOver = (result: GameResult) => {
    setGameResult(result);
    setAppState(AppState.GAME_OVER);
    
    // Award Coins
    let earned = 0;
    if (result.winner?.id === 'player1') {
        earned = 100 * formData.difficulty; // More coins for harder difficulties
    } else {
        earned = 25; // Participation trophy
    }
    
    setCoins(prev => prev + Math.floor(earned));
  };

  const handleReset = () => {
    // Keep formData (images, settings) intact!
    setAppState(AppState.UPLOAD);
    setP1Data(null);
    setP2Data(null);
    setGameResult(null);
    setGameId(0);
    setMpConfig(null);
    if(peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
    }
  };

  const handleRematch = () => {
    setGameId(prev => prev + 1); 
    setGameResult(null);
    setAppState(AppState.PLAYING);
  };

  // --- Multiplayer Logic ---

  const initPeer = () => {
      if (peerRef.current) return;
      const Peer = (window as any).Peer;
      if(!Peer) { alert("PeerJS not loaded"); return; }
      
      const peer = new Peer(null, { debug: 2 });
      peerRef.current = peer;

      peer.on('open', (id: string) => {
          setMyPeerId(id);
          setPeerStatus('Connected to Server. Ready to Host or Join.');
      });

      peer.on('connection', (conn: any) => {
          handleConnection(conn, true);
      });

      peer.on('error', (err: any) => {
          setPeerStatus('Error: ' + err.type);
      });
  };

  const handleMultiplayerRequest = (p1Data: any) => {
      setLocalP1DataForMp(p1Data);
      setAppState(AppState.LOBBY);
      initPeer();
  };

  const hostGame = () => {
      setIsHost(true);
      setPeerStatus('Waiting for opponent... Share your ID: ' + myPeerId);
  };

  const joinGame = () => {
      if (!remotePeerId) return;
      setPeerStatus('Connecting to ' + remotePeerId + '...');
      const conn = peerRef.current.connect(remotePeerId);
      handleConnection(conn, false);
  };

  const handleConnection = (conn: any, hosting: boolean) => {
      conn.on('open', () => {
          setPeerStatus(hosting ? 'Opponent Connected! Exchanging Data...' : 'Connected! Sending Fighter Data...');
          setMpConfig({ isMultiplayer: true, role: hosting ? 'HOST' : 'CLIENT', conn });
          
          if (!hosting) {
             conn.send({
                 type: 'HANDSHAKE_CLIENT_DATA',
                 payload: localP1DataForMp
             });
          }
      });

      conn.on('data', async (data: any) => {
          if (data.type === 'HANDSHAKE_CLIENT_DATA' && hosting) {
              const clientData = data.payload;
              const hostData = localP1DataForMp;

              setLoadingText("Syncing Dimensions...");
              setAppState(AppState.ANALYZING);

              try {
                  const stats = await analyzeFighters(hostData.imageSrc, clientData.imageSrc);
                  
                  stats.player1.name = hostData.name || stats.player1.name;
                  stats.player1.specialMove = hostData.specialName || stats.player1.specialMove;
                  
                  stats.player2.name = clientData.name || stats.player2.name;
                  stats.player2.specialMove = clientData.specialName || stats.player2.specialMove;
                  
                  stats.player1.hp = 200;
                  stats.player2.hp = 200;

                  const p1Obj: FighterData = { id: 'player1', imageSrc: hostData.imageSrc, stats: stats.player1, specialId: hostData.specialId };
                  const p2Obj: FighterData = { id: 'player2', imageSrc: clientData.imageSrc, stats: stats.player2, specialId: clientData.specialId };

                  setP1Data(p1Obj);
                  setP2Data(p2Obj);
                  // Update form data to match session
                  handleUpdateForm({ bulletImg: hostData.bulletImg, bulletVelocity: hostData.bulletVelocity, difficulty: 1 });

                  conn.send({
                      type: 'HANDSHAKE_START_GAME',
                      payload: { p1: p1Obj, p2: p2Obj, bulletImg: hostData.bulletImg, bulletVelocity: hostData.bulletVelocity }
                  });

                  setAppState(AppState.PLAYING);
              } catch(e) { console.error(e); }

          } else if (data.type === 'HANDSHAKE_START_GAME' && !hosting) {
              const { p1, p2, bulletImg, bulletVelocity } = data.payload;
              setP1Data(p1);
              setP2Data(p2);
              handleUpdateForm({ bulletImg, bulletVelocity, difficulty: 1 });
              setAppState(AppState.PLAYING);
          }
      });
      
      conn.on('close', () => {
          alert("Connection Lost");
          handleReset();
      });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none">
        <h1 className="text-xl font-bold font-cinzel text-white/80 tracking-widest pointer-events-auto shadow-black drop-shadow-md">
          LEGENDS <span className="text-purple-500">OF</span> GT
        </h1>
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur border border-yellow-500/30 px-4 py-1 rounded-full flex items-center gap-2 shadow-lg">
            <span className="text-yellow-400 text-lg">🪙</span>
            <span className="font-bold font-mono text-yellow-100">{coins}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen pt-16">
        
        {appState === AppState.UPLOAD && (
          <UploadSection 
            formData={formData}
            setFormData={handleUpdateForm}
            onImagesReady={handleImagesReady} 
            onMultiplayerRequest={handleMultiplayerRequest} 
            coins={coins}
            unlockedAbilities={unlockedAbilities}
            onBuyAbility={handleBuyAbility}
          />
        )}

        {appState === AppState.LOBBY && (
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl max-w-lg w-full text-center shadow-2xl animate-fade-in">
                <h2 className="text-3xl font-cinzel text-blue-400 mb-6">MULTIPLAYER LOBBY</h2>
                <div className="mb-6 p-4 bg-black/40 rounded font-mono text-sm text-yellow-500 break-all border border-slate-800">
                    STATUS: {peerStatus}
                </div>
                {!isHost && !mpConfig && (
                    <div className="flex flex-col gap-4">
                        <Button onClick={hostGame} className="w-full">HOST GAME (Create Room)</Button>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Enter Host ID" 
                                value={remotePeerId}
                                onChange={e => setRemotePeerId(e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            />
                            <Button onClick={joinGame} variant="secondary">JOIN</Button>
                        </div>
                    </div>
                )}
                 {isHost && !mpConfig && (
                     <div className="flex flex-col gap-4">
                         <div className="bg-slate-800 p-4 rounded border border-purple-500">
                             <p className="text-xs text-slate-400 mb-2">YOUR ROOM ID</p>
                             <p className="text-2xl font-bold text-white tracking-widest select-all cursor-pointer" onClick={() => navigator.clipboard.writeText(myPeerId)}>{myPeerId}</p>
                         </div>
                         <p className="text-slate-500 text-sm animate-pulse">Waiting for challenger to join...</p>
                         <Button onClick={() => { setIsHost(false); setPeerStatus("Ready"); }} variant="secondary">Cancel</Button>
                     </div>
                 )}
                 <Button onClick={handleReset} variant="danger" className="mt-8 text-sm py-2">Back to Menu</Button>
            </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center space-y-8 animate-pulse">
            <div className="w-24 h-24 border-4 border-t-purple-500 border-r-indigo-500 border-b-purple-900 border-l-indigo-900 rounded-full animate-spin"></div>
            <p className="text-2xl font-cinzel text-purple-200">{loadingText}</p>
          </div>
        )}

        {appState === AppState.VERSUS && p1Data && p2Data && (
          <VersusScreen p1={p1Data} p2={p2Data} onStartGame={handleStartGame} />
        )}

        {appState === AppState.PLAYING && p1Data && p2Data && (
          <GameCanvas 
            key={gameId} 
            p1={p1Data} 
            p2={p2Data} 
            customBullet={formData.bulletImg}
            onGameOver={handleGameOver} 
            onExit={handleReset}
            aimMode={formData.aimMode}
            allowedPowerUps={Array.from(formData.selectedPowerUps)}
            bulletVelocity={formData.bulletVelocity}
            difficulty={formData.difficulty}
            multiplayer={mpConfig}
          />
        )}

        {appState === AppState.GAME_OVER && gameResult && (
          <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl mx-4 z-10">
            <h2 className="text-6xl font-black font-cinzel text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {gameResult.winner ? "VICTORY" : "DRAW"}
            </h2>
            <p className="text-3xl font-bold text-red-500 font-cinzel mb-4 tracking-wider uppercase drop-shadow-md">
                GT Ki Maa Kunal
            </p>
            <p className="text-xl text-purple-300 mb-6">{gameResult.message}</p>
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-lg flex flex-col items-center gap-1 animate-bounce-slow">
                <span className="text-yellow-400 font-bold uppercase text-xs tracking-widest">Rewards</span>
                <span className="text-3xl font-mono font-bold text-white flex items-center gap-2">
                    +{gameResult.winner?.id === 'player1' ? (100 * formData.difficulty) : 25} 🪙
                </span>
            </div>
            {gameResult.winner && (
               <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 blur-xl opacity-50 rounded-full"></div>
                  <img src={gameResult.winner.imageSrc} alt="Winner" className="w-40 h-40 object-cover rounded-full border-4 border-yellow-400 relative z-10 shadow-2xl" />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold px-4 py-1 rounded-full text-xs uppercase z-20 whitespace-nowrap">
                    The Legend
                  </div>
               </div>
            )}
            <div className="flex gap-4">
                <Button onClick={handleRematch} className="bg-gradient-to-r from-green-600 to-emerald-600 border-green-400/30 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                    Rematch
                </Button>
                <Button onClick={handleReset} variant="secondary">
                    New Battle (Shop)
                </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
