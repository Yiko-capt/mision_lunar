import type { SiteDataSet } from '../io/schemas';

export interface BenchmarkCaseResult {
  site_id: string;
  nombre: string;
  tipo_prueba: 'anual' | 'puntual';
  estado: 'PASA' | 'NO PASA' | 'SIN DATOS';
  criterioEsperado: string;
  valorObtenido: string;
  fuente: string;
  motivo: string;
}

/**
 * Evalúa los 5 casos de validación física de referencia según ale/casos_de_validación_LOLA.
 */
export function evaluateBenchmark(siteDataMap: Record<string, SiteDataSet>): BenchmarkCaseResult[] {
  const results: BenchmarkCaseResult[] = [];

  // CASO 1: Shackleton Rim (Pico de luz casi eterna)
  {
    const data = siteDataMap['shackleton_rim'];
    const met = data?.metricas?.resumen;
    if (!met) {
      results.push({
        site_id: 'shackleton_rim',
        nombre: 'Cresta Shackleton (Pico de luz)',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Iluminación solar anual en [78.0%, 91.0%]',
        valorObtenido: 'Sin métricas anuales de efemérides',
        fuente: 'Mazarico et al. (2011), Icarus 211(2)',
        motivo: 'Faltan efemérides anuales completas para auditar el año lunar entero.',
      });
    } else {
      const ilum = met.iluminacion_solar_pct;
      const pasa = ilum >= 78.0 && ilum <= 91.0;
      results.push({
        site_id: 'shackleton_rim',
        nombre: 'Cresta Shackleton (Pico de luz)',
        tipo_prueba: 'anual',
        estado: pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Iluminación solar anual en [78.0%, 91.0%]',
        valorObtenido: `${ilum.toFixed(1)}%`,
        fuente: 'Mazarico et al. (2011), Icarus 211(2)',
        motivo: pasa
          ? 'Reproduce la iluminación solar casi continua del borde polar.'
          : `El valor obtenido (${ilum.toFixed(1)}%) queda fuera del rango esperado [78%, 91%].`,
      });
    }
  }

  // CASO 2: Shackleton Floor (Fondo PSR)
  {
    const data = siteDataMap['shackleton_floor'];
    const met = data?.metricas?.resumen;
    if (!met) {
      results.push({
        site_id: 'shackleton_floor',
        nombre: 'Interior Shackleton (Fondo PSR)',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Iluminación solar == 0.0% y Visibilidad Tierra == 0.0%',
        valorObtenido: 'Sin datos',
        fuente: 'Zuber et al. (2012), Nature 486',
        motivo: 'Faltan datos de métricas para este sitio.',
      });
    } else {
      const ilum = met.iluminacion_solar_pct;
      const tierra = met.visibilidad_tierra_nominal_pct;
      const pasa = ilum === 0.0 && tierra === 0.0;
      results.push({
        site_id: 'shackleton_floor',
        nombre: 'Interior Shackleton (Fondo PSR)',
        tipo_prueba: 'anual',
        estado: pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Iluminación solar == 0.0% y Visibilidad Tierra == 0.0%',
        valorObtenido: `Iluminación: ${ilum.toFixed(1)}%, Tierra: ${tierra.toFixed(1)}%`,
        fuente: 'Zuber et al. (2012), Nature 486',
        motivo: pasa
          ? 'Bloqueo topográfico completo verificado por el cráter.'
          : 'NO PASA: Las métricas de Rol B reportan iluminación porque el cálculo no aplicó el horizonte de LOLA (asumió esfera lisa).',
      });
    }
  }

  // CASO 3: Malapert Peak (Enlace DTE Continuo)
  {
    const data = siteDataMap['malapert_peak'];
    const met = data?.metricas?.resumen;
    if (!met) {
      results.push({
        site_id: 'malapert_peak',
        nombre: 'Cima Macizo Malapert',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Visibilidad Tierra >= 95.0% e Iluminación en [68.0%, 78.0%]',
        valorObtenido: 'Sin datos',
        fuente: 'Sharpe & Schrunk (2003), ASR 31(11)',
        motivo: 'Faltan datos de métricas anuales.',
      });
    } else {
      const tierra = met.visibilidad_tierra_nominal_pct;
      const ilum = met.iluminacion_solar_pct;
      const pasa = tierra >= 95.0 && ilum >= 68.0 && ilum <= 78.0;
      results.push({
        site_id: 'malapert_peak',
        nombre: 'Cima Macizo Malapert',
        tipo_prueba: 'anual',
        estado: pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Visibilidad Tierra >= 95.0% e Iluminación en [68.0%, 78.0%]',
        valorObtenido: `Tierra: ${tierra.toFixed(1)}%, Ilum: ${ilum.toFixed(1)}%`,
        fuente: 'Sharpe & Schrunk (2003), ASR 31(11)',
        motivo: pasa
          ? 'Cima despejada con línea de visión continua a la Tierra confirmada.'
          : `Valores obtenidos (Tierra: ${tierra.toFixed(1)}%, Ilum: ${ilum.toFixed(1)}%) fuera de rango de referencia.`,
      });
    }
  }

  // CASO 4: Apolo 11 (Calibración puntual histórica)
  {
    const data = siteDataMap['apollo_11'];
    const ephem = data?.efemerides;
    if (!ephem || ephem.datos.length === 0) {
      results.push({
        site_id: 'apollo_11',
        nombre: 'Base Tranquilidad (Apolo 11)',
        tipo_prueba: 'puntual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Sol El = 10.8° (±0.2°), Az = 88.0° (±0.2°) en 1969-07-20T20:17:40Z',
        valorObtenido: 'Sin efemérides de la época de alunizaje',
        fuente: 'Apollo 11 Mission Report (NASA SP-238) / JPL Horizons',
        motivo: 'SIN DATOS: Rol B no proveyó efemérides de 1969 para Apolo 11 en los archivos entregados.',
      });
    } else {
      // Buscar punto cercano a 20:17:40Z
      const pt = ephem.datos.find((d) => d.timestamp_utc.includes('1969-07-20T20'));
      if (!pt) {
        results.push({
          site_id: 'apollo_11',
          nombre: 'Base Tranquilidad (Apolo 11)',
          tipo_prueba: 'puntual',
          estado: 'SIN DATOS',
          criterioEsperado: 'Sol El = 10.8° (±0.2°), Az = 88.0° (±0.2°) en 1969-07-20T20:17:40Z',
          valorObtenido: 'Época no encontrada en datos',
          fuente: 'NASA SP-238',
          motivo: 'No se encontró la marca de tiempo de alunizaje en la tabla de efemérides.',
        });
      } else {
        const errEl = Math.abs(pt.sol_elevacion_deg - 10.8);
        const errAz = Math.abs(pt.sol_azimut_deg - 88.0);
        const pasa = errEl <= 0.2 && errAz <= 0.2;
        results.push({
          site_id: 'apollo_11',
          nombre: 'Base Tranquilidad (Apolo 11)',
          tipo_prueba: 'puntual',
          estado: pasa ? 'PASA' : 'NO PASA',
          criterioEsperado: 'Sol El = 10.8° (±0.2°), Az = 88.0° (±0.2°)',
          valorObtenido: `El: ${pt.sol_elevacion_deg.toFixed(2)}°, Az: ${pt.sol_azimut_deg.toFixed(2)}°`,
          fuente: 'NASA SP-238',
          motivo: pasa ? 'Calibración esférica verificada con éxito.' : `Error angular excesivo (ΔEl=${errEl.toFixed(2)}°, ΔAz=${errAz.toFixed(2)}°).`,
        });
      }
    }
  }

  // CASO 5: Cabeus Rim (Sensibilidad espacial Artemis III)
  {
    const data = siteDataMap['cabeus_rim'];
    const met = data?.metricas?.resumen;
    if (!met) {
      results.push({
        site_id: 'cabeus_rim',
        nombre: 'Borde de Cabeus (Peak near Cabeus B)',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Iluminación solar anual en [58.0%, 75.0%]',
        valorObtenido: 'Sin datos',
        fuente: 'Colaprete et al. (2010), Science 330',
        motivo: 'Faltan métricas anuales para este sitio.',
      });
    } else {
      const ilum = met.iluminacion_solar_pct;
      const pasa = ilum >= 58.0 && ilum <= 75.0;
      results.push({
        site_id: 'cabeus_rim',
        nombre: 'Borde de Cabeus (Peak near Cabeus B)',
        tipo_prueba: 'anual',
        estado: pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Iluminación solar anual en [58.0%, 75.0%]',
        valorObtenido: `${ilum.toFixed(1)}%`,
        fuente: 'Colaprete et al. (2010), Science 330',
        motivo: pasa
          ? 'Sensibilidad topográfica verificada dentro del umbral Artemis III.'
          : `Iluminación obtenida (${ilum.toFixed(1)}%) fuera del rango de borde de Cabeus [58%, 75%].`,
      });
    }
  }

  return results;
}
