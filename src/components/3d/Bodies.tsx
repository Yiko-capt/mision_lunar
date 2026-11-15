import { sunState, earthState } from '../../lib/solar';
import CelestialSun from './CelestialSun';
import CelestialEarth from './CelestialEarth';

const R_SUN = 90;
const R_EARTH = 130;

function toPos(theta: number, el: number, r: number): [number, number, number] {
  return [
    Math.cos(theta) * Math.cos(el) * r,
    Math.sin(el) * r,
    Math.sin(theta) * Math.cos(el) * r,
  ];
}

export function SunLight({
  days,
  targetPos = [0, 0, 0],
}: {
  days: number;
  targetPos?: [number, number, number];
}) {
  const st = sunState(days);
  const pos = toPos(st.theta, st.el, R_SUN);

  return (
    <CelestialSun
      position={pos}
      radius={7.5}
      targetPos={targetPos}
      showVector={true}
    />
  );
}

export function EarthMarker({
  days,
  targetPos = [0, 0, 0],
}: {
  days: number;
  targetPos?: [number, number, number];
}) {
  const st = earthState(days);
  const pos = toPos(0, st.el, R_EARTH);

  return (
    <CelestialEarth
      position={pos}
      radius={5.5}
      targetPos={targetPos}
      showVector={true}
    />
  );
}
