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

  // Coordenadas globales seleccionadas sincronizadas entre Globo 3D y Parche
  selectedLat: number;
  selectedLon: number;
  selectedAltKm: number;

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
  selected: 2048, // Centro de la malla 64x64

  // Coordenadas seleccionadas iniciales (Borde Shackleton)
  selectedLat: -89.684,
  selectedLon: 196.739,
  selectedAltKm: 1.52,

  activeSiteId: 'shackleton_rim',
  selectedSiteBId: 'shackleton_floor',
  uiMode: 'public',
  mainTab: 'dashboard',

  update: (p) => set(p),
}));
