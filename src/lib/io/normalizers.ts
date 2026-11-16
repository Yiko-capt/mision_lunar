/**
 * Funciones de normalización geométrica y temporal conforme a docs/convenciones.md
 */

/**
 * Normaliza cualquier longitud a [0.0, 360.0) hacia el Este.
 * Si una fuente entrega [-180, 180] (Oeste negativo), aplica: (lon + 360) mod 360.
 */
export function normalizeLon(lon: number): number {
  const norm = ((lon % 360.0) + 360.0) % 360.0;
  return Object.is(norm, -0) ? 0 : norm;
}

/**
 * Normaliza cualquier azimut a [0.0, 360.0) horario desde el Norte lunar verdadero.
 */
export function normalizeAz(az: number): number {
  const norm = ((az % 360.0) + 360.0) % 360.0;
  return Object.is(norm, -0) ? 0 : norm;
}

/**
 * Calcula la diferencia angular circular mínima entre dos ángulos en grados [0.0, 180.0].
 */
export function circularDiff(a: number, b: number): number {
  const diff = Math.abs(normalizeAz(a) - normalizeAz(b));
  return diff > 180.0 ? 360.0 - diff : diff;
}

/**
 * Normaliza cualquier cadena de fecha/hora ISO 8601 a UTC estricto con sufijo 'Z'.
 * Ej: "2026-11-14T00:00:00+00:00" -> "2026-11-14T00:00:00Z"
 */
export function normalizeTimestampToUtc(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    // Si no es parseable directamente, intenta corregir +00:00 al final
    return isoString.replace(/\+00:00$/, 'Z');
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Interpolación lineal circular del perfil de horizonte para cualquier azimut continuo.
 * Conforme a sección 3.1: lookup tiene 360 bins (0..359°), con Az_360 = Az_0.
 */
export function interpolateHorizon(azContinuous: number, lookup: Float32Array): number {
  if (lookup.length !== 360) {
    throw new Error(`El lookup de horizonte debe contener exactamente 360 valores, recibido: ${lookup.length}`);
  }
  const az = normalizeAz(azContinuous);
  const i0 = Math.floor(az) % 360;
  const i1 = (i0 + 1) % 360;
  const frac = az - Math.floor(az);
  return lookup[i0] + frac * (lookup[i1] - lookup[i0]);
}
