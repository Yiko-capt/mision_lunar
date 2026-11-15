import { describe, it, expect } from 'vitest';
import {
  angularDiameterDeg,
  radiusForAngularDiameter,
  MOON_RADIUS_KM,
  EARTH_RADIUS_KM,
  SUN_RADIUS_KM,
  EARTH_MOON_MEAN_KM,
  AU_KM,
  GLOBE_SCALES,
  PATCH_SUN_DISTANCE,
  PATCH_SUN_RADIUS,
  PATCH_EARTH_DISTANCE,
  PATCH_EARTH_RADIUS,
  SUN_ANGULAR_FROM_MOON_DEG,
  EARTH_ANGULAR_FROM_MOON_DEG,
} from '../../config/sceneScale';

/** Diámetro angular con que un disco de radio r a distancia d se ve en la escena. */
const drawnDiameterDeg = (r: number, d: number) => angularDiameterDeg(r, d);

describe('tamaños angulares reales (criterio de aceptación 1)', () => {
  it('el Sol visto desde la Luna mide ≈ 0.533° (±0.02°)', () => {
    expect(angularDiameterDeg(SUN_RADIUS_KM, AU_KM)).toBeCloseTo(0.533, 2);
    expect(Math.abs(SUN_ANGULAR_FROM_MOON_DEG - 0.533)).toBeLessThan(0.02);
  });

  it('la Tierra vista desde la Luna mide ≈ 1.90° (±0.02°)', () => {
    expect(Math.abs(angularDiameterDeg(EARTH_RADIUS_KM, EARTH_MOON_MEAN_KM) - 1.899)).toBeLessThan(0.02);
    expect(Math.abs(EARTH_ANGULAR_FROM_MOON_DEG - 1.9)).toBeLessThan(0.02);
  });

  it('la Luna vista desde la Tierra mide ≈ 0.518° (±0.02°)', () => {
    expect(Math.abs(angularDiameterDeg(MOON_RADIUS_KM, EARTH_MOON_MEAN_KM) - 0.518)).toBeLessThan(0.02);
  });

  it('desde la Luna, la Tierra se ve ≈ 3.6 veces más ancha que el Sol', () => {
    const ratio = EARTH_ANGULAR_FROM_MOON_DEG / SUN_ANGULAR_FROM_MOON_DEG;
    expect(ratio).toBeGreaterThan(3.4);
    expect(ratio).toBeLessThan(3.8);
  });
});

describe('escena del globo (criterio de aceptación 2)', () => {
  it('en escala real, la Tierra está a ≈ 221 radios lunares', () => {
    expect(GLOBE_SCALES.real.earthDistance).toBeCloseTo(384400 / 1737.4, 1);
    expect(Math.abs(GLOBE_SCALES.real.earthDistance - 221.3)).toBeLessThan(1);
  });

  it('en ningún modo la Luna (radio 1) es mayor que la Tierra ni que el Sol', () => {
    for (const s of Object.values(GLOBE_SCALES)) {
      expect(s.earthRadius).toBeGreaterThan(1);
      expect(s.sunRadius).toBeGreaterThan(1);
    }
  });

  it('el Sol siempre queda más lejos que la Tierra', () => {
    for (const s of Object.values(GLOBE_SCALES)) {
      expect(s.sunDistance).toBeGreaterThan(s.earthDistance);
    }
  });

  it('en escala real el disco solar dibujado mide 0.533° (±0.02°) desde la Luna', () => {
    const s = GLOBE_SCALES.real;
    expect(Math.abs(drawnDiameterDeg(s.sunRadius, s.sunDistance) - 0.533)).toBeLessThan(0.02);
  });

  it('la proporción de radios Tierra:Luna se conserva en ambos modos (3.667)', () => {
    for (const s of Object.values(GLOBE_SCALES)) {
      expect(s.earthRadius).toBeCloseTo(6371 / 1737.4, 2);
    }
  });

  it('el Sol queda dentro del far de cámara y la cámara puede alejarse hasta ver la Tierra', () => {
    for (const s of Object.values(GLOBE_SCALES)) {
      expect(s.cameraFar).toBeGreaterThan(s.sunDistance);
      expect(s.maxCameraDistance).toBeGreaterThan(s.earthDistance);
    }
  });
});

describe('escena del parche (discos de referencia a tamaño angular real)', () => {
  it('el disco solar del parche mide 0.533° (±0.02°)', () => {
    expect(Math.abs(drawnDiameterDeg(PATCH_SUN_RADIUS, PATCH_SUN_DISTANCE) - 0.533)).toBeLessThan(0.02);
  });

  it('el disco terrestre del parche mide 1.90° (±0.02°)', () => {
    expect(Math.abs(drawnDiameterDeg(PATCH_EARTH_RADIUS, PATCH_EARTH_DISTANCE) - 1.899)).toBeLessThan(0.02);
  });

  it('radiusForAngularDiameter es inversa de angularDiameterDeg', () => {
    const r = radiusForAngularDiameter(500, 1.23);
    expect(drawnDiameterDeg(r, 500)).toBeCloseTo(1.23, 6);
  });
});
