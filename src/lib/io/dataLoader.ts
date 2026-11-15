import type { SiteDataSet, UnifiedHorizon, UnifiedEphemeris, UnifiedMetrics } from './schemas';
import { adaptHorizon } from './horizonAdapter';
import { adaptEphemeris } from './ephemerisAdapter';
import { adaptMetrics } from './metricsAdapter';
import { DATA_MANIFEST, dataUrl } from './dataManifest';

async function fetchJsonSafely(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Horizonte esférico liso (0° en todos los azimuts) para los sitios que todavía no tienen
 * perfil de terreno. Queda marcado como `fallback` para que la interfaz lo etiquete.
 */
export function flatHorizon(siteId: string): UnifiedHorizon {
  const lookup = new Float32Array(360); // todo en 0°
  return {
    site_id: siteId,
    perfil_horizonte: Array.from({ length: 360 }, (_, az) => ({ azimut_deg: az, elevacion_maxima_deg: 0 })),
    elevationLookup: lookup,
    sintetico: true,
    fuenteFormato: 'fallback',
  };
}

/** Texto corto y veraz sobre el origen del horizonte de un sitio. */
export function horizonSourceLabel(h: UnifiedHorizon | null | undefined): string {
  if (!h) return 'Sin horizonte';
  if (h.fuenteFormato === 'fallback') return 'Horizonte liso 0° (sin perfil de terreno)';
  if (h.sintetico) return 'Horizonte sintético de prueba';
  return 'Horizonte trazado sobre DEM LOLA';
}

export async function loadSiteDataSet(siteId: string): Promise<SiteDataSet> {
  // Solo se pide lo que existe en public/data (ver dataManifest.ts): sin 404 en consola.
  const files = DATA_MANIFEST[siteId] ?? { horizonte: false, efemerides: false, metricas: false };

  const [rawHorizon, rawEphem, rawMetrics, rawLanding] = await Promise.all([
    files.horizonte ? fetchJsonSafely(dataUrl(siteId, 'horizonte.json')) : null,
    files.efemerides ? fetchJsonSafely(dataUrl(siteId, 'efemerides.json')) : null,
    files.metricas ? fetchJsonSafely(dataUrl(siteId, 'metricas.json')) : null,
    files.efemeridesLanding ? fetchJsonSafely(dataUrl(siteId, 'efemerides_landing.json')) : null,
  ]);

  let horizonte: UnifiedHorizon | null = null;
  let efemerides: UnifiedEphemeris | null = null;
  let efemeridesLanding: UnifiedEphemeris | null = null;
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

  if (rawLanding) {
    try {
      efemeridesLanding = adaptEphemeris(rawLanding, siteId);
    } catch (e) {
      console.warn(`Error adaptando efemérides de alunizaje para ${siteId}:`, e);
    }
  }

  if (rawMetrics) {
    try {
      metricas = adaptMetrics(rawMetrics, siteId);
    } catch (e) {
      console.warn(`Error adaptando métricas para ${siteId}:`, e);
    }
  }

  // Hay efemérides pero no perfil de terreno: se calcula con horizonte liso, etiquetado.
  if (!horizonte && efemerides) horizonte = flatHorizon(siteId);

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
    efemeridesLanding,
    metricas,
    cargando: false,
    estadoDatos,
  };
}
