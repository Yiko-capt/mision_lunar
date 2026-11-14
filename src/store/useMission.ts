import { create } from 'zustand';
import { daysSince } from '../lib/solar';

export interface MissionState {
  startDays: number;
  durationDays: number;
  simDay: number;        // posición en la línea de tiempo (0..duración)
  minLight: number;
  maxSlope: number;
  requireEarth: boolean;
  minEarth: number;
  selected: number | null; // índice de celda
  update: (p: Partial<MissionState>) => void;
}

export const useMission = create<MissionState>((set) => ({
  startDays: daysSince(new Date(Date.UTC(2027, 7, 1))),
  durationDays: 14,
  simDay: 0,
  minLight: 70,
  maxSlope: 10,
  requireEarth: false,
  minEarth: 50,
  selected: null,
  update: (p) => set(p),
}));