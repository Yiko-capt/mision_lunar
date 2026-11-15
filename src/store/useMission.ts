import { create } from 'zustand';
import { daysSince } from '../lib/solar';
import { normalizeLon } from '../lib/io/normalizers';

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
  resetCoordinates: () => void;
}

/**
 * Validador defensivo de coordenadas numéricas.
 * Descarta cadenas de texto corruptas, NaN, infinitos y valores fuera de rango.
 */
export function sanitizeCoordinate(val: unknown, fallback: number, min?: number, max?: number): number {
  if (val == null) return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return fallback;
  if (min !== undefined && num < min) return fallback;
  if (max !== undefined && num > max) return fallback;
  return num;
}

const STORAGE_KEY = 'mision_lunar_state_v1';

function loadPersistedState(): Partial<MissionState> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const clean: Partial<MissionState> = {};

    if (parsed.selectedLat !== undefined) {
      clean.selectedLat = sanitizeCoordinate(parsed.selectedLat, -89.684, -90, 90);
    }
    if (parsed.selectedLon !== undefined) {
      clean.selectedLon = normalizeLon(sanitizeCoordinate(parsed.selectedLon, 196.739));
    }
    if (parsed.selectedAltKm !== undefined) {
      clean.selectedAltKm = sanitizeCoordinate(parsed.selectedAltKm, 1.52, -10, 20);
    }
    if (typeof parsed.activeSiteId === 'string' && parsed.activeSiteId.trim()) {
      clean.activeSiteId = parsed.activeSiteId;
    }
    if (typeof parsed.durationDays === 'number' && Number.isFinite(parsed.durationDays)) {
      clean.durationDays = Math.max(1, Math.min(60, parsed.durationDays));
    }
    if (typeof parsed.minLight === 'number' && Number.isFinite(parsed.minLight)) {
      clean.minLight = Math.max(0, Math.min(100, parsed.minLight));
    }
    if (typeof parsed.maxSlope === 'number' && Number.isFinite(parsed.maxSlope)) {
      clean.maxSlope = Math.max(1, Math.min(45, parsed.maxSlope));
    }
    if (typeof parsed.requireEarth === 'boolean') {
      clean.requireEarth = parsed.requireEarth;
    }

    return clean;
  } catch (err) {
    console.warn('[useMission] Estado en localStorage corrupto; restableciendo valores por defecto:', err);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar errores de localStorage restringido
    }
    return {};
  }
}

const persisted = loadPersistedState();

export const useMission = create<MissionState>((set, get) => ({
  startDays: daysSince(new Date(Date.UTC(2026, 10, 15))), // Época oficial de prueba (15 Nov 2026)
  durationDays: persisted.durationDays ?? 14,
  simDay: 0,
  minLight: persisted.minLight ?? 70,
  maxSlope: persisted.maxSlope ?? 10,
  requireEarth: persisted.requireEarth ?? false,
  minEarth: 50,
  selected: 2048, // Centro de la malla 64x64

  // Coordenadas seleccionadas iniciales (Borde Shackleton: -89.684°, 196.739° E)
  selectedLat: sanitizeCoordinate(persisted.selectedLat, -89.684, -90, 90),
  selectedLon: normalizeLon(sanitizeCoordinate(persisted.selectedLon, 196.739)),
  selectedAltKm: sanitizeCoordinate(persisted.selectedAltKm, 1.52, -10, 20),

  activeSiteId: persisted.activeSiteId ?? 'shackleton_rim',
  selectedSiteBId: 'shackleton_floor',
  uiMode: 'public',
  mainTab: 'dashboard',

  update: (partial) => {
    const cleanUpdate: Partial<MissionState> = { ...partial };

    if (cleanUpdate.selectedLat !== undefined) {
      cleanUpdate.selectedLat = sanitizeCoordinate(cleanUpdate.selectedLat, get().selectedLat ?? -89.684, -90, 90);
    }
    if (cleanUpdate.selectedLon !== undefined) {
      cleanUpdate.selectedLon = normalizeLon(sanitizeCoordinate(cleanUpdate.selectedLon, get().selectedLon ?? 196.739));
    }
    if (cleanUpdate.selectedAltKm !== undefined) {
      cleanUpdate.selectedAltKm = sanitizeCoordinate(cleanUpdate.selectedAltKm, get().selectedAltKm ?? 1.52, -10, 20);
    }

    set((state) => {
      const nextState = { ...state, ...cleanUpdate };

      // Persistir de forma segura en localStorage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const snapshot = {
            selectedLat: nextState.selectedLat,
            selectedLon: nextState.selectedLon,
            selectedAltKm: nextState.selectedAltKm,
            activeSiteId: nextState.activeSiteId,
            durationDays: nextState.durationDays,
            minLight: nextState.minLight,
            maxSlope: nextState.maxSlope,
            requireEarth: nextState.requireEarth,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        }
      } catch {
        // Ignorar excepciones en entornos con cuota llena o privados
      }

      return nextState;
    });
  },

  resetCoordinates: () => {
    set({
      selectedLat: -89.684,
      selectedLon: 196.739,
      selectedAltKm: 1.52,
      selected: 2048,
    });
  },
}));
