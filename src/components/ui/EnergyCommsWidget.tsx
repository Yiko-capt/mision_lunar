import type { ComputedTrajectory } from '../../lib/physics';

interface EnergyCommsWidgetProps {
  trajectory: ComputedTrajectory | null;
  minLightPct: number;
  loading?: boolean;
}

export default function EnergyCommsWidget({
  trajectory,
  minLightPct,
  loading = false,
}: EnergyCommsWidgetProps) {
  if (loading) {
    return (
      <div className="p-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs space-y-2 animate-pulse">
        <div className="h-3 bg-slate-800 rounded w-2/3" />
        <div className="h-2 bg-slate-800 rounded w-full" />
      </div>
    );
  }

  const sunPct = trajectory?.summary?.sun_pct ?? 0;
  const earthPct = trajectory?.summary?.earth_pct_nominal ?? 0;
  const meetsMinLight = sunPct >= minLightPct;

  return (
    <div className="p-3 bg-[#060c18] border border-slate-700/80 rounded-xl space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
          ⚡ Power & Communications (Full Mission)
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
            meetsMinLight
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-amber-950 text-amber-400 border border-amber-800'
          }`}
        >
          {meetsMinLight ? '✓ OPTIMAL' : '⚠️ TIGHT'}
        </span>
      </div>

      {/* 1. Usable Solar Energy Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300 flex items-center gap-1.5">
            <span>☀️</span>
            <span>Solar Energy Fraction</span>
          </span>
          <span className="font-mono font-bold text-amber-300">
            {sunPct.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            style={{ width: `${Math.min(100, Math.max(0, sunPct))}%` }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>Min threshold: {minLightPct}%</span>
          <span>{trajectory?.summary?.sun_hours?.toFixed(0) ?? 0} h sunlight</span>
        </div>
      </div>

      {/* 2. Direct Earth Link Bar (DTE) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300 flex items-center gap-1.5">
            <span>🌍</span>
            <span>Direct Earth Link (DTE)</span>
          </span>
          <span className="font-mono font-bold text-cyan-300">
            {earthPct.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            style={{ width: `${Math.min(100, Math.max(0, earthPct))}%` }}
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>Nominal visibility</span>
          <span>{trajectory?.summary?.earth_hours_nominal?.toFixed(0) ?? 0} h comms</span>
        </div>
      </div>
    </div>
  );
}
