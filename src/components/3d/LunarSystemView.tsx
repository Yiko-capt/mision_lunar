import { useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  getTopocentricFrame,
  topocentricToCartesian,
  getSiteSpherePosition,
  createLunarGridLines,
  generateStarPositions,
} from '../../lib/celestial';
import { SITES, type LunarSite } from '../../data/sites';

const STATIC_STARS = generateStarPositions(1500);

interface LunarSystemViewProps {
  activeSite: LunarSite;
  candidateSites?: LunarSite[];
  sunAz: number;
  sunEl: number;
  earthAz: number;
  earthEl: number;
  onSelectSite?: (siteId: string) => void;
}

function MoonMeshWithTexture() {
  const texture = useTexture('/assets/moon_texture.jpg');
  return (
    <mesh receiveShadow castShadow>
      <sphereGeometry args={[1.0, 128, 96]} />
      <meshStandardMaterial
        map={texture}
        color={0xffffff}
        roughness={0.95}
        metalness={0.0}
      />
    </mesh>
  );
}

function MoonMeshFallback() {
  return (
    <mesh receiveShadow castShadow>
      <sphereGeometry args={[1.0, 128, 96]} />
      <meshStandardMaterial
        color={0x717987}
        roughness={0.95}
        metalness={0.0}
      />
    </mesh>
  );
}

function Starfield() {
  const points = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(STATIC_STARS, 3));
    return g;
  }, []);

  return (
    <points geometry={points}>
      <pointsMaterial color="#aab3c5" size={0.12} transparent opacity={0.7} />
    </points>
  );
}

export default function LunarSystemView({
  activeSite,
  candidateSites = SITES,
  sunAz,
  sunEl,
  earthAz,
  earthEl,
  onSelectSite,
}: LunarSystemViewProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Posición del sitio activo sobre la esfera lunar
  const sitePos = useMemo(
    () => getSiteSpherePosition(activeSite.lat_deg, activeSite.lon_deg, 1.015),
    [activeSite]
  );

  // Base topocéntrica local en el sitio
  const frame = useMemo(
    () => getTopocentricFrame(activeSite.lat_deg, activeSite.lon_deg),
    [activeSite]
  );

  // Vector hacia el Sol y la Tierra
  const sunDir = useMemo(() => topocentricToCartesian(frame, sunAz, sunEl), [frame, sunAz, sunEl]);
  const earthDir = useMemo(() => topocentricToCartesian(frame, earthAz, earthEl), [frame, earthAz, earthEl]);

  // Distancias de colocación de cuerpos celestes en escena
  const D_SUN = 3.2;
  const D_EARTH = 2.4;

  const sunPos = useMemo<[number, number, number]>(() => [
    sitePos[0] + sunDir[0] * D_SUN,
    sitePos[1] + sunDir[1] * D_SUN,
    sitePos[2] + sunDir[2] * D_SUN,
  ], [sitePos, sunDir]);

  const earthPos = useMemo<[number, number, number]>(() => [
    sitePos[0] + earthDir[0] * D_EARTH,
    sitePos[1] + earthDir[1] * D_EARTH,
    sitePos[2] + earthDir[2] * D_EARTH,
  ], [sitePos, earthDir]);

  // Geometría de líneas de cuadrícula selenográficas
  const gridLines = useMemo(() => createLunarGridLines(1.002), []);

  // Animación del pulso en el sitio seleccionado
  useFrame((state) => {
    if (pulseRef.current) {
      const s = 1.0 + 0.3 * Math.sin(state.clock.getElapsedTime() * 4);
      pulseRef.current.scale.set(s, s, s);
    }
  });

  // Filtrar sitios candidatos
  const otherPolarSites = useMemo(
    () => candidateSites.filter((s) => s.site_id !== activeSite.site_id && s.tipo === 'polar'),
    [candidateSites, activeSite]
  );

  return (
    <>
      <color attach="background" args={['#030712']} />
      <Starfield />

      {/* Iluminación solar física: luz direccional proveniente exactamente de la posición del Sol */}
      <directionalLight
        position={sunPos}
        intensity={3.2}
        color="#fffbeb"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Luz ambiente suave para revelar el hemisferio nocturno */}
      <ambientLight color="#1e293b" intensity={0.4} />

      {/* La Luna */}
      <group>
        <Suspense fallback={<MoonMeshFallback />}>
          <MoonMeshWithTexture />
        </Suspense>

        {/* Cuadrícula selenográfica (meridianos y paralelos) */}
        <lineSegments geometry={gridLines}>
          <lineBasicMaterial color="#94a3b8" transparent opacity={0.15} />
        </lineSegments>

        {/* Sitios candidatos (puntos rojos) */}
        {otherPolarSites.map((site) => {
          const p = getSiteSpherePosition(site.lat_deg, site.lon_deg, 1.014);
          return (
            <mesh
              key={site.site_id}
              position={p}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSite?.(site.site_id);
              }}
            >
              <sphereGeometry args={[0.016, 16, 16]} />
              <meshBasicMaterial color="#f87171" />
            </mesh>
          );
        })}

        {/* Sitio Activo Seleccionado (punto verde brillante) */}
        <group position={sitePos}>
          <mesh>
            <sphereGeometry args={[0.024, 24, 24]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh ref={pulseRef}>
            <ringGeometry args={[0.028, 0.042, 32]} />
            <meshBasicMaterial color="#4ade80" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        </group>
      </group>

      {/* Rayo vectorial Sitio -> Sol (Línea dorada Drei) */}
      <Line
        points={[sitePos, sunPos]}
        color="#eab308"
        lineWidth={2}
      />

      {/* Céleste Sol: Esfera dorada brillante */}
      <mesh position={sunPos}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>

      {/* Rayo vectorial Sitio -> Tierra (Línea azul Drei) */}
      <Line
        points={[sitePos, earthPos]}
        color="#38bdf8"
        lineWidth={2}
      />

      {/* Céleste Tierra: Esfera azul */}
      <mesh position={earthPos}>
        <sphereGeometry args={[0.13, 32, 32]} />
        <meshStandardMaterial color="#38bdf8" emissive="#1d4ed8" roughness={0.5} />
      </mesh>

      {/* Controles de cámara orbitales (inician enfocados en el polo sur) */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={1.2}
        maxDistance={8.0}
        target={[0, -0.6, 0]}
      />
    </>
  );
}
