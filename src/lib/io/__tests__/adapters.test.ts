import { describe, it, expect } from 'vitest';
import { normalizeLon, normalizeAz, circularDiff, interpolateHorizon, normalizeTimestampToUtc } from '../normalizers';
import { adaptHorizon } from '../horizonAdapter';
import { adaptEphemeris } from '../ephemerisAdapter';
import { adaptMetrics } from '../metricsAdapter';

describe('Normalizadores Geométricos y Temporales', () => {
  it('normaliza longitudes a [0, 360) hacia el Este', () => {
    expect(normalizeLon(0)).toBe(0);
    expect(normalizeLon(90)).toBe(90);
    expect(normalizeLon(360)).toBe(0);
    expect(normalizeLon(720)).toBe(0);
    expect(normalizeLon(-42.1)).toBeCloseTo(317.9, 4);
    expect(normalizeLon(-87.1)).toBeCloseTo(272.9, 4);
    expect(normalizeLon(-180)).toBe(180);
    expect(normalizeLon(-360)).toBe(0);
  });

  it('normaliza azimuts a [0, 360) horario', () => {
    expect(normalizeAz(0)).toBe(0);
    expect(normalizeAz(360)).toBe(0);
    expect(normalizeAz(-1)).toBe(359);
    expect(normalizeAz(450)).toBe(90);
  });

  it('calcula la diferencia circular mínima [0, 180]', () => {
    expect(circularDiff(10, 20)).toBe(10);
    expect(circularDiff(355, 5)).toBe(10);
    expect(circularDiff(0, 180)).toBe(180);
    expect(circularDiff(10, 270)).toBe(100);
  });

  it('normaliza timestamps con +00:00 o locales a UTC ISO con Z', () => {
    expect(normalizeTimestampToUtc('2026-11-14T00:00:00+00:00')).toBe('2026-11-14T00:00:00Z');
    expect(normalizeTimestampToUtc('2027-01-01T12:30:00Z')).toBe('2027-01-01T12:30:00Z');
  });

  it('interpola el horizonte circularmente con Az_360 = Az_0', () => {
    const lookup = new Float32Array(360);
    lookup[0] = 2.0;
    lookup[1] = 4.0;
    lookup[359] = 1.0;

    // A medio camino entre 0° y 1° -> 3.0°
    expect(interpolateHorizon(0.5, lookup)).toBeCloseTo(3.0);
    // A medio camino entre 359° y 360° (0°) -> 1.5°
    expect(interpolateHorizon(359.5, lookup)).toBeCloseTo(1.5);
    // En el azimut exacto
    expect(interpolateHorizon(0, lookup)).toBe(2.0);
  });
});

describe('Adaptador de Horizonte', () => {
  it('adapta el formato oficial de Cris (perfil_horizonte)', () => {
    const raw = {
      site_id: 'shackleton_rim',
      nombre: 'Borde Shackleton',
      lat_deg: -89.684,
      lon_deg: 196.739,
      elevacion_sitio_m: 1520.0,
      parametros: { h_obs_m: 2.0, d_max_km: 100.0, paso_azimut_deg: 1.0 },
      perfil_horizonte: [
        { azimut_deg: 0, elevacion_maxima_deg: 1.12 },
        { azimut_deg: 180, elevacion_maxima_deg: 2.45 },
      ],
    };

    const res = adaptHorizon(raw);
    expect(res.site_id).toBe('shackleton_rim');
    expect(res.sintetico).toBe(false);
    expect(res.fuenteFormato).toBe('convencion_cris');
    expect(res.elevationLookup[0]).toBeCloseTo(1.12, 2);
    expect(res.elevationLookup[180]).toBeCloseTo(2.45, 2);
  });

  it('adapta el formato sintético de Justin (az_deg y elev_deg)', () => {
    const raw = {
      sitio: 'malapert_sintetico',
      sintetico: true,
      az_deg: [0, 90, 180, 270],
      elev_deg: [3.5, 4.0, 2.0, 1.5],
    };

    const res = adaptHorizon(raw);
    expect(res.site_id).toBe('malapert_sintetico');
    expect(res.sintetico).toBe(true);
    expect(res.elevationLookup[0]).toBe(3.5);
    expect(res.elevationLookup[90]).toBe(4.0);
  });
});

