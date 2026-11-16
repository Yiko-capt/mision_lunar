import type { ComputedTrajectory, ComputedPoint } from './physics';

/** Marcas de tiempo (ms UTC) de cada punto de la trayectoria, memoizadas por objeto. */
const timeCache = new WeakMap<ComputedTrajectory, Float64Array>();

export function trajectoryTimes(traj: ComputedTrajectory): Float64Array {
  let t = timeCache.get(traj);
  if (!t) {
    t = new Float64Array(traj.points.length);
    for (let i = 0; i < traj.points.length; i++) t[i] = Date.parse(traj.points[i].timestamp_utc);
    timeCache.set(traj, t);
  }
  return t;
}

export interface Coverage {
  startMs: number;
  endMs: number;
}

export function trajectoryCoverage(traj: ComputedTrajectory | null): Coverage | null {
  if (!traj || traj.points.length === 0) return null;
  const t = trajectoryTimes(traj);
  return { startMs: t[0], endMs: t[t.length - 1] };
}

/**
 * Índice del punto vigente en `ms` (último punto con t <= ms).
 * Devuelve null si la fecha queda fuera de la cobertura de las efemérides.
 */
export function indexAtTime(traj: ComputedTrajectory | null, ms: number): number | null {
  if (!traj || traj.points.length === 0) return null;
  const t = trajectoryTimes(traj);
  if (ms < t[0] || ms > t[t.length - 1]) return null;
  let lo = 0;
  let hi = t.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function pointAtTime(traj: ComputedTrajectory | null, ms: number): ComputedPoint | null {
  const i = indexAtTime(traj, ms);
  return i == null || !traj ? null : traj.points[i];
}

export interface WindowSummary {
  /** Puntos horarios dentro de la ventana que caen en la cobertura de datos. */
  samples: number;
  hours: number;
  /** true si la ventana pedida se sale (total o parcialmente) de la cobertura. */
  truncated: boolean;
  sunPct: number;
  earthPct: number;
  bothPct: number;
  /** Racha más larga sin Sol (h). */
  maxBlackoutH: number;
  /** Racha más larga sin Tierra (h). */
  maxEarthGapH: number;
  energyWhM2: number;
  maxPowerW: number;
  startMs: number;
  endMs: number;
}

/**
 * Resume Sol/Tierra/energía entre dos instantes usando los mismos puntos y criterios
 * que computeTrajectory (fracción de disco solar, Tierra por su centro).
 */
export function summarizeWindow(
  traj: ComputedTrajectory | null,
  startMs: number,
  endMs: number
): WindowSummary | null {
  if (!traj || traj.points.length === 0) return null;
  const t = trajectoryTimes(traj);
  const step = traj.stepHours || 1;
  let n = 0;
  let sun = 0;
  let earth = 0;
  let both = 0;
  let dark = 0;
  let maxDark = 0;
  let gap = 0;
  let maxGap = 0;
  let energy = 0;
  let maxP = 0;
  let first = Infinity;
  let last = -Infinity;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < startMs || t[i] >= endMs) continue;
    const p = traj.points[i];
    n++;
    if (t[i] < first) first = t[i];
    if (t[i] > last) last = t[i];
    sun += p.disk_fraction;
    if (p.earth_nominal) earth++;
    if (p.sun_visible && p.earth_nominal) both++;
    if (!p.sun_visible) {
      dark++;
      if (dark > maxDark) maxDark = dark;
    } else dark = 0;
    if (!p.earth_nominal) {
      gap++;
      if (gap > maxGap) maxGap = gap;
    } else gap = 0;
    energy += p.power_w_m2 * step;
    if (p.power_w_m2 > maxP) maxP = p.power_w_m2;
  }
  if (n === 0) return null;
  const expected = Math.round((endMs - startMs) / (step * 3600000));
  return {
    samples: n,
    hours: n * step,
    truncated: n < expected,
    sunPct: (sun / n) * 100,
    earthPct: (earth / n) * 100,
    bothPct: (both / n) * 100,
    maxBlackoutH: maxDark * step,
    maxEarthGapH: maxGap * step,
    energyWhM2: energy,
    maxPowerW: maxP,
    startMs: first,
    endMs: last,
  };
}
