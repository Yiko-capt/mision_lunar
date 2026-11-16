/**
 * Escenarios de un clic del modo Estudiante.
 *
 * ESTE OBJETO ES EDITABLE: cambia aquí el sitio, la fecha o los filtros de cada
 * escenario y la interfaz se actualiza sola. Reglas:
 *  - `siteId` debe existir en src/data/sites.ts.
 *  - `baseDate` debe caer dentro de la cobertura de efemérides de public/data
 *    (hoy: 2026-11-14 a 2026-12-14), o las métricas saldrán como "fuera de cobertura".
 *  - `durationDays` entre 7 y 28 (límites del control de duración).
 */
export interface StudentScenario {
  id: string;
  icon: string;
  title: string;
  /** Una frase que explica qué se va a ver. */
  blurb: string;
  siteId: string;
  /** Fecha de inicio de la misión (UTC), formato AAAA-MM-DD. */
  baseDate: string;
  /** Hora de inicio (UTC), formato HH:MM. */
  baseTime: string;
  durationDays: number;
  /** Filtros de misión (los mismos del modo Profesional). */
  minLight: number;
  maxSlope: number;
  requireEarth: boolean;
}

export const STUDENT_SCENARIOS: StudentScenario[] = [
  {
    id: 'safe_landing',
    icon: '🛬',
    title: 'Safe Landing',
    blurb: 'A site with sunlight, Earth in view, and gentle ground slope.',
    siteId: 'malapert_peak',
    baseDate: '2026-11-15',
    baseTime: '00:00',
    durationDays: 14,
    minLight: 70,
    maxSlope: 8,
    requireEarth: true,
  },
  {
    id: 'max_solar',
    icon: '☀️',
    title: 'Maximum Solar Energy',
    blurb: 'A polar ridge with near-continuous sunlight during mission window.',
    siteId: 'shackleton_rim',
    baseDate: '2026-11-15',
    baseTime: '00:00',
    durationDays: 28,
    minLight: 90,
    maxSlope: 10,
    requireEarth: false,
  },
  {
    id: 'crater_exploration',
    icon: '🕳️',
    title: 'Crater Exploration',
    blurb: 'A deep polar crater floor where direct sunlight never reaches.',
    siteId: 'shackleton_floor',
    baseDate: '2026-11-15',
    baseTime: '00:00',
    durationDays: 7,
    minLight: 0,
    maxSlope: 15,
    requireEarth: false,
  },
];
