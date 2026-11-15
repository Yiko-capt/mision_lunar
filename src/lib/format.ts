/**
 * Formateadores tipados: NINGUNA cantidad se muestra en la interfaz sin su unidad.
 *
 * Convenciones del proyecto:
 *   ángulos ° · distancias m / km · potencia W (irradiancia W/m²) · energía Wh/m²
 *   tiempos h y fechas UTC · porcentajes % · η en % (adimensional × 100)
 *
 * La prueba src/lib/__tests__/unitsInUi.test.ts recorre los componentes y falla si
 * encuentra un número formateado sin unidad en la misma línea.
 */

const nf = (v: number, dp: number) =>
  Number.isFinite(v) ? v.toFixed(dp) : '—';

/** Ángulo en grados: fmtDeg(27.43) → "27.4°". */
export const fmtDeg = (v: number, dp = 1): string => `${nf(v, dp)}°`;

/** Metros: fmtMeters(153.6) → "154 m". */
export const fmtMeters = (v: number, dp = 0): string => `${nf(v, dp)} m`;

/** Kilómetros: fmtKm(1.52) → "1.52 km". */
export const fmtKm = (v: number, dp = 2): string => `${nf(v, dp)} km`;

/** Vatios: fmtWatts(10.63) → "10.6 W". */
export const fmtWatts = (v: number, dp = 1): string => `${nf(v, dp)} W`;

/** Irradiancia: fmtWm2(361.2) → "361 W/m²". */
export const fmtWm2 = (v: number, dp = 0): string => `${nf(v, dp)} W/m²`;

/** Energía por área: fmtWhm2(5324) → "5324 Wh/m²". */
export const fmtWhm2 = (v: number, dp = 0): string => `${nf(v, dp)} Wh/m²`;

/** Porcentaje: fmtPercent(43.1) → "43.1%". */
export const fmtPercent = (v: number, dp = 1): string => `${nf(v, dp)}%`;

/** Horas: fmtHours(378) → "378.0 h". */
export const fmtHours = (v: number, dp = 1): string => `${nf(v, dp)} h`;

/** Días: fmtDays(14) → "14 días". */
export const fmtDays = (v: number): string => `${nf(v, 0)} días`;

/** Fecha-hora UTC: fmtUTC(Date) → "2026-11-22 00:00 UTC". */
export const fmtUTC = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm} UTC`;
};

/** Distancia en UA: fmtAU(1.0) → "1.00 UA". */
export const fmtAU = (v: number, dp = 2): string => `${nf(v, dp)} UA`;

/** Coordenada selenográfica: fmtLatLon(-89.684, 196.739) → "-89.684° Lat, 196.739° E". */
export const fmtLatLon = (lat: number, lonE: number, dp = 3): string =>
  `${nf(lat, dp)}° Lat, ${nf(lonE, dp)}° E`;
