import type { CelestialInstant } from './ephemerisService';
import { solarPower, CONSTANTS } from './physics';

/**
 * Estado del punto seleccionado: ÚNICA fuente para el modo Profesional y el modo Estudiante.
 * El indicador de viabilidad del modo Estudiante se deriva de estos mismos números;
 * no hay un cálculo aparte.
 */
export type Viability = 'apt' | 'danger' | 'no_sun' | 'no_data';

export interface PointStatus {
  siteId: string;
  siteName: string;
  utc: string;
  lat: number;
  lon: number;
  altKm: number;
  /** Pendiente de la celda seleccionada del parche de demostración (grados). */
  slopeDeg: number;
  slopeSource: string;
  sunEl: number;
  sunAz: number;
  earthEl: number;
  earthAz: number;
  sunVisible: boolean;
  /** Visibilidad directa de la Tierra (DTE) en el instante. */
  earthVisible: boolean;
  /** Eficiencia solar instantánea (%), misma fórmula del panel de métricas. */
  etaPct: number;
  /** Potencia de un panel horizontal de 1 m² (W). */
  powerW: number;
  ephemerisSource: string;
  outOfCoverage: boolean;
  viability: Viability;
  viabilityReason: string;
}

export const SLOPE_SOURCE = 'Parche sintético de demostración (no es DEM LOLA)';

export interface PointStatusInput {
  siteId: string;
  siteName: string;
  lat: number;
  lon: number;
  altKm: number;
  slopeDeg: number;
  maxSlopeDeg: number;
  celestial: CelestialInstant;
  hasData: boolean;
}

/** η instantánea (%): eficiencia de celda × seno de la elevación solar, 0 si el Sol está oculto. */
export function instantEfficiencyPct(celestial: CelestialInstant): number {
  if (!celestial.isSunVisible) return 0;
  return CONSTANTS.DEFAULT_ETA * Math.sin(Math.max(0, (celestial.sunEl * Math.PI) / 180)) * 100;
}

export function derivePointStatus(input: PointStatusInput): PointStatus {
  const { celestial } = input;
  // "Fuera de cobertura" = el servicio de efemérides tuvo que usar el modelo analítico aproximado
  const outOfCoverage = celestial.isSynthetic && celestial.sourceLabel.includes('fuera de cobertura');
  const etaPct = instantEfficiencyPct(celestial);
  const powerW = solarPower(celestial.sunEl, celestial.localHorizonSun);

  let viability: Viability;
  let viabilityReason: string;
  if (!input.hasData || outOfCoverage) {
    viability = 'no_data';
    viabilityReason = 'No hay efemérides para esta fecha en este sitio.';
  } else if (!celestial.isSunVisible) {
    viability = 'no_sun';
    viabilityReason = `El Sol está a ${celestial.sunEl.toFixed(2)}° y el horizonte en esa dirección a ${celestial.localHorizonSun.toFixed(2)}°: queda tapado.`;
  } else if (input.slopeDeg > input.maxSlopeDeg) {
    viability = 'danger';
    viabilityReason = `La inclinación del suelo (${input.slopeDeg.toFixed(1)}°) supera el máximo permitido (${input.maxSlopeDeg}°).`;
  } else {
    viability = 'apt';
    viabilityReason = `Hay Sol y la inclinación del suelo (${input.slopeDeg.toFixed(1)}°) está dentro del máximo (${input.maxSlopeDeg}°).`;
  }

  return {
    siteId: input.siteId,
    siteName: input.siteName,
    utc: celestial.timestampUtc,
    lat: input.lat,
    lon: input.lon,
    altKm: input.altKm,
    slopeDeg: input.slopeDeg,
    slopeSource: SLOPE_SOURCE,
    sunEl: celestial.sunEl,
    sunAz: celestial.sunAz,
    earthEl: celestial.earthEl,
    earthAz: celestial.earthAz,
    sunVisible: celestial.isSunVisible,
    earthVisible: celestial.isEarthVisible,
    etaPct,
    powerW,
    ephemerisSource: celestial.sourceLabel,
    outOfCoverage,
    viability,
    viabilityReason,
  };
}

export const VIABILITY_LABEL: Record<Viability, string> = {
  apt: 'ZONA APTA PARA ALUNIZAJE',
  danger: 'TERRENO PELIGROSO',
  no_sun: 'SIN LUZ SOLAR',
  no_data: 'SIN DATOS PARA ESTA FECHA',
};
