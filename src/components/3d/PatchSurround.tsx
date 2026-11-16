import { useMemo } from 'react';
import * as THREE from 'three';
import { TERRAIN } from '../../data/moon';
import { SCALE, EXAG } from './LunarTerrain';
import { MOON_RADIUS_KM } from '../../config/sceneScale';
import { createLunarRegolithTextures } from '../../lib/textures';

/**
 * Entorno del parche: un "delantal" radial que arranca exactamente en el borde del
 * parche de 10 × 10 km (muestreando sus mismas alturas, para que no haya costura),
 * continúa con terreno ondulado procedural y cae con la curvatura REAL de la Luna
 * (sagita y = √(R² − d²) − R, con R = 1 737.4 km), hasta 380 km del sitio.
 *
 * Con esto, al alejar la cámara ya no se ve un rectángulo flotando en el vacío:
 * se ve el casquete lunar con su horizonte curvo, y el parche es su centro.
 *
 * El relieve del delantal es procedural (igual que el parche de demostración) y no
 * pretende ser el DEM real: la interfaz ya rotula el parche como demostración.
 */

const MOON_R_UNITS = (MOON_RADIUS_KM * 1000) / 100; // 1 unidad = 100 m → 17 374
const HALF = (TERRAIN.sizeM / 2) * SCALE;           // semi-lado del parche (50)
const OUTER = 3800;                                  // radio exterior (380 km)
const SEGS = 128;                                    // segmentos angulares
const RINGS = 56;                                    // anillos radiales (log)

/** Caída por curvatura lunar a distancia horizontal d (unidades de escena, y ≤ 0). */
function sagitta(d: number): number {
  const r = Math.min(d, MOON_R_UNITS * 0.999);
  return Math.sqrt(MOON_R_UNITS * MOON_R_UNITS - r * r) - MOON_R_UNITS;
}

/** Altura del parche (en unidades, con exageración), interpolada bilinealmente. */
function patchHeight(x: number, z: number): number {
  const { n, cellM, h } = TERRAIN;
  const half = (n - 1) / 2;
  const fi = Math.min(n - 1.001, Math.max(0, x / (cellM * SCALE) + half));
  const fj = Math.min(n - 1.001, Math.max(0, z / (cellM * SCALE) + half));
  const i0 = Math.floor(fi), j0 = Math.floor(fj);
  const tx = fi - i0, tz = fj - j0;
  const h00 = h[j0 * n + i0], h10 = h[j0 * n + i0 + 1];
  const h01 = h[(j0 + 1) * n + i0], h11 = h[(j0 + 1) * n + i0 + 1];
  return ((h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz) * SCALE * EXAG;
}

/** Distancia del centro al borde del cuadrado del parche en la dirección θ. */
function squareEdgeRadius(theta: number): number {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  return HALF / Math.max(c, s);
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Crater {
  x: number;
  z: number;
  r: number;
  depth: number;
}

/** Relieve procedural del delantal (metros), continuo con el estilo del parche. */
function apronReliefM(x: number, z: number, craters: Crater[]): number {
  const xm = x * 100, zm = z * 100; // a metros
  let v =
    15 * Math.sin(xm * 0.0011) * Math.cos(zm * 0.0014) +
    5 * Math.sin(xm * 0.004 + zm * 0.003) +
    42 * Math.sin(xm * 0.00013 + 1.7) * Math.cos(zm * 0.00011 - 0.6);
  for (const c of craters) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 3) v += c.depth * (d < 1 ? d * d - 1 : 0.12 * Math.exp(-(d - 1) * 4));
  }
  return v;
}

