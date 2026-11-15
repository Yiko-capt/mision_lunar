import { topocentricToScenePosition } from '../../lib/ephemerisService';
import CelestialSun from './CelestialSun';
import CelestialEarth from './CelestialEarth';

const R_SUN = 90;
const R_EARTH = 130;

interface SunLightProps {
  sunAz: number;
  sunEl: number;
  targetPos?: [number, number, number];
}

export function SunLight({
  sunAz,
  sunEl,
  targetPos = [0, 0, 0],
}: SunLightProps) {
  const pos = topocentricToScenePosition(sunAz, Math.max(-5, sunEl), R_SUN);

  return (
    <CelestialSun
      position={pos}
      radius={7.5}
      targetPos={targetPos}
      showVector={true}
    />
  );
}

interface EarthMarkerProps {
  earthAz: number;
  earthEl: number;
  targetPos?: [number, number, number];
  earthRotationRad?: number;
  isOccluded?: boolean;
}

export function EarthMarker({
  earthAz,
  earthEl,
  targetPos = [0, 0, 0],
  earthRotationRad,
  isOccluded = false,
}: EarthMarkerProps) {
  const pos = topocentricToScenePosition(earthAz, Math.max(-8, earthEl), R_EARTH);

  return (
    <CelestialEarth
      position={pos}
      radius={5.5}
      targetPos={targetPos}
      showVector={true}
      earthRotationRad={earthRotationRad}
      isOccluded={isOccluded}
    />
  );
}
