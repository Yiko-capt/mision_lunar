import { useMemo } from 'react';
import type { SiteDataSet } from '../../lib/io/schemas';
import type { CelestialInstant } from '../../lib/ephemerisService';
import { interpolateHorizon } from '../../lib/io/normalizers';
import { R_SOL_DEG, R_EARTH_DEG } from '../../lib/constants';

interface CabinViewProps {
  siteData: SiteDataSet | null;
  celestial: CelestialInstant;
}

const W = 320;
const H = 160;
const YMIN = -12;
const YMAX = 20;

const yOf = (deg: number) => {
  const clamped = Math.max(YMIN, Math.min(YMAX, deg));
  return H - ((clamped - YMIN) / (YMAX - YMIN)) * H;
};

export default function CabinView({ siteData, celestial }: CabinViewProps) {
  const horizonLookup = siteData?.horizonte?.elevationLookup ?? null;

  // Generar polígono del horizonte local en 360°
  const horizonPolygon = useMemo(() => {
    if (!horizonLookup) {
      // Horizonte plano en 0° si no hay datos
      return `0,${yOf(0)} ${W},${yOf(0)} ${W},${H} 0,${H}`;
    }

    const pts: string[] = [];
    for (let az = 0; az <= 360; az += 2) {
      const el = interpolateHorizon(az % 360, horizonLookup);
      const x = (az / 360) * W;
      const y = yOf(el);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return `0,${H} ${pts.join(' ')} ${W},${H}`;
  }, [horizonLookup]);

  const { sunAz, sunEl, earthAz, earthEl, localHorizonSun, localHorizonEarth } = celestial;

  // Coordenadas SVG
  const sx = (sunAz / 360) * W;
  const sy = yOf(sunEl);
  const isSunVisible = sunEl + R_SOL_DEG > localHorizonSun;

  const ex = (earthAz / 360) * W;
  const ey = yOf(earthEl);
  const isEarthVisible = earthEl + R_EARTH_DEG > localHorizonEarth;

  return (
    <div className="p-3 bg-[#070d18] border border-slate-800 rounded-xl space-y-2 text-xs font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] font-mono">
          🔭 360° Cabin View (Local Sky)
        </span>
        <span className="text-[9px] text-cyan-400 font-mono">
          N (0°) → E → S → W
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-[#03060c] border border-slate-800 rounded-lg overflow-hidden">
          {/* Línea de horizonte cero (datum de referencia) */}
          <line
            x1="0"
            y1={yOf(0)}
            x2={W}
            y2={yOf(0)}
            stroke="#1e293b"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />

          {/* Terreno lunar de relieve (LOLA 360°) */}
          <polygon points={horizonPolygon} fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* El Sol */}
          <g>
            <circle
              cx={sx}
              cy={sy}
              r={7}
              fill="#facc15"
              className={isSunVisible ? 'animate-pulse' : 'opacity-40'}
            />
            {isSunVisible && (
              <circle cx={sx} cy={sy} r={11} fill="none" stroke="#fde047" strokeWidth="1" opacity={0.6} />
            )}
            <text
              x={sx}
              y={sy - 10}
              textAnchor="middle"
              className="text-[9px] fill-amber-300 font-mono font-bold"
            >
              Sun ({sunEl > 0 ? `+${sunEl.toFixed(1)}` : sunEl.toFixed(1)}°)
            </text>
          </g>

          {/* Earth (with libration) */}
          <g>
            <circle
              cx={ex}
              cy={ey}
              r={6}
              fill={isEarthVisible ? '#38bdf8' : '#64748b'}
              stroke={isEarthVisible ? '#e0f2fe' : '#ef4444'}
              strokeWidth={isEarthVisible ? 1.2 : 1.5}
              strokeDasharray={isEarthVisible ? undefined : '2 2'}
              className={isEarthVisible ? '' : 'opacity-50'}
            />
            <text
              x={ex}
              y={ey - 9}
              textAnchor="middle"
              className={`text-[9px] font-mono font-bold ${
                isEarthVisible ? 'fill-cyan-300' : 'fill-rose-400'
              }`}
            >
              {isEarthVisible ? 'Earth' : 'Earth (Occulted)'} ({earthEl > 0 ? `+${earthEl.toFixed(1)}` : earthEl.toFixed(1)}°)
            </text>
          </g>
        </svg>

        {/* Cardinal base marks */}
        <div className="flex justify-between text-[8px] text-slate-500 font-mono px-1 pt-0.5">
          <span>0° N</span>
          <span>90° E</span>
          <span>180° S</span>
          <span>270° W</span>
          <span>360° N</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400 pt-0.5">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span>Sun: {sunAz.toFixed(1)}° Az</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          <span>Earth: {earthAz.toFixed(1)}° Az</span>
        </div>
      </div>
    </div>
  );
}
