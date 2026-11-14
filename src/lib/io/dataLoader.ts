import type { SiteDataSet, UnifiedHorizon, UnifiedEphemeris, UnifiedMetrics } from './schemas';
import { adaptHorizon } from './horizonAdapter';
import { adaptEphemeris } from './ephemerisAdapter';
import { adaptMetrics } from './metricsAdapter';

async function fetchJsonSafely(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loadSiteDataSet(siteId: string): Promise<SiteDataSet> {
  const basePath = `/data/${siteId}`;

  const [rawHorizon, rawEphem, rawMetrics] = await Promise.all([
    fetchJsonSafely(`${basePath}/horizonte.json`),
    fetchJsonSafely(`${basePath}/efemerides.json`),
    fetchJsonSafely(`${basePath}/metricas.json`),
  ]);

  let horizonte: UnifiedHorizon | null = null;
  let efemerides: UnifiedEphemeris | null = null;
  let metricas: UnifiedMetrics | null = null;

  if (rawHorizon) {
    try {
      horizonte = adaptHorizon(rawHorizon, siteId);
    } catch (e) {
      console.warn(`Error adaptando horizonte para ${siteId}:`, e);
    }
  }

  if (rawEphem) {
    try {
      efemerides = adaptEphemeris(rawEphem, siteId);
    } catch (e) {
      console.warn(`Error adaptando efemérides para ${siteId}:`, e);
    }
  }

  if (rawMetrics) {
    try {
      metricas = adaptMetrics(rawMetrics, siteId);
    } catch (e) {
      console.warn(`Error adaptando métricas para ${siteId}:`, e);
    }
  }

  let estadoDatos: 'completo' | 'parcial' | 'sin_datos' = 'sin_datos';
  if (horizonte && efemerides && metricas) {
    estadoDatos = 'completo';
  } else if (horizonte || efemerides || metricas) {
    estadoDatos = 'parcial';
  }

  return {
    site_id: siteId,
    horizonte,
    efemerides,
    metricas,
    cargando: false,
    estadoDatos,
  };
}
