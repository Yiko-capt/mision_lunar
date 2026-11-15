import * as THREE from 'three';

export interface TopocentricFrame {
  u: [number, number, number]; // Arriba (Cenit radial)
  n: [number, number, number]; // Norte selenográfico
  e: [number, number, number]; // Este selenográfico
}

/**
 * Calcula la base ortonormal topocéntrica (Este, Norte, Arriba) en la superficie de la Luna.
 * Conforme a convención:
 * - Latitud en [-90, +90], Longitud en [0, 360) hacia el Este.
 * - En el Polo Sur (-90°), el Norte se fija hacia el meridiano 0° Este.
 */
export function getTopocentricFrame(latDeg: number, lonDeg: number): TopocentricFrame {
  const rLat = (latDeg * Math.PI) / 180;
  const rLon = (lonDeg * Math.PI) / 180;

  // Vector radial unitario (Up / Cenit)
  const u: [number, number, number] = [
    Math.cos(rLat) * Math.sin(rLon),
    Math.sin(rLat),
    Math.cos(rLat) * Math.cos(rLon),
  ];

  // Vector Norte (tangente a los meridianos hacia el Norte)
  let n: [number, number, number] = [
    -Math.sin(rLat) * Math.sin(rLon),
    Math.cos(rLat),
    -Math.sin(rLat) * Math.cos(rLon),
  ];

  // Vector Este (tangente a los paralelos hacia el Este)
  let e: [number, number, number] = [
    Math.cos(rLon),
    0,
    -Math.sin(rLon),
  ];

  // Singularidad en el Polo Sur exacto (-90°)
  if (Math.abs(latDeg + 90) < 1e-4) {
    n = [0, 0, 1]; // Norte hacia lon = 0°
    e = [1, 0, 0]; // Este
  }

  return { u, n, e };
}

/**
 * Convierte azimut horario [0, 360) y elevación [-90, +90] desde el horizonte en vector unitario 3D.
 */
export function topocentricToCartesian(
  frame: TopocentricFrame,
  azDeg: number,
  elDeg: number
): [number, number, number] {
  const rAz = (azDeg * Math.PI) / 180;
  const rEl = (elDeg * Math.PI) / 180;

  const cEl = Math.cos(rEl);
  const sEl = Math.sin(rEl);
  const cAz = Math.cos(rAz);
  const sAz = Math.sin(rAz);

  const { u, n, e } = frame;

  return [
    cEl * cAz * n[0] + cEl * sAz * e[0] + sEl * u[0],
    cEl * cAz * n[1] + cEl * sAz * e[1] + sEl * u[1],
    cEl * cAz * n[2] + cEl * sAz * e[2] + sEl * u[2],
  ];
}

/**
 * Estima la fase lunar cualitativa a partir del ángulo de fase entre la Tierra y el Sol.
 */
export function estimateLunarPhase(sunAz: number): string {
  // En el polo sur lunar, el azimut solar da una vuelta de 360° en un mes sinódico (~29.5 días)
  const normAz = ((sunAz % 360) + 360) % 360;
  if (normAz < 22.5 || normAz >= 337.5) return 'Luna Nueva';
  if (normAz < 67.5) return 'Creciente';
  if (normAz < 112.5) return 'Cuarto Creciente';
  if (normAz < 157.5) return 'Gibosa Creciente';
  if (normAz < 202.5) return 'Luna Llena';
  if (normAz < 247.5) return 'Gibosa Menguante';
  if (normAz < 292.5) return 'Cuarto Menguante';
  return 'Menguante';
}

/**
 * Convierte latitud y longitud selenográficas en posición sobre la esfera lunar en Three.js.
 */
export function getSiteSpherePosition(latDeg: number, lonDeg: number, radius = 1.012): [number, number, number] {
  const rLat = (latDeg * Math.PI) / 180;
  const rLon = (lonDeg * Math.PI) / 180;
  return [
    radius * Math.cos(rLat) * Math.sin(rLon),
    radius * Math.sin(rLat),
    radius * Math.cos(rLat) * Math.cos(rLon),
  ];
}

/**
 * Genera la geometría de líneas de cuadrícula selenográficas (paralelos y meridianos).
 */
export function createLunarGridLines(radius = 1.002): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];

  // Paralelos cada 30 grados (y el círculo polar de -80°)
  const latitudes = [-80, -60, -30, 0, 30, 60, 80];
  const SEGMENTS = 96;

  for (const lat of latitudes) {
    const rLat = (lat * Math.PI) / 180;
    const y = radius * Math.sin(rLat);
    const rRing = radius * Math.cos(rLat);

    for (let i = 0; i < SEGMENTS; i++) {
      const a1 = (i / SEGMENTS) * Math.PI * 2;
      const a2 = ((i + 1) / SEGMENTS) * Math.PI * 2;
      points.push(new THREE.Vector3(rRing * Math.sin(a1), y, rRing * Math.cos(a1)));
      points.push(new THREE.Vector3(rRing * Math.sin(a2), y, rRing * Math.cos(a2)));
    }
  }

  // Meridianos cada 45 grados
  const longitudes = [0, 45, 90, 135, 180, 225, 270, 315];
  for (const lon of longitudes) {
    const rLon = (lon * Math.PI) / 180;
    for (let i = 0; i < SEGMENTS; i++) {
      const lat1 = -Math.PI / 2 + (i / SEGMENTS) * Math.PI;
      const lat2 = -Math.PI / 2 + ((i + 1) / SEGMENTS) * Math.PI;

      points.push(
        new THREE.Vector3(
          radius * Math.cos(lat1) * Math.sin(rLon),
          radius * Math.sin(lat1),
          radius * Math.cos(lat1) * Math.cos(rLon)
        )
      );
      points.push(
        new THREE.Vector3(
          radius * Math.cos(lat2) * Math.sin(rLon),
          radius * Math.sin(lat2),
          radius * Math.cos(lat2) * Math.cos(rLon)
        )
      );
    }
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * Genera de forma determinista posiciones esféricas de estrellas sin impurezas en render.
 */
export function generateStarPositions(count = 1500): Float32Array {
  const pos = new Float32Array(count * 3);
  let seed = 42;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const r = 40 + rng() * 30;
    const t = rng() * Math.PI * 2;
    const p = Math.acos(2 * rng() - 1);
    pos[3 * i] = r * Math.sin(p) * Math.cos(t);
    pos[3 * i + 1] = r * Math.sin(p) * Math.sin(t);
    pos[3 * i + 2] = r * Math.cos(p);
  }
  return pos;
}
