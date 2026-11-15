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
  // 1. Textura envolvente de la Vía Láctea y polvo cósmico
  const milkyWayTexture = useMemo(() => createMilkyWaySkyTexture(), []);
  const starSprite = useMemo(() => createCircularStarTexture(), []);

  // 2. 3800 estrellas circulares multicolores con magnitudes reales
  const { starGeometry } = useMemo(() => {
    const COUNT = 3800;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    let seed = 98765;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Paleta de temperaturas estelares
    const stellarColors: [number, number, number][] = [
      [0.65, 0.82, 1.00], // Azul O/B brillante
      [0.85, 0.92, 1.00], // Blanco A
      [1.00, 1.00, 1.00], // Blanco neutro F
      [1.00, 0.95, 0.75], // Amarillo cálido G (tipo Solar)
      [1.00, 0.82, 0.55], // Naranja K
      [1.00, 0.65, 0.50], // Rojo M gigante
    ];

    for (let i = 0; i < COUNT; i++) {
      const r = 180 + rng() * 120;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const colorType = stellarColors[Math.floor(rng() * stellarColors.length)];
      const brightness = 0.5 + rng() * 0.5;
      colors[i * 3] = colorType[0] * brightness;
      colors[i * 3 + 1] = colorType[1] * brightness;
      colors[i * 3 + 2] = colorType[2] * brightness;

    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));


    return { starGeometry: geom };
  }, []);

  // 3. Cuadrícula orbital / eclíptica estilo Solar System Scope
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
      {/* Fondo espacial negro profundo (#03050a) con la Vía Láctea */}
      <mesh scale={radius / 350}>
        <sphereGeometry args={[350, 48, 32]} />
        <meshBasicMaterial
          map={milkyWayTexture}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Estrellas circulares anti-aliased (la cáscara se escala con el radio del fondo) */}
      <points geometry={starGeometry} scale={radius / 350}>
        <pointsMaterial
          size={1.6}
          map={starSprite}
          vertexColors
          transparent
          alphaTest={0.02}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Nota: no se dibujan "constelaciones" porque los patrones serían inventados
          (las estrellas de este fondo son procedurales, no un catálogo real). */}

      {/* Cuadrícula de referencia orbital */}
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
