import { useMemo } from 'react';
import type { ComputedTrajectory } from '../../lib/physics';
import { trajectoryTimes } from '../../lib/trajectoryWindow';

interface TimelinePanelProps {
  trajectory: ComputedTrajectory | null;
  currentMs: number;
  missionStartMs: number;
  durationDays: number;
  /** Salta a un instante (ms UTC) dentro de la misión. */
  onJump: (ms: number) => void;
}

const W = 900;
const H = 120;
const PAD = { l: 14, r: 14, t: 26, b: 30 };
const COLORS = { both: '#34d399', sun: '#fbbf24', earth: '#38bdf8', none: '#1e293b' };

/** "Línea del tiempo": una banda de color por hora con datos (Sol, Tierra, ambos o ninguno). */
export default function TimelinePanel({ trajectory, currentMs, missionStartMs, durationDays, onJump }: TimelinePanelProps) {
  const model = useMemo(() => {
    if (!trajectory || trajectory.points.length === 0) return null;
    const t = trajectoryTimes(trajectory);
    const t0 = t[0];
    const t1 = t[t.length - 1];
    // Agrupar horas consecutivas con el mismo estado para dibujar pocos rectángulos
    const runs: Array<{ a: number; b: number; c: string }> = [];
    for (let i = 0; i < t.length; i++) {
      const p = trajectory.points[i];
      const c = p.sun_visible && p.earth_nominal ? COLORS.both : p.sun_visible ? COLORS.sun : p.earth_nominal ? COLORS.earth : COLORS.none;
      const last = runs[runs.length - 1];
      const end = i + 1 < t.length ? t[i + 1] : t[i];
      if (last && last.c === c) last.b = end;
      else runs.push({ a: t[i], b: end, c });
    }
    return { t0, t1, runs };
  }, [trajectory]);

  if (!model) {
    return <div className="text-xs text-slate-300">This site does not have ephemerides loaded.</div>;
  }

  const { t0, t1, runs } = model;
  const x = (ms: number) => PAD.l + ((ms - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const barY = PAD.t;
  const barH = H - PAD.t - PAD.b;
  const missionEndMs = missionStartMs + durationDays * 86400000;
  const clamp = (ms: number) => Math.max(t0, Math.min(t1, ms));
  const inRange = currentMs >= t0 && currentMs <= t1;

  const ticks: number[] = [];
  for (let d = Math.ceil(t0 / 86400000) * 86400000; d <= t1; d += 5 * 86400000) ticks.push(d);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const ms = t0 + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (t1 - t0);
    onJump(clamp(ms));
  };

  return (
    <div className="space-y-2" data-testid="timeline">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-[#03060c] border border-slate-800 rounded-lg cursor-pointer" onClick={handleClick}
        role="img" aria-label="Sun and Earth visibility timeline">
        {runs.map((r, i) => (
          <rect key={i} x={x(r.a)} y={barY} width={Math.max(0.5, x(r.b) - x(r.a) + 0.4)} height={barH} fill={r.c} />
        ))}
        {/* Mission window */}
        {missionEndMs > t0 && missionStartMs < t1 && (
          <g>
            <rect x={x(clamp(missionStartMs))} y={barY - 5} width={x(clamp(missionEndMs)) - x(clamp(missionStartMs))} height={barH + 10}
              fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="5 3" />
            <text x={x(clamp(missionStartMs)) + 4} y={barY - 9} fill="#e2e8f0" fontSize="10">Mission ({durationDays} d)</text>
          </g>
        )}
        {ticks.map((d) => (
          <g key={d}>
            <line x1={x(d)} y1={barY + barH} x2={x(d)} y2={barY + barH + 5} stroke="#64748b" />
            <text x={x(d)} y={barY + barH + 17} fill="#94a3b8" fontSize="10" textAnchor="middle">
              {new Date(d).toISOString().slice(5, 10)}
            </text>
          </g>
        ))}
        {inRange && <line x1={x(currentMs)} y1={barY - 8} x2={x(currentMs)} y2={barY + barH + 8} stroke="#ffffff" strokeWidth="2" />}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1.5" style={{ background: COLORS.both }} />Sun & Earth visible</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1.5" style={{ background: COLORS.sun }} />Sun only</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1.5" style={{ background: COLORS.earth }} />Earth only</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1.5 border border-slate-600" style={{ background: COLORS.none }} />Neither</span>
        <span className="text-slate-400">White line = current simulated time · click to jump</span>
      </div>
      <div className="text-[10px] text-slate-500 font-mono">
        Dataset range: {new Date(t0).toISOString().slice(0, 10)} to {new Date(t1).toISOString().slice(0, 10)} (UTC), 1-hour time step.
        {!inRange && ' Current time is outside this dataset range.'}
      </div>
    </div>
  );
}
