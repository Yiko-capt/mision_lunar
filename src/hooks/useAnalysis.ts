import { useMemo } from 'react';
import { useMission } from '../store/useMission';
import { analyze } from '../lib/analysis';
import { TERRAIN, HORIZONS } from '../data/moon';

export function useAnalysis() {
  const startDays = useMission((s) => s.startDays);
  const durationDays = useMission((s) => s.durationDays);
  const minLight = useMission((s) => s.minLight);
  const maxSlope = useMission((s) => s.maxSlope);
  const requireEarth = useMission((s) => s.requireEarth);
  const minEarth = useMission((s) => s.minEarth);

  return useMemo(
    () => analyze(TERRAIN, HORIZONS, { startDays, durationDays, minLight, maxSlope, requireEarth, minEarth }),
    [startDays, durationDays, minLight, maxSlope, requireEarth, minEarth],
  );
}