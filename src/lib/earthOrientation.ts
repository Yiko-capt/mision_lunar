import * as THREE from 'three';

/**
 * Orientación de la Tierra vista desde la Luna.
 *
 * Con esto la Tierra dibujada no es una bola que gira "porque sí": su eje está inclinado
 * 23.44° respecto a la eclíptica en la dirección que corresponde a la fecha, y su giro está
 * fijado a la hora UTC de modo que el meridiano que está al mediodía mira hacia el Sol.
 *
 * Aproximaciones (suficientes para una visualización, error < 1° en orientación):
 *  - El polo de rotación lunar se toma como normal a la eclíptica (la diferencia real es 1.54°).
 *  - La dirección Tierra→Sol se toma igual que Luna→Sol (diferencia < 0.3°).
 *  - Longitud eclíptica del Sol (series de bajo orden, Meeus) y ecuación del tiempo (Spencer, 1971).
 */

export const EARTH_OBLIQUITY_DEG = 23.4393;
const DEG = Math.PI / 180;
const J2000_JD = 2451545.0;
const MS_PER_DAY = 86_400_000;

/** Día juliano de un instante en ms UTC. */
export function julianDay(utcMs: number): number {
  return utcMs / MS_PER_DAY + 2440587.5;
}

/** Longitud eclíptica aparente del Sol, en grados [0, 360). */
export function sunEclipticLongitudeDeg(utcMs: number): number {
  const n = julianDay(utcMs) - J2000_JD;
  const meanLon = 280.46 + 0.9856474 * n;
  const g = (357.528 + 0.9856003 * n) * DEG;
  const lambda = meanLon + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
  return ((lambda % 360) + 360) % 360;
}

/**
 * Longitud geográfica del punto subsolar (donde el Sol está en el cenit), en grados Este
 * en (-180, 180]. Se mueve 15°/h hacia el Oeste.
 */
export function subsolarLongitudeDeg(utcMs: number): number {
  const d = new Date(utcMs);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const lon = -15 * (utcHours - 12 + subsolarEotHours(utcMs));
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Ecuación del tiempo en horas (aproximación de Spencer, 1971; error < 1 min). */
function subsolarEotHours(utcMs: number): number {
  const d = new Date(utcMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((utcMs - start) / MS_PER_DAY) + 1;
  const B = (2 * Math.PI * (doy - 1)) / 365;
  const eotMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(B) -
      0.032077 * Math.sin(B) -
      0.014615 * Math.cos(2 * B) -
      0.040849 * Math.sin(2 * B));
  return eotMin / 60;
}

export interface EarthOrientationInput {
  /** Dirección unitaria del polo norte lunar expresada en el sistema de coordenadas de la escena. */
  poleDir: THREE.Vector3;
  /** Dirección unitaria hacia el Sol en el mismo sistema. */
  sunDir: THREE.Vector3;
  /** Instante, ms UTC. */
  utcMs: number;
}

export interface EarthOrientation {
  /** Rotación que lleva el sistema local de la esfera (Y = norte, +X = lon 0°) al de la escena. */
  quaternion: THREE.Quaternion;
  /** Eje de rotación de la Tierra en la escena (unitario). */
  axis: THREE.Vector3;
  /** Latitud del punto subsolar, grados (declinación solar). */
  subsolarLatDeg: number;
  /** Longitud del punto subsolar, grados Este. */
  subsolarLonDeg: number;
  /** Inclinación del eje respecto al polo lunar, grados (≈ 23.44°). */
  tiltDeg: number;
}

/**
 * Orientación de una esfera de three.js (SphereGeometry con textura equirectangular
 * centrada en lon 0°: lon 0° = +X, este = -Z, norte = +Y) para que represente a la Tierra.
 */
export function earthOrientation({ poleDir, sunDir, utcMs }: EarthOrientationInput): EarthOrientation {
  const pole = poleDir.clone().normalize();
  const sun = sunDir.clone().normalize();

  // Dirección del Sol proyectada en el plano de la eclíptica (⟂ polo)
  const sunHoriz = sun.clone().sub(pole.clone().multiplyScalar(sun.dot(pole)));
  if (sunHoriz.lengthSq() < 1e-8) {
    // Sol en el polo: sin plano de referencia, se toma cualquiera perpendicular
    sunHoriz.set(1, 0, 0).sub(pole.clone().multiplyScalar(pole.x));
  }
  sunHoriz.normalize();

  // El polo norte terrestre apunta hacia la longitud eclíptica 90°; el Sol está en λ.
  // → la inclinación se orienta (90° − λ) respecto a la dirección del Sol.
  const lambda = sunEclipticLongitudeDeg(utcMs);
  const lean = sunHoriz
    .clone()
    .applyAxisAngle(pole, (90 - lambda) * DEG)
    .normalize();

  const eps = EARTH_OBLIQUITY_DEG * DEG;
  const axis = pole
    .clone()
    .multiplyScalar(Math.cos(eps))
    .add(lean.multiplyScalar(Math.sin(eps)))
    .normalize();

  // Latitud subsolar: ángulo del Sol sobre el ecuador terrestre
  const subsolarLat = Math.asin(THREE.MathUtils.clamp(sun.dot(axis), -1, 1));
  const subsolarLon = subsolarLongitudeDeg(utcMs);

  // Punto subsolar en el sistema local de la esfera
  const L = subsolarLon * DEG;
  const local = new THREE.Vector3(
    Math.cos(subsolarLat) * Math.cos(L),
    Math.sin(subsolarLat),
    -Math.cos(subsolarLat) * Math.sin(L)
  );

  // 1) alinear +Y local con el eje; 2) girar alrededor del eje hasta que el punto subsolar mire al Sol
  const base = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  const v0 = local.clone().applyQuaternion(base);
  const proj = (v: THREE.Vector3) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis))).normalize();
  const a0 = proj(v0);
  const a1 = proj(sun);
  const angle = Math.atan2(axis.dot(a0.clone().cross(a1)), a0.dot(a1));
  const spin = new THREE.Quaternion().setFromAxisAngle(axis, angle);

  return {
    quaternion: spin.multiply(base),
    axis,
    subsolarLatDeg: subsolarLat / DEG,
    subsolarLonDeg: subsolarLon,
    tiltDeg: (Math.acos(THREE.MathUtils.clamp(axis.dot(pole), -1, 1))) / DEG,
  };
}

/**
 * Dirección del polo norte lunar en la escena del parche (X = Este, Y = arriba, Z = Sur),
 * en función de la latitud del sitio. La longitud no interviene.
 */
export function poleDirInPatchScene(latDeg: number): THREE.Vector3 {
  const lat = latDeg * DEG;
  return new THREE.Vector3(0, Math.sin(lat), -Math.cos(lat));
}
