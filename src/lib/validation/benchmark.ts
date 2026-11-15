import type { SiteDataSet } from '../io/schemas';
import { computeTrajectory } from '../physics';

export interface BenchmarkCaseResult {
  site_id: string;
  nombre: string;
  tipo_prueba: 'anual' | 'puntual';
  estado: 'PASA' | 'NO PASA' | 'SIN DATOS' | 'NO COMPARABLE';
  criterioEsperado: string;
  valorObtenido: string;
  fuente: string;
  motivo: string;
}

/** Días mínimos de efemérides para poder auditar un criterio anual. */
export const MIN_DAYS_ANNUAL = 330;

interface SiteNumbers {
  ilum: number;
  tierra: number;
  /** Días cubiertos por las efemérides (null si los números vienen de un resumen sin serie). */
  days: number | null;
}

/**
 * Números del sitio para la auditoría. Se calculan con horizonte + efemérides, igual que el
 * Comparador A/B y el resto de paneles, para que ningún panel contradiga a otro.
 * Solo si faltan se recurre al resumen de metricas.json.
 */
function siteNumbers(data: SiteDataSet | undefined): SiteNumbers | null {
  if (data?.horizonte && data.efemerides && data.efemerides.datos.length > 0) {
    const t = computeTrajectory(data.horizonte, data.efemerides);
    return { ilum: t.summary.sun_pct, tierra: t.summary.earth_pct_nominal, days: t.totalHours / 24 };
  }
  const met = data?.metricas?.resumen;
  if (!met) return null;
  return { ilum: met.iluminacion_solar_pct, tierra: met.visibilidad_tierra_nominal_pct, days: null };
}

const shortPeriod = (n: SiteNumbers) => n.days != null && n.days < MIN_DAYS_ANNUAL;
const periodNote = (n: SiteNumbers) =>
  `Solo hay ${n.days!.toFixed(0)} días de efemérides: el criterio es anual y no se puede auditar con este periodo.`;

/**
 * Evalúa los 5 casos de validación física de referencia según ale/casos_de_validación_LOLA.
 */
