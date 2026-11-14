export interface Terrain {
  n: number;          // celdas por lado
  sizeM: number;      // ancho del área en metros
  cellM: number;      // tamaño de celda en metros
  h: Float32Array;    // altura en metros, índice j*n + i
  slopeDeg: Float32Array;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateTerrain(n = 64, sizeM = 10000, seed = 7): Terrain {
  const rand = rng(seed);
  const cellM = sizeM / n;

  const craters = Array.from({ length: 45 }, () => {
    const r = 150 + rand() * 900;
    return { x: rand() * sizeM, z: rand() * sizeM, r, depth: r * (0.15 + rand() * 0.2) };
  });

  const h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * cellM;
      const z = (j + 0.5) * cellM;
      let v = 15 * Math.sin(x * 0.0011) * Math.cos(z * 0.0014) + 5 * Math.sin(x * 0.004 + z * 0.003);
      for (const c of craters) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        if (d < 3) v += c.depth * (d < 1 ? d * d - 1 : 0.12 * Math.exp(-(d - 1) * 4));
      }
      h[j * n + i] = v;
    }
  }

  const slopeDeg = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const im = Math.max(i - 1, 0), ip = Math.min(i + 1, n - 1);
      const jm = Math.max(j - 1, 0), jp = Math.min(j + 1, n - 1);
      const dhdx = (h[j * n + ip] - h[j * n + im]) / ((ip - im) * cellM);
      const dhdz = (h[jp * n + i] - h[jm * n + i]) / ((jp - jm) * cellM);
      slopeDeg[j * n + i] = (Math.atan(Math.hypot(dhdx, dhdz)) * 180) / Math.PI;
    }
  }

  return { n, sizeM, cellM, h, slopeDeg };
}