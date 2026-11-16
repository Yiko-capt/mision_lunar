import { useMemo, useRef } from 'react';
import { indexAtTime, trajectoryTimes } from '../../lib/trajectoryWindow';
import type { ComputedTrajectory } from '../../lib/physics';
import { useMission } from '../../store/useMission';

const W = 800;
const H = 220;
const PADDING = { top: 20, right: 30, bottom: 35, left: 45 };
const plotW = W - PADDING.left - PADDING.right;
const plotH = H - PADDING.top - PADDING.bottom;
const yMin = -8;
const yMax = 14;

interface ElevationChartProps {
  trajectory: ComputedTrajectory | null;
  loading?: boolean;
  /** Instante simulado (ms UTC). El cursor de la gráfica marca este instante. */
  currentMs?: number;
  /** Etiqueta del origen del horizonte (DEM LOLA, plano, sintético). */
  horizonLabel?: string;
  /** Al hacer clic en la gráfica, salta a ese instante. */
  onJump?: (ms: number) => void;
}

export default function ElevationChart({ trajectory, loading, currentMs, horizonLabel, onJump }: ElevationChartProps) {
  const simDay = useMission((s) => s.simDay);
  const durationDays = useMission((s) => s.durationDays);
  const uiMode = useMission((s) => s.uiMode);
  const update = useMission((s) => s.update);

  const svgRef = useRef<SVGSVGElement>(null);

  const points = trajectory?.points;
  const numPoints = points?.length || 0;

  const { sunPath, earthPath, horSunPath, curPoint, curX } = useMemo(() => {
    if (!points || points.length === 0) {
      return { sunPath: '', earthPath: '', horSunPath: '', curPoint: null, curX: 0 };
    }
    const N = points.length;

    const toX = (idx: number) => PADDING.left + (idx / Math.max(1, N - 1)) * plotW;
    const toY = (deg: number) => PADDING.top + plotH - ((deg - yMin) / (yMax - yMin)) * plotH;

    let sPath = '';
    let ePath = '';
    let hsPath = '';

    for (let i = 0; i < N; i++) {
      const p = points[i];
      const x = toX(i);
      const sy = toY(Math.max(yMin, Math.min(yMax, p.sun_el)));
      const ey = toY(Math.max(yMin, Math.min(yMax, p.earth_el)));
      const hsy = toY(Math.max(yMin, Math.min(yMax, p.hor_sun)));

      if (i === 0) {
        sPath = `M ${x.toFixed(1)} ${sy.toFixed(1)}`;
        ePath = `M ${x.toFixed(1)} ${ey.toFixed(1)}`;
        hsPath = `M ${x.toFixed(1)} ${hsy.toFixed(1)}`;
      } else {
        sPath += ` L ${x.toFixed(1)} ${sy.toFixed(1)}`;
        ePath += ` L ${x.toFixed(1)} ${ey.toFixed(1)}`;
        hsPath += ` L ${x.toFixed(1)} ${hsy.toFixed(1)}`;
      }
    }

    // Calcular índice actual sincronizado con simDay
    let curIdx: number | null;
    if (currentMs != null) {
      // Mismo instante que el resto de la interfaz (null si la fecha queda fuera de los datos)
      curIdx = indexAtTime(trajectory, currentMs);
    } else {
      const progressFrac = Math.max(0, Math.min(1, simDay / Math.max(1, durationDays)));
      curIdx = Math.min(N - 1, Math.floor(progressFrac * N));
    }
    const curPt = curIdx == null ? null : points[curIdx];
    const cX = curIdx == null ? -100 : toX(curIdx);

    return { sunPath: sPath, earthPath: ePath, horSunPath: hsPath, curPoint: curPt, curX: cX };
  }, [points, simDay, durationDays, currentMs, trajectory]);

  // Manejar clic / scrub sobre la gráfica
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || numPoints === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const normX = (clickX - (PADDING.left / W) * rect.width) / ((plotW / W) * rect.width);
    const clamped = Math.max(0, Math.min(1, normX));
    if (onJump && trajectory) {
      const t = trajectoryTimes(trajectory);
      onJump(t[Math.round(clamped * (numPoints - 1))]);
    } else {
      update({ simDay: clamped * durationDays });
    }
  };

  if (loading) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400">
        Loading elevation profiles...
      </div>
    );
  }

  if (numPoints === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 p-4">
        <span className="text-amber-400 font-bold mb-1">NO TRAJECTORY DATA</span>
        <p className="text-center text-slate-500">
          No time-series ephemerides available for this site in the simulation window.
        </p>
      </div>
    );
  }

  // Y axis ticks
  const yTicks = [-5, 0, 5, 10];
  const toY = (deg: number) => PADDING.top + plotH - ((deg - yMin) / (yMax - yMin)) * plotH;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
            {uiMode === 'public' ? 'Elevation Profile Relative to Horizon' : 'Topocentric Ephemerides & Local Horizon'}
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            Step: {trajectory?.stepHours || 1} h · Total: {trajectory?.totalHours || 0} h
          </span>
        </div>

        {/* Interactive legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Sun {curPoint ? `(${curPoint.sun_el.toFixed(1)}°)` : ''}
          </span>
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            Earth {curPoint ? `(${curPoint.earth_el.toFixed(1)}°)` : ''}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
            {horizonLabel ?? 'Local horizon'} {curPoint ? `(${curPoint.hor_sun.toFixed(1)}°)` : ''}
          </span>
        </div>
      </div>

      {/* SVG del Gráfico */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair overflow-visible"
        onClick={handleSvgClick}
      >
        {/* Fondo del área de trazado */}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={plotW}
          height={plotH}
          fill="#050914"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Línea de 0° (Horizonte matemático) */}
        <line
          x1={PADDING.left}
          y1={toY(0)}
          x2={PADDING.left + plotW}
          y2={toY(0)}
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Rejilla y etiquetas del eje Y */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={toY(tick)}
              x2={PADDING.left + plotW}
              y2={toY(tick)}
              stroke="#1e293b"
              strokeDasharray="2 4"
            />
            <text
              x={PADDING.left - 8}
              y={toY(tick) + 3}
              fill="#64748b"
              fontSize="10"
              textAnchor="end"
              fontFamily="monospace"
            >
              {tick > 0 ? `+${tick}` : tick}°
            </text>
          </g>
        ))}

        {/* Línea del Horizonte Local Topográfico LOLA */}
        <path
          d={horSunPath}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.85"
        />

        {/* Curva de Elevación de la Tierra */}
        <path
          d={earthPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Curva de Elevación del Sol */}
        <path
          d={sunPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
        />

        {/* Cursor Vertical Sincronizado */}
        <line
          x1={curX}
          y1={PADDING.top}
          x2={curX}
          y2={PADDING.top + plotH}
          stroke="#06b6d4"
          strokeWidth="1.5"
        />

        {/* Puntos del instante actual sobre las curvas */}
        {curPoint && (
          <>
            <circle
              cx={curX}
              cy={toY(curPoint.sun_el)}
              r="4.5"
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle
              cx={curX}
              cy={toY(curPoint.earth_el)}
              r="4.5"
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle
              cx={curX}
              cy={toY(curPoint.hor_sun)}
              r="3"
              fill="#94a3b8"
            />
          </>
        )}
      </svg>

      {/* Current status alert and crossings */}
      {curPoint && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono">
          <div className="flex items-center gap-2">
            <span className={curPoint.sun_visible ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              {curPoint.sun_visible
                ? curPoint.sun_fully_visible
                  ? '☀️ Full Sun'
                  : `⛅ Partial Sun (${(curPoint.disk_fraction * 100).toFixed(0)}%)`
                : '🌑 Sun occluded below horizon'}
            </span>
            <span className="text-slate-600">|</span>
            <span className={curPoint.earth_nominal ? 'text-blue-400 font-bold' : 'text-slate-500'}>
              {curPoint.earth_nominal
                ? curPoint.earth_margen
                  ? '📡 DTE Optimal Margin'
                  : '📡 DTE Nominal'
                : '❌ No DTE Link'}
            </span>
          </div>

          <div className="text-cyan-300">
            {curPoint.sun_visible && curPoint.hours_to_sun_sunset != null ? (
              <span>⚠️ Sunset in <b className="text-amber-300">{curPoint.hours_to_sun_sunset.toFixed(1)} h</b></span>
            ) : curPoint.sun_visible ? (
              <span className="text-emerald-400">Continuous sunlight in this window</span>
            ) : (
              <span className="text-slate-400">Sun below horizon</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
