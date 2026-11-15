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
    title: 'Aterrizaje Seguro',
    blurb: 'Un sitio con Sol y con la Tierra a la vista, y suelo poco inclinado.',
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
    title: 'Máxima Energía Solar',
    blurb: 'Una cresta donde el Sol casi no se pone durante el periodo con datos.',
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
    title: 'Exploración de Cráter',
    blurb: 'El fondo de un cráter polar donde nunca llega la luz del Sol.',
    siteId: 'shackleton_floor',
    baseDate: '2026-11-15',
    baseTime: '00:00',
    durationDays: 7,
    minLight: 0,
    maxSlope: 15,
    requireEarth: false,
  },
];
