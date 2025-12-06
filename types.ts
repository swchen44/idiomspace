export interface Idiom {
  id: string;
  word: string;
  definition: string;
}

export type GameMode = 'DEF_TO_IDIOM' | 'IDIOM_TO_DEF';

export interface WrongRecord {
  idiom: Idiom;
  mode: GameMode;
}

export interface GameState {
  playerHp: number;
  maxPlayerHp: number;
  enemyHp: number;
  maxEnemyHp: number;
  score: number;
  streak: number;
  level: number;
  status: 'MENU' | 'EXPLORING' | 'BATTLE' | 'VICTORY' | 'DEFEAT';
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'miss';
  x: number;
  y: number;
}

export interface WorldMonster {
  id: number;
  x: number;
  z: number;
  level: number;
  isDefeated: boolean;
  color: string;
  bodyType: 'biped' | 'quadruped';
}
