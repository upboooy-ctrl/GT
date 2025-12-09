export interface FighterStats {
  name: string;
  title: string;
  description: string;
  hp: number;
  speed: number;
  power: number;
  specialMove: string;
  quote: string;
}

export interface FighterData {
  id: 'player1' | 'player2';
  imageSrc: string; // Base64 or URL
  stats: FighterStats;
  specialId?: SpecialId; // New field for logic mapping
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  VERSUS = 'VERSUS',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LOBBY = 'LOBBY', // New state
}

export interface GameResult {
  winner: FighterData | null; // null if draw? (unlikely in this logic)
  message: string;
}

export type PowerUpType = 'HEAL' | 'SPEED' | 'POWER' | 'BLACK_HOLE';

export type SpecialId = 'GMASTI' | '6FTBADDIE' | 'ROHANMOB' | 'LAMBARDAAR' | 'SINGH' | 'SONI' | 'PAL' | 'MANAN' | 'ABHAY' | 'GT_MODE';

export interface ActiveEffect {
    type: PowerUpType | 'FREEZE' | 'SHIELD' | 'GIANT' | 'TOUGH' | 'GOLD_MODE' | 'LOVELY' | 'MANAN_CURSE' | 'SHRINK' | 'GT_OVERDRIVE' | 'GRAVITY_WELL' | 'VOID_TRAP';
    duration: number; // frames
}

export interface MultiplayerConfig {
    isMultiplayer: boolean;
    role: 'HOST' | 'CLIENT';
    conn: any; // PeerJS DataConnection
}

export interface RemoteInput {
    keys: Record<string, boolean>;
    mouse: { x: number, y: number };
    joystick: { dx: number, dy: number, active: boolean };
}

export interface NetworkPacket {
    type: 'GAME_STATE' | 'INPUT' | 'GAME_OVER';
    payload: any;
}