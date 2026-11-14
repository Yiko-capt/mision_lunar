const D2R = Math.PI / 180;

export const SYNODIC_DAYS = 29.530589; // ciclo de fases (el Sol da una vuelta en el cielo lunar)
export const SIDEREAL_DAYS = 27.321661; // ciclo de libración de la Tierra
export const YEAR_DAYS = 365.25;

const LAT = -88.5 * D2R;       // zona del Polo Sur (aproximada)
const OBLIQUITY = 1.54 * D2R;  // inclinación del eje lunar
const EARTH_LIBRATION = 6.7 * D2R;

// Fecha de referencia para la fase. Reemplazar por efemérides reales (JPL Horizons).
export const PHASE_REF = Date.UTC(2026, 0, 1);

export const daysSince = (d: Date) => (d.getTime() - PHASE_REF) / 86400000;
export const dateFromDays = (days: number) => new Date(PHASE_REF + days * 86400000);

// theta: dirección horizontal en el plano (x, z), en radianes
// el: elevación sobre el horizonte local, en radianes
export function sunState(days: number) {
  const H = (2 * Math.PI * days) / SYNODIC_DAYS;
  const delta = OBLIQUITY * Math.sin((2 * Math.PI * days) / YEAR_DAYS);
  const sinEl = Math.sin(LAT) * Math.sin(delta) + Math.cos(LAT) * Math.cos(delta) * Math.cos(H);
  return { el: Math.asin(Math.max(-1, Math.min(1, sinEl))), theta: H };
}

export function earthState(days: number) {
  return { el: EARTH_LIBRATION * Math.sin((2 * Math.PI * days) / SIDEREAL_DAYS), theta: 0 };
}