export function evaluateBenchmark(siteDataMap: Record<string, SiteDataSet>): BenchmarkCaseResult[] {
  const results: BenchmarkCaseResult[] = [];

  // CASO 1: Shackleton Rim (Pico de luz casi eterna)
  {
    const met = siteNumbers(siteDataMap['shackleton_rim']);
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
      const ilum = met.ilum;
      const pasa = ilum >= 78.0 && ilum <= 91.0;
      results.push({
        site_id: 'shackleton_rim',
        nombre: 'Cresta Shackleton (Pico de luz)',
        tipo_prueba: 'anual',
        estado: shortPeriod(met) ? 'NO COMPARABLE' : pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Iluminación solar anual en [78.0%, 91.0%]',
        valorObtenido: shortPeriod(met) ? `${ilum.toFixed(1)}% en ${met.days!.toFixed(0)} días` : `${ilum.toFixed(1)}%`,
        fuente: 'Mazarico et al. (2011), Icarus 211(2)',
        motivo: shortPeriod(met)
          ? periodNote(met)
          : pasa
          ? 'Reproduce la iluminación solar casi continua del borde polar.'
          : `El valor obtenido (${ilum.toFixed(1)}%) queda fuera del rango esperado [78%, 91%].`,
      });
    }
  }

  // CASO 2: Shackleton Floor (Fondo PSR)
  {
    const met = siteNumbers(siteDataMap['shackleton_floor']);
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
      const ilum = met.ilum;
      const tierra = met.tierra;
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
          ? met.days != null
            ? `Sin Sol ni Tierra en los ${met.days.toFixed(0)} días con datos (horizonte del cráter aplicado).`
            : 'Bloqueo topográfico completo verificado por el cráter.'
          : met.days != null
          ? 'NO PASA: con el horizonte del sitio aplicado, el Sol o la Tierra asoman en el periodo con datos.'
          : 'NO PASA: el resumen de métricas reporta iluminación porque se calculó sin horizonte (esfera lisa).',
      });
    }
  }

  // CASO 3: Malapert Peak (Enlace DTE Continuo)
  {
    const met = siteNumbers(siteDataMap['malapert_peak']);
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
      const tierra = met.tierra;
      const ilum = met.ilum;
      const pasa = tierra >= 95.0 && ilum >= 68.0 && ilum <= 78.0;
      results.push({
        site_id: 'malapert_peak',
        nombre: 'Cima Macizo Malapert',
        tipo_prueba: 'anual',
        estado: shortPeriod(met) ? 'NO COMPARABLE' : pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Visibilidad Tierra >= 95.0% e Iluminación en [68.0%, 78.0%]',
        valorObtenido: `Tierra: ${tierra.toFixed(1)}%, Ilum: ${ilum.toFixed(1)}%`,
        fuente: 'Sharpe & Schrunk (2003), ASR 31(11)',
        motivo: shortPeriod(met)
          ? periodNote(met)
          : pasa
          ? 'Cima despejada con línea de visión continua a la Tierra confirmada.'
          : `Valores obtenidos (Tierra: ${tierra.toFixed(1)}%, Ilum: ${ilum.toFixed(1)}%) fuera de rango de referencia.`,
      });
    }
  }

  // CASO 4: Apolo 11 (Calibración puntual histórica, 1969-07-20T20:17:40Z)
  {
    const data = siteDataMap['apollo_11'];
    const base = {
      site_id: 'apollo_11',
      nombre: 'Base Tranquilidad (Apolo 11)',
      tipo_prueba: 'puntual' as const,
      criterioEsperado: 'Sol El = 10.8° (±0.2°), Az = 88.0° (±0.2°) en 1969-07-20T20:17:40Z',
      fuente: 'Apollo 11 Mission Report (NASA SP-238) / JPL Horizons',
    };
    // La época de 1969 viene en un archivo aparte (efemerides_landing.json)
    const pts = [...(data?.efemeridesLanding?.datos ?? []), ...(data?.efemerides?.datos ?? [])].filter((d) =>
      d.timestamp_utc.startsWith('1969-07-20T20')
    );
    if (pts.length === 0) {
      results.push({
        ...base,
        estado: 'SIN DATOS',
        valorObtenido: 'Sin efemérides de la época de alunizaje',
        motivo: 'SIN DATOS: no hay efemérides de 1969 para Apolo 11 en los archivos cargados.',
      });
    } else {
      // Interpolar al instante del contacto entre las dos muestras que lo rodean
      const target = Date.UTC(1969, 6, 20, 20, 17, 40);
      const sorted = [...pts].sort((x, y) => Date.parse(x.timestamp_utc) - Date.parse(y.timestamp_utc));
      let p0 = sorted[0];
      let p1 = sorted[sorted.length - 1];
      for (const p of sorted) {
        const t = Date.parse(p.timestamp_utc);
        if (t <= target) p0 = p;
        if (t >= target) {
          p1 = p;
          break;
        }
      }
      const t0 = Date.parse(p0.timestamp_utc);
      const t1 = Date.parse(p1.timestamp_utc);
      const a = t1 > t0 ? Math.max(0, Math.min(1, (target - t0) / (t1 - t0))) : 0;
      const el = p0.sol_elevacion_deg + (p1.sol_elevacion_deg - p0.sol_elevacion_deg) * a;
      const az = p0.sol_azimut_deg + (p1.sol_azimut_deg - p0.sol_azimut_deg) * a;
      const errEl = Math.abs(el - 10.8);
      const errAz = Math.abs(az - 88.0);
      const pasa = errEl <= 0.2 && errAz <= 0.2;
      results.push({
        ...base,
        estado: pasa ? 'PASA' : 'NO PASA',
        valorObtenido: `El: ${el.toFixed(2)}°, Az: ${az.toFixed(2)}°`,
        motivo: pasa
          ? 'Calibración esférica verificada con éxito.'
          : errEl <= 0.2
          ? `Elevación dentro de tolerancia (ΔEl=${errEl.toFixed(2)}°); azimut fuera (ΔAz=${errAz.toFixed(2)}°). Pendiente: revisar la referencia de azimut (88.0°) o su convención.`
          : `Error angular excesivo (ΔEl=${errEl.toFixed(2)}°, ΔAz=${errAz.toFixed(2)}°).`,
      });
    }
  }

  // CASO 5: Cabeus Rim (Sensibilidad espacial Artemis III)
  {
    const met = siteNumbers(siteDataMap['cabeus_rim']);
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
      const ilum = met.ilum;
      const pasa = ilum >= 58.0 && ilum <= 75.0;
      results.push({
        site_id: 'cabeus_rim',
        nombre: 'Borde de Cabeus (Peak near Cabeus B)',
        tipo_prueba: 'anual',
        estado: shortPeriod(met) ? 'NO COMPARABLE' : pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Iluminación solar anual en [58.0%, 75.0%]',
        valorObtenido: shortPeriod(met) ? `${ilum.toFixed(1)}% en ${met.days!.toFixed(0)} días` : `${ilum.toFixed(1)}%`,
        fuente: 'Colaprete et al. (2010), Science 330',
        motivo: shortPeriod(met)
          ? periodNote(met)
          : pasa
          ? 'Sensibilidad topográfica verificada dentro del umbral Artemis III.'
          : `Iluminación obtenida (${ilum.toFixed(1)}%) fuera del rango de borde de Cabeus [58%, 75%].`,
      });
    }
  }

  return results;
}