export default function PatchSurround() {
  const { apron, skirt } = useMemo(() => {
    // Cráteres procedurales del delantal (más grandes a mayor distancia del parche)
    const rand = rng(20261115);
    const craters: Crater[] = [];
    for (let k = 0; k < 90; k++) {
      const ang = rand() * Math.PI * 2;
      const dist = HALF * 1.3 + Math.pow(rand(), 1.6) * (OUTER * 0.45 - HALF);
      const rM = 180 + rand() * (900 + dist * 9); // radio en metros
      craters.push({
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        r: (rM / 100),
        depth: rM * (0.12 + rand() * 0.18),
      });
    }

    const vCount = (RINGS + 1) * (SEGS + 1);
    const pos = new Float32Array(vCount * 3);
    const col = new Float32Array(vCount * 3);
    const uvs = new Float32Array(vCount * 2);
    const idx: number[] = [];

    for (let ring = 0; ring <= RINGS; ring++) {
      // Espaciado logarítmico: denso junto al parche, amplio lejos
      const t = ring / RINGS;
      for (let s = 0; s <= SEGS; s++) {
        const theta = (s / SEGS) * Math.PI * 2;
        const rIn = squareEdgeRadius(theta);
        const r = rIn * Math.pow(OUTER / rIn, t);
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        // Altura: borde del parche → relieve procedural (mezcla en los 2 primeros km)
        const borderH = patchHeight(Math.cos(theta) * (rIn - 0.01), Math.sin(theta) * (rIn - 0.01));
        const reliefH = apronReliefM(x, z, craters) * SCALE * EXAG;
        const blend = Math.min(1, (r - rIn) / 20);
        const y = (1 - blend) * borderH + blend * reliefH + sagitta(r);

        const vIdx = ring * (SEGS + 1) + s;
        const o = vIdx * 3;
        pos[o] = x;
        pos[o + 1] = y;
        pos[o + 2] = z;

        uvs[vIdx * 2] = (x / HALF) * 16;
        uvs[vIdx * 2 + 1] = (z / HALF) * 16;

        // Paleta de regolito (continuación de la del parche), con ruido mineral
        const noise = ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.04 - 0.02;
        const hNorm = Math.max(0, Math.min(1, 0.45 + apronReliefM(x, z, craters) / 160));
        const base = 0.149 + hNorm * (0.431 - 0.149);
        col[o] = Math.max(0.08, Math.min(0.85, base + noise));
        col[o + 1] = Math.max(0.08, Math.min(0.85, base - 0.004 + noise));
        col[o + 2] = Math.max(0.08, Math.min(0.85, base - 0.02 + noise));
      }
    }

    for (let ring = 0; ring < RINGS; ring++) {
      for (let s = 0; s < SEGS; s++) {
        const a = ring * (SEGS + 1) + s;
        const b = a + 1;
        const c = a + (SEGS + 1);
        const d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }

    const apron = new THREE.BufferGeometry();
    apron.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    apron.setAttribute('color', new THREE.BufferAttribute(col, 3));
    apron.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    apron.setIndex(idx);
    apron.computeVertexNormals();

    // Faldón ("skirt"): cinta vertical bajo el borde del parche que tapa cualquier
    // rendija entre la malla del parche (64 vértices por lado) y el delantal (128 ángulos).
    const SK = SEGS * 2;
    const sPos = new Float32Array((SK + 1) * 2 * 3);
    const sIdx: number[] = [];
    for (let s = 0; s <= SK; s++) {
      const theta = (s / SK) * Math.PI * 2;
      const rIn = squareEdgeRadius(theta);
      const x = Math.cos(theta) * rIn;
      const z = Math.sin(theta) * rIn;
      const hTop = patchHeight(Math.cos(theta) * (rIn - 0.01), Math.sin(theta) * (rIn - 0.01)) - 0.05;
      const o = s * 6;
      sPos[o] = x; sPos[o + 1] = hTop; sPos[o + 2] = z;
      sPos[o + 3] = x; sPos[o + 4] = hTop - 6; sPos[o + 5] = z;
      if (s < SK) {
        const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
        sIdx.push(a, b, c, b, d, c);
      }
    }
    const skirt = new THREE.BufferGeometry();
    skirt.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    skirt.setIndex(sIdx);
    skirt.computeVertexNormals();

    return { apron, skirt };
  }, []);

  const { map: regolithMap, bumpMap: regolithBump } = useMemo(() => createLunarRegolithTextures(), []);

  return (
    <group>
      {/* Delantal: del borde del parche al horizonte curvo (380 km) */}
      <mesh geometry={apron} receiveShadow>
        <meshStandardMaterial
          map={regolithMap}
          bumpMap={regolithBump}
          bumpScale={0.12}
          vertexColors
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      {/* Faldón que sella la costura parche ↔ delantal */}
      <mesh geometry={skirt}>
        <meshStandardMaterial color="#45443f" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
