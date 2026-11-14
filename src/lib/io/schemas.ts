/**
 * Modelo Interno Unificado (SSOT) para Horizontes, Efemérides y Métricas.
 * Conforme a docs/convenciones.md:
 * - Ángulos en grados decimales.
 * - Latitud en [-90.0, +90.0], hemisferio sur negativo.
 * - Longitud en [0.0, 360.0), medida hacia el Este.
 * - Azimut en [0.0, 360.0), horario desde el Norte lunar verdadero (0=N, 90=E).
 * - Elevación en [-90.0, +90.0] desde el plano horizontal local.
 * - Marcas de tiempo en UTC estricto ISO 8601 con sufijo 'Z'.
 */

export interface UnifiedHorizon {
  site_id: string;
  nombre?: string;
  lat_deg?: number;
  lon_deg?: number;
  elevacion_sitio_m?: number;
  parametros?: {
    h_obs_m: number;
    d_max_km: number;
    paso_azimut_deg: number;
  };
  /**
   * Perfil de 360 puntos para azimuts 0, 1, ..., 359°.
   */
  perfil_horizonte: Array<{
    azimut_deg: number;
    elevacion_maxima_deg: number;
  }>;
  /**
   * Lookup rápido de 360 valores ordenados por índice de azimut entero (0..359).
   */
  elevationLookup: Float32Array;
  sintetico: boolean;
  fuenteFormato: 'convencion_cris' | 'sintetico_justin' | 'fallback';
}

export interface UnifiedEphemerisPoint {
  timestamp_utc: string; // ISO 8601 UTC con 'Z'
  sol_azimut_deg: number;
  sol_elevacion_deg: number;
  tierra_azimut_deg: number;
  tierra_elevacion_deg: number;
  sol_dist_au?: number;
  tierra_dist_km?: number;
}

export interface UnifiedEphemeris {
  site_id: string;
  lat_deg?: number;
  lon_deg?: number;
  alt_km?: number;
  refraccion_aplicada: boolean;
  datos: UnifiedEphemerisPoint[];
  sintetico: boolean;
  fuenteFormato: 'convencion' | 'fabrizio' | 'sintetico_justin' | 'fallback';
}

export interface UnifiedMetricsSummary {
  iluminacion_solar_pct: number;
  horas_luz_total: number;
  elevacion_solar_max_deg: number;
  visibilidad_tierra_nominal_pct: number;
  visibilidad_tierra_margen_pct: number;
  energia_especifica_wh_m2?: number;
  potencia_pico_w?: number;
  potencia_media_w?: number;
  semaforo?: 'verde' | 'amarillo' | 'rojo';
  tiempo_hasta_ocaso_solar_h?: number | null;
  tiempo_hasta_ocaso_tierra_h?: number | null;
}

export interface UnifiedMetricsTimeSeriesPoint {
  timestamp_utc: string;
  horizonte_sol_deg?: number;
  fraccion_disco_solar?: number;
  sol_visible?: boolean;
  horizonte_tierra_deg?: number;
  tierra_visible_nominal?: boolean;
  tierra_visible_margen?: boolean;
  potencia_especifica_w_m2?: number;
  tiempo_hasta_ocaso_solar_h?: number | null;
  tiempo_hasta_ocaso_tierra_h?: number | null;
}

export interface UnifiedMetrics {
  site_id: string;
  resumen: UnifiedMetricsSummary;
  serie_temporal: UnifiedMetricsTimeSeriesPoint[];
  sintetico: boolean;
  fuenteFormato: 'convencion' | 'fabrizio' | 'justin_rol_d' | 'calculado_interno' | 'fallback';
  rawJustinData?: Record<string, any>;
  rawFabrizioData?: Record<string, any>;
}

export interface SiteDataSet {
  site_id: string;
  horizonte: UnifiedHorizon | null;
  efemerides: UnifiedEphemeris | null;
  metricas: UnifiedMetrics | null;
  cargando: boolean;
  error?: string | null;
  estadoDatos: 'completo' | 'parcial' | 'sin_datos';
}
