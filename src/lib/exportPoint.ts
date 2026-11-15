import type { PointStatus } from './siteStatus';

/** Registro plano que se exporta (mismos valores que muestra el modo Profesional). */
export interface ExportedPoint {
  sitio: string;
  site_id: string;
  fecha_hora_utc: string;
  lat_deg: number;
  lon_deg_este: number;
  altitud_dem_km: number;
  pendiente_deg: number;
  pendiente_fuente: string;
  eta_solar_pct: number;
  potencia_w_panel_1m2: number;
  dte_visible: boolean;
  sol_elevacion_deg: number;
  sol_azimut_deg: number;
  tierra_elevacion_deg: number;
  tierra_azimut_deg: number;
  viabilidad: string;
  fuente_efemerides: string;
}

const r = (v: number, d: number) => Number(v.toFixed(d));

export function toExportedPoint(s: PointStatus, viabilityLabel: string): ExportedPoint {
  return {
    sitio: s.siteName,
    site_id: s.siteId,
    fecha_hora_utc: s.utc,
    lat_deg: r(s.lat, 5),
    lon_deg_este: r(s.lon, 5),
    altitud_dem_km: r(s.altKm, 4),
    pendiente_deg: r(s.slopeDeg, 2),
    pendiente_fuente: s.slopeSource,
    eta_solar_pct: r(s.etaPct, 3),
    potencia_w_panel_1m2: r(s.powerW, 2),
    dte_visible: s.earthVisible,
    sol_elevacion_deg: r(s.sunEl, 3),
    sol_azimut_deg: r(s.sunAz, 3),
    tierra_elevacion_deg: r(s.earthEl, 3),
    tierra_azimut_deg: r(s.earthAz, 3),
    viabilidad: viabilityLabel,
    fuente_efemerides: s.ephemerisSource,
  };
}

export function toJson(p: ExportedPoint): string {
  return JSON.stringify(p, null, 2);
}

function csvCell(v: unknown): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(p: ExportedPoint): string {
  const keys = Object.keys(p) as Array<keyof ExportedPoint>;
  return `${keys.join(',')}\n${keys.map((k) => csvCell(p[k])).join(',')}\n`;
}

export function exportFileBase(p: ExportedPoint): string {
  const stamp = p.fecha_hora_utc.replace(/[-:]/g, '').replace(/\.\d+/, '');
  return `killaland_${p.site_id}_${stamp}`;
}

/** Descarga un texto como archivo, sin dependencias. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
