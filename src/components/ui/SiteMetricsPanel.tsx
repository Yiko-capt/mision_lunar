import { useMemo } from 'react';
import type { SiteDataSet } from '../../lib/io/schemas';
import type { ComputedTrajectory } from '../../lib/physics';
import type { CountdownInfo } from '../../lib/eventCountdown';
import type { LunarSite } from '../../data/sites';
import { summarizeWindow, trajectoryCoverage } from '../../lib/trajectoryWindow';
import { horizonSourceLabel } from '../../lib/io/dataLoader';
import { useMission } from '../../store/useMission';
import { label, help, type GlossaryKey } from '../../config/glossary';
import InfoTip from './InfoTip';

interface SiteMetricsPanelProps {
  site: LunarSite;
  siteData: SiteDataSet | null;
  trajectory: ComputedTrajectory | null;
  missionStartMs: number;
  durationDays: number;
  countdowns: CountdownInfo;
  loading?: boolean;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** "Métricas del sitio": resumen de Sol, Tierra y energía en la ventana de misión y en todo el periodo con datos. */
export default function SiteMetricsPanel({
  site,
  siteData,
  trajectory,
  missionStartMs,
  durationDays,
  countdowns,
  loading,
}: SiteMetricsPanelProps) {
  const viewMode = useMission((s) => s.viewMode);
  const isPro = viewMode === 'professional';
  const coverage = trajectoryCoverage(trajectory);

  const mission = useMemo(
    () => summarizeWindow(trajectory, missionStartMs, missionStartMs + durationDays * 86400000),
    [trajectory, missionStartMs, durationDays]
  );
  const whole = useMemo(
    () => (coverage ? summarizeWindow(trajectory, coverage.startMs, coverage.endMs + 1) : null),
    [trajectory, coverage]
  );

  if (loading && !trajectory) return <div className="text-xs text-slate-400">Cargando datos del sitio…</div>;
  if (!trajectory || !coverage) {
    return (
      <div className="text-xs text-slate-300 bg-[#070e1a] border border-slate-800 rounded-lg p-3">
        Este sitio no tiene efemérides cargadas, así que no hay métricas que mostrar.
      </div>
    );
  }

  const Card = ({ k, value, sub, tone }: { k: GlossaryKey; value: string; sub?: string; tone: string }) => (
    <div className="bg-[#070e1a] border border-slate-800 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
        {label(k, viewMode)} <InfoTip term={label(k, viewMode)} text={help(k)} />
      </div>
      <div className={`text-2xl font-bold font-mono ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 font-mono">{sub}</div>}
    </div>
  );

  const Block = ({ title, s, note }: { title: string; s: NonNullable<typeof mission>; note?: string }) => (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
        <span className="text-[10px] text-slate-400 font-mono">
          {day(s.startMs)} → {day(s.endMs)} · {s.hours.toFixed(0)} h con datos{note ? ` · ${note}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card k="sunPct" value={`${s.sunPct.toFixed(1)}%`} tone="text-amber-300" />
        <Card k="earthPct" value={`${s.earthPct.toFixed(1)}%`} tone="text-sky-300" />
        <div className="bg-[#070e1a] border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Sol y Tierra a la vez</div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{s.bothPct.toFixed(1)}%</div>
        </div>
        <Card k="blackout" value={`${s.maxBlackoutH.toFixed(0)} h`} tone="text-slate-200" />
      </div>
      {isPro && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
          <div className="bg-[#070e1a] border border-slate-800 rounded-lg px-2.5 py-1.5">
            Energía específica: <b className="text-amber-300">{(s.energyWhM2 / 1000).toFixed(2)} kWh/m²</b>
          </div>
          <div className="bg-[#070e1a] border border-slate-800 rounded-lg px-2.5 py-1.5">
            Potencia pico: <b className="text-amber-300">{s.maxPowerW.toFixed(1)} W/m²</b>
          </div>
          <div className="bg-[#070e1a] border border-slate-800 rounded-lg px-2.5 py-1.5">
            Mayor corte de Tierra: <b className="text-sky-300">{s.maxEarthGapH.toFixed(0)} h</b>
          </div>
        </div>
      )}
    </section>
  );

  const eph = siteData?.efemerides;
  const hor = siteData?.horizonte;

  return (
    <div className="space-y-4" data-testid="site-metrics">
      <div className="text-sm font-bold text-white">{site.nombre}</div>

      {mission ? (
        <Block
          title={`Durante la misión (${durationDays} días)`}
          s={mission}
          note={mission.truncated ? 'ventana recortada a los datos disponibles' : undefined}
        />
      ) : (
        <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/60 rounded-lg p-3">
          La misión elegida queda fuera del periodo con efemérides ({day(coverage.startMs)} a {day(coverage.endMs)}).
          Cambia la fecha de inicio para ver las métricas de misión.
        </div>
      )}

      {whole && <Block title="Todo el periodo con datos" s={whole} />}

      <section className="bg-[#050b14] rounded-lg border border-slate-800 p-3 text-xs space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Próximos eventos</div>
        <div className="text-amber-300">{countdowns.sunStatusText}</div>
        <div className="text-cyan-300">{countdowns.earthStatusText}</div>
      </section>

      {isPro && (
        <section className="text-[10.5px] text-slate-400 font-mono space-y-0.5 border-t border-slate-800 pt-2">
          <div>Sitio (catálogo): lat {site.lat_deg.toFixed(4)}°, lon {site.lon_deg.toFixed(4)}° E, alt {site.alt_km.toFixed(3)} km</div>
          {eph?.lat_deg != null && eph?.lon_deg != null && (
            <div>
              Efemérides calculadas en: lat {eph.lat_deg.toFixed(4)}°, lon {eph.lon_deg.toFixed(4)}° E
              {Math.abs(eph.lat_deg - site.lat_deg) > 0.05 || Math.abs(((eph.lon_deg - site.lon_deg + 540) % 360) - 180) > 0.5
                ? ' — difiere del catálogo'
                : ''}
            </div>
          )}
          {hor?.lat_deg != null && hor?.lon_deg != null && (
            <div>Horizonte trazado en: lat {hor.lat_deg.toFixed(4)}°, lon {hor.lon_deg.toFixed(4)}° E</div>
          )}
          <div>{horizonSourceLabel(hor)} · Sol por fracción de disco visible · Tierra por su centro</div>
        </section>
      )}
    </div>
  );
}
