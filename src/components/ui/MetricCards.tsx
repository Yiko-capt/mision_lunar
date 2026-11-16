import type { SiteDataSet } from '../../lib/io/schemas';
import { indexAtTime } from '../../lib/trajectoryWindow';
import { horizonSourceLabel } from '../../lib/io/dataLoader';
import type { ComputedTrajectory } from '../../lib/physics';
import { useMission } from '../../store/useMission';

interface MetricCardsProps {
  siteData: SiteDataSet | null;
  trajectory: ComputedTrajectory | null;
  /** Instante simulado (ms UTC) para las alertas en tiempo real. */
  currentMs?: number;
}

export default function MetricCards({ siteData, trajectory, currentMs }: MetricCardsProps) {
  const uiMode = useMission((s) => s.uiMode);
  const simDay = useMission((s) => s.simDay);
  const durationDays = useMission((s) => s.durationDays);

  const pts = trajectory?.points || [];
  const N = pts.length;
  const progressFrac = Math.max(0, Math.min(1, simDay / Math.max(1, durationDays)));
  const curIdx =
    currentMs != null
      ? indexAtTime(trajectory, currentMs)
      : N > 0
      ? Math.min(N - 1, Math.floor(progressFrac * N))
      : null;
  const curPt = curIdx !== null ? pts[curIdx] : null;

  const summary = trajectory?.summary;
  const metrics = siteData?.metricas;

  // Determinar banderas de estado
  const isSynthetic = siteData?.horizonte?.sintetico || siteData?.efemerides?.sintetico || siteData?.metricas?.sintetico;
  const isFallback = siteData?.estadoDatos === 'sin_datos';

  if (isFallback) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 font-mono text-sm">
        <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
          <span>⚠️ STATUS: NO DATA AVAILABLE</span>
        </div>
        <p className="text-slate-400 text-xs mb-3">
          This site does not yet have ephemeris profiles or precomputed metrics from Roles A, B, or D.
        </p>
        <span className="inline-block bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700">
          Operating in preliminary topographic inspection mode
        </span>
      </div>
    );
  }

  // Values to display (prioritizing dynamic calculation with LOLA horizon)
  const sunHours = summary?.sun_hours ?? metrics?.resumen.horas_luz_total ?? 0;
  const sunPct = summary?.sun_pct ?? metrics?.resumen.iluminacion_solar_pct ?? 0;
  const sunMaxEl = summary?.sun_max_el ?? metrics?.resumen.elevacion_solar_max_deg ?? 0;
  const earthNominalPct = summary?.earth_pct_nominal ?? metrics?.resumen.visibilidad_tierra_nominal_pct ?? 0;
  const earthMargenPct = summary?.earth_pct_margen ?? metrics?.resumen.visibilidad_tierra_margen_pct ?? 0;
  const totalEnergy = summary?.total_energy_wh_m2 ?? metrics?.resumen.energia_especifica_wh_m2 ?? 0;
  const maxPower = summary?.max_power_w ?? metrics?.resumen.potencia_pico_w ?? 0;

  return (
    <div className="space-y-3">
      {/* Data source badges */}
      <div className="flex flex-wrap items-center gap-2">
        {isSynthetic && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
            APPROXIMATE MODEL / SYNTHETIC DATA
          </span>
        )}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {horizonSourceLabel(siteData?.horizonte)}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Ephemerides: {siteData?.efemerides?.fuenteFormato || 'Horizons'}
        </span>
      </div>

      {/* Critical real-time alerts */}
      {curPt && (
        <div className="space-y-1.5">
          {curPt.sun_visible && curPt.hours_to_sun_sunset != null && curPt.hours_to_sun_sunset <= 24 && (
            <div className="p-2.5 rounded bg-amber-950/70 border border-amber-700/80 text-amber-200 text-xs flex items-center justify-between">
              <span>⚠️ <b>THERMAL & POWER ALERT:</b> Sunset behind terrain horizon in <b>{curPt.hours_to_sun_sunset.toFixed(1)} h</b></span>
            </div>
          )}
          {curPt.earth_nominal && curPt.hours_to_earth_loss != null && curPt.hours_to_earth_loss <= 24 && (
            <div className="p-2.5 rounded bg-rose-950/70 border border-rose-700/80 text-rose-200 text-xs flex items-center justify-between">
              <span>📡 <b>TELEMETRY ALERT:</b> Earth occluded below horizon in <b>{curPt.hours_to_earth_loss.toFixed(1)} h</b></span>
            </div>
          )}
        </div>
      )}

      {/* Cards by audience mode */}
      {uiMode === 'public' ? (
        /* PUBLIC VIEW (Direct, accessible) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {/* Sunlight & Power Card */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>☀️ Sunlight & Power</span>
              <span className="text-xs font-mono font-normal text-slate-400">{sunPct.toFixed(0)} % daylight</span>
            </h3>
            <div className="text-xl font-bold text-slate-100">
              {sunHours.toFixed(0)} hours of sunlight
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sun reaches a peak elevation of <b>{sunMaxEl.toFixed(1)}°</b> above terrain.
              Generates up to <b>{maxPower.toFixed(0)} W</b> of power with a 1 m² solar array.
            </p>
          </div>

          {/* Direct Earth Communication Card */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
              <span>📡 Direct-to-Earth Link (DTE)</span>
              <span className="text-xs font-mono font-normal text-slate-400">{earthNominalPct.toFixed(0)} % visible</span>
            </h3>
            <div className="text-xl font-bold text-slate-100">
              {earthNominalPct >= 95 ? 'Continuous line of sight' : `${earthNominalPct.toFixed(0)} % line of sight`}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Earth remains in view throughout the majority of the mission window, enabling high-rate direct communication with Deep Space Network ground stations.
            </p>
          </div>
        </div>
      ) : (
        /* TECHNICAL VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {/* EPS Subsystem */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="text-amber-400 font-bold border-b border-slate-800 pb-1">
              EPS SUBSYSTEM (POWER)
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">solar_illumination_pct:</span>
              <span className="font-bold">{sunPct.toFixed(2)} %</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">total_sun_hours:</span>
              <span>{sunHours.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">max_solar_elevation_deg:</span>
              <span>{sunMaxEl > 0 ? `+${sunMaxEl.toFixed(2)}` : sunMaxEl.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">peak_power_w:</span>
              <span>{maxPower.toFixed(1)} W</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">specific_energy_wh_m2:</span>
              <span>{totalEnergy.toFixed(1)} Wh/m²</span>
            </div>
          </div>

          {/* TT&C / DTE Subsystem */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="text-blue-400 font-bold border-b border-slate-800 pb-1">
              TT&C / DTE SUBSYSTEM
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">earth_visibility_nominal_pct:</span>
              <span className="font-bold">{earthNominalPct.toFixed(2)} %</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">earth_visibility_margin_pct:</span>
              <span>{earthMargenPct.toFixed(2)} %</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">earth_angular_radius_deg:</span>
              <span>0.950°</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">refraction_applied:</span>
              <span className="text-emerald-400">false (airless)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
