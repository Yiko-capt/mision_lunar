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
  `Only ${n.days!.toFixed(0)} days of ephemerides available: criterion is annual and cannot be audited over this period.`;

/**
 * Evaluates the 5 physical benchmark reference cases.
 */
export function evaluateBenchmark(siteDataMap: Record<string, SiteDataSet>): BenchmarkCaseResult[] {
  const results: BenchmarkCaseResult[] = [];

  // CASE 1: Shackleton Rim (Quasi-eternal light peak)
  {
    const met = siteNumbers(siteDataMap['shackleton_rim']);
    if (!met) {
      results.push({
        site_id: 'shackleton_rim',
        nombre: 'Shackleton Rim (Light Peak)',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Annual solar illumination in [78.0%, 91.0%]',
        valorObtenido: 'No annual ephemerides metrics',
        fuente: 'Mazarico et al. (2011), Icarus 211(2)',
        motivo: 'Missing complete annual ephemerides to audit full lunar year.',
      });
    } else {
      const ilum = met.ilum;
      const pasa = ilum >= 78.0 && ilum <= 91.0;
      results.push({
        site_id: 'shackleton_rim',
        nombre: 'Shackleton Rim (Light Peak)',
        tipo_prueba: 'anual',
        estado: shortPeriod(met) ? 'NO COMPARABLE' : pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Annual solar illumination in [78.0%, 91.0%]',
        valorObtenido: shortPeriod(met) ? `${ilum.toFixed(1)}% over ${met.days!.toFixed(0)} days` : `${ilum.toFixed(1)}%`,
        fuente: 'Mazarico et al. (2011), Icarus 211(2)',
        motivo: shortPeriod(met)
          ? periodNote(met)
          : pasa
          ? 'Reproduces quasi-continuous solar illumination on polar rim.'
          : `Obtained value (${ilum.toFixed(1)}%) outside expected range [78%, 91%].`,
      });
    }
  }

  // CASE 2: Shackleton Floor (Deep PSR)
  {
    const met = siteNumbers(siteDataMap['shackleton_floor']);
    if (!met) {
      results.push({
        site_id: 'shackleton_floor',
        nombre: 'Shackleton Floor (Deep PSR)',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Solar illumination == 0.0% & Earth visibility == 0.0%',
        valorObtenido: 'No data',
        fuente: 'Zuber et al. (2012), Nature 486',
        motivo: 'Missing metrics data for this site.',
      });
    } else {
      const ilum = met.ilum;
      const tierra = met.tierra;
      const pasa = ilum === 0.0 && tierra === 0.0;
      results.push({
        site_id: 'shackleton_floor',
        nombre: 'Shackleton Floor (Deep PSR)',
        tipo_prueba: 'anual',
        estado: pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Solar illumination == 0.0% & Earth visibility == 0.0%',
        valorObtenido: `Illumination: ${ilum.toFixed(1)}%, Earth: ${tierra.toFixed(1)}%`,
        fuente: 'Zuber et al. (2012), Nature 486',
        motivo: pasa
          ? met.days != null
            ? `Zero Sun and Earth over ${met.days.toFixed(0)} days with data (crater terrain horizon applied).`
            : 'Complete topographic occlusion verified by crater rim.'
          : met.days != null
          ? 'NO PASA: with site horizon applied, Sun or Earth rises in dataset window.'
          : 'NO PASA: metrics summary reports illumination because it was calculated without horizon (smooth sphere).',
      });
    }
  }

  // CASE 3: Malapert Peak (Continuous DTE Link)
  {
    const met = siteNumbers(siteDataMap['malapert_peak']);
    if (!met) {
      results.push({
        site_id: 'malapert_peak',
        nombre: 'Malapert Mountain Peak',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Earth visibility >= 95.0% & Illumination in [68.0%, 78.0%]',
        valorObtenido: 'No data',
        fuente: 'Sharpe & Schrunk (2003), ASR 31(11)',
        motivo: 'Missing annual metrics data.',
      });
    } else {
      const tierra = met.tierra;
      const ilum = met.ilum;
      const pasa = tierra >= 95.0 && ilum >= 68.0 && ilum <= 78.0;
      results.push({
        site_id: 'malapert_peak',
        nombre: 'Malapert Mountain Peak',
        tipo_prueba: 'anual',
        estado: shortPeriod(met) ? 'NO COMPARABLE' : pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Earth visibility >= 95.0% & Illumination in [68.0%, 78.0%]',
        valorObtenido: `Earth: ${tierra.toFixed(1)}%, Illum: ${ilum.toFixed(1)}%`,
        fuente: 'Sharpe & Schrunk (2003), ASR 31(11)',
        motivo: shortPeriod(met)
          ? periodNote(met)
          : pasa
          ? 'Clear summit with verified continuous line of sight to Earth.'
          : `Obtained values (Earth: ${tierra.toFixed(1)}%, Illum: ${ilum.toFixed(1)}%) outside reference range.`,
      });
    }
  }

  // CASE 4: Apollo 11 (Historical calibration epoch, 1969-07-20T20:17:40Z)
  {
    const data = siteDataMap['apollo_11'];
    const base = {
      site_id: 'apollo_11',
      nombre: 'Tranquility Base (Apollo 11)',
      tipo_prueba: 'puntual' as const,
      criterioEsperado: 'Sun El = 10.8° (±0.2°), Az = 88.0° (±0.2°) at 1969-07-20T20:17:40Z',
      fuente: 'Apollo 11 Mission Report (NASA SP-238) / JPL Horizons',
    };
    const pts = [...(data?.efemeridesLanding?.datos ?? []), ...(data?.efemerides?.datos ?? [])].filter((d) =>
      d.timestamp_utc.startsWith('1969-07-20T20')
    );
    if (pts.length === 0) {
      results.push({
        ...base,
        estado: 'SIN DATOS',
        valorObtenido: 'No ephemerides for landing epoch',
        motivo: 'SIN DATOS: no 1969 ephemerides for Apollo 11 in loaded files.',
      });
    } else {
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
          ? 'Spherical calibration verified successfully.'
          : errEl <= 0.2
          ? `Elevation within tolerance (ΔEl=${errEl.toFixed(2)}°); azimuth outside (ΔAz=${errAz.toFixed(2)}°).`
          : `Excessive angular error (ΔEl=${errEl.toFixed(2)}°, ΔAz=${errAz.toFixed(2)}°).`,
      });
    }
  }

  // CASE 5: Cabeus Rim (Artemis III spatial sensitivity)
  {
    const met = siteNumbers(siteDataMap['cabeus_rim']);
    if (!met) {
      results.push({
        site_id: 'cabeus_rim',
        nombre: 'Cabeus Rim (Peak near Cabeus B)',
        tipo_prueba: 'anual',
        estado: 'SIN DATOS',
        criterioEsperado: 'Annual solar illumination in [58.0%, 75.0%]',
        valorObtenido: 'No data',
        fuente: 'Colaprete et al. (2010), Science 330',
        motivo: 'Missing annual metrics for this site.',
      });
    } else {
      const ilum = met.ilum;
      const pasa = ilum >= 58.0 && ilum <= 75.0;
      results.push({
        site_id: 'cabeus_rim',
        nombre: 'Cabeus Rim (Peak near Cabeus B)',
        tipo_prueba: 'anual',
        estado: shortPeriod(met) ? 'NO COMPARABLE' : pasa ? 'PASA' : 'NO PASA',
        criterioEsperado: 'Annual solar illumination in [58.0%, 75.0%]',
        valorObtenido: shortPeriod(met) ? `${ilum.toFixed(1)}% over ${met.days!.toFixed(0)} days` : `${ilum.toFixed(1)}%`,
        fuente: 'Colaprete et al. (2010), Science 330',
        motivo: shortPeriod(met)
          ? periodNote(met)
          : pasa
          ? 'Topographic sensitivity verified within Artemis III threshold.'
          : `Obtained illumination (${ilum.toFixed(1)}%) outside Cabeus rim range [58%, 75%].`,
      });
    }
  }

  return results;
}
