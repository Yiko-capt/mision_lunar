import { useMemo } from 'react';
import { SITES } from '../../data/sites';
import type { SiteDataSet } from '../../lib/io/schemas';
import { computeTrajectory } from '../../lib/physics';
import { summarizeWindow, trajectoryCoverage } from '../../lib/trajectoryWindow';
import { horizonSourceLabel } from '../../lib/io/dataLoader';
import { useMission } from '../../store/useMission';
import { label, help } from '../../config/glossary';
import InfoTip from './InfoTip';

interface SitesComparisonTableProps {
  siteDataMap: Record<string, SiteDataSet>;
  activeSiteId: string;
  missionStartMs: number;
  durationDays: number;
  onSelectSite: (id: string) => void;
}

/** "Comparación entre sitios": los sitios del catálogo lado a lado, en la misma ventana de misión. */
export default function SitesComparisonTable({
  siteDataMap,
  activeSiteId,
  missionStartMs,
  durationDays,
  onSelectSite,
}: SitesComparisonTableProps) {
  const viewMode = useMission((s) => s.viewMode);
  const isPro = viewMode === 'professional';

  const rows = useMemo(
    () =>
      SITES.map((site) => {
        const d = siteDataMap[site.site_id];
        if (!d) return { site, state: 'loading' as const };
        if (!d.horizonte || !d.efemerides) return { site, state: 'nodata' as const };
        const traj = computeTrajectory(d.horizonte, d.efemerides);
        const cov = trajectoryCoverage(traj);
        const s =
          summarizeWindow(traj, missionStartMs, missionStartMs + durationDays * 86400000) ??
          (cov ? summarizeWindow(traj, cov.startMs, cov.endMs + 1) : null);
        return { site, state: 'ok' as const, s, horizon: horizonSourceLabel(d.horizonte) };
      }),
    [siteDataMap, missionStartMs, durationDays]
  );

  const Bar = ({ v, color }: { v: number; color: string }) => (
    <div className="h-1.5 rounded bg-slate-800 overflow-hidden mt-0.5">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </div>
  );

  return (
    <div className="space-y-2" data-testid="sites-table">
      <div className="text-[11px] text-slate-400">
        Misma ventana para todos: {durationDays} días desde {new Date(missionStartMs).toISOString().slice(0, 10)} (UTC).
        Haz clic en una fila para ir a ese sitio.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 text-left">
              <th className="py-2 pr-2 font-semibold">Sitio</th>
              {isPro && <th className="py-2 px-2 font-semibold text-right">Lat / Lon</th>}
              <th className="py-2 px-2 font-semibold">
                <span className="inline-flex items-center gap-1">{label('sunPct', viewMode)} <InfoTip term={label('sunPct', viewMode)} text={help('sunPct')} /></span>
              </th>
              <th className="py-2 px-2 font-semibold">
                <span className="inline-flex items-center gap-1">{label('earthPct', viewMode)} <InfoTip term={label('earthPct', viewMode)} text={help('earthPct')} /></span>
              </th>
              <th className="py-2 px-2 font-semibold">Ambos</th>
              <th className="py-2 px-2 font-semibold text-right">
                <span className="inline-flex items-center gap-1">{label('blackout', viewMode)} <InfoTip term={label('blackout', viewMode)} text={help('blackout')} /></span>
              </th>
              {isPro && <th className="py-2 pl-2 font-semibold">Horizonte</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sel = r.site.site_id === activeSiteId;
              return (
                <tr
                  key={r.site.site_id}
                  onClick={() => onSelectSite(r.site.site_id)}
                  className={`border-t border-slate-800 cursor-pointer hover:bg-slate-800/50 ${sel ? 'bg-cyan-950/40' : ''}`}
                >
                  <td className="py-2 pr-2">
                    <div className={`font-semibold ${sel ? 'text-cyan-200' : 'text-slate-100'}`}>{r.site.nombre}</div>
                    <div className="text-[10px] text-slate-500">{r.site.isOfficial ? 'Oficial (benchmark)' : 'Adicional'}</div>
                  </td>
                  {isPro && (
                    <td className="py-2 px-2 text-right font-mono text-slate-300 whitespace-nowrap">
                      {r.site.lat_deg.toFixed(2)}° / {r.site.lon_deg.toFixed(2)}°
                    </td>
                  )}
                  {r.state === 'ok' && r.s ? (
                    <>
                      <td className="py-2 px-2 font-mono text-amber-300 min-w-20">{r.s.sunPct.toFixed(1)}%<Bar v={r.s.sunPct} color="bg-amber-400" /></td>
                      <td className="py-2 px-2 font-mono text-sky-300 min-w-20">{r.s.earthPct.toFixed(1)}%<Bar v={r.s.earthPct} color="bg-sky-400" /></td>
                      <td className="py-2 px-2 font-mono text-emerald-300 min-w-20">{r.s.bothPct.toFixed(1)}%<Bar v={r.s.bothPct} color="bg-emerald-400" /></td>
                      <td className="py-2 px-2 font-mono text-right text-slate-200">{r.s.maxBlackoutH.toFixed(0)} h</td>
                      {isPro && <td className="py-2 pl-2 text-[10px] text-slate-400">{r.horizon}</td>}
                    </>
                  ) : (
                    <td colSpan={isPro ? 5 : 4} className="py-2 px-2 text-slate-500">
                      {r.state === 'loading' ? 'Cargando…' : 'Sin efemérides para este sitio'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-slate-500">
        Los sitios con "horizonte esférico liso" no tienen perfil de terreno: sus porcentajes no consideran montañas y son orientativos.
      </div>
    </div>
  );
}
