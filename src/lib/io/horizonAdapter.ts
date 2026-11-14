import type { UnifiedHorizon } from './schemas';
import { normalizeLon, normalizeAz } from './normalizers';

export function adaptHorizon(raw: any, defaultSiteId = 'desconocido'): UnifiedHorizon {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El objeto JSON de horizonte es inválido o nulo.');
  }

  const lookup = new Float32Array(360);

  // Formato 1: Convención oficial (Cris - Rol A)
  if (Array.isArray(raw.perfil_horizonte)) {
    const site_id = String(raw.site_id || defaultSiteId);
    const perfil: Array<{ azimut_deg: number; elevacion_maxima_deg: number }> = [];

    // Llenar lookup con -90 por defecto
    lookup.fill(-90);

    for (const p of raw.perfil_horizonte) {
      if (typeof p.azimut_deg === 'number' && typeof p.elevacion_maxima_deg === 'number') {
        const azIdx = Math.round(normalizeAz(p.azimut_deg)) % 360;
        lookup[azIdx] = p.elevacion_maxima_deg;
      }
    }

    // Reconstruir perfil_horizonte ordenado de 0 a 359
    for (let az = 0; az < 360; az++) {
      perfil.push({ azimut_deg: az, elevacion_maxima_deg: lookup[az] });
    }

    return {
      site_id,
      nombre: raw.nombre,
      lat_deg: typeof raw.lat_deg === 'number' ? raw.lat_deg : undefined,
      lon_deg: typeof raw.lon_deg === 'number' ? normalizeLon(raw.lon_deg) : undefined,
      elevacion_sitio_m: typeof raw.elevacion_sitio_m === 'number' ? raw.elevacion_sitio_m : undefined,
      parametros: raw.parametros || { h_obs_m: 2.0, d_max_km: 100.0, paso_azimut_deg: 1.0 },
      perfil_horizonte: perfil,
      elevationLookup: lookup,
      sintetico: false,
      fuenteFormato: 'convencion_cris',
    };
  }

  // Formato 2: Sintético de prueba (Justin - Rol D)
  if (Array.isArray(raw.az_deg) && Array.isArray(raw.elev_deg)) {
    const site_id = String(raw.sitio || raw.site_id || defaultSiteId);
    lookup.fill(-90);

    const len = Math.min(raw.az_deg.length, raw.elev_deg.length);
    for (let i = 0; i < len; i++) {
      const az = normalizeAz(Number(raw.az_deg[i]));
      const el = Number(raw.elev_deg[i]);
      const idx = Math.round(az) % 360;
      lookup[idx] = el;
    }

    // Rellenar interpolando los huecos si az_deg tenía paso mayor a 1°
    for (let az = 0; az < 360; az++) {
      if (lookup[az] === -90) {
        // buscar anterior y posterior
        let prev = az, next = az;
        while (lookup[prev] === -90) prev = (prev - 1 + 360) % 360;
        while (lookup[next] === -90) next = (next + 1) % 360;
        lookup[az] = (lookup[prev] + lookup[next]) / 2;
      }
    }

    const perfil: Array<{ azimut_deg: number; elevacion_maxima_deg: number }> = [];
    for (let az = 0; az < 360; az++) {
      perfil.push({ azimut_deg: az, elevacion_maxima_deg: lookup[az] });
    }

    return {
      site_id,
      nombre: `Sintético (${site_id})`,
      perfil_horizonte: perfil,
      elevationLookup: lookup,
      sintetico: true,
      fuenteFormato: 'sintetico_justin',
    };
  }

  throw new Error(`Estructura de horizonte no reconocida en las claves: ${Object.keys(raw).join(', ')}`);
}
