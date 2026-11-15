import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import {
  createRealisticEarthTexture,
  createEarthRoughnessMap,
  createEarthNightLightsTexture,
  createRealisticCloudsTexture,
} from '../../lib/textures';

interface CelestialEarthProps {
  position: [number, number, number];
  radius?: number;
  targetPos?: [number, number, number];
  showVector?: boolean;
}

export default function CelestialEarth({
  position,
  radius = 0.25,
  targetPos,
  showVector = true,
}: CelestialEarthProps) {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);

  const earthTexture = useMemo(() => createRealisticEarthTexture(), []);
  const roughnessMap = useMemo(() => createEarthRoughnessMap(), []);
  const nightLightsMap = useMemo(() => createEarthNightLightsTexture(), []);
  const cloudsTexture = useMemo(() => createRealisticCloudsTexture(), []);

  useFrame((_, delta) => {
    if (earthMeshRef.current) {
      earthMeshRef.current.rotation.y += delta * 0.12;
    }
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* 1. Vector Tierra (Línea punteada celeste directa hacia el sitio lunar) */}
      {showVector && targetPos && (
        <Line
          points={[
            [0, 0, 0],
            [targetPos[0] - position[0], targetPos[1] - position[1], targetPos[2] - position[2]],
          ]}
          color="#38bdf8"
          lineWidth={2.2}
          dashed
          dashScale={12}
          dashSize={0.16}
          gapSize={0.08}
        />
      )}

      {/* 2. Capa 1: Superficie de la Tierra (océanos azul profundo #0b2d5b, continentes y luces nocturnas) */}
      <mesh ref={earthMeshRef} receiveShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughnessMap={roughnessMap}
          roughness={0.65}
          metalness={0.05}
          emissiveMap={nightLightsMap}
          emissive="#fbbf24"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* 3. Capa 2: Esfera de nubes blancas translúcidas (scale={1.012}) en rotación lenta */}
      <mesh ref={cloudsMeshRef} scale={[1.012, 1.012, 1.012]}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.65}
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Capa 3: Halo atmosférico Fresnel azul celeste suave (scale={1.035}, BackSide, AdditiveBlending) */}
      <mesh scale={[1.035, 1.035, 1.035]}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.42}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
