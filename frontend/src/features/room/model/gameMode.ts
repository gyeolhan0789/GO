import type { GameMode } from '../api/roomApi';

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  SINGLE: '혼자',
  COOPERATE: '협동',
  BATTLE: '대결',
};
