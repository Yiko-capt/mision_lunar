import { sunState, earthState } from '../../lib/solar';

const R_SUN = 120;
const R_EARTH = 200;

// Convierte (dirección, elevación) en posición de la escena
function toPos(theta: number, el: number, r: number): [number, number, number] {
  return [
    Math.cos(theta) * Math.cos(el) * r,
    Math.sin(el) * r,
    Math.sin(theta) * Math.cos(el) * r,
  ];
}

export function SunLight({ days }: { days: number }) {
  const st = sunState(days);
  const [x, y, z] = toPos(st.theta, st.el, R_SUN);
  return (
    <directionalLight
      position={[x, y, z]}
      intensity={st.el > 0 ? 3 : 0}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-60}
      shadow-camera-right={60}
      shadow-camera-top={60}
      shadow-camera-bottom={-60}
      shadow-camera-far={400}
    />
  );
}

export function EarthMarker({ days }: { days: number }) {
  const st = earthState(days);
  const [x, y, z] = toPos(0, st.el, R_EARTH);
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[6, 32, 32]} />
      <meshStandardMaterial color="#3b82f6" emissive="#1e3a8a" />
    </mesh>
  );
}