import { useState } from 'react';
import { useMission, type ViewMode } from '../../store/useMission';
import { VIABILITY_LABEL, type PointStatus, type Viability } from '../../lib/siteStatus';
import { toExportedPoint, toJson, toCsv, exportFileBase, downloadText } from '../../lib/exportPoint';
import { REGION_FACTS } from '../../config/regionFacts';
import { label, help, type GlossaryKey } from '../../config/glossary';
import InfoTip from './InfoTip';

interface ObjectivePanelProps {
  status: PointStatus;
}

const VIABILITY_STYLE: Record<Viability, { box: string; dot: string; icon: string }> = {
  apt: { box: 'bg-emerald-950/70 border-emerald-500 text-emerald-200', dot: 'bg-emerald-400', icon: '✅' },
  danger: { box: 'bg-amber-950/70 border-amber-500 text-amber-200', dot: 'bg-amber-400', icon: '⚠️' },
  no_sun: { box: 'bg-slate-900 border-slate-500 text-slate-200', dot: 'bg-slate-400', icon: '🌑' },
  no_data: { box: 'bg-slate-900 border-slate-700 text-slate-400', dot: 'bg-slate-600', icon: '❔' },
};

const signed = (v: number, d = 2) => (v > 0 ? `+${v.toFixed(d)}` : v.toFixed(d));

