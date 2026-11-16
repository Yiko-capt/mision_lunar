import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { createRealisticSunTexture } from '../../lib/textures';

interface CelestialSunProps {
  position: [number, number, number];
  radius?: number;
  targetPos?: [number, number, number];
  /** Punto al que apunta la LUZ (por defecto `targetPos`). En el globo es el centro de la Luna,
   *  para que los rayos sean exactamente paralelos a la dirección Luna→Sol. */
  lightTargetPos?: [number, number, number];
  showVector?: boolean;
  /** Si la luz solar proyecta sombras (útil en el parche; en el globo causa artefactos). */
  castShadows?: boolean;
  /** Semilado del volumen de sombras, en unidades de escena. */
  shadowExtent?: number;
  /** Intensidad de la luz directa. */
  intensity?: number;
}

export default function CelestialSun({
  position,
  radius = 0.38,
  targetPos,
  lightTargetPos,
  showVector = true,
  castShadows = false,
  shadowExtent = 5,
  intensity = 3.4,
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

  // El objetivo de la luz vive DENTRO del grupo del Sol (que está en `position`), así que su
  // posición local debe ser (targetPos − position) para que su posición en el mundo sea targetPos.
  // (Antes se le asignaba targetPos tal cual y los rayos salían en una dirección que no
  // dependía de dónde estuviera el Sol.)
  const lightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    const t = lightTargetPos ?? targetPos ?? [0, 0, 0];
    obj.position.set(t[0] - position[0], t[1] - position[1], t[2] - position[2]);
    return obj;
  }, [lightTargetPos, targetPos, position]);

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
          lineWidth={1.6}
          transparent
          opacity={0.75}
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

      {/* 5. Luz solar: direccional (rayos paralelos, como corresponde a una fuente a ~86 000 radios
             lunares). Se coloca en el Sol y apunta al sitio, así que su dirección depende de dónde
             esté el Sol. Sin luz puntual: con el Sol lejos no tendría alcance y sería redundante. */}
      <primitive object={lightTarget} />
      <directionalLight
        ref={dirLightRef}
        target={lightTarget}
        position={[0, 0, 0]}
        intensity={intensity}
        color="#fffbf0"
        castShadow={castShadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={Math.hypot(position[0], position[1], position[2]) * 2 + 50}
        shadow-bias={-0.0004}
      />
    </group>
  );
}
