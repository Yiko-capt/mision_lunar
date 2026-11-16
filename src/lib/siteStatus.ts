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

export const SLOPE_SOURCE = 'Synthetic demo patch (not LOLA DEM)';

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

/** Instantaneous η (%): cell efficiency × sin(solar elevation), 0 if Sun is occulted. */
export function instantEfficiencyPct(celestial: CelestialInstant): number {
  if (!celestial.isSunVisible) return 0;
  return CONSTANTS.DEFAULT_ETA * Math.sin(Math.max(0, (celestial.sunEl * Math.PI) / 180)) * 100;
}

export function derivePointStatus(input: PointStatusInput): PointStatus {
  const { celestial } = input;
  // Out of coverage = ephemeris service had to use the approximate analytical fallback
  const outOfCoverage =
    celestial.isSynthetic &&
    (celestial.sourceLabel.includes('fuera de cobertura') ||
      celestial.sourceLabel.includes('outside JPL coverage'));
  const etaPct = instantEfficiencyPct(celestial);
  const powerW = solarPower(celestial.sunEl, celestial.localHorizonSun);

  let viability: Viability;
  let viabilityReason: string;
  if (!input.hasData || outOfCoverage) {
    viability = 'no_data';
    viabilityReason = 'No ephemeris coverage for this date at this site.';
  } else if (!celestial.isSunVisible) {
    viability = 'no_sun';
    viabilityReason = `Sun is at ${celestial.sunEl.toFixed(2)}° and the local horizon is at ${celestial.localHorizonSun.toFixed(2)}°: occulted.`;
  } else if (input.slopeDeg > input.maxSlopeDeg) {
    viability = 'danger';
    viabilityReason = `Terrain slope (${input.slopeDeg.toFixed(1)}°) exceeds maximum allowed (${input.maxSlopeDeg}°).`;
  } else {
    viability = 'apt';
    viabilityReason = `Sunlight available and terrain slope (${input.slopeDeg.toFixed(1)}°) is within limit (${input.maxSlopeDeg}°).`;
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
  apt: 'SUITABLE LANDING ZONE',
  danger: 'HAZARDOUS TERRAIN',
  no_sun: 'NO SUNLIGHT',
  no_data: 'NO DATA FOR THIS DATE',
};
