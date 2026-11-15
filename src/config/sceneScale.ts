/**
 * Escala física del sistema Sol–Tierra–Luna.
 *
 * Unidad de escena del globo: 1 unidad = 1 radio lunar (1 737.4 km).
 * Unidad de escena del parche: 1 unidad = 100 m (ver LunarTerrain.SCALE).
 *
 * Constantes de referencia (NASA Planetary Fact Sheet, D.R. Williams, NSSDCA):
 *   Radio lunar medio (volumétrico) ... 1 737.4 km
 *   Radio terrestre medio (volumétrico) 6 371.0 km
 *   Radio solar ....................... 695 700 km  (valor nominal IAU 2015)
 *   Distancia media Tierra–Luna ....... 384 400 km  (semieje mayor)
 *   Unidad astronómica (1 UA) ......... 149 597 870.7 km (valor exacto IAU 2012)
 *
 * Tamaños angulares (diámetro) que se deducen de esas cifras y que los tests verifican:
 *   Sol visto desde la Luna ........ ≈ 0.533°
 *   Tierra vista desde la Luna ..... ≈ 1.90°
 *   Luna vista desde la Tierra ..... ≈ 0.518°
 */

export const MOON_RADIUS_KM = 1737.4;
export const EARTH_RADIUS_KM = 6371.0;
export const SUN_RADIUS_KM = 695700;
export const EARTH_MOON_MEAN_KM = 384400;
export const AU_KM = 149597870.7;

const DEG = 180 / Math.PI;

/** Diámetro angular (°) de un cuerpo de radio R a distancia d (centro a observador). */
export function angularDiameterDeg(radiusKm: number, distanceKm: number): number {
  return 2 * Math.atan(radiusKm / distanceKm) * DEG;
}

/** Radio de escena necesario para que un cuerpo a `distance` se vea con `diamDeg` de diámetro. */
export function radiusForAngularDiameter(distance: number, diamDeg: number): number {
  return distance * Math.tan((diamDeg / 2) / DEG);
}

/* ─────────────────────────── Escena del globo ───────────────────────────
 * Dos modos, siempre rotulados en pantalla:
 *
 *  real      Tamaños y distancia Tierra–Luna reales en radios lunares.
 *            El Sol no cabe a 86 100 radios: se dibuja lejos (detrás de la
 *            Tierra) con su diámetro angular REAL de 0.533°, que es lo único
 *            que el ojo puede comprobar. Rayos de luz en la dirección real.
 *
 *  didactica Distancias comprimidas para que Tierra y Luna quepan juntas en
 *            pantalla. La proporción de tamaños Tierra:Luna (3.667:1) se
 *            conserva; el Sol se dibuja con 3° (≈ 5.6× su tamaño aparente)
 *            para que se vea como disco y no como un punto.
 *
 * En ningún modo la Luna (radio 1) es mayor que la Tierra ni que el Sol, y el
 * Sol siempre queda más lejos que la Tierra.
 */

export type ScaleMode = 'real' | 'didactica';

export interface GlobeScale {
  mode: ScaleMode;
  /** Distancia Tierra–Luna en la escena (radios lunares). */
  earthDistance: number;
  /** Radio de la Tierra en la escena (radios lunares). */
  earthRadius: number;
  /** Distancia del disco solar en la escena (radios lunares). */
  sunDistance: number;
  /** Radio del disco solar en la escena (radios lunares). */
  sunRadius: number;
  /** Diámetro angular con que se dibuja el Sol (°). */
  sunAngularDiameterDeg: number;
  /** Límites de cámara. */
  minCameraDistance: number;
  maxCameraDistance: number;
  cameraFar: number;
  /** Etiqueta permanente que se muestra sobre el lienzo. */
  label: string;
}

/** Proporción real de radios Tierra:Luna = 3.667. */
export const EARTH_MOON_RADIUS_RATIO = EARTH_RADIUS_KM / MOON_RADIUS_KM;

/** Distancia real Tierra–Luna en radios lunares = 221.3. */
export const EARTH_MOON_DISTANCE_LR = EARTH_MOON_MEAN_KM / MOON_RADIUS_KM;

/** Diámetro angular real del Sol visto desde la Luna (°). */
export const SUN_ANGULAR_FROM_MOON_DEG = angularDiameterDeg(SUN_RADIUS_KM, AU_KM);

/** Diámetro angular real de la Tierra vista desde la Luna (°). */
export const EARTH_ANGULAR_FROM_MOON_DEG = angularDiameterDeg(EARTH_RADIUS_KM, EARTH_MOON_MEAN_KM);

const REAL_SUN_SCENE_DISTANCE = 1200; // detrás de la Tierra (221), dentro del far de cámara

export const GLOBE_SCALES: Record<ScaleMode, GlobeScale> = {
  real: {
    mode: 'real',
    earthDistance: EARTH_MOON_DISTANCE_LR,
    earthRadius: EARTH_MOON_RADIUS_RATIO,
    sunDistance: REAL_SUN_SCENE_DISTANCE,
    sunRadius: radiusForAngularDiameter(REAL_SUN_SCENE_DISTANCE, SUN_ANGULAR_FROM_MOON_DEG),
    sunAngularDiameterDeg: SUN_ANGULAR_FROM_MOON_DEG,
    minCameraDistance: 1.15,
    maxCameraDistance: 420,
    cameraFar: 4000,
    label: `Escala real · Tierra a ${EARTH_MOON_DISTANCE_LR.toFixed(0)} radios lunares (384 400 km) · Sol dibujado con su diámetro aparente real (0.53°)`,
  },
  didactica: {
    mode: 'didactica',
    // 26 radios lunares (la distancia real es 221): la Tierra se ve claramente más grande y
    // más lejana que la Luna sin que su halo atmosférico invada toda la pantalla.
    earthDistance: 26,
    earthRadius: EARTH_MOON_RADIUS_RATIO,
    sunDistance: 130,
    sunRadius: radiusForAngularDiameter(130, 3),
    sunAngularDiameterDeg: 3,
    minCameraDistance: 1.15,
    maxCameraDistance: 70,
    cameraFar: 1000,
    label: 'Escala didáctica · distancias comprimidas · proporción de tamaños Tierra:Luna conservada (3.67:1) · Sol ampliado a 3°',
  },
};

/* ─────────────────────────── Escena del parche ───────────────────────────
 * Unidades ≈ metros/100. El Sol y la Tierra son discos de referencia direccional:
 * se dibujan con sus diámetros angulares REALES vistos desde la Luna, de modo
 * que la Tierra se ve ≈ 3.6 veces más ancha que el Sol, como en la realidad.
 */
export const PATCH_SUN_DISTANCE = 2600;
export const PATCH_SUN_RADIUS = radiusForAngularDiameter(PATCH_SUN_DISTANCE, SUN_ANGULAR_FROM_MOON_DEG);
export const PATCH_EARTH_DISTANCE = 2100;
export const PATCH_EARTH_RADIUS = radiusForAngularDiameter(PATCH_EARTH_DISTANCE, EARTH_ANGULAR_FROM_MOON_DEG);

/* Compatibilidad con código anterior (modo didáctico por defecto). */
export const SUN_DISTANCE = GLOBE_SCALES.didactica.sunDistance;
export const SUN_RADIUS = GLOBE_SCALES.didactica.sunRadius;
export const EARTH_DISTANCE = GLOBE_SCALES.didactica.earthDistance;
export const EARTH_RADIUS = GLOBE_SCALES.didactica.earthRadius;
export const SUN_ANGULAR_DIAMETER_DEG = GLOBE_SCALES.didactica.sunAngularDiameterDeg;
