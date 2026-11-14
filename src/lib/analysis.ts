import { AZ } from './horizon';
import { sunState, earthState } from './solar';
import type { Terrain } from './terrain';

export interface MissionParams {
  startDays: number;
  durationDays: number;
  minLight: number;     // %
  maxSlope: number;     // grados
  requireEarth: boolean;
  minEarth: number;     // %
}

export interface Analysis {
  light: Float32Array;   // fracción de tiempo con Sol (0..1)
  earth: Float32Array;   // fracción de tiempo con Tierra visible (0..1)
  viable: Uint8Array;    // 1 = cumple todos los requisitos
}

const R2D = 180 / Math.PI;
const TWO_PI = 2 * Math.PI;
const azIndex = (theta: number) => {
  const t = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.round((t / TWO_PI) * AZ) % AZ;
};

export function analyze(t: Terrain, hor: Float32Array, p: MissionParams): Analysis {
  // Muestreo: 4 puntos por día dentro de la misión
  const N = Math.max(8, Math.round(p.durationDays * 4));
  const sunK = new Int32Array(N), sunDeg = new Float32Array(N);
  const eK = new Int32Array(N), eDeg = new Float32Array(N);

  for (let s = 0; s < N; s++) {
    const d = p.startDays + ((s + 0.5) * p.durationDays) / N;
    const sun = sunState(d);
    sunK[s] = azIndex(sun.theta);
    sunDeg[s] = sun.el * R2D + 0.27; // +0.27°: radio aparente del disco solar
    const e = earthState(d);
    eK[s] = azIndex(e.theta);
    eDeg[s] = e.el * R2D;
  }

  const cells = t.n * t.n;
  const light = new Float32Array(cells);
  const earth = new Float32Array(cells);
  const viable = new Uint8Array(cells);

  for (let c = 0; c < cells; c++) {
    let L = 0, E = 0;
    for (let s = 0; s < N; s++) {
      if (sunDeg[s] > hor[c * AZ + sunK[s]]) L++;
      if (eDeg[s] > hor[c * AZ + eK[s]]) E++;
    }
    light[c] = L / N;
    earth[c] = E / N;
    const ok =
      light[c] * 100 >= p.minLight &&
      t.slopeDeg[c] <= p.maxSlope &&
      (!p.requireEarth || earth[c] * 100 >= p.minEarth);
    viable[c] = ok ? 1 : 0;
  }

  return { light, earth, viable };
}