/** Tarjeta "OBJETIVO LUNAR". Ambos modos leen el mismo PointStatus. */
function Row({ k, value, tone, viewMode }: { k: GlossaryKey; value: string; tone?: string; viewMode: ViewMode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400 flex items-center gap-1 min-w-0">
        <span className="truncate">{label(k, viewMode)}</span>
        {viewMode === 'student' && <InfoTip term={label(k, viewMode)} text={help(k)} />}
      </span>
      <span className={`text-right shrink-0 ${tone ?? 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

const OPEN_KEY = 'killaland_objective_open';

export default function ObjectivePanel({ status }: ObjectivePanelProps) {
  const viewMode = useMission((s) => s.viewMode);
  const isStudent = viewMode === 'student';
  const v = VIABILITY_STYLE[status.viability];
  // Plegable (recordado en la sesión) para despejar la parte gráfica
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(OPEN_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const toggleOpen = () => {
    setOpen((prev) => {
      try {
        sessionStorage.setItem(OPEN_KEY, prev ? '0' : '1');
      } catch {
        /* sin sessionStorage */
      }
      return !prev;
    });
  };

  const handleExport = (kind: 'json' | 'csv') => {
    const point = toExportedPoint(status, VIABILITY_LABEL[status.viability]);
    const base = exportFileBase(point);
    if (kind === 'json') downloadText(`${base}.json`, toJson(point), 'application/json');
    else downloadText(`${base}.csv`, toCsv(point), 'text/csv');
  };

  const card = REGION_FACTS[status.siteId];

  return (
    <div
      data-testid="objective-panel"
      className="w-68 bg-[#09111e]/92 border border-cyan-500/40 rounded-2xl p-3.5 text-xs shadow-2xl backdrop-blur-md space-y-1.5 mt-1 text-slate-200"
    >
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">OBJETIVO LUNAR</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
            ENLACE 3D
          </span>
          <button
            onClick={toggleOpen}
            aria-expanded={open}
            title={open ? 'Plegar la tarjeta' : 'Desplegar la tarjeta'}
            className="text-slate-400 hover:text-white cursor-pointer text-[11px] px-1"
          >
            {open ? '▲' : '▼'}
          </button>
        </span>
      </div>
      <div className="font-bold text-white text-sm">{status.siteName}</div>
      {!open && (
        <div data-testid="viability" data-viability={status.viability} className={`rounded-lg border px-2 py-1 text-[10px] ${v.box}`}>
          {v.icon} {VIABILITY_LABEL[status.viability]}
        </div>
      )}
      {open && (<>

      {isStudent ? (
        <>
          {/* Indicador de viabilidad: mismo estado que la fila "Viabilidad" del modo Profesional */}
          <div
            data-testid="viability"
            data-viability={status.viability}
            className={`rounded-xl border-2 px-3 py-2.5 ${v.box}`}
            role="status"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{v.icon}</span>
              <span className="font-extrabold tracking-wide text-[12px] leading-tight">
                {VIABILITY_LABEL[status.viability]}
              </span>
            </div>
            <div className="text-[11px] leading-snug pt-1 opacity-90">{status.viabilityReason}</div>
          </div>

          <div className="text-[11px] space-y-1 pt-0.5">
            <Row viewMode={viewMode} k="slope" value={`${status.slopeDeg.toFixed(1)}°`} />
            <Row viewMode={viewMode}
              k="sunElevation"
              value={`${signed(status.sunEl)}°`}
              tone={status.sunVisible ? 'text-amber-300' : 'text-slate-500'}
            />
            <Row viewMode={viewMode}
              k="dte"
              value={status.earthVisible ? '✓ Sí' : '✗ No'}
              tone={status.earthVisible ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}
            />
            <Row viewMode={viewMode} k="solarEfficiency" value={`${status.etaPct.toFixed(2)}%`} tone="text-emerald-400" />
          </div>

          <div className="pt-1.5 border-t border-slate-800">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
              📘 {card ? card.title : 'Ficha de la región'}
            </div>
            {card ? (
              <ul className="space-y-1.5">
                {card.facts.map((f, i) => (
                  <li key={i} className="text-[11px] leading-snug text-slate-200">
                    {f.text}{' '}
                    <span className="text-[9.5px] text-slate-400">
                      Fuente:{' '}
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer" className="underline hover:text-cyan-300">
                          {f.source}
                        </a>
                      ) : (
                        f.source
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[11px] text-slate-400">
                Aún no tenemos una ficha con datos verificados para esta región.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="text-[11px] space-y-0.5 font-mono pt-0.5">
            <Row viewMode={viewMode} k="latitude" value={`${status.lat.toFixed(3)}°`} />
            <Row viewMode={viewMode} k="longitude" value={`${status.lon.toFixed(3)}° E`} />
            <Row viewMode={viewMode} k="altitude" value={`${status.altKm.toFixed(2)} km`} />
            <div className="flex items-center justify-between gap-2" title={status.slopeSource}>
              <span className="text-slate-400">Pendiente (parche demo)</span>
              <span className="text-slate-200">{status.slopeDeg.toFixed(1)}°</span>
            </div>
            <Row viewMode={viewMode} k="solarEfficiency" value={`${status.etaPct.toFixed(2)}%`} tone="text-emerald-400" />
            <Row viewMode={viewMode} k="power" value={`${status.powerW.toFixed(1)} W`} tone="text-amber-300" />
            <Row viewMode={viewMode}
              k="dteVisibility"
              value={status.earthVisible ? '✓ Directa' : '❌ Oculta'}
              tone={status.earthVisible ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}
            />
            <div
              data-testid="viability"
              data-viability={status.viability}
              className="flex items-center justify-between gap-2 pt-0.5"
              title={status.viabilityReason}
            >
              <span className="text-slate-400">Viabilidad</span>
              <span className="flex items-center gap-1.5 text-slate-100 text-[10px] font-bold">
                <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                {VIABILITY_LABEL[status.viability]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Exportar punto</span>
            <button
              onClick={() => handleExport('json')}
              className="ml-auto px-2 py-1 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-semibold cursor-pointer"
              title="Descargar los datos del punto en JSON"
            >
              ⬇ JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold cursor-pointer"
              title="Descargar los datos del punto en CSV"
            >
              ⬇ CSV
            </button>
          </div>
        </>
      )}
      </>)}

      <div className="text-[10px] text-amber-300 pt-1 leading-tight flex items-center gap-1 font-sans">
        <span>💡</span>
        <span>Haz clic en la luna para seleccionar el sitio más cercano.</span>
      </div>
    </div>
  );
}
