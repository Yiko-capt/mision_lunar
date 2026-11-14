import { useMemo } from 'react';
import * as THREE from 'three';
import { TERRAIN } from '../../data/moon';
import { useMission } from '../../store/useMission';
import type { Analysis } from '../../lib/analysis';

export const SCALE = 1 / 100; // 1 unidad de escena = 100 m
export const EXAG = 3;        // exageración vertical para ver el relieve

export default function LunarTerrain({ analysis }: { analysis: Analysis }) {
  const { n, cellM, h } = TERRAIN;
  const half = (n - 1) / 2;
  const selected = useMission((s) => s.selected);
  const update = useMission((s) => s.update);

  const geometry = useMemo(() => {
    const pos = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const c = j * n + i, o = c * 3;
        pos[o] = (i - half) * cellM * SCALE;
        pos[o + 1] = h[c] * SCALE * EXAG;
        pos[o + 2] = (j - half) * cellM * SCALE;
        if (analysis.viable[c]) {
          col[o] = 0.13; col[o + 1] = 0.77; col[o + 2] = 0.37; // verde: apta
        } else {
          const g = 0.2 + 0.45 * analysis.light[c]; // gris según iluminación
          col[o] = g; col[o + 1] = g; col[o + 2] = g * 1.05;
        }
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, [analysis, n, cellM, h, half]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const p = e.point as THREE.Vector3;
    const i = Math.min(n - 1, Math.max(0, Math.round(p.x / (cellM * SCALE) + half)));
    const j = Math.min(n - 1, Math.max(0, Math.round(p.z / (cellM * SCALE) + half)));
    update({ selected: j * n + i });
  };

  let marker = null;
  if (selected !== null) {
    const i = selected % n, j = Math.floor(selected / n);
    marker = (
      <mesh position={[(i - half) * cellM * SCALE, h[selected] * SCALE * EXAG + 0.3, (j - half) * cellM * SCALE]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#f43f5e" />
      </mesh>
    );
  }

  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow onClick={handleClick}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
      {marker}
    </>
  );
}