import { useMemo } from 'react';
import * as THREE from 'three';
import { topocentricToScenePosition } from '../../lib/ephemerisService';
import { earthOrientation, poleDirInPatchScene } from '../../lib/earthOrientation';
import {
  PATCH_SUN_DISTANCE,
  PATCH_SUN_RADIUS,
  PATCH_EARTH_DISTANCE,
  PATCH_EARTH_RADIUS,
} from '../../config/sceneScale';
import CelestialSun from './CelestialSun';
import CelestialEarth from './CelestialEarth';

// El Sol queda más lejos que la Tierra, y ambos discos se dibujan con su diámetro angular REAL
// visto desde la Luna (Sol 0.533°, Tierra 1.90°): la Tierra se ve ~3.6 veces más ancha que el Sol.
const R_SUN = PATCH_SUN_DISTANCE;
const R_EARTH = PATCH_EARTH_DISTANCE;

interface SunLightProps {
  sunAz: number;
  sunEl: number;
  targetPos?: [number, number, number];
  showVector?: boolean;
}

export function SunLight({
  sunAz,
  sunEl,
  targetPos = [0, 0, 0],
  showVector = true,
}: SunLightProps) {
  const pos = useMemo(
    () => topocentricToScenePosition(sunAz, Math.max(-5, sunEl), R_SUN),
    [sunAz, sunEl]
  );

  return (
    <CelestialSun
      position={pos}
      radius={PATCH_SUN_RADIUS}
      targetPos={targetPos}
      showVector={showVector}
      castShadows
      shadowExtent={80}
    />
  );
}

interface EarthMarkerProps {
  earthAz: number;
  earthEl: number;
  /** Para orientar la Tierra: dirección del Sol, latitud del sitio e instante simulado. */
  sunAz?: number;
  sunEl?: number;
  siteLatDeg?: number;
  utcMs?: number;
  targetPos?: [number, number, number];
  earthRotationRad?: number;
  isOccluded?: boolean;
  showVector?: boolean;
}

export function EarthMarker({
  earthAz,
  earthEl,
  sunAz,
  sunEl,
  siteLatDeg,
  utcMs,
  targetPos = [0, 0, 0],
  earthRotationRad,
  isOccluded = false,
  showVector = true,
}: EarthMarkerProps) {
  const pos = useMemo(
    () => topocentricToScenePosition(earthAz, Math.max(-8, earthEl), R_EARTH),
    [earthAz, earthEl]
  );

  const sun = useMemo<[number, number, number] | undefined>(() => {
    if (sunAz === undefined || sunEl === undefined) return undefined;
    const v = topocentricToScenePosition(sunAz, sunEl, 1);
    return [v[0], v[1], v[2]];
  }, [sunAz, sunEl]);

  const orientation = useMemo(() => {
    if (!sun || siteLatDeg === undefined || utcMs === undefined) return undefined;
    return earthOrientation({
      poleDir: poleDirInPatchScene(siteLatDeg),
      sunDir: new THREE.Vector3(...sun),
      utcMs,
    }).quaternion;
  }, [sun, siteLatDeg, utcMs]);

  return (
    <CelestialEarth
      position={pos}
      radius={PATCH_EARTH_RADIUS}
      targetPos={targetPos}
      showVector={showVector}
      earthRotationRad={earthRotationRad}
      orientation={orientation}
      sunDir={sun}
      isOccluded={isOccluded}
    />
  );
}
