import { useMemo } from 'react';
import type { SiteDataSet } from '../../lib/io/schemas';
import type { ComputedTrajectory } from '../../lib/physics';
import type { CelestialInstant } from '../../lib/ephemerisService';
import { interpolateHorizon } from '../../lib/io/normalizers';
import { horizonSourceLabel } from '../../lib/io/dataLoader';
import { trajectoryTimes } from '../../lib/trajectoryWindow';
import { useMission } from '../../store/useMission';
import { label, help } from '../../config/glossary';
import InfoTip from './InfoTip';

interface SkyViewProps {
  siteData: SiteDataSet | null;
  trajectory: ComputedTrajectory | null;
  celestial: CelestialInstant;
  currentMs: number;
}

const W = 900;
const H = 360;
const PAD = { l: 48, r: 14, t: 14, b: 36 };
const CARDINALS: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO', 360: 'N' };

/**
 * "Cielo visto desde el sitio": panorámica 360° con la silueta del horizonte, la trayectoria
 * del Sol y de la Tierra en las 24 h del día simulado y su posición en el instante actual.
 * Usa los mismos puntos (efemérides + horizonte) que el resto de la app.
 */
export default function SkyView({ siteData, trajectory, celestial, currentMs }: SkyViewProps) {
  const viewMode = useMission((s) => s.viewMode);
  const lookup = siteData?.horizonte?.elevationLookup ?? null;

  const { sunTrack, earthTrack } = useMemo(() => {
    const sun: Array<[number, number]> = [];
    const earth: Array<[number, number]> = [];
    if (trajectory) {
      const t = trajectoryTimes(trajectory);
      const dayStart = Math.floor(currentMs / 86400000) * 86400000;
      for (let i = 0; i < t.length; i++) {
        if (t[i] >= dayStart && t[i] <= dayStart + 86400000) {
          const p = trajectory.points[i];
          sun.push([p.sun_az, p.sun_el]);
          earth.push([p.earth_az, p.earth_el]);
        }
      }
    }
    return { sunTrack: sun, earthTrack: earth };
  }, [trajectory, currentMs]);

  // Rango vertical dinámico: en el polo el Sol roza el horizonte; en el ecuador sube mucho.
  let emax = 12;
  let emin = -4;
  for (const [, el] of [...sunTrack, ...earthTrack, [0, celestial.sunEl], [0, celestial.earthEl]] as Array<[number, number]>) {
    emax = Math.max(emax, el);
    emin = Math.min(emin, el);
  }
  if (lookup) for (let a = 0; a < 360; a++) { emax = Math.max(emax, lookup[a]); emin = Math.min(emin, lookup[a]); }
  const EL_MAX = Math.min(90, Math.ceil(emax + 3));
  const EL_MIN = Math.max(-90, Math.floor(emin - 2));
  const span = EL_MAX - EL_MIN;
  const stepEl = span > 80 ? 20 : span > 40 ? 10 : span > 18 ? 5 : 2;

  const x = (az: number) => PAD.l + (az / 360) * (W - PAD.l - PAD.r);
  const y = (el: number) => PAD.t + (1 - (el - EL_MIN) / span) * (H - PAD.t - PAD.b);

  const horizonPath = useMemo(() => {
    let d = `M${x(0)},${y(EL_MIN)}`;
    for (let az = 0; az <= 360; az++) d += ` L${x(az).toFixed(1)},${y(lookup ? interpolateHorizon(az % 360, lookup) : 0).toFixed(1)}`;
    return `${d} L${x(360)},${y(EL_MIN)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, EL_MIN, EL_MAX]);

  const segments = (pts: Array<[number, number]>) => {
    const segs: Array<Array<[number, number]>> = [];
    let cur: Array<[number, number]> = [];
    pts.forEach((p, i) => {
      if (i > 0 && Math.abs(p[0] - pts[i - 1][0]) > 180) { segs.push(cur); cur = []; }
      cur.push(p);
    });
    segs.push(cur);
    return segs.filter((s) => s.length > 1);
  };

  const elTicks: number[] = [];
  for (let e = Math.ceil(EL_MIN / stepEl) * stepEl; e <= EL_MAX; e += stepEl) elTicks.push(e);

  const signed = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
  const both = celestial.isSunVisible && celestial.isEarthVisible;
  const summary = both
    ? 'Sol y Tierra sobre el horizonte: hay energía y comunicación directa.'
    : celestial.isSunVisible
    ? 'Solo el Sol es visible: los paneles cargan, pero no hay enlace directo con la Tierra.'
    : celestial.isEarthVisible
    ? 'Solo la Tierra es visible: hay enlace de comunicación, pero no energía solar.'
    : 'Ni el Sol ni la Tierra se ven desde este sitio ahora.';

  const Cell = ({ k, value, tone }: { k: 'sunElevation' | 'sunAzimuth' | 'earthElevation' | 'earthAzimuth'; value: string; tone: string }) => (
    <div className="bg-[#070e1a] border border-slate-800 rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] text-slate-400 flex items-center gap-1">
        {label(k, viewMode)} <InfoTip term={label(k, viewMode)} text={help(k)} />
      </div>
      <div className={`font-mono font-bold text-sm ${tone}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-3" data-testid="sky-view">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-[#03060c] border border-slate-800 rounded-lg" role="img"
        aria-label="Panorámica del cielo: horizonte, Sol y Tierra">
        <path d={horizonPath} fill="#1e293b" stroke="#475569" strokeWidth="1" />
        {Object.keys(CARDINALS).map((k) => {
          const a = Number(k);
          return (
            <g key={a}>
              <line x1={x(a)} y1={PAD.t} x2={x(a)} y2={H - PAD.b} stroke="#16202f" strokeWidth="1" />
              <text x={x(a)} y={H - PAD.b + 15} fill="#94a3b8" fontSize="11" textAnchor="middle">{CARDINALS[a]}</text>
              <text x={x(a)} y={H - PAD.b + 28} fill="#64748b" fontSize="9" textAnchor="middle">{a}°</text>
            </g>
          );
        })}
        {elTicks.map((e) => (
          <g key={e}>
            <line x1={PAD.l} y1={y(e)} x2={W - PAD.r} y2={y(e)} stroke={e === 0 ? '#475569' : '#16202f'} strokeDasharray={e === 0 ? '4 3' : undefined} strokeWidth="1" />
            <text x={PAD.l - 6} y={y(e) + 3} fill="#94a3b8" fontSize="11" textAnchor="end">{e}°</text>
          </g>
        ))}
        {segments(sunTrack).map((s, i) => (
          <polyline key={`s${i}`} points={s.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeOpacity="0.7" />
        ))}
        {segments(earthTrack).map((s, i) => (
          <polyline key={`e${i}`} points={s.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')} fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeOpacity="0.7" />
        ))}
        {/* Posición en el instante actual. El relleno indica si está sobre el horizonte. */}
        <circle cx={x(celestial.sunAz)} cy={y(celestial.sunEl)} r="8" fill={celestial.isSunVisible ? '#fbbf24' : 'none'} stroke="#fbbf24" strokeWidth="2" strokeDasharray={celestial.isSunVisible ? undefined : '3 2'} />
        <text x={x(celestial.sunAz)} y={y(celestial.sunEl) - 12} fill="#fcd34d" fontSize="11" fontWeight="bold" textAnchor="middle">
          Sol{celestial.isSunVisible ? '' : ' (oculto)'}
        </text>
        <circle cx={x(celestial.earthAz)} cy={y(celestial.earthEl)} r="7" fill={celestial.isEarthVisible ? '#38bdf8' : 'none'} stroke="#38bdf8" strokeWidth="2" strokeDasharray={celestial.isEarthVisible ? undefined : '3 2'} />
        <text x={x(celestial.earthAz)} y={y(celestial.earthEl) - 11} fill="#7dd3fc" fontSize="11" fontWeight="bold" textAnchor="middle">
          Tierra{celestial.isEarthVisible ? '' : ' (oculta)'}
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span><span className="inline-block w-3 h-0.5 bg-amber-400 align-middle mr-1.5" />Trayectoria del Sol (24 h)</span>
        <span><span className="inline-block w-3 h-0.5 bg-sky-400 align-middle mr-1.5" />Trayectoria de la Tierra (24 h)</span>
        <span><span className="inline-block w-3 h-2.5 bg-slate-700 align-middle mr-1.5" />{label('horizon', viewMode)} <InfoTip term={label('horizon', viewMode)} text={help('horizon')} /></span>
        <span>Círculo relleno = visible · punteado = tapado por el horizonte</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Cell k="sunElevation" value={`${signed(celestial.sunEl)}°`} tone={celestial.isSunVisible ? 'text-amber-300' : 'text-slate-500'} />
        <Cell k="sunAzimuth" value={`${celestial.sunAz.toFixed(1)}°`} tone="text-slate-200" />
        <Cell k="earthElevation" value={`${signed(celestial.earthEl)}°`} tone={celestial.isEarthVisible ? 'text-sky-300' : 'text-slate-500'} />
        <Cell k="earthAzimuth" value={`${celestial.earthAz.toFixed(1)}°`} tone="text-slate-200" />
      </div>

      <div className="text-xs text-slate-200 bg-[#070e1a] border border-slate-800 rounded-lg px-3 py-2">
        <b className="font-mono text-cyan-300">{celestial.timestampUtc.replace('T', ' ').replace('Z', ' UTC')}</b> · {summary}
        {viewMode === 'professional' && (
          <div className="text-[10px] text-slate-400 pt-1 font-mono">
            Horizonte hacia el Sol: {celestial.localHorizonSun.toFixed(2)}° · hacia la Tierra: {celestial.localHorizonEarth.toFixed(2)}° ·{' '}
            {horizonSourceLabel(siteData?.horizonte)} · {celestial.sourceLabel}
          </div>
        )}
      </div>
    </div>
  );
}
