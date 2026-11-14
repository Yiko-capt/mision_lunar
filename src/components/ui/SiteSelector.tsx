import { useState } from 'react';
import { SITES } from '../../data/sites';

interface SiteSelectorProps {
  siteStatuses?: Record<string, 'completo' | 'parcial' | 'sin_datos'>;
  selectedId: string;
  onSelect: (siteId: string) => void;
  label?: string;
}

export default function SiteSelector({
  siteStatuses = {},
  selectedId,
  onSelect,
  label = 'Seleccionar Sitio',
}: SiteSelectorProps) {
  const [filter, setFilter] = useState<'all' | 'official'>('all');

  const filteredSites = SITES.filter((s) => (filter === 'official' ? s.isOfficial : true));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wide">{label}</span>
        <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px]">
          <button
            onClick={() => setFilter('official')}
            className={`px-2 py-0.5 rounded transition ${
              filter === 'official' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oficiales (5)
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded transition ${
              filter === 'all' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({SITES.length})
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {filteredSites.map((site) => {
          const isSelected = site.site_id === selectedId;
          const status = siteStatuses[site.site_id] || (site.site_id === 'apollo_11' ? 'parcial' : 'completo');

          let statusBadge = (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-400 font-mono">
              COMPLETO
            </span>
          );
          if (status === 'parcial') {
            statusBadge = (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-800 text-amber-400 font-mono">
                PARCIAL
              </span>
            );
          } else if (status === 'sin_datos') {
            statusBadge = (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/70 border border-rose-800 text-rose-400 font-mono">
                SIN DATOS
              </span>
            );
          }

          return (
            <div
              key={site.site_id}
              onClick={() => onSelect(site.site_id)}
              className={`p-2 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <span className="truncate">{site.nombre}</span>
                  {!site.isOfficial && (
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      No oficial
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {site.lat_deg.toFixed(2)}° Lat · {site.lon_deg.toFixed(1)}° Lon
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {statusBadge}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