describe('Adaptador de Efemérides', () => {
  it('adapta efemérides de Fabrizio convirtiendo columnas paralelas y normalizando lon negativa', () => {
    const raw = {
      site: 'cabeus',
      lat: -85.3,
      lon: -42.1, // Oeste negativo -> 317.9° Este
      t: ['2026-11-14T00:00:00+00:00', '2026-11-14T01:00:00+00:00'],
      sun: { az: [120.5, 121.5], el: [1.2, 1.3] },
      earth: { az: [5.2, 5.3], el: [4.1, 4.2] },
    };

    const res = adaptEphemeris(raw);
    expect(res.site_id).toBe('cabeus');
    expect(res.lon_deg).toBeCloseTo(317.9, 1);
    expect(res.datos.length).toBe(2);
    expect(res.datos[0].timestamp_utc).toBe('2026-11-14T00:00:00Z');
    expect(res.datos[0].sol_azimut_deg).toBe(120.5);
    expect(res.datos[0].tierra_elevacion_deg).toBe(4.1);
  });

  it('adapta efemérides sintéticas de Justin', () => {
    const raw = {
      sitio: 'shackleton_borde',
      lat: -89.9,
      lon: 0.0,
      sintetico: true,
      t_utc: ['2027-01-01T00:00:00Z'],
      sol: { az: [100], el: [1.5], r_ua: [0.99] },
      tierra: { az: [10], el: [5.5], dist_km: [384400] },
    };

    const res = adaptEphemeris(raw);
    expect(res.site_id).toBe('shackleton_borde');
    expect(res.sintetico).toBe(true);
    expect(res.datos[0].sol_azimut_deg).toBe(100);
    expect(res.datos[0].sol_dist_au).toBe(0.99);
  });
});

describe('Adaptador de Métricas', () => {
  it('adapta métricas de Justin con estructura escenario y semáforo', () => {
    const raw = {
      sitio: 'shackleton_borde',
      escenario: {
        energia: {
          horas_luz_h: 120.0,
          fraccion_luz: 0.5,
          el_sol_max_deg: 1.8,
          energia_total_wh: 4500,
          potencia_pico_w: 38.5,
          potencia_media_w: 19.2,
          t_hasta_puesta_h: 24.5,
        },
        comunicacion: {
          horas_dte_h: 200.0,
          fraccion_dte: 0.8,
          t_hasta_tierra_puesta_h: 48.0,
        },
        viabilidad: {
          semaforo: 'verde',
        },
      },
    };

    const res = adaptMetrics(raw);
    expect(res.resumen.iluminacion_solar_pct).toBe(50);
    expect(res.resumen.horas_luz_total).toBe(120);
    expect(res.resumen.semaforo).toBe('verde');
    expect(res.resumen.tiempo_hasta_ocaso_solar_h).toBe(24.5);
  });

  it('adapta métricas de Fabrizio computando horas totales de luz', () => {
    const raw = {
      site: 'malapert',
      horas_luz_por_dia: { '2026-11-14': 10, '2026-11-15': 20 },
      horas_tierra_por_dia: { '2026-11-14': 24, '2026-11-15': 24 },
      ventanas_sol: [{ inicio: '2026-11-14T00:00:00+00:00', fin: '2026-11-15T00:00:00+00:00', horas: 30 }],
      ventanas_tierra: [],
      t: ['2026-11-14T00:00:00+00:00', '2026-11-14T01:00:00+00:00'],
    };

    const res = adaptMetrics(raw);
    expect(res.site_id).toBe('malapert');
    expect(res.resumen.horas_luz_total).toBe(30);
  });
});
