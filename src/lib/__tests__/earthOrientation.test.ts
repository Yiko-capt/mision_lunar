import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  earthOrientation,
  sunEclipticLongitudeDeg,
  subsolarLongitudeDeg,
  EARTH_OBLIQUITY_DEG,
} from '../earthOrientation';

const pole = new THREE.Vector3(0, 1, 0);
const sunAt = (lambdaDeg: number) => {
  const l = (lambdaDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(l), 0, Math.cos(l));
};

describe('earthOrientation', () => {
  it('longitud eclíptica del Sol: solsticios y equinoccios (±1°)', () => {
    const near = (iso: string, deg: number) => {
      const v = sunEclipticLongitudeDeg(Date.parse(iso));
      const d = Math.abs(((v - deg + 540) % 360) - 180);
      expect(d).toBeLessThan(1);
    };
    near('2026-03-20T14:46:00Z', 0);
    near('2026-06-21T08:24:00Z', 90);
    near('2026-09-23T00:05:00Z', 180);
    near('2026-12-21T20:50:00Z', 270);
  });

  it('el punto subsolar está a 12:00 UTC cerca de la longitud 0° y se mueve 15°/h al oeste', () => {
    const noon = subsolarLongitudeDeg(Date.parse('2026-11-15T12:00:00Z'));
    expect(Math.abs(noon)).toBeLessThan(6); // ecuación del tiempo ≤ 16 min ≈ 4°
    const later = subsolarLongitudeDeg(Date.parse('2026-11-15T13:00:00Z'));
    const d = ((later - noon + 540) % 360) - 180;
    expect(d).toBeCloseTo(-15, 0);
  });

  it('en el solsticio de junio el polo norte se inclina hacia el Sol (declinación ≈ +23.4°)', () => {
    const t = Date.parse('2026-06-21T08:24:00Z');
    const o = earthOrientation({ poleDir: pole, sunDir: sunAt(sunEclipticLongitudeDeg(t)), utcMs: t });
    expect(o.tiltDeg).toBeCloseTo(EARTH_OBLIQUITY_DEG, 1);
    expect(o.subsolarLatDeg).toBeCloseTo(EARTH_OBLIQUITY_DEG, 0);
  });

  it('en el solsticio de diciembre la declinación solar es ≈ −23.4°; en el equinoccio ≈ 0°', () => {
    const tD = Date.parse('2026-12-21T20:50:00Z');
    const oD = earthOrientation({ poleDir: pole, sunDir: sunAt(sunEclipticLongitudeDeg(tD)), utcMs: tD });
    expect(oD.subsolarLatDeg).toBeCloseTo(-EARTH_OBLIQUITY_DEG, 0);
    const tE = Date.parse('2026-03-20T14:46:00Z');
    const oE = earthOrientation({ poleDir: pole, sunDir: sunAt(sunEclipticLongitudeDeg(tE)), utcMs: tE });
    expect(Math.abs(oE.subsolarLatDeg)).toBeLessThan(1);
  });

  it('el punto subsolar de la textura mira exactamente hacia el Sol', () => {
    const t = Date.parse('2026-11-15T17:30:00Z');
    const sun = sunAt(231).normalize();
    const o = earthOrientation({ poleDir: pole, sunDir: sun, utcMs: t });
    const lat = (o.subsolarLatDeg * Math.PI) / 180;
    const lon = (o.subsolarLonDeg * Math.PI) / 180;
    const local = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
    const world = local.applyQuaternion(o.quaternion);
    expect(world.angleTo(sun) * (180 / Math.PI)).toBeLessThan(0.01);
  });
});
