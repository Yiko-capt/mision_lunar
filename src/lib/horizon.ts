import type { Terrain } from './terrain';
import { PASO_AZIMUT_DEG, D_MAX_KM, H_OBS_M } from './constants';

export const AZ = Math.round(360 / PASO_AZIMUT_DEG); // 360 directions
const EYE_M = H_OBS_M; // observer height (m)

export function computeHorizons(t: Terrain, maxDistM = D_MAX_KM * 1000): Float32Array {
  const { n, cellM, h } = t;
  const out = new Float32Array(n * n * AZ);
  const steps = Math.floor(maxDistM / cellM);

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const c = j * n + i;
      const base = h[c] + EYE_M;
      for (let k = 0; k < AZ; k++) {
        const th = (k / AZ) * 2 * Math.PI;
        const dx = Math.cos(th), dz = Math.sin(th);
        let maxAng = -90;
        for (let s = 1; s <= steps; s++) {
          const ii = Math.round(i + dx * s);
          const jj = Math.round(j + dz * s);
          if (ii < 0 || jj < 0 || ii >= n || jj >= n) break; // borde del mapa
          const dh = h[jj * n + ii] - base;
          const ang = (Math.atan2(dh, s * cellM) * 180) / Math.PI;
          if (ang > maxAng) maxAng = ang;
        }
        out[c * AZ + k] = maxAng;
      }
    }
  }
  return out;
}