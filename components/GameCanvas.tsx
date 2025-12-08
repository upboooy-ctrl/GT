import React, { useEffect, useRef, useState } from 'react';
import { FighterData, GameResult, PowerUpType, SpecialId } from '../types';

interface GameCanvasProps {
  p1: FighterData;
  p2: FighterData;
  customBullet: string | null;
  onGameOver: (result: GameResult) => void;
  aimMode: 'MANUAL' | 'AUTO';
  allowedPowerUps: PowerUpType[];
  bulletVelocity: number;
}

interface PowerUp {
    x: number;
    y: number;
    type: PowerUpType;
    radius: number;
    life: number;
    rotation: number;
}

interface ActiveEffect {
    type: PowerUpType | 'FREEZE' | 'SHIELD' | 'GIANT' | 'TOUGH' | 'GOLD_MODE' | 'LOVELY';
    duration: number; // frames
}

interface BlackHole {
    x: number;
    y: number;
    life: number;
    owner: 'p1' | 'p2'; // Who spawned it
}

interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    vy: number;
    size: 'small' | 'large';
}

interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    owner: 'p1' | 'p2';
    dmg: number;
    size: number;
    color: string;
    isSpecial?: boolean;
    logicType?: 'FIRE' | 'ICE'; 
    img?: HTMLImageElement;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
    isHeart?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ p1, p2, customBullet, onGameOver, aimMode, allowedPowerUps, bulletVelocity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [p1Health, setP1Health] = useState(p1.stats.hp);
  const [p2Health, setP2Health] = useState(p2.stats.hp);
  const [p1Special, setP1Special] = useState(0); 
  const [p2Special, setP2Special] = useState(0); 
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  
  // Game State Refs
  const gameState = useRef({
    p1: { 
        x: 100, y: 300, 
        hp: p1.stats.hp, maxHp: p1.stats.hp, 
        vx: 0, vy: 0, 
        cooldown: 0, 
        img: new Image(), 
        radius: 40, 
        baseRadius: 40,
        baseSpeed: 3 + ((p1.stats.speed || 5) * 0.3), speed: 3 + ((p1.stats.speed || 5) * 0.3), 
        effects: [] as ActiveEffect[],
        hitFlash: 0,
        specialCharge: 0
    },
    p2: { 
        x: 700, y: 300, 
        hp: p2.stats.hp, maxHp: p2.stats.hp, 
        vx: 0, vy: 0, 
        cooldown: 0, 
        img: new Image(), 
        radius: 45, 
        baseRadius: 45,
        baseSpeed: 2 + ((p2.stats.speed || 5) * 0.2), speed: 2 + ((p2.stats.speed || 5) * 0.2), 
        phase: 0, 
        effects: [] as ActiveEffect[],
        hitFlash: 0,
        specialCharge: 0
    },
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    powerups: [] as PowerUp[],
    blackHoles: [] as BlackHole[],
    texts: [] as FloatingText[],
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false, Space: false, KeyE: false },
    mouse: { x: 400, y: 300 }, // Default center to avoid NaN on initial frame
    time: 0,
    deathTimer: 0,
    gameEnded: false,
    screenShake: 0,
    bulletImg: null as HTMLImageElement | null
  });

  // --- Sound Synthesizer ---
  const playSound = (type: 'shoot' | 'hit' | 'special' | 'powerup' | 'freeze' | 'gameover' | 'void' | 'shield' | 'lovely') => {
    try {
        if (!audioCtxRef.current) {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                audioCtxRef.current = new AudioContextClass();
            }
        }
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;

        switch (type) {
            case 'shoot':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'hit':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'special':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.5);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.1); // C#
                osc.frequency.setValueAtTime(659, now + 0.2); // E
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'freeze':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1500, now);
                osc.frequency.linearRampToValueAtTime(2000, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'void':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 1.0);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
            case 'gameover':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(50, now + 1.0);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
            case 'shield':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.5);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'lovely':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(400, now + 0.1); // Stable
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
        }
    } catch (e) {
        // Audio not supported or blocked, ignore
    }
  };

  const togglePause = () => {
      if (gameState.current.gameEnded) return;
      const newState = !isPausedRef.current;
      isPausedRef.current = newState;
      setIsPaused(newState);
  };

  useEffect(() => {
    // Initialize Canvas Size
    if (canvasRef.current) {
        canvasRef.current.width = 800;
        canvasRef.current.height = 600;
    }

    // Load Images
    gameState.current.p1.img.src = p1.imageSrc;
    gameState.current.p2.img.src = p2.imageSrc;
    
    if (customBullet) {
        const img = new Image();
        img.src = customBullet;
        gameState.current.bulletImg = img;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
          togglePause();
          return;
      }
      if (gameState.current.keys.hasOwnProperty(e.code)) {
        (gameState.current.keys as any)[e.code] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState.current.keys.hasOwnProperty(e.code)) {
        (gameState.current.keys as any)[e.code] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Accurate Mouse Mapping for Scaled Canvas
        const rect = canvas.getBoundingClientRect();
        
        // Prevent division by zero / NaN logic
        if (rect.width > 0 && rect.height > 0) {
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            gameState.current.mouse.x = (e.clientX - rect.left) * scaleX;
            gameState.current.mouse.y = (e.clientY - rect.top) * scaleY;
        }
    };
    
    const initAudio = () => {
         try {
            if (!audioCtxRef.current) {
                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                if (AudioContextClass) {
                    audioCtxRef.current = new AudioContextClass();
                }
            }
         } catch(e) {}
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', initAudio);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', initAudio);
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spawnPowerUp = (width: number, height: number) => {
      if (!allowedPowerUps || allowedPowerUps.length === 0) return;

      const randIndex = Math.floor(Math.random() * allowedPowerUps.length);
      const type = allowedPowerUps[randIndex];
      if (!type) return;

      const margin = 100;
      gameState.current.powerups.push({
          x: margin + Math.random() * (width - margin * 2),
          y: margin + Math.random() * (height - margin * 2),
          type,
          radius: 20,
          life: 600, // 10 seconds
          rotation: 0
      });
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, size: 'small' | 'large' = 'small') => {
      gameState.current.texts.push({
          x: isNaN(x) ? 0 : x, 
          y: (isNaN(y) ? 0 : y) - 20,
          text,
          color,
          life: 60,
          vy: size === 'large' ? -1.5 : -0.8,
          size
      });
  };

  const fireSpecial = (char: typeof gameState.current.p1, owner: 'p1'|'p2', dmgMult: number) => {
     if (char.specialCharge < 100) return;
     
     char.specialCharge = 0;
     if (owner === 'p1') setP1Special(0);
     else setP2Special(0);
     
     const isP1 = owner === 'p1';
     const specialId: SpecialId = isP1 ? (p1.specialId || 'GMASTI') : (p2.specialId || '6FTBADDIE');
     const displayName = isP1 ? p1.stats.specialMove : p2.stats.specialMove;

     addFloatingText(char.x, char.y - 60, displayName + "!", '#ffffff', 'large');
     
     // --- SPECIAL LOGIC SWITCH ---
     switch(specialId) {
         case 'ROHANMOB': // White Shield
             char.effects.push({ type: 'SHIELD', duration: 300 }); // 5s
             playSound('shield');
             addFloatingText(char.x, char.y - 90, "INVINCIBLE", '#ffffff', 'large');
             break;
         
         case 'LAMBARDAAR': // Giant
             char.effects.push({ type: 'GIANT', duration: 600 }); // 10s
             playSound('powerup');
             addFloatingText(char.x, char.y - 90, "GIANT MODE", '#fcd34d', 'large');
             break;
             
         case 'SINGH': // Tuff
             char.effects.push({ type: 'TOUGH', duration: 600 }); // 10s
             playSound('shield');
             addFloatingText(char.x, char.y - 90, "IRON WILL", '#94a3b8', 'large');
             break;
             
         case 'SONI': // Gold
             char.effects.push({ type: 'GOLD_MODE', duration: 480 }); // 8s
             playSound('powerup');
             addFloatingText(char.x, char.y - 90, "GOLD RUSH", '#facc15', 'large');
             break;
             
         case 'PAL': // Lovely
            // Apply to both players or global? Global effect essentially, applied to both
            gameState.current.p1.effects.push({ type: 'LOVELY', duration: 600 });
            gameState.current.p2.effects.push({ type: 'LOVELY', duration: 600 });
            playSound('lovely');
            addFloatingText(canvasRef.current!.width/2, canvasRef.current!.height/2, "PEACE & LOVE", '#f472b6', 'large');
            break;
            
         // Projectile Based
         case 'GMASTI':
         case '6FTBADDIE':
         default:
            playSound('special');
             // Aiming Logic
             let angle = 0;
             if (isP1) {
                 if (aimMode === 'MANUAL') {
                     // Safety check for aiming coordinates
                     const dx = gameState.current.mouse.x - char.x;
                     const dy = gameState.current.mouse.y - char.y;
                     angle = Math.atan2(dy || 0, dx || 1); // fallback to prevent NaN
                 } else {
                     const target = gameState.current.p2;
                     angle = Math.atan2(target.y - char.y, target.x - char.x);
                 }
             } else {
                const target = gameState.current.p1;
                angle = Math.atan2(target.y - char.y, target.x - char.x);
             }
             
             if (isNaN(angle)) angle = 0;

             gameState.current.bullets.push({
                 x: char.x + Math.cos(angle) * 40,
                 y: char.y + Math.sin(angle) * 40,
                 vx: Math.cos(angle) * (isP1 ? 16 : 12), 
                 vy: Math.sin(angle) * (isP1 ? 16 : 12),
                 owner: owner,
                 dmg: (isP1 ? 80 : 50) * dmgMult, 
                 size: isP1 ? 40 : 30,
                 color: specialId === 'GMASTI' ? '#ef4444' : '#06b6d4',
                 isSpecial: true,
                 logicType: specialId === 'GMASTI' ? 'FIRE' : 'ICE'
             });
             gameState.current.screenShake = 20;
             createParticles(char.x, char.y, specialId === 'GMASTI' ? '#ef4444' : '#06b6d4', 50, 4);
             break;
     }
  };

  const animate = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear Screen (Always safe to do)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const state = gameState.current;

    // 2. Update Logic (Try/Catch Wrapper)
    try {
        if (state.gameEnded) {
            // Only draw calls needed
        } else if (isPausedRef.current) {
            // Paused state, no update
        } else {
             updateGameLogic(canvas, state);
        }
    } catch (error) {
        console.error("Game Update Error:", error);
    }

    // 3. Draw Logic (Try/Catch Wrapper)
    try {
        if (isPausedRef.current) {
            draw(ctx, canvas);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 60px Cinzel';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        } else {
            draw(ctx, canvas);
        }
    } catch (error) {
        console.error("Game Draw Error:", error);
    }
    
    requestRef.current = requestAnimationFrame(animate);
  };

  const updateGameLogic = (canvas: HTMLCanvasElement, state: any) => {
        // Check Death
        if (state.p1.hp <= 0 || state.p2.hp <= 0) {
            if (state.deathTimer === 0) {
                state.deathTimer = 1; // Start death sequence
                playSound('gameover');
            }
            state.deathTimer++;
            
            // Slow motion logic during death
            if (state.time % 2 === 0) {
                const deadChar = state.p1.hp <= 0 ? state.p1 : state.p2;
                createParticles(
                    deadChar.x + (Math.random()-0.5)*40, 
                    deadChar.y + (Math.random()-0.5)*40, 
                    '#ef4444', 5, 5
                );
            }
            
            if (state.deathTimer > 90) {
                state.gameEnded = true;
                const winner = state.p1.hp > 0 ? p1 : (state.p2.hp > 0 ? p2 : null);
                onGameOver({
                    winner,
                    message: winner ? (winner.id === 'player1' ? "You have proved your strength!" : "The Legend remains supreme.") : "Double KO!",
                });
            }
            return;
        }

        state.time++;
        if (state.screenShake > 0) state.screenShake *= 0.9;

        if (state.time % 600 === 0) spawnPowerUp(canvas.width, canvas.height);

        // Update Black Holes
        for (let i = state.blackHoles.length - 1; i >= 0; i--) {
            const bh = state.blackHoles[i];
            bh.life--;
            
            // Sucking Effect
            const target = bh.owner === 'p1' ? state.p2 : state.p1;
            const dx = bh.x - target.x;
            const dy = bh.y - target.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Gravity force
            if (dist > 10) {
                const force = 1000 / (dist + 50); // Stronger when closer
                const angle = Math.atan2(dy, dx);
                if (!isNaN(angle) && !isNaN(force)) {
                    target.vx += Math.cos(angle) * force;
                    target.vy += Math.sin(angle) * force;
                }
            }
            
            // Damage if in center
            if (dist < 40 && state.time % 10 === 0) {
                target.hp -= 2;
                target.hitFlash = 5;
                if (bh.owner === 'p1') setP2Health(target.hp);
                else setP1Health(target.hp);
            }

            // Visuals for BH
            if (state.time % 3 === 0) {
                state.particles.push({
                    x: bh.x + (Math.random()-0.5)*100,
                    y: bh.y + (Math.random()-0.5)*100,
                    vx: (bh.x - (bh.x + (Math.random()-0.5)*100)) * 0.05,
                    vy: (bh.y - (bh.y + (Math.random()-0.5)*100)) * 0.05,
                    life: 20,
                    color: '#7e22ce', // purple
                    size: 2
                });
            }

            if (bh.life <= 0) state.blackHoles.splice(i, 1);
        }

        // Effects Manager
        const manageEffects = (char: typeof state.p1, isPlayer: boolean) => {
            char.speed = char.baseSpeed || 5;
            char.radius = char.baseRadius || 40;
            let damageMult = 1;
            let damageTakenMult = 1;
            let isFrozen = false;
            let isShielded = false;
            let isLovely = false;
            
            if (char.hitFlash > 0) char.hitFlash--;

            for (let i = char.effects.length - 1; i >= 0; i--) {
                const effect = char.effects[i];
                effect.duration--;
                if (effect.duration <= 0) {
                    char.effects.splice(i, 1);
                    continue;
                }
                if (effect.type === 'SPEED') char.speed *= 1.5;
                if (effect.type === 'POWER') damageMult *= 2;
                if (effect.type === 'FREEZE') isFrozen = true;
                if (effect.type === 'SHIELD') isShielded = true;
                if (effect.type === 'TOUGH') damageTakenMult *= 0.2;
                if (effect.type === 'GIANT') {
                    char.radius = char.baseRadius * 2;
                    damageMult *= 1.5;
                }
                if (effect.type === 'GOLD_MODE') {
                    damageMult *= 3;
                }
                if (effect.type === 'LOVELY') {
                    isLovely = true;
                    if (state.time % 10 === 0) {
                        char.hp = Math.min(char.maxHp, char.hp + 2);
                        if (isPlayer) setP1Health(char.hp); else setP2Health(char.hp);
                    }
                    if (state.time % 15 === 0) {
                        state.particles.push({
                            x: char.x, y: char.y - char.radius, 
                            vx: (Math.random()-0.5), vy: -2, life: 60, color: '#f472b6', size: 10, isHeart: true
                        });
                    }
                }
            }
            if (isFrozen) char.speed *= 0.2; 
            
            return { damageMult, damageTakenMult, isShielded, isLovely };
        };

        const p1Status = manageEffects(state.p1, true);
        const p2Status = manageEffects(state.p2, false);

        // P1 Movement
        let moveX = 0, moveY = 0;
        if (state.keys.ArrowUp || state.keys.KeyW) moveY = -1;
        if (state.keys.ArrowDown || state.keys.KeyS) moveY = 1;
        if (state.keys.ArrowLeft || state.keys.KeyA) moveX = -1;
        if (state.keys.ArrowRight || state.keys.KeyD) moveX = 1;

        if (moveX !== 0 || moveY !== 0) {
            const len = Math.sqrt(moveX*moveX + moveY*moveY);
            if (len > 0) {
                moveX /= len;
                moveY /= len;
            }
        }

        // NaN check on speed/movement
        if (!isNaN(state.p1.speed)) {
            state.p1.vx += moveX * state.p1.speed * 0.2; 
            state.p1.vy += moveY * state.p1.speed * 0.2;
        }
        state.p1.vx *= 0.85; 
        state.p1.vy *= 0.85;

        // Apply velocity with NaN check
        if (!isNaN(state.p1.vx)) state.p1.x += state.p1.vx;
        if (!isNaN(state.p1.vy)) state.p1.y += state.p1.vy;

        // Boundaries
        state.p1.x = Math.max(state.p1.radius, Math.min(canvas.width - state.p1.radius, state.p1.x));
        state.p1.y = Math.max(state.p1.radius, Math.min(canvas.height - state.p1.radius, state.p1.y));

        // P1 Shooting
        if (state.p1.cooldown > 0) state.p1.cooldown--;
        
        if (state.keys.Space && state.p1.cooldown <= 0) {
            playSound('shoot');
            let angle = 0;
            
            if (aimMode === 'MANUAL') {
                const dx = state.mouse.x - state.p1.x;
                const dy = state.mouse.y - state.p1.y;
                angle = Math.atan2(dy || 0, dx || 1);
            } else {
                angle = Math.atan2(state.p2.y - state.p1.y, state.p2.x - state.p1.x);
            }
            if (isNaN(angle)) angle = 0;

            const vx = Math.cos(angle);
            const vy = Math.sin(angle);
            const validVelocity = isNaN(bulletVelocity) ? 12 : bulletVelocity;

            state.bullets.push({
                x: state.p1.x + vx * state.p1.radius,
                y: state.p1.y + vy * state.p1.radius,
                vx: vx * validVelocity, 
                vy: vy * validVelocity,
                owner: 'p1',
                dmg: (8 + (p1.stats.power * 0.8)) * p1Status.damageMult,
                size: 10, 
                color: '#a855f7',
                img: state.bulletImg || undefined
            });
            state.p1.cooldown = 15 - Math.min(10, p1.stats.speed); 
        }

        // P1 Special
        if (state.keys.KeyE && state.p1.specialCharge >= 100) {
            fireSpecial(state.p1, 'p1', p1Status.damageMult);
        }

        // P2 AI
        const dx = state.p1.x - state.p2.x;
        const dy = state.p1.y - state.p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 350) {
            const angle = Math.atan2(dy, dx);
            if (!isNaN(angle)) {
                state.p2.vx += Math.cos(angle) * state.p2.speed * 0.1;
                state.p2.vy += Math.sin(angle) * state.p2.speed * 0.1;
            }
        } else {
            state.p2.vx += Math.sin(state.time * 0.05) * state.p2.speed * 0.15;
            state.p2.vy += Math.cos(state.time * 0.03) * state.p2.speed * 0.15;
        }
        state.p2.vx *= 0.9;
        state.p2.vy *= 0.9;
        
        if (!isNaN(state.p2.vx)) state.p2.x += state.p2.vx;
        if (!isNaN(state.p2.vy)) state.p2.y += state.p2.vy;
        state.p2.x = Math.max(state.p2.radius, Math.min(canvas.width - state.p2.radius, state.p2.x));
        state.p2.y = Math.max(state.p2.radius, Math.min(canvas.height - state.p2.radius, state.p2.y));

        // P2 Shooting
        if (state.p2.cooldown > 0) state.p2.cooldown--;
        else {
            const bossDmg = (5 + (p2.stats.power * 0.6)) * p2Status.damageMult;
            if (state.time % 250 < 120) {
                playSound('shoot');
                const angle = Math.atan2(state.p1.y - state.p2.y, state.p1.x - state.p2.x);
                state.bullets.push({
                x: state.p2.x,
                y: state.p2.y,
                vx: Math.cos(angle) * 7,
                vy: Math.sin(angle) * 7,
                owner: 'p2',
                dmg: bossDmg,
                size: 8,
                color: '#ef4444'
                });
                state.p2.cooldown = 35;
            } else {
                playSound('shoot');
                for(let i=0; i<8; i++){
                    const angle = (i / 8) * Math.PI * 2;
                    state.bullets.push({
                        x: state.p2.x,
                        y: state.p2.y,
                        vx: Math.cos(angle) * 5, 
                        vy: Math.sin(angle) * 5,
                        owner: 'p2',
                        dmg: bossDmg * 0.8,
                        size: 7,
                        color: '#ef4444'
                    });
                }
                state.p2.cooldown = 90;
            }
        }

        if (state.p2.specialCharge >= 100) fireSpecial(state.p2, 'p2', p2Status.damageMult);

        // Update Bullets & Collisions
        updateBullets(canvas, state, p1Status, p2Status);

        // Power Ups Collision
        state.powerups.forEach((p, i) => {
            p.rotation += 0.05;
            p.life--;
            const dist1 = Math.sqrt((p.x - state.p1.x) ** 2 + (p.y - state.p1.y) ** 2);
            if (dist1 < state.p1.radius + p.radius) {
                applyPowerUp(state.p1, p.type, 'p1');
                state.powerups.splice(i, 1);
            } else {
                const dist2 = Math.sqrt((p.x - state.p2.x) ** 2 + (p.y - state.p2.y) ** 2);
                if (dist2 < state.p2.radius + p.radius) {
                    applyPowerUp(state.p2, p.type, 'p2');
                    state.powerups.splice(i, 1);
                } else if (p.life <= 0) {
                    state.powerups.splice(i, 1);
                }
            }
        });

        // Particles & Text
        updateParticlesAndText(state);
  }

  const updateBullets = (canvas: HTMLCanvasElement, state: any, p1Status: any, p2Status: any) => {
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        
        if (isNaN(b.x) || isNaN(b.y)) {
             state.bullets.splice(i, 1);
             continue;
        }

        b.x += b.vx;
        b.y += b.vy;

        // Trail particles
        if (b.isSpecial && state.time % 2 === 0) {
             state.particles.push({
                x: b.x, y: b.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 15,
                color: b.logicType === 'FIRE' ? '#f59e0b' : '#cffafe',
                size: Math.random() * 4 + 2
             });
        }

        if (b.x < -100 || b.x > canvas.width + 100 || b.y < -100 || b.y > canvas.height + 100) {
            state.bullets.splice(i, 1);
            continue;
        }

        let hit = false;
        // Collision logic
        const target = b.owner === 'p1' ? state.p2 : state.p1;
        const targetStatus = b.owner === 'p1' ? p2Status : p1Status;
        
        // If PAL mode or Shield, damage might be ignored
        if (p1Status.isLovely || p2Status.isLovely) {
            createParticles(b.x, b.y, '#f472b6', 5, 2);
            state.bullets.splice(i, 1);
            continue;
        }

        const dist = Math.sqrt((b.x - target.x) ** 2 + (b.y - target.y) ** 2);
        
        if (dist < target.radius + b.size) {
            hit = true;
            
            // Shield check
            if (targetStatus.isShielded) {
                playSound('shield');
                addFloatingText(target.x, target.y - 40, "BLOCKED", '#ffffff', 'small');
                createParticles(b.x, b.y, '#ffffff', 10, 2);
            } else {
                let finalDmg = b.dmg * targetStatus.damageTakenMult;
                target.hp -= finalDmg;
                target.hitFlash = 10;
                state.screenShake = Math.min(20, state.screenShake + (b.isSpecial ? 15 : 2));

                addFloatingText(target.x, target.y - 40, `-${Math.round(finalDmg)}`, '#ff0000', b.isSpecial ? 'large' : 'small');
                playSound('hit');
                
                // Special Effects on hit
                if (b.isSpecial && b.logicType === 'ICE') {
                    target.effects.push({ type: 'FREEZE', duration: 180 });
                    addFloatingText(target.x, target.y - 70, "FROZEN!", '#06b6d4', 'large');
                    playSound('freeze');
                }
                
                const attacker = b.owner === 'p1' ? state.p1 : state.p2;
                const attackerStatus = b.owner === 'p1' ? p1Status : p2Status;
                
                if (attackerStatus.damageMult >= 3) { // Check for GOLD multiplier roughly
                     target.effects.push({ type: 'FREEZE', duration: 30 }); // Mini slow
                }

                // Charge Specials
                target.specialCharge = Math.min(100, target.specialCharge + 5);
                attacker.specialCharge = Math.min(100, attacker.specialCharge + 10);
                
                // Sync State for UI
                if (target === state.p1) {
                    setP1Health(Math.max(0, target.hp));
                } else {
                    setP2Health(Math.max(0, target.hp));
                }
                setP1Special(state.p1.specialCharge);
                setP2Special(state.p2.specialCharge);
            }
            
            createParticles(b.x, b.y, b.color, b.isSpecial ? 40 : 10, b.isSpecial ? 3 : 2);
        }

        if (hit) {
            state.bullets.splice(i, 1);
        }
      }
  };

  const updateParticlesAndText = (state: any) => {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.texts.length - 1; i >= 0; i--) {
        const t = state.texts[i];
        t.y += t.vy;
        t.life--;
        if (t.life <= 0) state.texts.splice(i, 1);
    }
  };

  const applyPowerUp = (char: typeof gameState.current.p1, type: PowerUpType, id: string) => {
    if (type === 'BLACK_HOLE') {
        playSound('void');
        addFloatingText(char.x, char.y - 50, "VOID OPENED!", '#9333ea', 'large');
        const target = id === 'p1' ? gameState.current.p2 : gameState.current.p1;
        gameState.current.blackHoles.push({
            x: target.x,
            y: target.y,
            life: 300, // 5 seconds
            owner: id === 'p1' ? 'p1' : 'p2'
        });
        return;
    }

    createParticles(char.x, char.y, type === 'HEAL' ? '#22c55e' : (type === 'SPEED' ? '#3b82f6' : '#ef4444'), 30, 3);
    addFloatingText(char.x, char.y - 50, type + " UP!", '#ffffff', 'large');
    playSound('powerup');

    if (type === 'HEAL') {
        char.hp = Math.min(char.maxHp, char.hp + 50);
        if(id === 'p1') setP1Health(char.hp);
        else setP2Health(char.hp);
    } else {
        const existing = char.effects.findIndex(e => e.type === type);
        if (existing !== -1) char.effects.splice(existing, 1);
        char.effects.push({ type, duration: 480 }); 
    }
  };

  const createParticles = (x: number, y: number, color: string, count: number, sizeBase: number) => {
    if (isNaN(x) || isNaN(y)) return;
    for (let i = 0; i < count; i++) {
      gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 20 + Math.random() * 20,
        color,
        size: Math.random() * sizeBase + 1
      });
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const state = gameState.current;
    
    // Screen Shake
    ctx.save();
    if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
    }

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40); 
    
    // Grid
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<=canvas.width; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); }
    for(let y=0; y<=canvas.height; y+=50) { ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); }
    ctx.stroke();

    // Draw Black Holes
    state.blackHoles.forEach(bh => {
        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Accretion disk
        ctx.strokeStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(0, 0, 45 + Math.sin(state.time * 0.2)*5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    });

    // Mouse Aim Indicator
    if (!state.gameEnded && !isPausedRef.current && aimMode === 'MANUAL') {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(state.mouse.x, state.mouse.y, 10, 0, Math.PI * 2);
        ctx.moveTo(state.mouse.x - 15, state.mouse.y);
        ctx.lineTo(state.mouse.x + 15, state.mouse.y);
        ctx.moveTo(state.mouse.x, state.mouse.y - 15);
        ctx.lineTo(state.mouse.x, state.mouse.y + 15);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(state.p1.x, state.p1.y);
        ctx.lineTo(state.mouse.x, state.mouse.y);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (aimMode === 'AUTO' && !state.gameEnded) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(state.p1.x, state.p1.y);
        ctx.lineTo(state.p2.x, state.p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Particles
    state.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 30);
      if (p.isHeart) {
          ctx.beginPath();
          const topCurveHeight = p.size * 0.3;
          ctx.moveTo(p.x, p.y + topCurveHeight);
          ctx.bezierCurveTo(p.x, p.y, p.x - p.size / 2, p.y, p.x - p.size / 2, p.y + topCurveHeight);
          ctx.bezierCurveTo(p.x - p.size / 2, p.y + (p.size + topCurveHeight) / 2, p.x, p.y + (p.size + topCurveHeight) / 2, p.x, p.y + p.size);
          ctx.bezierCurveTo(p.x, p.y + (p.size + topCurveHeight) / 2, p.x + p.size / 2, p.y + (p.size + topCurveHeight) / 2, p.x + p.size / 2, p.y + topCurveHeight);
          ctx.bezierCurveTo(p.x + p.size / 2, p.y, p.x, p.y, p.x, p.y + topCurveHeight);
          ctx.fill();
      } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    // Powerups
    state.powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const colors: Record<string, string> = { HEAL: '#22c55e', SPEED: '#3b82f6', POWER: '#ef4444', BLACK_HOLE: '#9333ea' };
        ctx.shadowColor = colors[p.type] || '#fff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = colors[p.type] || '#fff';
        
        ctx.beginPath();
        if (p.type === 'BLACK_HOLE') {
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            for(let i=0; i<5; i++){
                ctx.lineTo(Math.cos((18+i*72)/180*Math.PI)*p.radius, -Math.sin((18+i*72)/180*Math.PI)*p.radius);
                ctx.lineTo(Math.cos((54+i*72)/180*Math.PI)*(p.radius/2), -Math.sin((54+i*72)/180*Math.PI)*(p.radius/2));
            }
            ctx.fill();
        }
        ctx.closePath();
        ctx.restore();
    });

    // Bullets
    state.bullets.forEach(b => {
      if (b.img && !b.isSpecial) {
          ctx.save();
          ctx.translate(b.x, b.y);
          const rotation = Math.atan2(b.vy, b.vx);
          ctx.rotate(rotation + Math.PI/2);
          try {
              ctx.drawImage(b.img, -b.size, -b.size, b.size * 2, b.size * 2);
          } catch(e) {
              ctx.fillStyle = b.color;
              ctx.beginPath(); ctx.arc(0,0,b.size,0,Math.PI*2); ctx.fill();
          }
          ctx.restore();
      } else {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = b.isSpecial ? 20 : 10;
        ctx.shadowColor = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Characters
    drawCharacter(ctx, state.p1, '#a855f7', state.time);
    drawCharacter(ctx, state.p2, '#ef4444', state.time);

    // Floating Text
    state.texts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.font = t.size === 'large' ? '900 32px Cinzel' : 'bold 20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.shadowBlur = 0;
    });

    ctx.restore();
  };

  const drawCharacter = (ctx: CanvasRenderingContext2D, char: any, glowColor: string, time: number) => {
    // Check if dead
    if (char.hp <= 0) {
        ctx.globalAlpha = Math.max(0, 1 - gameState.current.deathTimer / 60);
    }

    ctx.save();
    
    // Status Effects Visuals
    const hasSpeed = char.effects.some((e: ActiveEffect) => e.type === 'SPEED');
    const hasPower = char.effects.some((e: ActiveEffect) => e.type === 'POWER');
    const isFrozen = char.effects.some((e: ActiveEffect) => e.type === 'FREEZE');
    const isShielded = char.effects.some((e: ActiveEffect) => e.type === 'SHIELD');
    const isGiant = char.effects.some((e: ActiveEffect) => e.type === 'GIANT');
    const isTough = char.effects.some((e: ActiveEffect) => e.type === 'TOUGH');
    const isGold = char.effects.some((e: ActiveEffect) => e.type === 'GOLD_MODE');
    const isLovely = char.effects.some((e: ActiveEffect) => e.type === 'LOVELY');

    if (hasSpeed) glowColor = '#3b82f6';
    if (hasPower) glowColor = '#ef4444';
    if (isFrozen) glowColor = '#06b6d4'; 
    if (isShielded) glowColor = '#ffffff';
    if (isGold) glowColor = '#fbbf24';
    if (isLovely) glowColor = '#f472b6';

    ctx.translate(char.x, char.y);

    if (isGiant) {
        const scale = 1.5;
        ctx.scale(scale, scale);
    }

    if (isShielded) {
        ctx.beginPath();
        ctx.arc(0, 0, char.radius + 15, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Pulse effect if special ready
    if (char.specialCharge >= 100) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2 + Math.sin(time * 0.2) * 2;
        ctx.beginPath();
        ctx.arc(0, 0, char.radius + 8, 0, Math.PI*2);
        ctx.stroke();
    }

    if (hasSpeed || hasPower || isGold || isTough) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, char.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, char.radius, 0, Math.PI * 2);
    ctx.closePath();
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
    
    // IMAGE DRAWING - SAFEGUARDED
    ctx.save();
    ctx.clip();
    
    if (char.hitFlash > 0) {
        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(-char.radius, -char.radius, char.radius * 2, char.radius * 2);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(220, 38, 38, 0.7)';
        ctx.fillRect(-char.radius, -char.radius, char.radius * 2, char.radius * 2);
    } else {
        try {
            if (char.img.complete && char.img.naturalWidth !== 0) {
                ctx.drawImage(char.img, -char.radius, -char.radius, char.radius * 2, char.radius * 2);
            } else {
                 throw new Error("Img not ready");
            }
            
            if (isTough) {
                ctx.globalCompositeOperation = 'saturation';
                ctx.fillStyle = '#94a3b8'; 
                ctx.fillRect(-char.radius, -char.radius, char.radius * 2, char.radius * 2);
                ctx.globalCompositeOperation = 'source-over';
            }
            if (isGold) {
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = '#facc15';
                ctx.fillRect(-char.radius, -char.radius, char.radius * 2, char.radius * 2);
                ctx.globalCompositeOperation = 'source-over';
            }
        } catch(e) {
            ctx.fillStyle = glowColor;
            ctx.fill();
        }
    }
    
    if (isFrozen) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.fillRect(-char.radius, -char.radius, char.radius * 2, char.radius * 2);
    }

    ctx.restore(); // Restore clip
    
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    const hpPct = Math.max(0, char.hp / char.maxHp);
    ctx.fillStyle = '#374151';
    ctx.fillRect(-30, -char.radius - 20, 60, 6);
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
    ctx.fillRect(-30, -char.radius - 20, 60 * hpPct, 6);

    const spPct = char.specialCharge / 100;
    ctx.fillStyle = '#374151';
    ctx.fillRect(-30, -char.radius - 12, 60, 4);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-30, -char.radius - 12, 60 * spPct, 4);
    
    ctx.restore(); // Restore translate
    ctx.globalAlpha = 1;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-900 overflow-hidden relative cursor-crosshair">
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none select-none z-20">
        
        {/* P1 Stats */}
        <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-xl backdrop-blur-md border border-purple-500/50 shadow-lg">
           <img src={p1.imageSrc} alt="P1" className="w-16 h-16 rounded-lg border-2 border-purple-500 object-cover" />
           <div className="flex flex-col gap-1">
              <div className="text-white font-bold text-lg">{p1.stats.name}</div>
              <div className="w-48 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: `${Math.max(0, (p1Health / p1.stats.hp) * 100)}%` }} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">HP</span>
              </div>
              <div className="w-48 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative mt-1">
                <div className={`h-full bg-orange-500 transition-all duration-300 ${p1Special >= 100 ? 'animate-pulse' : ''}`} style={{ width: `${p1Special}%` }} />
                 <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-widest shadow-black drop-shadow-md">
                    {p1Special >= 100 ? `${p1.stats.specialMove} READY [E]` : p1.stats.specialMove}
                 </span>
              </div>
           </div>
        </div>

        <div className="flex flex-col items-center gap-2 pointer-events-auto">
             <div className="text-5xl font-black text-white/10 font-cinzel">VS</div>
        </div>

        {/* P2 Stats */}
        <div className="flex items-center gap-4 flex-row-reverse bg-slate-900/80 p-3 rounded-xl backdrop-blur-md border border-cyan-500/50 shadow-lg">
           <img src={p2.imageSrc} alt="P2" className="w-16 h-16 rounded-lg border-2 border-cyan-500 object-cover" />
           <div className="text-right flex flex-col gap-1 items-end">
              <div className="text-white font-bold text-lg">{p2.stats.name}</div>
              <div className="w-48 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative">
                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300" style={{ width: `${Math.max(0, (p2Health / p2.stats.hp) * 100)}%` }} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">HP</span>
              </div>
              <div className="w-48 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative mt-1">
                <div className={`h-full bg-cyan-400 transition-all duration-300 ${p2Special >= 100 ? 'animate-pulse' : ''}`} style={{ width: `${p2Special}%` }} />
                 <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black uppercase tracking-widest">{p2.stats.specialMove}</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Pause Button */}
      <button 
        onClick={togglePause}
        className="absolute top-4 right-1/2 translate-x-1/2 z-30 bg-slate-800/80 text-white p-2 rounded-full hover:bg-slate-700 border border-slate-600 transition-all"
        title="Pause (ESC)"
      >
        {isPaused ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        )}
      </button>

      {/* Special Button (Mobile) */}
      {p1Special >= 100 && !isPaused && (
          <button 
            className="absolute bottom-24 right-8 z-30 w-24 h-24 bg-orange-500 rounded-full border-4 border-yellow-300 shadow-[0_0_30px_rgba(249,115,22,0.6)] animate-bounce flex items-center justify-center text-white font-black text-xl tracking-tighter"
            onClick={() => {
                if (gameState.current.p1.specialCharge >= 100) {
                     gameState.current.keys.KeyE = true;
                     setTimeout(() => gameState.current.keys.KeyE = false, 100);
                }
            }}
          >
              {p1.stats.specialMove.length > 8 ? 'ULTIMATE' : p1.stats.specialMove}
          </button>
      )}

      <div className="absolute bottom-8 text-white/30 text-sm font-mono z-10 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
        WASD to Move | <span className="text-white font-bold">{aimMode === 'AUTO' ? 'AUTO-AIM Active' : 'MOUSE to Aim'} & SPACE to Shoot</span> | <span className="text-orange-400 font-bold">E for {p1.stats.specialMove}</span>
      </div>

      <canvas ref={canvasRef} className="game-canvas rounded-xl shadow-2xl border border-slate-700 bg-black max-w-full max-h-full" />
    </div>
  );
};