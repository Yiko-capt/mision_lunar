import { interpolateHorizon } from './io/normalizers';
import type { UnifiedHorizon, UnifiedEphemeris } from './io/schemas';

export const CONSTANTS = {
  R_LUNA_KM: 1737.4,
  S0_W_M2: 1361.0,
  R_SOL_DEG: 0.267,
  R_TIERRA_DEG: 0.950,
  H_OBS_M: 2.0,
  D_MAX_KM: 100.0,
  PASO_AZIMUT_DEG: 1.0,
  DEFAULT_ETA: 0.28,
  DEFAULT_AREA_M2: 1.0,
};

/**
 * Fracción visible del disco solar f(x) en [0, 1] conforme a sección 3.2 de convenciones.md.
 * x = (El_sol - El_hor) / R_sol
 */
export function diskFraction(elSol: number, elHor: number, rSol = CONSTANTS.R_SOL_DEG): number {
  const x = (elSol - elHor) / rSol;
  if (x <= -1.0) return 0.0;
  if (x >= 1.0) return 1.0;
  return (1.0 / Math.PI) * (Math.acos(-x) + x * Math.sqrt(1.0 - x * x));
}

/**
 * Modelo de potencia solar P(t) = f(x) * S0 * eta * A * sin(e_eff) conforme a sección 3.3.
 */
export function solarPower(
  elSol: number,
  elHor: number,
  eta = CONSTANTS.DEFAULT_ETA,
  areaM2 = CONSTANTS.DEFAULT_AREA_M2,
  tracking = false
): number {
  const f = diskFraction(elSol, elHor);
  if (f <= 0) return 0;
  const sinEff = tracking ? 1.0 : Math.max(0, Math.sin((elSol * Math.PI) / 180));
  return f * CONSTANTS.S0_W_M2 * eta * areaM2 * sinEff;
}

export interface ComputedPoint {
  index: number;
  timestamp_utc: string;
  sun_el: number;
  sun_az: number;
  earth_el: number;
  earth_az: number;
  hor_sun: number;
  hor_earth: number;
  sun_visible: boolean; // disco completo o parcial (f > 0)
  sun_fully_visible: boolean; // disco completo (f >= 1)
  disk_fraction: number;
  earth_nominal: boolean; // El_tierra > El_hor
  earth_margen: boolean; // El_tierra - R_tierra > El_hor
  power_w_m2: number;
  hours_to_sun_sunset: number | null;
  hours_to_earth_loss: number | null;
}

export interface ComputedTrajectory {
  points: ComputedPoint[];
  stepHours: number;
  totalHours: number;
  summary: {
    sun_hours: number;
    sun_pct: number;
    sun_max_el: number;
    earth_hours_nominal: number;
    earth_pct_nominal: number;
    earth_hours_margen: number;
    earth_pct_margen: number;
    total_energy_wh_m2: number;
    max_power_w: number;
  };
}

/**
 * Calcula la trayectoria completa, cruces de horizonte, visibilidad, potencia y tiempos hasta el ocaso.
 */
export function computeTrajectory(
  horizon: UnifiedHorizon,
  ephemeris: UnifiedEphemeris,
  stepHours = 1.0
): ComputedTrajectory {
  const pts = ephemeris.datos;
  const N = pts.length;
  if (N === 0) {
    return {
      points: [],
      stepHours,
      totalHours: 0,
      summary: {
        sun_hours: 0,
        sun_pct: 0,
        sun_max_el: -90,
        earth_hours_nominal: 0,
        earth_pct_nominal: 0,
        earth_hours_margen: 0,
        earth_pct_margen: 0,
        total_energy_wh_m2: 0,
        max_power_w: 0,
      },
    };
  }

  const computed: ComputedPoint[] = [];
  let sunHours = 0;
  let earthNominalHours = 0;
  let earthMargenHours = 0;
  let sunMaxEl = -90;
  let totalEnergyWh = 0;
  let maxPowerW = 0;

  for (let i = 0; i < N; i++) {
    const pt = pts[i];
    const horSun = interpolateHorizon(pt.sol_azimut_deg, horizon.elevationLookup);
    const horEarth = interpolateHorizon(pt.tierra_azimut_deg, horizon.elevationLookup);

    const f = diskFraction(pt.sol_elevacion_deg, horSun);
    const sunVis = f > 0;
    const sunFull = f >= 1.0;
    const earthNom = pt.tierra_elevacion_deg > horEarth;
    const earthMar = pt.tierra_elevacion_deg - CONSTANTS.R_TIERRA_DEG > horEarth;
    const pwr = solarPower(pt.sol_elevacion_deg, horSun);

    if (f > 0) sunHours += f * stepHours;
    if (earthNom) earthNominalHours += stepHours;
    if (earthMar) earthMargenHours += stepHours;
    if (pt.sol_elevacion_deg > sunMaxEl) sunMaxEl = pt.sol_elevacion_deg;
    totalEnergyWh += pwr * stepHours;
    if (pwr > maxPowerW) maxPowerW = pwr;

    computed.push({
      index: i,
      timestamp_utc: pt.timestamp_utc,
      sun_el: pt.sol_elevacion_deg,
      sun_az: pt.sol_azimut_deg,
      earth_el: pt.tierra_elevacion_deg,
      earth_az: pt.tierra_azimut_deg,
      hor_sun: horSun,
      hor_earth: horEarth,
      sun_visible: sunVis,
      sun_fully_visible: sunFull,
      disk_fraction: f,
      earth_nominal: earthNom,
      earth_margen: earthMar,
      power_w_m2: pwr,
      hours_to_sun_sunset: null, // se calculará en pasada hacia adelante
      hours_to_earth_loss: null,
    });
  }

  // Pasada hacia adelante para determinar tiempo hasta el próximo ocaso / salida
  for (let i = 0; i < N; i++) {
    const current = computed[i];

    // Ocaso solar: si actualmente hay luz, ¿cuándo se pone (f == 0)?
    if (current.sun_visible) {
      let sunsetFound = false;
      for (let j = i + 1; j < N; j++) {
        if (!computed[j].sun_visible) {
          current.hours_to_sun_sunset = (j - i) * stepHours;
          sunsetFound = true;
          break;
        }
      }
      if (!sunsetFound) current.hours_to_sun_sunset = null; // No se oculta en el período analizado
    }

    // Pérdida de Tierra: si actualmente hay enlace nominal, ¿cuándo cae bajo el horizonte?
    if (current.earth_nominal) {
      let lossFound = false;
      for (let j = i + 1; j < N; j++) {
        if (!computed[j].earth_nominal) {
          current.hours_to_earth_loss = (j - i) * stepHours;
          lossFound = true;
          break;
        }
      }
      if (!lossFound) current.hours_to_earth_loss = null; // No se pierde en el período analizado
    }
  }

  const totalHours = N * stepHours;
  return {
    points: computed,
    stepHours,
    totalHours,
    summary: {
      sun_hours: Number(sunHours.toFixed(1)),
      sun_pct: Number(((sunHours / totalHours) * 100).toFixed(1)),
      sun_max_el: Number(sunMaxEl.toFixed(2)),
      earth_hours_nominal: Number(earthNominalHours.toFixed(1)),
      earth_pct_nominal: Number(((earthNominalHours / totalHours) * 100).toFixed(1)),
      earth_hours_margen: Number(earthMargenHours.toFixed(1)),
      earth_pct_margen: Number(((earthMargenHours / totalHours) * 100).toFixed(1)),
      total_energy_wh_m2: Number(totalEnergyWh.toFixed(1)),
      max_power_w: Number(maxPowerW.toFixed(1)),
    },
  };
}
