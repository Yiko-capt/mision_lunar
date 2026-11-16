import { useMemo } from 'react';
import * as THREE from 'three';
import {
  createMilkyWaySkyTexture,
  createCircularStarTexture,
} from '../../lib/textures';

interface SpaceBackgroundProps {
  showEclipticGrid?: boolean;
  /** Radio de la esfera de fondo (debe superar la distancia máxima de la cámara). */
  radius?: number;
}

export default function SpaceBackground({ showEclipticGrid = true, radius = 350 }: SpaceBackgroundProps) {
  // 1. Skybox texture with embedded Milky Way, nebulae, and baked-in stars
  const milkyWayTexture = useMemo(() => createMilkyWaySkyTexture(), []);
  const starSprite = useMemo(() => createCircularStarTexture(), []);

  const scaleFactor = radius / 350;

  // 2. Sparse sharp point-cloud stars (fewer, more spread apart)
  const { starGeometry } = useMemo(() => {
    const COUNT = 1600;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    let seed = 98765;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Mostly white / blue-white (matching the sharp punctual aesthetic)
    const stellarColors: [number, number, number][] = [
      [0.78, 0.85, 1.00], // Blue-white
      [0.90, 0.94, 1.00], // Cool white
      [1.00, 1.00, 1.00], // Pure white
      [1.00, 0.97, 0.90], // Warm white
      [1.00, 0.90, 0.75], // Yellow-white
    ];

    for (let i = 0; i < COUNT; i++) {
      const r = 180 + rng() * 120;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const colorType = stellarColors[Math.floor(rng() * stellarColors.length)];
      const brightness = 0.4 + rng() * 0.6;
      colors[i * 3] = colorType[0] * brightness;
      colors[i * 3 + 1] = colorType[1] * brightness;
      colors[i * 3 + 2] = colorType[2] * brightness;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return { starGeometry: geom };
  }, []);

  // Point size: small and sharp
  const pointSize = 1.2;

  // 3. Orbital / ecliptic reference grid (Solar System Scope style)
  const eclipticGrid = useMemo(() => {
    const size = 32;
    const divisions = 32;
    const grid = new THREE.GridHelper(size, divisions, 0x06b6d4, 0x0c4a6e);
    grid.position.y = -1.2;
    const mat = grid.material as THREE.LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.12;
    mat.depthWrite = false;
    return grid;
  }, []);

  // 4. Trayectoria orbital de la Luna
  const orbitRing = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 3.4, 3.4, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(128);
    const geom = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, -1.2, p.y))
    );
    return geom;
  }, []);

  return (
    <group>
      {/* Deep space background with baked-in Milky Way and stars */}
      <mesh scale={scaleFactor}>
        <sphereGeometry args={[350, 48, 32]} />
        <meshBasicMaterial
          map={milkyWayTexture}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Anti-aliased circular point-cloud stars (shell scales with background radius) */}
      <points geometry={starGeometry} scale={scaleFactor}>
        <pointsMaterial
          size={pointSize}
          map={starSprite}
          vertexColors
          transparent
          alphaTest={0.02}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={false}
        />
      </points>

      {/* Note: no "constellations" are drawn because the patterns would be fictitious
          (the stars in this background are procedural, not from a real catalog). */}

      {/* Orbital reference grid */}
      {showEclipticGrid && (
        <>
          <primitive object={eclipticGrid} />
          <lineLoop geometry={orbitRing}>
            <lineBasicMaterial
              color="#0ea5e9"
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </lineLoop>
        </>
      )}
    </group>
  );
}
