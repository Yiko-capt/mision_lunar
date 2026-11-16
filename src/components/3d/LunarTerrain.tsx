import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TERRAIN } from '../../data/moon';
import { useMission } from '../../store/useMission';
import { SITES } from '../../data/sites';
import type { Analysis } from '../../lib/analysis';
import { createLunarRegolithTextures } from '../../lib/textures';

export const SCALE = 1 / 100; // 1 scene unit = 100 m
export const EXAG = 1.0;      // 1:1 true physical elevation: prevents sharp spiky artifacts

interface LunarTerrainProps {
  analysis: Analysis;
  sunPos?: [number, number, number];
  earthPos?: [number, number, number];
  /** Ocultar el marcador del punto (en la vista "Desde el sitio" el observador ESTÁ en él). */
  showMarker?: boolean;
}

export default function LunarTerrain({ analysis: _analysis, showMarker = true }: LunarTerrainProps) {
  const { n, cellM, h, slopeDeg } = TERRAIN;
  const half = (n - 1) / 2;

  const mission = useMission();
  const selected = mission.selected;
  const selectedLat = mission.selectedLat;
  const selectedLon = mission.selectedLon;
  const activeSiteId = mission.activeSiteId;
  const update = mission.update;

  const activeSite = useMemo(
    () => SITES.find((s) => s.site_id === activeSiteId) || SITES[0],
    [activeSiteId]
  );

  const selectedMarkerRef = useRef<THREE.Mesh>(null);
  const ringMarkerRef = useRef<THREE.Mesh>(null);

  // Mapear (selectedLat, selectedLon) a celda del terreno al sincronizar desde el Globo 3D
  useEffect(() => {
    // Escala topográfica aproximada en torno al sitio activo (~10 km x 10 km)
    const kmPerDegreeLat = 30.32; // En la Luna: 1 grado ~ 30.32 km
    const dLatKm = (selectedLat - activeSite.lat_deg) * kmPerDegreeLat;
    const dLonKm =
      (selectedLon - activeSite.lon_deg) *
      kmPerDegreeLat *
      Math.cos((activeSite.lat_deg * Math.PI) / 180);

    // Convertir a coordenadas de celda (0 a n-1)
    const halfWidthKm = (TERRAIN.sizeM / 1000) / 2;
    const normX = Math.max(-1, Math.min(1, dLonKm / halfWidthKm));
    const normY = Math.max(-1, Math.min(1, dLatKm / halfWidthKm));

    const i = Math.round(half + normX * (half * 0.85));
    const j = Math.round(half + normY * (half * 0.85));
    const clampedI = Math.min(n - 1, Math.max(0, i));
    const clampedJ = Math.min(n - 1, Math.max(0, j));

    const cellIdx = clampedJ * n + clampedI;
    if (mission.selected !== cellIdx) {
      update({ selected: cellIdx });
    }
  }, [selectedLat, selectedLon, activeSite, half, n, mission.selected, update]);

  // Generar geometría con mayor densidad de polígonos, relieve suave sin crestas puntiagudas y UVs para textura
  const geometry = useMemo(() => {
    const subdiv = 160; // Malla de 160x160 (50,562 triángulos) para eliminar caras angulares planas
    const pos = new Float32Array(subdiv * subdiv * 3);
    const col = new Float32Array(subdiv * subdiv * 3);
    const uvs = new Float32Array(subdiv * subdiv * 2);

    // Encontrar rango de alturas para normalizar
    let minH = Infinity;
    let maxH = -Infinity;
    for (let c = 0; c < n * n; c++) {
      if (h[c] < minH) minH = h[c];
      if (h[c] > maxH) maxH = h[c];
    }
    const hRange = Math.max(1, maxH - minH);

    for (let sj = 0; sj < subdiv; sj++) {
      const vNorm = sj / (subdiv - 1);
      const fj = Math.min(n - 1.0001, Math.max(0, vNorm * (n - 1)));
      const j0 = Math.floor(fj);
      const j1 = Math.min(n - 1, j0 + 1);
      const tz = fj - j0;
      const sz = tz * tz * (3 - 2 * tz); // Suavizado cúbico Hermite

      for (let si = 0; si < subdiv; si++) {
        const uNorm = si / (subdiv - 1);
        const fi = Math.min(n - 1.0001, Math.max(0, uNorm * (n - 1)));
        const i0 = Math.floor(fi);
        const i1 = Math.min(n - 1, i0 + 1);
        const tx = fi - i0;
        const sx = tx * tx * (3 - 2 * tx);

        // Interpolación continua suave sin aristas angulares
        const h00 = h[j0 * n + i0];
        const h10 = h[j0 * n + i1];
        const h01 = h[j1 * n + i0];
        const h11 = h[j1 * n + i1];
        const smoothH = (h00 * (1 - sx) + h10 * sx) * (1 - sz) + (h01 * (1 - sx) + h11 * sx) * sz;

        const s00 = slopeDeg[j0 * n + i0];
        const s10 = slopeDeg[j0 * n + i1];
        const s01 = slopeDeg[j1 * n + i0];
        const s11 = slopeDeg[j1 * n + i1];
        const smoothSlope = (s00 * (1 - sx) + s10 * sx) * (1 - sz) + (s01 * (1 - sx) + s11 * sx) * sz;

        const vIdx = sj * subdiv + si;
        const o = vIdx * 3;
        const uIdx = vIdx * 2;

        pos[o] = (uNorm - 0.5) * (n - 1) * cellM * SCALE;
        pos[o + 1] = smoothH * SCALE * EXAG;
        pos[o + 2] = (vNorm - 0.5) * (n - 1) * cellM * SCALE;

        // UVs mapeadas con repetición para micro-detalle de regolito
        uvs[uIdx] = uNorm * 32;
        uvs[uIdx + 1] = vNorm * 32;

        const normH = (smoothH - minH) / hRange;
        const slope = Math.min(30, smoothSlope) / 30;

        // Ruido mineral sutil de regolito
        const noise = ((Math.sin(si * 12.9898 + sj * 78.233) * 43758.5453) % 1) * 0.04 - 0.02;

        let r: number, g: number, b: number;
        if (normH > 0.55) {
          const t = (normH - 0.55) / 0.45;
          r = 0.431 + t * (0.658 - 0.431) - slope * 0.1 + noise;
          g = 0.424 + t * (0.647 - 0.424) - slope * 0.1 + noise;
          b = 0.404 + t * (0.620 - 0.404) - slope * 0.09 + noise;
        } else {
          const t = normH / 0.55;
          r = 0.149 + t * (0.431 - 0.149) + noise;
          g = 0.145 + t * (0.424 - 0.145) + noise;
          b = 0.137 + t * (0.404 - 0.137) + noise;
        }

        col[o] = Math.max(0.08, Math.min(0.85, r));
        col[o + 1] = Math.max(0.08, Math.min(0.85, g));
        col[o + 2] = Math.max(0.08, Math.min(0.85, b));
      }
    }

    const idx: number[] = [];
    for (let sj = 0; sj < subdiv - 1; sj++) {
      for (let si = 0; si < subdiv - 1; si++) {
        const a = sj * subdiv + si;
        const b = a + 1;
        const c = a + subdiv;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, [n, cellM, h, slopeDeg]);

  // Animación suave del marcador sobre el sitio seleccionado
  useFrame((state) => {
    if (selectedMarkerRef.current) {
      const s = 1.0 + 0.25 * Math.sin(state.clock.getElapsedTime() * 4.5);
      selectedMarkerRef.current.scale.set(s, s, s);
    }
    if (ringMarkerRef.current) {
      const s = 1.0 + 0.15 * Math.sin(state.clock.getElapsedTime() * 3);
      ringMarkerRef.current.scale.set(s, s, s);
    }
  });

  // Manejo de clic sobre el parche topográfico
  const handleClick = (e: any) => {
    e.stopPropagation();
    const p = e.point as THREE.Vector3;
    const i = Math.min(n - 1, Math.max(0, Math.round(p.x / (cellM * SCALE) + half)));
    const j = Math.min(n - 1, Math.max(0, Math.round(p.z / (cellM * SCALE) + half)));
    const cellIdx = j * n + i;

    // Calcular coordenadas selenográficas inversas a partir de la celda cliqueada
    const kmPerDegreeLat = 30.32;
    const halfWidthKm = (TERRAIN.sizeM / 1000) / 2;
    const normX = (i - half) / (half * 0.85);
    const normY = (j - half) / (half * 0.85);

    const dLonKm = normX * halfWidthKm;
    const dLatKm = normY * halfWidthKm;

    const lat = activeSite.lat_deg + dLatKm / kmPerDegreeLat;
    const lon =
      activeSite.lon_deg +
      dLonKm / (kmPerDegreeLat * Math.cos((activeSite.lat_deg * Math.PI) / 180));
    const altKm = (h[cellIdx] / 1000) + activeSite.alt_km;

    update({
      selected: cellIdx,
      selectedLat: Number(lat.toFixed(4)),
      selectedLon: Number((((lon % 360) + 360) % 360).toFixed(4)),
      selectedAltKm: Number(altKm.toFixed(3)),
    });
  };

  // Posición del marcador 3D en el terreno
  const markerPos = useMemo<[number, number, number] | null>(() => {
    if (selected === null || selected < 0 || selected >= n * n) return null;
    const i = selected % n;
    const j = Math.floor(selected / n);
    return [
      (i - half) * cellM * SCALE,
      h[selected] * SCALE * EXAG + 0.6,
      (j - half) * cellM * SCALE,
    ];
  }, [selected, n, half, cellM, h]);

  const { map: regolithMap, bumpMap: regolithBump } = useMemo(() => createLunarRegolithTextures(), []);

  return (
    <group>
      {/* 1. Malla del terreno con regolito lunar PBR, textura fotorrealista y micro-relieve */}
      <mesh geometry={geometry} castShadow receiveShadow onClick={handleClick}>
        <meshStandardMaterial
          map={regolithMap}
          bumpMap={regolithBump}
          bumpScale={0.12}
          vertexColors
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* 2. Marcador objetivo seleccionado (sincronizado con Globo 3D) */}
      {showMarker && markerPos && (
        <group position={markerPos}>
          {/* Núcleo esférico brillante */}
          <mesh ref={selectedMarkerRef}>
            <sphereGeometry args={[0.45, 24, 24]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>

          {/* Anillo de objetivo con pulso luminoso */}
          <mesh ref={ringMarkerRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 1.05, 32]} />
            <meshBasicMaterial
              color="#4ade80"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Luz focal puntual que ilumina suavemente el punto de aterrizaje */}
          <pointLight color="#4ade80" intensity={1.5} distance={15} />
        </group>
      )}
    </group>
  );
}
