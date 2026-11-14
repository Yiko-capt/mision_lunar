import { create } from 'zustand';
import { daysSince } from '../lib/solar';

export type UIMode = 'public' | 'technical';
export type MainViewTab = 'dashboard' | 'compare' | 'benchmark' | 'patch';

export interface MissionState {
  startDays: number;
  durationDays: number;
  simDay: number; // posición en la línea de tiempo (0..duración)
  minLight: number;
  maxSlope: number;
  requireEarth: boolean;
  minEarth: number;
  selected: number | null; // índice de celda

  // Navegación de sitios e interfaz
  activeSiteId: string;
  selectedSiteBId: string | null;
  uiMode: UIMode;
  mainTab: MainViewTab;

  update: (p: Partial<MissionState>) => void;
}

export const useMission = create<MissionState>((set) => ({
  startDays: daysSince(new Date(Date.UTC(2026, 10, 15))), // Época oficial de prueba
  durationDays: 14,
  simDay: 0,
  minLight: 70,
  maxSlope: 10,
  requireEarth: false,
  minEarth: 50,
  selected: null,

  activeSiteId: 'shackleton_rim',
  selectedSiteBId: 'shackleton_floor',
  uiMode: 'public',
  mainTab: 'dashboard',

  update: (p) => set(p),
}));
