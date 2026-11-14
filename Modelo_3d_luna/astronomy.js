// ============================================================================
// astronomy.js — Física / efemérides lunares (MIEMBRO 1 y 2)
// ----------------------------------------------------------------------------
// Fórmulas analíticas de baja precisión (Meeus simplificado).
// Precisión: validada contra PyEphem (ver tools/validate_ephem.py).
// Funciones puras, sin dependencias de Three.js ni del DOM → fáciles de testear.
//
// Para producción: reemplazar por datos pre-calculados con Python (skyfield,
// JPL DE440) exportados a JSON, o consultar JPL Horizons.
// ============================================================================

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

// ---------- Tiempo ----------

/** Día juliano a partir de un objeto Date de JS. */
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Días desde J2000.0 (2000-01-01 12:00 UTC). */
export function daysSinceJ2000(date) {
  return julianDay(date) - 2451545.0;
}

/** Normaliza un ángulo a [0, 360). */
export function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

// ---------- Efemérides geocéntricas ----------

/** Longitud eclíptica aparente del Sol (grados). Error < 0.01°. */
export function sunEclipticLongitude(D) {
  const L = norm360(280.459 + 0.98564736 * D);
  const M = norm360(357.529 + 0.98560028 * D);
  return norm360(L + 1.915 * Math.sin(M * DEG) + 0.020 * Math.sin(2 * M * DEG));
}

/** Longitud del nodo ascendente lunar (precesa en 18.6 años). */
export function moonNodeLongitude(D) {
  return norm360(125.0445479 - 0.0529537 * D);
}

/**
 * Posición geocéntrica de la Luna: longitud λ y latitud β eclípticas (grados).
 * Serie truncada de Meeus (Astronomical Algorithms, cap. 47): ~10 términos de
 * longitud y ~10 de latitud. Error típico < 0.1°.
 */
export function moonEcliptic(D) {
  const Lp = 218.3164477 + 13.17639648 * D;   // longitud media
  const Dm = 297.8501921 + 12.19074912 * D;   // elongación media
  const M  = 357.5291092 + 0.98560028 * D;    // anomalía media del Sol
  const Mp = 134.9633964 + 13.06499295 * D;   // anomalía media de la Luna
  const F  = 93.2720950 + 13.22935035 * D;    // argumento de latitud
  const s = (a) => Math.sin(norm360(a) * DEG);

  const sl =
      6288774 * s(Mp) + 1274027 * s(2 * Dm - Mp) + 658314 * s(2 * Dm) +
      213618 * s(2 * Mp) - 185116 * s(M) - 114332 * s(2 * F) +
      58793 * s(2 * Dm - 2 * Mp) + 57066 * s(2 * Dm - M - Mp) +
      53322 * s(2 * Dm + Mp) + 45758 * s(2 * Dm - M) - 40923 * s(M - Mp) -
      34720 * s(Dm) - 30383 * s(M + Mp) + 15327 * s(2 * Dm - 2 * F);
  const sb =
      5128122 * s(F) + 280602 * s(Mp + F) + 277693 * s(Mp - F) +
      173237 * s(2 * Dm - F) + 55413 * s(2 * Dm - Mp + F) +
      46271 * s(2 * Dm - Mp - F) + 32573 * s(2 * Dm + F) +
      17198 * s(2 * Mp + F) + 9266 * s(2 * Dm + Mp - F) + 8822 * s(2 * Mp - F);

  return { lambda: norm360(Lp + sl / 1e6), beta: sb / 1e6, F: norm360(F) };
}

/** Longitud eclíptica de la Luna (grados). */
export function moonEclipticLongitude(D) {
  return moonEcliptic(D).lambda;
}

const INCL = 1.54242; // inclinación del ecuador lunar respecto a la eclíptica (°)

function wrap180(x) { return ((x + 180) % 360 + 360) % 360 - 180; }

/**
 * Coordenadas selenográficas del punto sub-observador (fórmulas de libración
 * ópticas de Meeus, cap. 53). `lam`, `bet` = dirección eclíptica del cuerpo
 * observado visto desde el observador (λ, β), `F` = argumento de latitud de la Luna.
 */
