import { useState, useMemo } from 'react';
import type { SiteDataSet } from '../../lib/io/schemas';
import { findBestMissionWindows, WEIGHT_SOLAR_LIGHT, WEIGHT_EARTH_VISIBILITY } from '../../lib/missionPlanner';

interface BestDaysModalProps {
  siteData: SiteDataSet | null;
  siteName: string;
  missionDurationDays: number;
  onSelectDay: (startDateStr: string) => void;
  onClose: () => void;
}

export default function BestDaysModal({
  siteData,
  siteName,
  missionDurationDays,
  onSelectDay,
  onClose,
}: BestDaysModalProps) {
  // Rango de búsqueda: por defecto noviembre a diciembre de 2026 (coincidente con efemérides JPL)
  const [rangeStart, setRangeStart] = useState('2026-11-14');
  const [rangeEnd, setRangeEnd] = useState('2026-11-30');
  const [duration, setDuration] = useState(missionDurationDays || 14);

  const plannerResult = useMemo(() => {
    const sDate = new Date(`${rangeStart}T00:00:00Z`);
    const eDate = new Date(`${rangeEnd}T00:00:00Z`);
    return findBestMissionWindows(siteData?.horizonte || null, siteData?.efemerides || null, sDate, eDate, duration);
  }, [siteData, rangeStart, rangeEnd, duration]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#09111e] border border-cyan-500/40 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d1629]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏆</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Optimización de Ventanas de Lanzamiento (Mejores Días)
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Sitio analizado: <span className="text-cyan-400 font-semibold">{siteName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition cursor-pointer"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Controles de Configuración */}
          <div className="bg-[#050b14] p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Fecha Inicio Búsqueda
              </label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="w-full bg-[#111a2d] text-white rounded-lg px-3 py-1.5 border border-slate-700 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Fecha Fin Búsqueda
              </label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="w-full bg-[#111a2d] text-white rounded-lg px-3 py-1.5 border border-slate-700 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Duración Misión: <span className="text-cyan-400 font-mono">{duration} días</span>
              </label>
              <input
                type="range"
                min={3}
                max={28}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2"
              />
            </div>
          </div>

          {/* Fórmula del Puntaje */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="text-cyan-300 font-medium">
              📐 Función Objetivo: <code className="font-mono text-white">Puntaje = {(WEIGHT_SOLAR_LIGHT * 100).toFixed(0)}% · Luz + {(WEIGHT_EARTH_VISIBILITY * 100).toFixed(0)}% · DTE</code>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Tiempo de cómputo: {plannerResult.evaluationTimeMs} ms
            </span>
          </div>

          {/* Estado de Cobertura o Alerta */}
          {plannerResult.status !== 'ok' ? (
            <div className="p-8 text-center bg-slate-900/60 border border-amber-500/40 rounded-2xl space-y-2">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-sm font-bold text-amber-300 font-mono">Rango sin datos</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {plannerResult.message || 'No se cuenta con efemérides de JPL Horizons para este rango temporal.'}
              </p>
            </div>
          ) : (
            <>
              {/* Ranking Top 5 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span>🏆 Ranking Top 5 de Ventanas Óptimas</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Haz clic para cargar en simulación</span>
                </div>

                <div className="grid gap-2">
                  {plannerResult.ranking.map((item, idx) => (
                    <div
                      key={item.startDateUtc}
                      onClick={() => {
                        onSelectDay(item.startDateUtc);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        item.isBest
                          ? 'bg-emerald-950/50 border-emerald-500/70 hover:bg-emerald-900/60 shadow-lg'
                          : 'bg-[#0f172a]/80 border-slate-700/80 hover:bg-[#1a2642]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white font-mono text-sm flex items-center gap-2">
                            <span>{item.startDateUtc}</span>
                            {item.isBest && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-900 text-emerald-300 border border-emerald-700 rounded uppercase tracking-wider">
                                Óptimo Global
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex gap-4 pt-0.5">
                            <span>☀️ Luz solar útil: <b className="text-amber-300">{item.solarLightPct}%</b></span>
                            <span>🌍 Visibilidad DTE: <b className="text-cyan-300">{item.earthVisibilityPct}%</b></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-emerald-400">
                          {item.score} <span className="text-xs text-slate-500">pts</span>
                        </div>
                        <div className="text-[10px] text-cyan-400 underline font-medium">
                          Cargar día →
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfica de Puntaje Diario */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  📈 Curva de Aptitud Temporal ({duration} días de misión)
                </span>
                <div className="h-28 bg-[#040810] p-2.5 rounded-xl border border-slate-800 flex items-end gap-1 overflow-x-auto">
                  {plannerResult.dailyScores.map((day) => (
                    <div
                      key={day.startDateUtc}
                      onClick={() => {
                        onSelectDay(day.startDateUtc);
                        onClose();
                      }}
                      className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group cursor-pointer"
                      title={`${day.startDateUtc}: ${day.score} pts (Luz: ${day.solarLightPct}%, DTE: ${day.earthVisibilityPct}%)`}
                    >
                      <div
                        style={{ height: `${Math.max(8, day.score)}%` }}
                        className={`w-full rounded-t transition ${
                          day.isBest
                            ? 'bg-emerald-400 shadow-md shadow-emerald-500/50'
                            : 'bg-cyan-600/70 hover:bg-cyan-400'
                        }`}
                      />
                      <span className="text-[8px] text-slate-500 font-mono scale-90 group-hover:text-white">
                        {day.startDateUtc.slice(8)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
