import { useMemo } from 'react';
import type { SiteDataSet } from '../../lib/io/schemas';
import { evaluateBenchmark, type BenchmarkCaseResult } from '../../lib/validation/benchmark';

interface BenchmarkPanelProps {
  siteDataMap: Record<string, SiteDataSet>;
}

export default function BenchmarkPanel({ siteDataMap }: BenchmarkPanelProps) {
  const results = useMemo(() => evaluateBenchmark(siteDataMap), [siteDataMap]);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <span>📋 Auditoría Física de Referencia (Benchmark)</span>
          <span className="text-[10px] text-slate-400 font-normal">5 Casos Científicos Oficiales (Rol C)</span>
        </h2>
        <span className="text-xs font-mono text-slate-400">
          Criterio: Pasa / No Pasa / Sin Datos
        </span>
      </div>

      <div className="space-y-2.5">
        {results.map((res: BenchmarkCaseResult) => {
          let badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
          if (res.estado === 'NO PASA') {
            badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-700 font-bold animate-pulse';
          } else if (res.estado === 'SIN DATOS') {
            badgeColor = 'bg-slate-800 text-slate-300 border-slate-600';
          }

          return (
            <div
              key={res.site_id}
              className={`p-3 rounded-lg border text-xs font-mono transition ${
                res.estado === 'NO PASA'
                  ? 'bg-rose-950/20 border-rose-900/60'
                  : res.estado === 'PASA'
                  ? 'bg-emerald-950/15 border-emerald-900/40'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{res.nombre}</span>
                  <span className="text-[10px] text-slate-500">({res.site_id})</span>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${badgeColor}`}>
                  {res.estado}
                </span>
              </div>

              <div className="space-y-1 text-slate-400 text-[11px]">
                <div>
                  <span className="text-slate-500">Criterio esperado:</span> {res.criterioEsperado}
                </div>
                <div>
                  <span className="text-slate-500">Valor obtenido:</span> <b className="text-slate-200">{res.valorObtenido}</b>
                </div>
                <div className="text-slate-400 italic pt-0.5">
                  {res.motivo}
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  Fuente: {res.fuente}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
