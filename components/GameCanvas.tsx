import React, { useEffect, useRef, useState } from 'react';
import { FighterData, GameResult, PowerUpType, SpecialId, ActiveEffect, MultiplayerConfig, RemoteInput } from '../types';
import { Button } from './Button';

interface GameCanvasProps {
  p1: FighterData;
  p2: FighterData;
  customBullet: string | null;
  onGameOver: (result: GameResult) => void;
  onExit: () => void;
  aimMode: 'MANUAL' | 'AUTO';
  allowedPowerUps: PowerUpType[];
  bulletVelocity: number;
  difficulty?: number;
  multiplayer?: MultiplayerConfig | null;
}

interface PowerUp {
    x: number;
    y: number;
    type: PowerUpType;
    radius: number;
    life: number;
    rotation: number;
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
    logicType?: 'FIRE' | 'ICE' | 'MANAN' | 'VOID'; 
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

export const GameCanvas: React.FC<GameCanvasProps> = ({ p1, p2, customBullet, onGameOver, onExit, aimMode, allowedPowerUps, bulletVelocity, difficulty = 1, multiplayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [p1Health, setP1Health] = useState(p1.stats.hp);
  const [p2Health, setP2Health] = useState(p2.stats.hp);
  const [p1Special, setP1Special] = useState(0); 
  const [p2Special, setP2Special] = useState(0); 
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  
  // Mobile Controls State
  const joystickRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });

