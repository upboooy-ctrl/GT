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
}

export interface GameResult {
  winner: FighterData | null; // null if draw? (unlikely in this logic)
  message: string;
}

export type PowerUpType = 'HEAL' | 'SPEED' | 'POWER' | 'BLACK_HOLE';

export type SpecialId = 'GMASTI' | '6FTBADDIE' | 'ROHANMOB' | 'LAMBARDAAR' | 'SINGH' | 'SONI' | 'PAL';
