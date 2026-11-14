import type { UnifiedEphemeris, UnifiedEphemerisPoint } from './schemas';
import { normalizeLon, normalizeAz, normalizeTimestampToUtc } from './normalizers';

export function adaptEphemeris(raw: any, defaultSiteId = 'desconocido'): UnifiedEphemeris {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El objeto JSON de efemérides es inválido o nulo.');
  }

  // Formato 1: Convención oficial (Rol B / C)
  if (Array.isArray(raw.datos)) {
    const site_id = String(raw.site_id || defaultSiteId);
    const datos: UnifiedEphemerisPoint[] = raw.datos.map((d: any) => ({
      timestamp_utc: normalizeTimestampToUtc(String(d.timestamp_utc)),
      sol_azimut_deg: normalizeAz(Number(d.sol_azimut_deg)),
      sol_elevacion_deg: Number(d.sol_elevacion_deg),
      tierra_azimut_deg: normalizeAz(Number(d.tierra_azimut_deg)),
      tierra_elevacion_deg: Number(d.tierra_elevacion_deg),
      sol_dist_au: d.sol_dist_au != null ? Number(d.sol_dist_au) : undefined,
      tierra_dist_km: d.tierra_dist_km != null ? Number(d.tierra_dist_km) : undefined,
    }));

    return {
      site_id,
      lat_deg: typeof raw.lat_deg === 'number' ? raw.lat_deg : undefined,
      lon_deg: typeof raw.lon_deg === 'number' ? normalizeLon(raw.lon_deg) : undefined,
      alt_km: typeof raw.alt_km === 'number' ? raw.alt_km : undefined,
      refraccion_aplicada: Boolean(raw.refraccion_aplicada),
      datos,
      sintetico: Boolean(raw.sintetico),
      fuenteFormato: 'convencion',
    };
  }

  // Formato 2: Fabrizio (Rol B)
  if (raw.sun && raw.earth && Array.isArray(raw.t)) {
    const site_id = String(raw.site || defaultSiteId);
    const tList: string[] = raw.t;
    const sunAz: number[] = raw.sun.az || [];
    const sunEl: number[] = raw.sun.el || [];
    const earthAz: number[] = raw.earth.az || [];
    const earthEl: number[] = raw.earth.el || [];

    const count = Math.min(tList.length, sunAz.length, sunEl.length, earthAz.length, earthEl.length);
    const datos: UnifiedEphemerisPoint[] = [];

    for (let i = 0; i < count; i++) {
      datos.push({
        timestamp_utc: normalizeTimestampToUtc(tList[i]),
        sol_azimut_deg: normalizeAz(Number(sunAz[i])),
        sol_elevacion_deg: Number(sunEl[i]),
        tierra_azimut_deg: normalizeAz(Number(earthAz[i])),
        tierra_elevacion_deg: Number(earthEl[i]),
      });
    }

    return {
      site_id,
      lat_deg: typeof raw.lat === 'number' ? raw.lat : undefined,
      lon_deg: typeof raw.lon === 'number' ? normalizeLon(raw.lon) : undefined,
      alt_km: typeof raw.alt === 'number' ? raw.alt : 0.0,
      refraccion_aplicada: false,
      datos,
      sintetico: false,
      fuenteFormato: 'fabrizio',
    };
  }

  // Formato 3: Justin (Rol D - Sintético)
  if (raw.sol && raw.tierra && Array.isArray(raw.t_utc)) {
    const site_id = String(raw.sitio || raw.site_id || defaultSiteId);
    const tList: string[] = raw.t_utc;
    const sunAz: number[] = raw.sol.az || [];
    const sunEl: number[] = raw.sol.el || [];
    const sunR: number[] = raw.sol.r_ua || [];
    const earthAz: number[] = raw.tierra.az || [];
    const earthEl: number[] = raw.tierra.el || [];
    const earthDist: number[] = raw.tierra.dist_km || [];

    const count = Math.min(tList.length, sunAz.length, sunEl.length, earthAz.length, earthEl.length);
    const datos: UnifiedEphemerisPoint[] = [];

    for (let i = 0; i < count; i++) {
      datos.push({
        timestamp_utc: normalizeTimestampToUtc(tList[i]),
        sol_azimut_deg: normalizeAz(Number(sunAz[i])),
        sol_elevacion_deg: Number(sunEl[i]),
        tierra_azimut_deg: normalizeAz(Number(earthAz[i])),
        tierra_elevacion_deg: Number(earthEl[i]),
        sol_dist_au: sunR[i] != null ? Number(sunR[i]) : undefined,
        tierra_dist_km: earthDist[i] != null ? Number(earthDist[i]) : undefined,
      });
    }

    return {
      site_id,
      lat_deg: typeof raw.lat === 'number' ? raw.lat : undefined,
      lon_deg: typeof raw.lon === 'number' ? normalizeLon(raw.lon) : undefined,
      alt_km: 0.0,
      refraccion_aplicada: false,
      datos,
      sintetico: true,
      fuenteFormato: 'sintetico_justin',
    };
  }

  throw new Error(`Estructura de efemérides no reconocida en las claves: ${Object.keys(raw).join(', ')}`);
}
