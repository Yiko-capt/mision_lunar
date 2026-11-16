import type { SiteDataSet } from './io/schemas';
import { interpolateHorizon } from './io/normalizers';
import { R_SOL_DEG, R_EARTH_DEG } from './constants';

export interface CelestialInstant {
  timestampUtc: string;
  sunAz: number;
  sunEl: number;
  earthAz: number;
  earthEl: number;
  localHorizonSun: number;
  localHorizonEarth: number;
  isSunVisible: boolean;
  isEarthVisible: boolean;
  isEarthOccluded: boolean;
  earthRotationRad: number;
  isSynthetic: boolean;
  sourceLabel: string;
}

/**
 * Encuentra o interpola la posición topocéntrica del Sol y de la Tierra
 * para una fecha y hora UTC dada, a partir de las efemérides del sitio.
 * Si la fecha solicitada está fuera de la cobertura del archivo JPL Horizons,
 * recurre al modelo analítico de respaldo indicándolo claramente.
 */
export function getCelestialInstant(
  siteData: SiteDataSet | null,
  targetDate: Date,
  _latDeg = -89.684,
  _lonDeg = 196.739
): CelestialInstant {
  const targetMs = targetDate.getTime();
  const timestampUtc = targetDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Rotación axial de la Tierra: 1 vuelta cada 24 horas de tiempo de misión
  const hoursSinceMidnightUtc =
    targetDate.getUTCHours() +
    targetDate.getUTCMinutes() / 60 +
    targetDate.getUTCSeconds() / 3600;
  const earthRotationRad = (hoursSinceMidnightUtc / 24) * 2 * Math.PI;

  const horizonLookup = siteData?.horizonte?.elevationLookup ?? null;

  // 1. Intentar resolver con efemérides reales de JPL Horizons
  if (siteData?.efemerides && siteData.efemerides.datos.length > 0) {
    const datos = siteData.efemerides.datos;
    const tFirst = new Date(datos[0].timestamp_utc).getTime();
    const tLast = new Date(datos[datos.length - 1].timestamp_utc).getTime();

    if (targetMs >= tFirst && targetMs <= tLast) {
      // Buscar el intervalo [i, i+1]
      let idx = 0;
      let left = 0;
      let right = datos.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const tMid = new Date(datos[mid].timestamp_utc).getTime();
        if (tMid <= targetMs) {
          idx = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      const p0 = datos[idx];
      const p1 = datos[Math.min(datos.length - 1, idx + 1)];
      const t0 = new Date(p0.timestamp_utc).getTime();
      const t1 = new Date(p1.timestamp_utc).getTime();

      const alpha = t1 > t0 ? Math.max(0, Math.min(1, (targetMs - t0) / (t1 - t0))) : 0;

      // Interpolación continua con manejo de salto 360° en azimut
      const lerpAngle = (a0: number, a1: number, t: number) => {
        let diff = (a1 - a0) % 360;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        return ((a0 + diff * t) % 360 + 360) % 360;
      };

      const sAz = lerpAngle(p0.sol_azimut_deg, p1.sol_azimut_deg, alpha);
      const sEl = p0.sol_elevacion_deg + (p1.sol_elevacion_deg - p0.sol_elevacion_deg) * alpha;
      const eAz = lerpAngle(p0.tierra_azimut_deg, p1.tierra_azimut_deg, alpha);
      const eEl = p0.tierra_elevacion_deg + (p1.tierra_elevacion_deg - p0.tierra_elevacion_deg) * alpha;

      const horSun = horizonLookup ? interpolateHorizon(sAz, horizonLookup) : 0;
      const horEarth = horizonLookup ? interpolateHorizon(eAz, horizonLookup) : 0;

      const isSunVis = sEl + R_SOL_DEG > horSun;
      const isEarthVis = eEl > horEarth;
      const isEarthOcc = eEl - R_EARTH_DEG < horEarth;

      const isSynt = siteData.efemerides.sintetico;
      const sourceLabel = isSynt
        ? 'Synthetic ephemerides (Role D)'
        : 'NASA JPL Horizons (coord@301, no refraction)';

      return {
        timestampUtc,
        sunAz: sAz,
        sunEl: sEl,
        earthAz: eAz,
        earthEl: eEl,
        localHorizonSun: horSun,
        localHorizonEarth: horEarth,
        isSunVisible: isSunVis,
        isEarthVisible: isEarthVis,
        isEarthOccluded: isEarthOcc,
        earthRotationRad,
        isSynthetic: isSynt,
        sourceLabel,
      };
    }
  }

  // 2. Modelo analítico topocéntrico aproximado (cuando la fecha está fuera de cobertura o no hay efemérides)
  // Día sinódico lunar = 29.530589 d; mes anomalístico = 27.55455 d; período de libración = 27.321661 d
  const epoch2026 = Date.UTC(2026, 10, 15, 0, 0, 0);
  const diffDays = (targetMs - epoch2026) / 86400000;

  const sunAngle = ((diffDays * 360) / 29.530589) % 360;
  const sAz = (sunAngle + 120.45) % 360;
  const sEl = 1.49 + 0.35 * Math.sin((diffDays * 2 * Math.PI) / 29.530589);

  // Libración lunar en el cielo local (la Tierra no sale ni se pone, solo oscila alrededor de una posición media)
  const librationT = (diffDays * 2 * Math.PI) / 27.321661;
  const eAz = (0.52 + 3.2 * Math.sin(librationT) + 360) % 360;
  const eEl = 4.10 + 2.4 * Math.cos(librationT);

  const horSun = horizonLookup ? interpolateHorizon(sAz, horizonLookup) : 0;
  const horEarth = horizonLookup ? interpolateHorizon(eAz, horizonLookup) : 0;

  return {
    timestampUtc,
    sunAz: sAz,
    sunEl: sEl,
    earthAz: eAz,
    earthEl: eEl,
    localHorizonSun: horSun,
    localHorizonEarth: horEarth,
    isSunVisible: sEl + R_SOL_DEG > horSun,
    isEarthVisible: eEl > horEarth,
    isEarthOccluded: eEl - R_EARTH_DEG < horEarth,
    earthRotationRad,
    isSynthetic: true,
    sourceLabel: 'Approximate analytical model (date outside JPL coverage)',
  };
}

/**
 * Convierte azimut y elevación topocéntrica al sistema de coordenadas de la escena 3D plana
 * de modo que el vector de luz y el marcador apunten con total coherencia astronómica.
 */
export function topocentricToScenePosition(
  azDeg: number,
  elDeg: number,
  distance: number
): [number, number, number] {
  const rAz = (azDeg * Math.PI) / 180;
  const rEl = (elDeg * Math.PI) / 180;

  // En la escena del terreno:
  // Az = 0° (Norte) apunta hacia -Z
  // Az = 90° (Este) apunta hacia +X
  // Az = 180° (Sur) apunta hacia +Z
  // Az = 270° (Oeste) apunta hacia -X
  // El > 0 apunta hacia +Y (arriba)
  const cosEl = Math.cos(rEl);
  const sinEl = Math.sin(rEl);

  const x = distance * cosEl * Math.sin(rAz);
  const y = distance * sinEl;
  const z = -distance * cosEl * Math.cos(rAz);

  return [x, y, z];
}
