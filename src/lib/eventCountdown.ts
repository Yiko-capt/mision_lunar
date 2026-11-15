import type { ComputedTrajectory } from './physics';

export interface CountdownInfo {
  sunStatusText: string;
  sunDetailText: string;
  isSunLit: boolean;
  earthStatusText: string;
  earthDetailText: string;
  isEarthVisible: boolean;
}

/**
 * Calcula en tiempo real las horas restantes hasta el próximo evento solar (ocaso o salida)
 * y evento terrestre (pérdida o recuperación de visión directa DTE).
 */
export function computeCountdowns(
  trajectory: ComputedTrajectory | null,
  simDayOffset: number
): CountdownInfo {
  if (!trajectory || trajectory.points.length === 0) {
    return {
      sunStatusText: 'Sin datos de horizonte',
      sunDetailText: '—',
      isSunLit: false,
      earthStatusText: 'Sin datos de horizonte',
      earthDetailText: '—',
      isEarthVisible: false,
    };
  }

  const pts = trajectory.points;
  const N = pts.length;
  const stepHours = trajectory.stepHours || 1.0;

  // Determinar índice actual según el día simulado
  const currentIdx = Math.min(
    N - 1,
    Math.max(0, Math.floor((simDayOffset * 24) / stepHours))
  );

  const current = pts[currentIdx];
  const isSunLit = current.sun_visible;
  const isEarthVis = current.earth_nominal;

  // 1. Análisis del Sol
  let sunStatusText = '';
  let sunDetailText = '';

  if (isSunLit) {
    let sunsetIdx = -1;
    for (let j = currentIdx + 1; j < N; j++) {
      if (!pts[j].sun_visible) {
        sunsetIdx = j;
        break;
      }
    }

    if (sunsetIdx !== -1) {
      const h = (sunsetIdx - currentIdx) * stepHours;
      sunStatusText = `☀️ Sol visible (${h.toFixed(1)} h restantes de luz)`;
      sunDetailText = `Ocaso solar previsto en ${h.toFixed(1)} horas`;
    } else {
      const remainingDays = ((N - currentIdx) * stepHours) / 24;
      sunStatusText = `☀️ Sol continuo durante ${remainingDays.toFixed(1)} días`;
      sunDetailText = 'Sin puesta de Sol en el período analizado (luz casi eterna)';
    }
  } else {
    let sunriseIdx = -1;
    for (let j = currentIdx + 1; j < N; j++) {
      if (pts[j].sun_visible) {
        sunriseIdx = j;
        break;
      }
    }

    if (sunriseIdx !== -1) {
      const h = (sunriseIdx - currentIdx) * stepHours;
      sunStatusText = `🌑 Bajo el horizonte (${h.toFixed(1)} h hasta el amanecer)`;
      sunDetailText = `Salida del Sol estimada en ${h.toFixed(1)} horas`;
    } else {
      const remainingDays = ((N - currentIdx) * stepHours) / 24;
      sunStatusText = `🌑 Noche continua durante ${remainingDays.toFixed(1)} días`;
      sunDetailText = 'Región en sombra permanente o noche lunar extendida';
    }
  }

  // 2. Análisis de la Tierra (DTE)
  let earthStatusText = '';
  let earthDetailText = '';

  if (isEarthVis) {
    let lossIdx = -1;
    for (let j = currentIdx + 1; j < N; j++) {
      if (!pts[j].earth_nominal) {
        lossIdx = j;
        break;
      }
    }

    if (lossIdx !== -1) {
      const h = (lossIdx - currentIdx) * stepHours;
      earthStatusText = `🌍 DTE activo (${h.toFixed(1)} h de visión restante)`;
      earthDetailText = `Pérdida de enlace directo estimada en ${h.toFixed(1)} horas`;
    } else {
      const remainingDays = ((N - currentIdx) * stepHours) / 24;
      earthStatusText = `🌍 Visibilidad DTE continua (${remainingDays.toFixed(1)} días)`;
      earthDetailText = 'Enlace directo ininterrumpido gracias a libración favorable';
    }
  } else {
    let riseIdx = -1;
    for (let j = currentIdx + 1; j < N; j++) {
      if (pts[j].earth_nominal) {
        riseIdx = j;
        break;
      }
    }

    if (riseIdx !== -1) {
      const h = (riseIdx - currentIdx) * stepHours;
      earthStatusText = `📡 DTE bloqueado (${h.toFixed(1)} h para recuperación)`;
      earthDetailText = `Reaparición sobre el horizonte en ${h.toFixed(1)} horas`;
    } else {
      earthStatusText = '📡 Tierra oculta tras el horizonte local';
      earthDetailText = 'Sin enlace directo con la Tierra en el horizonte de misión';
    }
  }

  return {
    sunStatusText,
    sunDetailText,
    isSunLit,
    earthStatusText,
    earthDetailText,
    isEarthVisible: isEarthVis,
  };
}
