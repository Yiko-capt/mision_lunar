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
  sunStatusText: 'Sin datos para esta fecha',
  sunDetailText: 'La fecha simulada queda fuera del periodo con efemérides',
  isSunLit: false,
  earthStatusText: 'Sin datos para esta fecha',
  earthDetailText: 'La fecha simulada queda fuera del periodo con efemérides',
  isEarthVisible: false,
};

/**
 * Cuentas regresivas del instante simulado (ms UTC): cuánto falta para que el Sol y la Tierra
 * crucen el horizonte del sitio. Si están ocultos, dice cuándo reaparecen (no un guion).
 * Usa los mismos puntos y criterios que computeTrajectory.
 */
export function computeCountdowns(trajectory: ComputedTrajectory | null, currentMs: number): CountdownInfo {
  if (!trajectory || trajectory.points.length === 0) {
    return { ...NO_DATA, sunStatusText: 'Sin datos de este sitio', earthStatusText: 'Sin datos de este sitio' };
  }
  const currentIdx = indexAtTime(trajectory, currentMs);
  if (currentIdx == null) return NO_DATA;

  const pts = trajectory.points;
  const N = pts.length;
  const stepHours = trajectory.stepHours || 1.0;
  const current = pts[currentIdx];
  const remainingDays = (((N - 1 - currentIdx) * stepHours) / 24).toFixed(1);

  /** Horas hasta el próximo cambio de estado de `flag`, o null si no cambia en los datos. */
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
        ? `☀️ Sol visible (se pone en ${sunH.toFixed(1)} h)`
        : `☀️ Sol visible sin ocaso (${remainingDays} días con datos)`;
    sunDetailText =
      sunH != null
        ? `Ocaso solar en ${sunH.toFixed(1)} horas`
        : 'El Sol no se pone en lo que queda del periodo con datos';
  } else {
    sunStatusText =
      sunH != null
        ? `🌑 Sol oculto (sale en ${sunH.toFixed(1)} h)`
        : `🌑 Sol oculto sin amanecer (${remainingDays} días con datos)`;
    sunDetailText =
      sunH != null
        ? `Salida del Sol en ${sunH.toFixed(1)} horas`
        : 'El Sol no sale en lo que queda del periodo con datos';
  }

  const isEarthVisible = current.earth_nominal;
  const earthH = hoursToFlip((i) => pts[i].earth_nominal);
  let earthStatusText: string;
  let earthDetailText: string;
  if (isEarthVisible) {
    earthStatusText =
      earthH != null
        ? `🌍 Tierra visible (se oculta en ${earthH.toFixed(1)} h)`
        : `🌍 Tierra visible sin puesta (${remainingDays} días con datos)`;
    earthDetailText =
      earthH != null
        ? `Puesta de la Tierra en ${earthH.toFixed(1)} horas`
        : 'La Tierra no se oculta en lo que queda del periodo con datos';
  } else {
    earthStatusText =
      earthH != null
        ? `📡 Tierra oculta (reaparece en ${earthH.toFixed(1)} h)`
        : `📡 Tierra oculta (${remainingDays} días con datos)`;
    earthDetailText =
      earthH != null
        ? `La Tierra reaparece sobre el horizonte en ${earthH.toFixed(1)} horas`
        : 'La Tierra no asoma en lo que queda del periodo con datos';
  }

  return { sunStatusText, sunDetailText, isSunLit, earthStatusText, earthDetailText, isEarthVisible };
}
