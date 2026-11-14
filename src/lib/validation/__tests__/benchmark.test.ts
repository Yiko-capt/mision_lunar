import { describe, it, expect } from 'vitest';
import { evaluateBenchmark } from '../benchmark';
import type { SiteDataSet } from '../../io/schemas';

describe('Suite de Validación Automática (Benchmark Físico)', () => {
  it('marca shackleton_floor como NO PASA cuando las métricas reportan 100% de luz (falla de horizonte de Fabrizio)', () => {
    const mockMap: Record<string, SiteDataSet> = {
      shackleton_floor: {
        site_id: 'shackleton_floor',
        horizonte: null,
        efemerides: null,
        metricas: {
          site_id: 'shackleton_floor',
          resumen: {
            iluminacion_solar_pct: 100.0, // Error de Fabrizio
            horas_luz_total: 720.0,
            elevacion_solar_max_deg: 1.82,
            visibilidad_tierra_nominal_pct: 35.0,
            visibilidad_tierra_margen_pct: 20.0,
          },
          serie_temporal: [],
          sintetico: false,
          fuenteFormato: 'fabrizio',
        },
        cargando: false,
        estadoDatos: 'parcial',
      },
    };

    const results = evaluateBenchmark(mockMap);
    const case2 = results.find((r) => r.site_id === 'shackleton_floor');
    expect(case2).toBeDefined();
    expect(case2?.estado).toBe('NO PASA');
    expect(case2?.motivo).toContain('NO PASA');
  });

  it('marca apollo_11 como SIN DATOS cuando no se suministraron efemérides de 1969', () => {
    const mockMap: Record<string, SiteDataSet> = {
      apollo_11: {
        site_id: 'apollo_11',
        horizonte: null,
        efemerides: null,
        metricas: null,
        cargando: false,
        estadoDatos: 'sin_datos',
      },
    };

    const results = evaluateBenchmark(mockMap);
    const case4 = results.find((r) => r.site_id === 'apollo_11');
    expect(case4).toBeDefined();
    expect(case4?.estado).toBe('SIN DATOS');
  });

  it('aprueba shackleton_floor cuando la iluminación y visibilidad son exactamente 0.0%', () => {
    const mockMap: Record<string, SiteDataSet> = {
      shackleton_floor: {
        site_id: 'shackleton_floor',
        horizonte: null,
        efemerides: null,
        metricas: {
          site_id: 'shackleton_floor',
          resumen: {
            iluminacion_solar_pct: 0.0,
            horas_luz_total: 0.0,
            elevacion_solar_max_deg: -4.5,
            visibilidad_tierra_nominal_pct: 0.0,
            visibilidad_tierra_margen_pct: 0.0,
          },
          serie_temporal: [],
          sintetico: false,
          fuenteFormato: 'convencion',
        },
        cargando: false,
        estadoDatos: 'completo',
      },
    };

    const results = evaluateBenchmark(mockMap);
    const case2 = results.find((r) => r.site_id === 'shackleton_floor');
    expect(case2?.estado).toBe('PASA');
  });
});
