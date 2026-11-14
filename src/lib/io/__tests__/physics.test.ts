import { describe, it, expect } from 'vitest';
import { diskFraction, solarPower, computeTrajectory } from '../../physics';
import { adaptHorizon } from '../horizonAdapter';
import { adaptEphemeris } from '../ephemerisAdapter';

describe('Física Solar y Fracción de Disco', () => {
  it('f(x) devuelve 0 cuando el Sol está completamente oculto (x <= -1)', () => {
    // Sol a 0.0°, horizonte a 1.0° -> x = -1 / 0.267 < -1
    expect(diskFraction(0.0, 1.0)).toBe(0.0);
  });

  it('f(x) devuelve 1 cuando el Sol está completamente visible (x >= 1)', () => {
    // Sol a 2.0°, horizonte a 1.0° -> x = 1 / 0.267 > 1
    expect(diskFraction(2.0, 1.0)).toBe(1.0);
  });

  it('f(x) devuelve exactamente 0.5 cuando el centro del Sol está en el horizonte (x = 0)', () => {
    expect(diskFraction(1.0, 1.0)).toBeCloseTo(0.5, 4);
  });

  it('calcula potencia P(t) con panel horizontal sin tracking', () => {
    // Sol completamente visible a 10° sobre horizonte 0°
    const pwr = solarPower(10.0, 0.0, 0.28, 1.0, false);
    const expected = 1.0 * 1361.0 * 0.28 * 1.0 * Math.sin((10.0 * Math.PI) / 180);
    expect(pwr).toBeCloseTo(expected, 2);
  });
});

describe('Cálculo de Trayectoria y Tiempos de Ocaso', () => {
  it('detecta correctamente cuándo el Sol o la Tierra caen bajo el horizonte', () => {
    const horizon = adaptHorizon({
      site_id: 'test_site',
      perfil_horizonte: [{ azimut_deg: 0, elevacion_maxima_deg: 1.0 }],
    });

    const ephem = adaptEphemeris({
      site_id: 'test_site',
      datos: [
        {
          timestamp_utc: '2026-11-15T00:00:00Z',
          sol_azimut_deg: 0,
          sol_elevacion_deg: 2.0, // Visible
          tierra_azimut_deg: 0,
          tierra_elevacion_deg: 3.0, // Visible
        },
        {
          timestamp_utc: '2026-11-15T01:00:00Z',
          sol_azimut_deg: 0,
          sol_elevacion_deg: 0.5, // Puesta de sol (bajo 1.0° - 0.267°)
          tierra_azimut_deg: 0,
          tierra_elevacion_deg: 0.5, // Bajo horizonte
        },
      ],
    });

    const traj = computeTrajectory(horizon, ephem, 1.0);
    expect(traj.points.length).toBe(2);
    expect(traj.points[0].sun_visible).toBe(true);
    expect(traj.points[0].hours_to_sun_sunset).toBe(1.0);
    expect(traj.points[0].hours_to_earth_loss).toBe(1.0);
    expect(traj.points[1].sun_visible).toBe(false);
  });
});