function subObserverPoint(lam, bet, F, D) {
  const W = (lam - moonNodeLongitude(D)) * DEG;
  const b = bet * DEG, I = INCL * DEG;
  const A = Math.atan2(Math.sin(W) * Math.cos(b) * Math.cos(I) - Math.sin(b) * Math.sin(I),
                       Math.cos(W) * Math.cos(b)) * RAD;
  const lat = Math.asin(-Math.sin(W) * Math.cos(b) * Math.sin(I) - Math.sin(b) * Math.cos(I)) * RAD;
  const lon = wrap180(A - F);
  return { lat, lon };
}

// ---------- Subpuntos sobre la Luna ----------

/**
 * Punto sub-Tierra = libración óptica geocéntrica (lat = libración en latitud,
 * lon = libración en longitud). Lon 0 = cara visible, +E.
 */
export function subEarthPoint(D) {
  const m = moonEcliptic(D);
  return subObserverPoint(m.lambda, m.beta, m.F, D);
}

/**
 * Punto sub-solar: donde el Sol está en el cenit local. Se obtiene con las mismas
 * fórmulas tomando al Sol como observador (λ_sol + 180°, β ≈ 0). Ignora el paralaje
 * Luna-Tierra respecto al Sol (~0.15°).
 */
export function subSolarPoint(D) {
  const m = moonEcliptic(D);
  return subObserverPoint(sunEclipticLongitude(D) + 180, 0, m.F, D);
}

/** Elongación Luna-Sol (grados): 0 = nueva, 90 = cuarto creciente, 180 = llena. */
export function moonElongation(D) {
  return norm360(moonEclipticLongitude(D) - sunEclipticLongitude(D));
}

/** Fase lunar como fracción del ciclo: 0 = nueva, 0.25 = cuarto creciente, 0.5 = llena. */
export function moonPhase(D) {
  return moonElongation(D) / 360;
}

export function phaseName(f) {
  if (f < 0.03 || f > 0.97) return 'Nueva';
  if (f < 0.22) return 'Creciente';
  if (f < 0.28) return 'Cuarto creciente';
  if (f < 0.47) return 'Gibosa creciente';
  if (f < 0.53) return 'Llena';
  if (f < 0.72) return 'Gibosa menguante';
  if (f < 0.78) return 'Cuarto menguante';
  return 'Menguante';
}

// ---------- Geometría local en el sitio ----------

/**
 * Elevación y azimut local de un cuerpo (dado por su subpunto lat/lon)
 * visto desde un sitio (lat/lon). Horizonte ESFÉRICO: no considera terreno.
 * TODO (Miembro 2): restar el ángulo de horizonte topográfico (DEM LOLA).
 */
export function elevationAzimuth(siteLat, siteLon, bodyLat, bodyLon) {
  const sL = siteLat * DEG;
  const bL = bodyLat * DEG;
  const dLon = (bodyLon - siteLon) * DEG;
  const sinEl = Math.sin(sL) * Math.sin(bL) + Math.cos(sL) * Math.cos(bL) * Math.cos(dLon);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl))) * RAD;
  const y = Math.sin(dLon) * Math.cos(bL);
  const x = Math.cos(sL) * Math.sin(bL) - Math.sin(sL) * Math.cos(bL) * Math.cos(dLon);
  const az = norm360(Math.atan2(y, x) * RAD);
  return { el, az };
}

/** Eficiencia relativa de un panel horizontal: η = max(0, sin(elevación)). */
export function solarEfficiency(elevationDeg) {
  return Math.max(0, Math.sin(elevationDeg * DEG));
}

/**
 * Busca el próximo cruce de horizonte (ocaso u orto) de un cuerpo.
 * bodyFn: función D → {lat, lon}.
 * Retorna {hours, wasVisible} o null si no hay cruce en la ventana (60 días).
 */
export function timeToHorizonCrossing(date, siteLat, siteLon, bodyFn,
                                      stepH = 0.5, maxH = 24 * 60) {
  const D0 = daysSinceJ2000(date);
  const b0 = bodyFn(D0);
  const wasVisible = elevationAzimuth(siteLat, siteLon, b0.lat, b0.lon).el > 0;

  for (let h = stepH; h <= maxH; h += stepH) {
    const b = bodyFn(D0 + h / 24);
    const { el } = elevationAzimuth(siteLat, siteLon, b.lat, b.lon);
    if ((wasVisible && el <= 0) || (!wasVisible && el > 0)) {
      return { hours: h, wasVisible };
    }
  }
  return null;
}