  // Game State Refs
  const gameState = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
    p1: { 
        x: window.innerWidth * 0.2, y: window.innerHeight / 2, 
        hp: p1.stats.hp, maxHp: p1.stats.hp, 
        vx: 0, vy: 0, 
        cooldown: 0, 
        img: new Image(), 
        radius: 40, 
        baseRadius: 40,
        baseSpeed: 3 + ((p1.stats.speed || 5) * 0.3), speed: 3 + ((p1.stats.speed || 5) * 0.3), 
        effects: [] as ActiveEffect[],
        hitFlash: 0,
        specialCharge: 0,
        contactCooldown: 0
    },
    p2: { 
        x: window.innerWidth * 0.8, y: window.innerHeight / 2, 
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
        specialCharge: 0,
        contactCooldown: 0
    },
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    powerups: [] as PowerUp[],
    blackHoles: [] as BlackHole[],
    texts: [] as FloatingText[],
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false, Space: false, KeyE: false },
    remoteKeys: { keys: {}, mouse: {x:0, y:0}, joystick: {dx:0, dy:0, active: false} } as RemoteInput,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 
    time: 0,
    deathTimer: 0,
    gameEnded: false,
    screenShake: 0,
    bulletImg: null as HTMLImageElement | null
  });

  // --- Sound Synthesizer ---
  const playSound = (type: 'shoot' | 'hit' | 'special' | 'powerup' | 'freeze' | 'gameover' | 'void' | 'shield' | 'lovely' | 'giant' | 'curse' | 'godmode' | 'tough') => {
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
            case 'giant':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.5);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'curse':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            case 'godmode':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.linearRampToValueAtTime(1760, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
            case 'tough':
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
        }
    } catch (e) {
        // Audio not supported or blocked, ignore
    }
  };

  const createParticles = (x: number, y: number, color: string, count: number, size: number, isHeart: boolean = false) => {
      for (let i = 0; i < count; i++) {
          gameState.current.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * (Math.random() * 10),
              vy: (Math.random() - 0.5) * (Math.random() * 10),
              life: Math.random() * 30 + 20,
              color,
              size: Math.random() * size + 1,
              isHeart
          });
      }
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

  const applyPowerUp = (char: typeof gameState.current.p1, type: PowerUpType, owner: 'p1' | 'p2') => {
      playSound('powerup');
      const isP1 = owner === 'p1';
      addFloatingText(char.x, char.y - 60, type, '#10b981', 'large');

      if (type === 'HEAL') {
          char.hp = Math.min(char.maxHp, char.hp + 50);
          if (isP1) setP1Health(char.hp); else setP2Health(char.hp);
          createParticles(char.x, char.y, '#22c55e', 30, 3);
      } else if (type === 'BLACK_HOLE') {
          gameState.current.blackHoles.push({
              x: char.x + (isP1 ? 100 : -100),
              y: char.y,
              life: 600,
              owner
          });
          createParticles(char.x, char.y, '#7e22ce', 50, 4);
      } else {
          char.effects.push({ type, duration: 600 });
          createParticles(char.x, char.y, '#f59e0b', 30, 3);
      }
  };

  const updateParticlesAndText = (state: any) => {
      // Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          p.vx *= 0.95;
          p.vy *= 0.95;
          if (p.life <= 0) state.particles.splice(i, 1);
      }

      // Texts
      for (let i = state.texts.length - 1; i >= 0; i--) {
          const t = state.texts[i];
          t.y += t.vy;
          t.life--;
          if (t.life <= 0) state.texts.splice(i, 1);
      }
  };

  const togglePause = () => {
      if (gameState.current.gameEnded) return;
      if (multiplayer && multiplayer.role === 'CLIENT') return; 

      const newState = !isPausedRef.current;
      isPausedRef.current = newState;
      setIsPaused(newState);
  };

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
                color: b.logicType === 'FIRE' ? '#f59e0b' : (b.logicType === 'MANAN' ? '#3b82f6' : '#cffafe'),
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
                if (b.isSpecial && b.logicType === 'MANAN') {
                    target.effects.push({ type: 'MANAN_CURSE', duration: 480 }); // 8s
                    addFloatingText(target.x, target.y - 70, "CURSED!", '#1e3a8a', 'large');
                    playSound('curse'); 
                }
                if (b.isSpecial && b.logicType === 'VOID') {
                    target.effects.push({ type: 'VOID_TRAP', duration: 180 }); // 3s
                    addFloatingText(target.x, target.y - 70, "VOID TRAP!", '#000000', 'large');
                    playSound('void');
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

  const fireSpecial = (char: typeof gameState.current.p1, owner: 'p1'|'p2', dmgMult: number) => {
     if (char.specialCharge < 100) return;
     
     const isP1 = owner === 'p1';
     const specialId: SpecialId = isP1 ? (p1.specialId || 'GMASTI') : (p2.specialId || '6FTBADDIE');
     const displayName = isP1 ? p1.stats.specialMove : p2.stats.specialMove;

     // GT MODE CHECK FIRST (Cost REMOVED, Free to use)
     if (specialId === 'GT_MODE') {
         // No HP Cost
         addFloatingText(char.x, char.y - 60, "GT OVERDRIVE!", '#a855f7', 'large');
         playSound('godmode');
         
         // Apply Buff
         char.effects.push({ type: 'GT_OVERDRIVE', duration: 600 }); // 10 seconds of mayhem
         char.specialCharge = 0;
         if (isP1) setP1Special(0); else setP2Special(0);
         return;
     }

     // Standard Cost
     char.specialCharge = 0;
     if (isP1) setP1Special(0);
     else setP2Special(0);

     addFloatingText(char.x, char.y - 60, displayName + "!", '#ffffff', 'large');
     
     switch(specialId) {
         case 'ROHANMOB': // White Shield
             char.effects.push({ type: 'SHIELD', duration: 300 }); // 5s
             playSound('shield');
             addFloatingText(char.x, char.y - 90, "INVINCIBLE", '#ffffff', 'large');
             break;
         
         case 'LAMBARDAAR': // Giant
             char.effects.push({ type: 'GIANT', duration: 600 }); // 10s
             char.hp = Math.min(char.maxHp, char.hp + 50);
             if (isP1) setP1Health(char.hp); else setP2Health(char.hp);
             playSound('giant');
             addFloatingText(char.x, char.y - 90, "GIANT + HEAL", '#fcd34d', 'large');
             break;
             
         case 'SINGH': // Tuff + Power
             char.effects.push({ type: 'TOUGH', duration: 600 }); // 10s
             playSound('tough');
             addFloatingText(char.x, char.y - 90, "IMMORTAL WILL", '#94a3b8', 'large');
             break;
             
         case 'PAL': // Lovely
            gameState.current.p1.effects.push({ type: 'LOVELY', duration: 600 });
            gameState.current.p2.effects.push({ type: 'LOVELY', duration: 600 });
            playSound('lovely');
            addFloatingText(canvasRef.current!.width/2, canvasRef.current!.height/2, "PEACE & LOVE", '#f472b6', 'large');
            break;
        
        case 'ABHAY': // Gravity
             char.effects.push({ type: 'GRAVITY_WELL', duration: 400 }); 
             playSound('void');
             addFloatingText(char.x, char.y - 90, "GRAVITY WELL", '#c026d3', 'large');
             break;

        case 'MANAN': // Curse + Shrink
             char.effects.push({ type: 'SHRINK', duration: 300 }); // 5s self shrink
             addFloatingText(char.x, char.y - 90, "SHRINK!", '#3b82f6', 'small');
             playSound('curse');
             // Fallthrough to fire projectile logic...

        case 'SONI': // God Mode
             if (specialId === 'SONI') {
                char.effects.push({ type: 'GOLD_MODE', duration: 300 }); // 5s
                playSound('godmode');
                addFloatingText(char.x, char.y - 90, "OVERPOWERED GOD", '#facc15', 'large');
             }
             // Fallthrough

         // Projectile Based
         case 'GMASTI':
         case '6FTBADDIE':
         default:
             if (specialId !== 'MANAN' && specialId !== 'SONI') {
                playSound('special');
             }
             // Aiming Logic
             let angle = 0;
             if (multiplayer && multiplayer.role === 'HOST' && !isP1) {
                 const remote = gameState.current.remoteKeys;
                 if (remote.joystick.active) {
                    angle = Math.atan2(remote.joystick.dy, remote.joystick.dx);
                 } else {
                     angle = Math.atan2(remote.mouse.y - char.y, remote.mouse.x - char.x);
                 }
             } else if (isP1) {
                 if (aimMode === 'MANUAL') {
                     const dx = gameState.current.mouse.x - char.x;
                     const dy = gameState.current.mouse.y - char.y;
                     angle = Math.atan2(dy || 0, dx || 1);
                 } else {
                     const target = gameState.current.p2;
                     angle = Math.atan2(target.y - char.y, target.x - char.x);
                 }
             } else {
                const target = gameState.current.p1;
                angle = Math.atan2(target.y - char.y, target.x - char.x);
             }
             
             if (isNaN(angle)) angle = 0;
             
             let bulletColor = '#ef4444';
             let logicType: 'FIRE' | 'ICE' | 'MANAN' | 'VOID' = 'FIRE';
             let bSize = isP1 ? 40 : 30;
             
             if (specialId === '6FTBADDIE') { bulletColor = '#06b6d4'; logicType = 'ICE'; }
             else if (specialId === 'MANAN') { bulletColor = '#3b82f6'; logicType = 'MANAN'; }
             else if (specialId === 'SONI') { bulletColor = '#000000'; logicType = 'VOID'; bSize = 60; }

             gameState.current.bullets.push({
                 x: char.x + Math.cos(angle) * 40,
                 y: char.y + Math.sin(angle) * 40,
                 vx: Math.cos(angle) * (isP1 ? 16 : 12), 
                 vy: Math.sin(angle) * (isP1 ? 16 : 12),
                 owner: owner,
                 dmg: (isP1 ? 80 : 50) * dmgMult, 
                 size: bSize,
                 color: bulletColor,
                 isSpecial: true,
                 logicType: logicType
             });
             gameState.current.screenShake = 20;
             createParticles(char.x, char.y, bulletColor, 50, 4);
             break;
     }
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
                const result = {
                    winner,
                    message: winner ? (winner.id === 'player1' ? "You have proved your strength!" : "The Legend remains supreme.") : "Double KO!",
                };
                onGameOver(result);
                
                // Host sends Game Over
                if(multiplayer && multiplayer.role === 'HOST') {
                    multiplayer.conn.send({ type: 'GAME_OVER', payload: result });
                }
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
            let isGold = false;
            let isGtMode = false;
            let isVoidTrapped = false;
            
            if (char.hitFlash > 0) char.hitFlash--;
            if (char.contactCooldown > 0) char.contactCooldown--;

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
                if (effect.type === 'TOUGH') {
                    damageTakenMult *= 0.1; 
                    damageMult *= 2; 
                    if (state.time % 30 === 0) char.hp = Math.min(char.maxHp, char.hp + 2); // Regen
                    if (isPlayer) setP1Health(char.hp); else setP2Health(char.hp);
                }
                if (effect.type === 'GIANT') {
                    char.radius = char.baseRadius * 2;
                    damageMult *= 1.25;
                }
                if (effect.type === 'GOLD_MODE') {
                    damageMult *= 5; 
                    char.speed *= 2.5; 
                    isShielded = true; 
                    isGold = true;
                    // SUPER REGEN
                    if (state.time % 10 === 0) { 
                        char.hp = Math.min(char.maxHp, char.hp + 5);
                        if(isPlayer) setP1Health(char.hp); else setP2Health(char.hp);
                    }
                }
                if (effect.type === 'SHRINK') {
                    char.radius = char.baseRadius * 0.5;
                }
                if (effect.type === 'MANAN_CURSE') {
                    if (state.time % 60 === 0) {
                        char.hp -= 10;
                        char.hitFlash = 5;
                        if (isPlayer) setP1Health(char.hp); else setP2Health(char.hp);
                        addFloatingText(char.x, char.y - 30, "-10", '#3b82f6', 'small');
                    }
                    if (state.time % 10 === 0) {
                         state.particles.push({
                            x: char.x + (Math.random()-0.5)*char.radius, 
                            y: char.y + (Math.random()-0.5)*char.radius, 
                            vx: 0, vy: -1, life: 20, color: '#3b82f6', size: 2
                        });
                    }
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
                if (effect.type === 'GT_OVERDRIVE') {
                    isGtMode = true;
                    char.speed *= 2.0;
                    if (state.time % 5 === 0) { 
                        createParticles(char.x, char.y, `hsl(${state.time % 360}, 100%, 50%)`, 2, 2);
                    }
                }
                if (effect.type === 'GRAVITY_WELL') {
                    const opponent = isPlayer ? state.p2 : state.p1;
                    const dx = char.x - opponent.x;
                    const dy = char.y - opponent.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 0 && dist < 500) {
                         const pull = 2000 / (dist * dist + 100); // Strong pull
                         opponent.vx += (dx / dist) * pull;
                         opponent.vy += (dy / dist) * pull;
                    }
                    if (dist < char.radius + opponent.radius) {
                        opponent.hp -= 1; // rapid contact dmg
                        if (isPlayer) setP2Health(opponent.hp); else setP1Health(opponent.hp);
                    }
                     if (state.time % 5 === 0) {
                         state.particles.push({
                            x: char.x + (Math.random()-0.5)*char.radius*2, 
                            y: char.y + (Math.random()-0.5)*char.radius*2, 
                            vx: (char.x - (char.x + (Math.random()-0.5)*char.radius*2)) * 0.1,
                            vy: (char.y - (char.y + (Math.random()-0.5)*char.radius*2)) * 0.1,
                            life: 20, color: '#c026d3', size: 2
                        });
                     }
                }
                if (effect.type === 'VOID_TRAP') {
                    isVoidTrapped = true;
                    isFrozen = true;
                    if (state.time % 20 === 0) {
                        char.hp -= 5;
                        char.hitFlash = 5;
                        if (isPlayer) setP1Health(char.hp); else setP2Health(char.hp);
                    }
                }
            }
            if (isFrozen) char.speed *= 0.1;
            
            return { damageMult, damageTakenMult, isShielded, isLovely, isGtMode, isGold, isVoidTrapped };
        };

        const p1Status = manageEffects(state.p1, true);
        const p2Status = manageEffects(state.p2, false);

        // --- Soni Body Collision Logic (Touch of Death) ---
        const dxBody = state.p1.x - state.p2.x;
        const dyBody = state.p1.y - state.p2.y;
        const distBody = Math.sqrt(dxBody*dxBody + dyBody*dyBody);
        const minDist = state.p1.radius + state.p2.radius;

        if (distBody < minDist) {
            if (p1Status.isGold && state.p1.contactCooldown <= 0) {
                const dmg = state.p2.maxHp * 0.5;
                state.p2.hp -= dmg;
                setP2Health(state.p2.hp);
                state.p2.hitFlash = 20;
                addFloatingText(state.p2.x, state.p2.y - 50, "-50% HP!", '#facc15', 'large');
                state.p1.contactCooldown = 120; // 2 seconds cooldown
                state.screenShake = 30;
                playSound('hit');
                state.p2.vx -= (dxBody/distBody) * 20;
                state.p2.vy -= (dyBody/distBody) * 20;
            }
            if (p2Status.isGold && state.p2.contactCooldown <= 0) {
                const dmg = state.p1.maxHp * 0.5;
                state.p1.hp -= dmg;
                setP1Health(state.p1.hp);
                state.p1.hitFlash = 20;
                addFloatingText(state.p1.x, state.p1.y - 50, "-50% HP!", '#facc15', 'large');
                state.p2.contactCooldown = 120;
                state.screenShake = 30;
                playSound('hit');
                state.p1.vx += (dxBody/distBody) * 20;
                state.p1.vy += (dyBody/distBody) * 20;
            }
        }

        // --- P1 MOVEMENT ---
        let moveX = 0, moveY = 0;
        
        if (joystickRef.current.active) {
            moveX = joystickRef.current.dx / 40; 
            moveY = joystickRef.current.dy / 40;
        } else {
            if (state.keys.ArrowUp || state.keys.KeyW) moveY = -1;
            if (state.keys.ArrowDown || state.keys.KeyS) moveY = 1;
            if (state.keys.ArrowLeft || state.keys.KeyA) moveX = -1;
            if (state.keys.ArrowRight || state.keys.KeyD) moveX = 1;
        }

        if (Math.abs(moveX) > 1) moveX = Math.sign(moveX);
        if (Math.abs(moveY) > 1) moveY = Math.sign(moveY);

        if (!joystickRef.current.active && (moveX !== 0 || moveY !== 0)) {
            const len = Math.sqrt(moveX*moveX + moveY*moveY);
            if (len > 0) {
                moveX /= len;
                moveY /= len;
            }
        }

        if (!isNaN(state.p1.speed)) {
            state.p1.vx += moveX * state.p1.speed * 0.2; 
            state.p1.vy += moveY * state.p1.speed * 0.2;
        }
        state.p1.vx *= 0.85; 
        state.p1.vy *= 0.85;

        if (!isNaN(state.p1.vx)) state.p1.x += state.p1.vx;
        if (!isNaN(state.p1.vy)) state.p1.y += state.p1.vy;

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

            const baseVx = Math.cos(angle);
            const baseVy = Math.sin(angle);
            const validVelocity = isNaN(bulletVelocity) ? 12 : bulletVelocity;
            
            if (p1Status.isGtMode || p1Status.isGold) {
                for (let i = -1; i <= 1; i++) {
                     const spreadAngle = angle + (i * 0.2);
                     const svx = Math.cos(spreadAngle);
                     const svy = Math.sin(spreadAngle);
                     
                    const rand = Math.random();
                    let bColor = '#ef4444';
                    let bType: 'FIRE' | 'ICE' | 'MANAN' | 'VOID' = 'FIRE';
                    
                    if (p1Status.isGold) {
                         bColor = rand > 0.5 ? '#facc15' : '#000000';
                         bType = rand > 0.5 ? 'FIRE' : 'VOID'; 
                    } else {
                        if (rand > 0.6) { bColor = '#06b6d4'; bType = 'ICE'; }
                        else if (rand > 0.3) { bColor = '#3b82f6'; bType = 'MANAN'; }
                    }
                    
                    state.bullets.push({
                        x: state.p1.x + svx * state.p1.radius,
                        y: state.p1.y + svy * state.p1.radius,
                        vx: svx * validVelocity * 1.5, 
                        vy: svy * validVelocity * 1.5,
                        owner: 'p1',
                        dmg: (15 + p1.stats.power) * p1Status.damageMult,
                        size: 25, 
                        color: bColor,
                        isSpecial: true,
                        logicType: bType
                    });
                }
                state.p1.cooldown = 4;
            } else {
                const bulletSize = 10;
                state.bullets.push({
                    x: state.p1.x + baseVx * state.p1.radius,
                    y: state.p1.y + baseVy * state.p1.radius,
                    vx: baseVx * validVelocity, 
                    vy: baseVy * validVelocity,
                    owner: 'p1',
                    dmg: (8 + (p1.stats.power * 0.8)) * p1Status.damageMult,
                    size: bulletSize, 
                    color: '#a855f7',
                    img: state.bulletImg || undefined
                });
                state.p1.cooldown = 15 - Math.min(10, p1.stats.speed); 
            }
        }

        // P1 Special
        if (state.keys.KeyE && state.p1.specialCharge >= 100) {
            fireSpecial(state.p1, 'p1', p1Status.damageMult);
        }

        // --- P2 LOGIC ---
        if (multiplayer && multiplayer.role === 'HOST') {
            const rk = state.remoteKeys;
            let rmX = 0, rmY = 0;
            if (rk.joystick.active) {
                rmX = rk.joystick.dx / 40;
                rmY = rk.joystick.dy / 40;
            } else {
                if (rk.keys.ArrowUp || rk.keys.KeyW) rmY = -1;
                if (rk.keys.ArrowDown || rk.keys.KeyS) rmY = 1;
                if (rk.keys.ArrowLeft || rk.keys.KeyA) rmX = -1;
                if (rk.keys.ArrowRight || rk.keys.KeyD) rmX = 1;
            }

            if (Math.abs(rmX) > 1) rmX = Math.sign(rmX);
            if (Math.abs(rmY) > 1) rmY = Math.sign(rmY);

            state.p2.vx += rmX * state.p2.speed * 0.2;
            state.p2.vy += rmY * state.p2.speed * 0.2;

            if (state.p2.cooldown > 0) state.p2.cooldown--;
            if (rk.keys.Space && state.p2.cooldown <= 0) {
                 playSound('shoot');
                 let angle = 0;
                 if (rk.joystick.active) {
                     angle = Math.atan2(rk.joystick.dy, rk.joystick.dx);
                 } else {
                     angle = Math.atan2(rk.mouse.y - state.p2.y, rk.mouse.x - state.p2.x);
                 }
                 if(isNaN(angle)) angle = 0;

                 state.bullets.push({
                    x: state.p2.x,
                    y: state.p2.y,
                    vx: Math.cos(angle) * 7,
                    vy: Math.sin(angle) * 7,
                    owner: 'p2',
                    dmg: (8 + (p2.stats.power * 0.8)) * p2Status.damageMult,
                    size: 8,
                    color: '#ef4444'
                 });
                 state.p2.cooldown = 20;
            }
            if (rk.keys.KeyE && state.p2.specialCharge >= 100) {
                fireSpecial(state.p2, 'p2', p2Status.damageMult);
            }

        } else {
            // AI Logic
            const dx = state.p1.x - state.p2.x;
            const dy = state.p1.y - state.p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const aggression = difficulty >= 1.5 ? 1.5 : (difficulty <= 0.5 ? 0.7 : 1);
            
            if (dist > 350) {
                const angle = Math.atan2(dy, dx);
                if (!isNaN(angle)) {
                    state.p2.vx += Math.cos(angle) * state.p2.speed * 0.1 * aggression;
                    state.p2.vy += Math.sin(angle) * state.p2.speed * 0.1 * aggression;
                }
            } else {
                state.p2.vx += Math.sin(state.time * 0.05) * state.p2.speed * 0.15 * aggression;
                state.p2.vy += Math.cos(state.time * 0.03) * state.p2.speed * 0.15 * aggression;
            }

            if (state.p2.cooldown > 0) state.p2.cooldown--;
            else {
                // Boss Damage Scaling
                const bossDmg = (5 + (p2.stats.power * 0.6)) * p2Status.damageMult * difficulty;
                
                // Enhanced AI Shooting for GT/God Mode
                if (p2Status.isGtMode || p2Status.isGold) {
                    const angle = Math.atan2(state.p1.y - state.p2.y, state.p1.x - state.p2.x);
                    
                    if (state.time % 20 === 0) { // Fast fire rate for specials
                        playSound('shoot');
                        if (p2Status.isGold) {
                             // VOID BEAM (Large, High Dmg, Void Type)
                             state.bullets.push({
                                x: state.p2.x, y: state.p2.y,
                                vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20,
                                owner: 'p2',
                                dmg: bossDmg * 2,
                                size: 50,
                                color: '#000000',
                                isSpecial: true,
                                logicType: 'VOID'
                            });
                        } else {
                             // GT SPREAD (Shotgun style)
                             for(let i = -2; i <= 2; i++) {
                                 const spread = angle + (i * 0.1);
                                 state.bullets.push({
                                    x: state.p2.x, y: state.p2.y,
                                    vx: Math.cos(spread) * 15, vy: Math.sin(spread) * 15,
                                    owner: 'p2',
                                    dmg: bossDmg,
                                    size: 15,
                                    color: '#ef4444',
                                    isSpecial: true,
                                    logicType: 'FIRE'
                                });
                             }
                        }
                    }
                } else {
                    // Standard AI Shooting Patterns
                    const fireRate = difficulty >= 2.0 ? 20 : 35;
                    if (state.time % 250 < 120) {
                        playSound('shoot');
                        const angle = Math.atan2(state.p1.y - state.p2.y, state.p1.x - state.p2.x);
                        state.bullets.push({
                        x: state.p2.x,
                        y: state.p2.y,
                        vx: Math.cos(angle) * 7 * aggression,
                        vy: Math.sin(angle) * 7 * aggression,
                        owner: 'p2',
                        dmg: bossDmg,
                        size: 8,
                        color: '#ef4444'
                        });
                        state.p2.cooldown = fireRate;
                    } else {
                        playSound('shoot');
                        for(let i=0; i<8; i++){
                            const angle = (i / 8) * Math.PI * 2;
                            state.bullets.push({
                                x: state.p2.x,
                                y: state.p2.y,
                                vx: Math.cos(angle) * 5 * aggression, 
                                vy: Math.sin(angle) * 5 * aggression,
                                owner: 'p2',
                                dmg: bossDmg * 0.8,
                                size: 7,
                                color: '#ef4444'
                            });
                        }
                        state.p2.cooldown = difficulty >= 2 ? 60 : 90;
                    }
                }
            }

            if (state.p2.specialCharge >= 100) fireSpecial(state.p2, 'p2', p2Status.damageMult);
        }
        
        state.p2.vx *= 0.9;
        state.p2.vy *= 0.9;
        
        if (!isNaN(state.p2.vx)) state.p2.x += state.p2.vx;
        if (!isNaN(state.p2.vy)) state.p2.y += state.p2.vy;
        state.p2.x = Math.max(state.p2.radius, Math.min(canvas.width - state.p2.radius, state.p2.x));
        state.p2.y = Math.max(state.p2.radius, Math.min(canvas.height - state.p2.radius, state.p2.y));

        updateBullets(canvas, state, p1Status, p2Status);

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

        updateParticlesAndText(state);
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const state = gameState.current;

      // Screen Shake
      ctx.save();
      if (state.screenShake > 0) {
          ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
      }

      // Draw Characters
      const drawChar = (char: typeof state.p1, isP1: boolean) => {
          ctx.save();
          // Draw Effects Aura
          char.effects.forEach(effect => {
             ctx.beginPath();
             ctx.arc(char.x, char.y, char.radius + 10, 0, Math.PI * 2);
             if(effect.type === 'SHIELD') ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
             else if(effect.type === 'FREEZE') ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
             else if(effect.type === 'GIANT') ctx.fillStyle = 'rgba(252, 211, 77, 0.3)';
             else if(effect.type === 'GOLD_MODE') {
                 ctx.shadowBlur = 20;
                 ctx.shadowColor = 'gold';
                 ctx.fillStyle = 'rgba(250, 204, 21, 0.5)';
             }
             else ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
             ctx.fill();
             ctx.shadowBlur = 0;
          });

          // Draw Character Image
          ctx.beginPath();
          ctx.arc(char.x, char.y, char.radius, 0, Math.PI * 2);
          ctx.save();
          ctx.clip();
          
          if (char.hitFlash > 0 && Math.floor(state.time / 2) % 2 === 0) {
              ctx.globalCompositeOperation = 'source-atop';
              ctx.fillStyle = 'white';
              ctx.fillRect(char.x - char.radius, char.y - char.radius, char.radius * 2, char.radius * 2);
          } else {
              try {
                  ctx.drawImage(char.img, char.x - char.radius, char.y - char.radius, char.radius * 2, char.radius * 2);
              } catch (e) {
                  ctx.fillStyle = isP1 ? 'blue' : 'red';
                  ctx.fill();
              }
          }
          ctx.restore(); 

          // Outline
          ctx.beginPath();
          ctx.arc(char.x, char.y, char.radius, 0, Math.PI * 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = isP1 ? '#a855f7' : '#ef4444';
          if(char.effects.some(e => e.type === 'GOLD_MODE')) ctx.strokeStyle = 'gold';
          ctx.stroke();

          // HP Bar above head
          const hpPct = Math.max(0, char.hp / char.maxHp);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(char.x - 30, char.y - char.radius - 15, 60, 8);
          ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : (hpPct > 0.2 ? '#eab308' : '#ef4444');
          ctx.fillRect(char.x - 30, char.y - char.radius - 15, 60 * hpPct, 8);
          
          // Special Charge Bar
          const spPct = Math.min(100, char.specialCharge) / 100;
          if (spPct > 0) {
              ctx.fillStyle = '#3b82f6';
              ctx.fillRect(char.x - 30, char.y - char.radius - 5, 60 * spPct, 4);
          }

          ctx.restore();
      };

      drawChar(state.p1, true);
      drawChar(state.p2, false);

      // Draw Bullets
      state.bullets.forEach(b => {
          ctx.save();
          ctx.translate(b.x, b.y);
          if (b.img) {
               ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI/2);
               ctx.drawImage(b.img, -b.size, -b.size, b.size*2, b.size*2);
          } else {
               ctx.beginPath();
               ctx.arc(0, 0, b.size, 0, Math.PI * 2);
               ctx.fillStyle = b.color;
               ctx.shadowBlur = 10;
               ctx.shadowColor = b.color;
               ctx.fill();
          }
          ctx.restore();
      });

      // Draw PowerUps
      state.powerups.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 15;
          ctx.shadowColor = p.type === 'HEAL' ? '#22c55e' : (p.type === 'BLACK_HOLE' ? '#7e22ce' : '#f59e0b');
          ctx.fill();
          
          ctx.rotate(-p.rotation); 
          ctx.fillStyle = '#000';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = p.type === 'HEAL' ? '+' : (p.type === 'SPEED' ? '⚡' : (p.type === 'POWER' ? '⚔️' : '⚫'));
          ctx.fillText(icon, 0, 0);

          ctx.restore();
      });

      state.blackHoles.forEach(bh => {
          ctx.save();
          ctx.translate(bh.x, bh.y);
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.fillStyle = 'black';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#7e22ce';
          ctx.fill();
          ctx.strokeStyle = '#d8b4fe';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
      });

      state.particles.forEach(p => {
          ctx.save();
          ctx.globalAlpha = p.life / 30; 
          ctx.fillStyle = p.color;
          if (p.isHeart) {
               ctx.font = `${p.size*2}px serif`;
               ctx.fillText('❤', p.x, p.y);
          } else {
               ctx.beginPath();
               ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
               ctx.fill();
          }
          ctx.restore();
      });

      state.texts.forEach(t => {
          ctx.save();
          ctx.font = `bold ${t.size === 'large' ? '24px' : '14px'} monospace`;
          ctx.fillStyle = t.color;
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.fillText(t.text, t.x, t.y);
          ctx.restore();
      });
      
      if (aimMode === 'MANUAL' && !multiplayer) {
          ctx.beginPath();
          ctx.moveTo(state.p1.x, state.p1.y);
          ctx.lineTo(state.mouse.x, state.mouse.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.beginPath();
          ctx.arc(state.mouse.x, state.mouse.y, 10, 0, Math.PI * 2);
          ctx.strokeStyle = 'red';
          ctx.stroke();
      }

      ctx.restore(); 
  };

  const animate = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const state = gameState.current;

    try {
        if (state.gameEnded) {
            // Draw last frame state
        } else if (isPausedRef.current) {
            // Paused
        } else {
             if (!multiplayer || multiplayer.role === 'HOST') {
                 updateGameLogic(canvas, state);
             }
             
             if (multiplayer) {
                 if (multiplayer.role === 'HOST') {
                     multiplayer.conn.send({
                         type: 'GAME_STATE',
                         payload: {
                             p1: { x: state.p1.x, y: state.p1.y, hp: state.p1.hp, effects: state.p1.effects, sc: state.p1.specialCharge, hf: state.p1.hitFlash },
                             p2: { x: state.p2.x, y: state.p2.y, hp: state.p2.hp, effects: state.p2.effects, sc: state.p2.specialCharge, hf: state.p2.hitFlash },
                             bullets: state.bullets.map(b => ({ ...b, img: undefined })),
                             bhs: state.blackHoles,
                             time: state.time,
                             shake: state.screenShake,
                         }
                     });
                 } else {
                     multiplayer.conn.send({
                         type: 'INPUT',
                         payload: {
                             keys: state.keys,
                             mouse: state.mouse,
                             joystick: joystickRef.current
                         }
                     });
                 }
             }
        }
    } catch (error) {
        console.error("Game Update Error:", error);
    }

    try {
        if (isPausedRef.current) {
            draw(ctx, canvas);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            draw(ctx, canvas);
        }
    } catch (error) {
        console.error("Game Draw Error:", error);
    }
    
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            gameState.current.width = window.innerWidth;
            gameState.current.height = window.innerHeight;
        }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    gameState.current.p1.img.src = p1.imageSrc;
    gameState.current.p2.img.src = p2.imageSrc;
    
    if (customBullet) {
        const img = new Image();
        img.src = customBullet;
        gameState.current.bulletImg = img;
    }

    if (multiplayer) {
        multiplayer.conn.on('data', (packet: any) => {
            if (packet.type === 'INPUT' && multiplayer.role === 'HOST') {
                gameState.current.remoteKeys = packet.payload;
            } else if (packet.type === 'GAME_STATE' && multiplayer.role === 'CLIENT') {
                const pl = packet.payload;
                gameState.current.p1.x = pl.p1.x;
                gameState.current.p1.y = pl.p1.y;
                gameState.current.p1.hp = pl.p1.hp;
                gameState.current.p1.effects = pl.p1.effects;
                gameState.current.p1.specialCharge = pl.p1.sc;
                gameState.current.p1.hitFlash = pl.p1.hf;

                gameState.current.p2.x = pl.p2.x;
                gameState.current.p2.y = pl.p2.y;
                gameState.current.p2.hp = pl.p2.hp;
                gameState.current.p2.effects = pl.p2.effects;
                gameState.current.p2.specialCharge = pl.p2.sc;
                gameState.current.p2.hitFlash = pl.p2.hf;

                gameState.current.bullets = pl.bullets;
                gameState.current.blackHoles = pl.bhs;
                gameState.current.time = pl.time;
                gameState.current.screenShake = pl.shake;

                setP1Health(pl.p1.hp);
                setP2Health(pl.p2.hp);
                setP1Special(pl.p1.sc);
                setP2Special(pl.p2.sc);
                
                if (pl.events) {
                    pl.events.forEach((evt: any) => {
                        if (evt.type === 'sound') playSound(evt.val);
                        if (evt.type === 'text') addFloatingText(evt.x, evt.y, evt.text, evt.color, evt.size);
                        if (evt.type === 'particle') createParticles(evt.x, evt.y, evt.color, evt.count, evt.size);
                    });
                }
            } else if (packet.type === 'GAME_OVER') {
                gameState.current.gameEnded = true;
                onGameOver(packet.payload);
            }
        });
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
        
        const rect = canvas.getBoundingClientRect();
        
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
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', initAudio);
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-screen bg-black overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
         <div className="bg-slate-900/80 p-2 rounded border border-purple-500">
             <div className="text-xs text-purple-400 font-bold">PLAYER 1</div>
             <div className="text-xl text-white font-mono">{Math.ceil(p1Health)} HP</div>
         </div>
      </div>
      <div className="absolute top-4 right-4 z-10 text-right flex flex-col gap-2">
         <div className="bg-slate-900/80 p-2 rounded border border-red-500">
             <div className="text-xs text-red-400 font-bold">PLAYER 2</div>
             <div className="text-xl text-white font-mono">{Math.ceil(p2Health)} HP</div>
         </div>
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="block bg-slate-900 cursor-crosshair touch-none"
      />

      <div className="absolute bottom-4 left-4 z-20 md:hidden">
         <div 
            className="w-32 h-32 bg-white/10 rounded-full relative touch-none backdrop-blur-sm border border-white/20"
            onTouchStart={(e) => {
                const touch = e.touches[0];
                joystickRef.current.active = true;
                joystickRef.current.startX = touch.clientX;
                joystickRef.current.startY = touch.clientY;
            }}
            onTouchMove={(e) => {
                if(!joystickRef.current.active) return;
                const touch = e.touches[0];
                const dx = touch.clientX - joystickRef.current.startX;
                const dy = touch.clientY - joystickRef.current.startY;
                joystickRef.current.dx = dx;
                joystickRef.current.dy = dy;
            }}
            onTouchEnd={() => {
                joystickRef.current.active = false;
                joystickRef.current.dx = 0;
                joystickRef.current.dy = 0;
            }}
         >
            <div 
                className="w-12 h-12 bg-white/50 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg"
                style={{
                    transform: `translate(${joystickRef.current.dx * 0.5}px, ${joystickRef.current.dy * 0.5}px) translate(-50%, -50%)`
                }}
            />
         </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-20 md:hidden flex flex-col gap-4">
          <button 
            className="w-16 h-16 bg-red-500/80 rounded-full border-2 border-red-400 text-white font-bold shadow-lg active:scale-95 transition-transform"
            onTouchStart={(e) => { e.preventDefault(); (gameState.current.keys as any)['Space'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); (gameState.current.keys as any)['Space'] = false; }}
          >
            SHOOT
          </button>
          <button 
            className={`w-16 h-16 rounded-full border-2 text-white font-bold shadow-lg active:scale-95 transition-all ${p1Special >= 100 ? 'bg-purple-600 border-purple-400 animate-pulse' : 'bg-slate-700/80 border-slate-600 opacity-50'}`}
            onTouchStart={(e) => { e.preventDefault(); (gameState.current.keys as any)['KeyE'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); (gameState.current.keys as any)['KeyE'] = false; }}
          >
            ULT
          </button>
      </div>

      {isPaused && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-fade-in">
              <h2 className="text-5xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8 drop-shadow-lg">PAUSED</h2>
              <div className="flex flex-col gap-4 w-64">
                  <Button onClick={togglePause} className="w-full text-lg">RESUME</Button>
                  <Button onClick={onExit} variant="danger" className="w-full text-lg">EXIT BATTLE</Button>
              </div>
          </div>
      )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-xs bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm hidden md:block">
         [ESC] Pause | [SPACE] Shoot | [E] Special ({Math.floor(p1Special)}%)
      </div>
    </div>
  );
};