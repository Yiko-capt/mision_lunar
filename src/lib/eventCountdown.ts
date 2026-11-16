import type { ComputedTrajectory } from './physics';
import { indexAtTime } from './trajectoryWindow';

export interface CountdownInfo {
  sunStatusText: string;
  sunDetailText: string;
  isSunLit: boolean;
  earthStatusText: string;
  earthDetailText: string;
  isEarthVisible: boolean;
}

const NO_DATA: CountdownInfo = {
  sunStatusText: 'No data for this date',
  sunDetailText: 'Simulated date is outside the ephemeris coverage period',
  isSunLit: false,
  earthStatusText: 'No data for this date',
  earthDetailText: 'Simulated date is outside the ephemeris coverage period',
  isEarthVisible: false,
};

/**
 * Real-time event countdowns for simulated time (UTC ms): time until Sun and Earth
 * cross the local terrain horizon.
 */
export function computeCountdowns(trajectory: ComputedTrajectory | null, currentMs: number): CountdownInfo {
  if (!trajectory || trajectory.points.length === 0) {
    return { ...NO_DATA, sunStatusText: 'No site ephemeris data', earthStatusText: 'No site ephemeris data' };
  }
  const currentIdx = indexAtTime(trajectory, currentMs);
  if (currentIdx == null) return NO_DATA;

  const pts = trajectory.points;
  const N = pts.length;
  const stepHours = trajectory.stepHours || 1.0;
  const current = pts[currentIdx];
  const remainingDays = (((N - 1 - currentIdx) * stepHours) / 24).toFixed(1);

  /** Hours until state flip of `flag`, or null if constant in dataset. */
  const hoursToFlip = (flag: (i: number) => boolean): number | null => {
    const now = flag(currentIdx);
    for (let j = currentIdx + 1; j < N; j++) {
      if (flag(j) !== now) return (j - currentIdx) * stepHours;
    }
    return null;
  };

  const isSunLit = current.sun_visible;
  const sunH = hoursToFlip((i) => pts[i].sun_visible);
  let sunStatusText: string;
  let sunDetailText: string;
  if (isSunLit) {
    sunStatusText =
      sunH != null
        ? `☀️ Sun visible (sets in ${sunH.toFixed(1)} h)`
        : `☀️ Continuous sunlight (${remainingDays} days in dataset)`;
    sunDetailText =
      sunH != null
        ? `Sunset in ${sunH.toFixed(1)} hours`
        : 'Sun does not set during remainder of coverage period';
  } else {
    sunStatusText =
      sunH != null
        ? `🌑 Sun occulted (rises in ${sunH.toFixed(1)} h)`
        : `🌑 Continuous lunar night (${remainingDays} days in dataset)`;
    sunDetailText =
      sunH != null
        ? `Sunrise in ${sunH.toFixed(1)} hours`
        : 'Sun does not rise during remainder of coverage period';
  }

  const isEarthVisible = current.earth_nominal;
  const earthH = hoursToFlip((i) => pts[i].earth_nominal);
  let earthStatusText: string;
  let earthDetailText: string;
  if (isEarthVisible) {
    earthStatusText =
      earthH != null
        ? `🌍 Earth visible (sets in ${earthH.toFixed(1)} h)`
        : `🌍 Continuous Earth line of sight (${remainingDays} days in dataset)`;
    earthDetailText =
      earthH != null
        ? `Earthset in ${earthH.toFixed(1)} hours`
        : 'Earth does not set during remainder of coverage period';
  } else {
    earthStatusText =
      earthH != null
        ? `📡 Earth occulted (rises in ${earthH.toFixed(1)} h)`
        : `📡 Continuous Earth occultation (${remainingDays} days in dataset)`;
    earthDetailText =
      earthH != null
        ? `Earth rises above horizon in ${earthH.toFixed(1)} hours`
        : 'Earth does not emerge during remainder of coverage period';
  }

  return { sunStatusText, sunDetailText, isSunLit, earthStatusText, earthDetailText, isEarthVisible };
}
