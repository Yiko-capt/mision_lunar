import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { createRealisticSunTexture } from '../../lib/textures';

interface CelestialSunProps {
  position: [number, number, number];
  radius?: number;
  targetPos?: [number, number, number];
  showVector?: boolean;
}

export default function CelestialSun({
  position,
  radius = 0.38,
  targetPos,
  showVector = true,
}: CelestialSunProps) {
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const coronaInnerRef = useRef<THREE.Mesh>(null);
  const coronaOuterRef = useRef<THREE.Mesh>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  const sunTexture = useMemo(() => createRealisticSunTexture(), []);

  // Animación del Sol: rotación lenta del plasma fotosférico y pulsación térmica
  useFrame((state, delta) => {
    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += delta * 0.04;
    }
    const t = state.clock.getElapsedTime();
    if (coronaInnerRef.current) {
      const s = 1.04 + 0.015 * Math.sin(t * 3.0);
      coronaInnerRef.current.scale.set(s, s, s);
    }
    if (coronaOuterRef.current) {
      const s = 1.12 + 0.03 * Math.sin(t * 2.2 + 1.0);
      coronaOuterRef.current.scale.set(s, s, s);
    }
  });

  // Vector de dirección exacto Sol -> Sitio
  const lightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    if (targetPos) {
      obj.position.set(targetPos[0], targetPos[1], targetPos[2]);
    } else {
      obj.position.set(0, 0, 0);
    }
    return obj;
  }, [targetPos]);

  return (
    <group position={position}>
      {/* 1. Rayo Solar Amarillo Vectorial (Línea sólida dorada conectada al sitio) */}
      {showVector && targetPos && (
        <Line
          points={[
            [0, 0, 0],
            [targetPos[0] - position[0], targetPos[1] - position[1], targetPos[2] - position[2]],
          ]}
          color="#facc15"
          lineWidth={2.4}
        />
      )}

      {/* 2. Fotosfera nuclear del Sol (plasma de alta definición estilo Solar System Scope) */}
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshBasicMaterial
          map={sunTexture}
          color="#ffffff"
        />
      </mesh>

      {/* 3. Corona Solar Esférica Interior (Fresnel ámbar dorado, BackSide, AdditiveBlending) */}
      <mesh ref={coronaInnerRef} scale={[1.04, 1.04, 1.04]}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial
          color="#fbbf24"
          side={THREE.BackSide}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Corona Solar Esférica Exterior Difusa (Halo de plasma térmico anaranjado) */}
      <mesh ref={coronaOuterRef} scale={[1.12, 1.12, 1.12]}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color="#f97316"
          side={THREE.BackSide}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 5. Iluminación física principal alineada con los rayos solares */}
      <primitive object={lightTarget} />
      <directionalLight
        ref={dirLightRef}
        target={lightTarget}
        position={[0, 0, 0]}
        intensity={4.2}
        color="#fffbf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 0, 0]} intensity={3.8} distance={50} color="#ffedd5" />
    </group>
  );
}
