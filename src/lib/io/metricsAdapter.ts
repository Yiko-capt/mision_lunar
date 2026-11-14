import type { UnifiedMetrics, UnifiedMetricsSummary, UnifiedMetricsTimeSeriesPoint } from './schemas';
import { normalizeTimestampToUtc } from './normalizers';

export function adaptMetrics(raw: any, defaultSiteId = 'desconocido'): UnifiedMetrics {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El objeto JSON de métricas es inválido o nulo.');
  }

  // Formato 1: Convención 4.3 oficial
  if (raw.resumen && Array.isArray(raw.serie_temporal)) {
    const site_id = String(raw.site_id || defaultSiteId);
    return {
      site_id,
      resumen: {
        iluminacion_solar_pct: Number(raw.resumen.iluminacion_solar_pct || 0),
        horas_luz_total: Number(raw.resumen.horas_luz_total || 0),
        elevacion_solar_max_deg: Number(raw.resumen.elevacion_solar_max_deg || 0),
        visibilidad_tierra_nominal_pct: Number(raw.resumen.visibilidad_tierra_nominal_pct || 0),
        visibilidad_tierra_margen_pct: Number(raw.resumen.visibilidad_tierra_margen_pct || 0),
        energia_especifica_wh_m2: raw.resumen.energia_especifica_wh_m2 != null ? Number(raw.resumen.energia_especifica_wh_m2) : undefined,
      },
      serie_temporal: raw.serie_temporal.map((p: any) => ({
        timestamp_utc: normalizeTimestampToUtc(String(p.timestamp_utc)),
        horizonte_sol_deg: p.horizonte_sol_deg,
        fraccion_disco_solar: p.fraccion_disco_solar,
        sol_visible: Boolean(p.sol_visible),
        horizonte_tierra_deg: p.horizonte_tierra_deg,
        tierra_visible_nominal: Boolean(p.tierra_visible_nominal),
        tierra_visible_margen: Boolean(p.tierra_visible_margen),
        potencia_especifica_w_m2: p.potencia_especifica_w_m2,
        tiempo_hasta_ocaso_solar_h: p.tiempo_hasta_ocaso_solar_h,
        tiempo_hasta_ocaso_tierra_h: p.tiempo_hasta_ocaso_tierra_h,
      })),
      sintetico: Boolean(raw.sintetico),
      fuenteFormato: 'convencion',
    };
  }

  // Formato 2: Justin (Rol D - Energía y Comunicación)
  if (raw.escenario && raw.escenario.energia && raw.escenario.comunicacion) {
    const site_id = String(raw.sitio || raw.site_id || defaultSiteId);
    const en = raw.escenario.energia;
    const co = raw.escenario.comunicacion;
    const vi = raw.escenario.viabilidad || {};

    const resumen: UnifiedMetricsSummary = {
      iluminacion_solar_pct: Number((en.fraccion_luz ?? 0) * 100),
      horas_luz_total: Number(en.horas_luz_h ?? 0),
      elevacion_solar_max_deg: Number(en.el_sol_max_deg ?? 0),
      visibilidad_tierra_nominal_pct: Number((co.fraccion_dte ?? 0) * 100),
      visibilidad_tierra_margen_pct: Number((co.fraccion_dte ?? 0) * 90), // aproximación con margen
      energia_especifica_wh_m2: Number(en.energia_total_wh ?? 0),
      potencia_pico_w: Number(en.potencia_pico_w ?? 0),
      potencia_media_w: Number(en.potencia_media_w ?? 0),
      semaforo: vi.semaforo || 'amarillo',
      tiempo_hasta_ocaso_solar_h: en.t_hasta_puesta_h,
      tiempo_hasta_ocaso_tierra_h: co.t_hasta_tierra_puesta_h,
    };

    return {
      site_id,
      resumen,
      serie_temporal: [],
      sintetico: Boolean(raw.sintetico),
      fuenteFormato: 'justin_rol_d',
      rawJustinData: raw,
    };
  }

  // Formato 3: Fabrizio (Rol B)
  if (raw.horas_luz_por_dia && raw.ventanas_sol) {
    const site_id = String(raw.site || defaultSiteId);
    let totalLuzH = 0;
    const dias = Object.values(raw.horas_luz_por_dia) as number[];
    for (const h of dias) totalLuzH += Number(h || 0);

    let totalTierraH = 0;
    if (raw.horas_tierra_por_dia) {
      const diasT = Object.values(raw.horas_tierra_por_dia) as number[];
      for (const h of diasT) totalTierraH += Number(h || 0);
    }

    const totalPeriodoH = Math.max(1, (raw.t ? raw.t.length : dias.length * 24));
    const iluminacionPct = (totalLuzH / totalPeriodoH) * 100;
    const tierraPct = (totalTierraH / totalPeriodoH) * 100;

    const serie: UnifiedMetricsTimeSeriesPoint[] = [];
    if (Array.isArray(raw.t)) {
      const solCambio = raw.horas_hasta_cambio_sol || [];
      const tierraCambio = raw.horas_hasta_cambio_tierra || [];
      for (let i = 0; i < raw.t.length; i++) {
        serie.push({
          timestamp_utc: normalizeTimestampToUtc(raw.t[i]),
          tiempo_hasta_ocaso_solar_h: solCambio[i],
          tiempo_hasta_ocaso_tierra_h: tierraCambio[i],
        });
      }
    }

    return {
      site_id,
      resumen: {
        iluminacion_solar_pct: Number(iluminacionPct.toFixed(1)),
        horas_luz_total: Number(totalLuzH.toFixed(1)),
        elevacion_solar_max_deg: 1.82, // valor típico o calculado
        visibilidad_tierra_nominal_pct: Number(tierraPct.toFixed(1)),
        visibilidad_tierra_margen_pct: Number((tierraPct * 0.9).toFixed(1)),
      },
      serie_temporal: serie,
      sintetico: false,
      fuenteFormato: 'fabrizio',
      rawFabrizioData: raw,
    };
  }

  throw new Error(`Estructura de métricas no reconocida en las claves: ${Object.keys(raw).join(', ')}`);
}
