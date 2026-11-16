import { useState } from 'react';
import { SITES, type LunarSite } from '../../data/sites';
import { estimateLunarPhase } from '../../lib/celestial';

interface SeleneSidebarProps {
  activeSite: LunarSite;
  onSelectSite: (siteId: string) => void;
  baseDate: string;
  baseTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  simDayOffset: number;
  maxDays: number;
  onOffsetChange: (days: number) => void;
  isAnimating: boolean;
  onToggleAnimate: () => void;
  onResetNow: () => void;

  // Filtros de Requisitos de Misión (como en captura de usuario)
  missionDurationDays: number;
  onDurationChange: (v: number) => void;
  minSolarLightPct: number;
  onMinSolarLightChange: (v: number) => void;
  maxSlopeDeg: number;
  onMaxSlopeChange: (v: number) => void;
  requireEarthVisibility: boolean;
  onRequireEarthVisibilityChange: (v: boolean) => void;
  aptCellsCount: number;
  totalCellsCount: number;

  // Métricas instantáneas
  sunEl: number;
  sunAz: number;
  earthEl: number;
  earthAz: number;
  hoursToSunset: number | null;
  solarEfficiencyPct: number;
  hasDte: boolean;

  // Apertura de modales / herramientas complementarias
  onOpenChart: () => void;
  onOpenCompare: () => void;
  onOpenBenchmark: () => void;
}

export default function SeleneSidebar({
  activeSite,
  onSelectSite,
  baseDate,
  baseTime,
  onDateChange,
  onTimeChange,
  simDayOffset,
  maxDays,
  onOffsetChange,
  isAnimating,
  onToggleAnimate,
  onResetNow,

  missionDurationDays,
  onDurationChange,
  minSolarLightPct,
  onMinSolarLightChange,
  maxSlopeDeg,
  onMaxSlopeChange,
  requireEarthVisibility,
  onRequireEarthVisibilityChange,
  aptCellsCount,
  totalCellsCount,

  sunEl,
  sunAz,
  earthEl,
  earthAz,
  hoursToSunset,
  solarEfficiencyPct,
  hasDte,
  onOpenChart,
  onOpenCompare,
  onOpenBenchmark,
}: SeleneSidebarProps) {
  const [tab, setTab] = useState<'filtros' | 'metricas'>('filtros');
  const lunarPhase = estimateLunarPhase(sunAz);

  return (
    <aside className="w-80 bg-[#090d16]/95 border-r border-[#1e293b] p-4 flex flex-col justify-between overflow-y-auto z-20 select-none font-sans shrink-0">
      <div className="space-y-3.5">
        {/* Encabezado Principal de Marca */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <h1 className="text-base font-bold text-white tracking-wide">SeleneHorizon</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold pl-7">
            POLO SUR LUNAR · NAVEGADOR
          </p>
        </div>

        {/* 1. SELECCIÓN DE SITIO DE ATERRIZAJE */}
        <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-lg p-2.5 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Landing Site
          </label>
          <select
            value={activeSite.site_id}
            onChange={(e) => onSelectSite(e.target.value)}
            className="w-full bg-[#1e293b] text-slate-100 text-xs rounded-md px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-400"
          >
            <optgroup label="Official Benchmark Sites (Role C)">
              {SITES.filter((s) => s.isOfficial).map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.nombre} ({site.lat_deg.toFixed(1)}°, {site.lon_deg.toFixed(1)}°)
                </option>
              ))}
            </optgroup>
            <optgroup label="Additional Sites (LOLA DEM)">
              {SITES.filter((s) => !s.isOfficial).map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.nombre} ({site.lat_deg.toFixed(1)}°, {site.lon_deg.toFixed(1)}°)
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-[10px] text-slate-400 leading-tight pt-0.5 italic">
            {activeSite.descripcion}
          </p>
        </div>

        {/* Pestañas de Navegación del Panel Izquierdo */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setTab('filtros')}
            className={`py-1.5 rounded transition cursor-pointer text-center ${
              tab === 'filtros'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mission Filters
          </button>
          <button
            onClick={() => setTab('metricas')}
            className={`py-1.5 rounded transition cursor-pointer text-center ${
              tab === 'metricas'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Metrics
          </button>
        </div>

        {/* PESTAÑA A: REQUISITOS DE MISIÓN (FILTROS) */}
        {tab === 'filtros' && (
          <div className="space-y-3">
            <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-lg p-3 space-y-3">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span>Mission Requirements</span>
                <span className="text-[9px] text-cyan-400 font-mono">CRITERIA</span>
              </h2>

              {/* Inicio de Misión */}
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  Mission start
                </label>
                <input
                  type="date"
                  value={baseDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full bg-[#1e293b] text-slate-100 text-xs rounded px-2.5 py-1.5 border border-slate-700 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Duración */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Duration</span>
                  <span className="font-mono text-cyan-300 font-bold">{missionDurationDays} days</span>
                </div>
                <input
                  type="range"
                  min={7}
                  max={28}
                  step={1}
                  value={missionDurationDays}
                  onChange={(e) => onDurationChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Luz solar mínima */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Minimum sunlight</span>
                  <span className="font-mono text-cyan-300 font-bold">{minSolarLightPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={minSolarLightPct}
                  onChange={(e) => onMinSolarLightChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Pendiente máxima */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Maximum slope</span>
                  <span className="font-mono text-cyan-300 font-bold">{maxSlopeDeg}°</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={maxSlopeDeg}
                  onChange={(e) => onMaxSlopeChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Checkbox Exigir línea de visión con la Tierra */}
              <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={requireEarthVisibility}
                  onChange={(e) => onRequireEarthVisibilityChange(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                Require Earth line-of-sight
              </label>

              {/* Contador de celdas aptas */}
              <div className="mt-2 p-2.5 rounded bg-[#131d33] border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-300">Eligible cells:</span>
                <span className="font-mono font-bold">
                  <span className="text-emerald-400">{aptCellsCount}</span>{' '}
                  <span className="text-slate-500">/ {totalCellsCount} cells</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA B: EFEMÉRIDES Y MÉTRICAS INSTANTÁNEAS */}
        {tab === 'metricas' && (
          <div className="space-y-3">
            {/* Control temporal */}
            <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-lg p-3 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Time Control (UTC)
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={baseTime}
                  onChange={(e) => onTimeChange(e.target.value)}
                  className="w-full bg-[#1e293b] text-slate-100 text-xs rounded px-2 py-1 border border-slate-700 font-mono text-center"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>Offset:</span>
                  <span className="text-cyan-300 font-bold">{simDayOffset.toFixed(2)} d</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxDays}
                  step={0.05}
                  value={simDayOffset}
                  onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onToggleAnimate}
                  className={`flex-1 py-1 px-2 rounded text-xs font-medium transition cursor-pointer border ${
                    isAnimating
                      ? 'bg-amber-600/80 border-amber-500 text-white'
                      : 'bg-[#1e293b] border-slate-700 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isAnimating ? '⏸ Pause' : '▶ Animate'}
                </button>
                <button
                  onClick={onResetNow}
                  className="py-1 px-3 rounded text-xs font-medium bg-[#1e293b] border border-slate-700 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                >
                  Now
                </button>
              </div>
            </div>

            {/* Valores de Elevación y Azimut */}
            <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-lg p-3 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Sun Elevation</span>
                <span className={`font-bold ${sunEl > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {sunEl > 0 ? `+${sunEl.toFixed(2)}` : sunEl.toFixed(2)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Sun Azimuth</span>
                <span className="text-slate-200">+{sunAz.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Earth Elevation</span>
                <span className={`font-bold ${earthEl > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                  {earthEl > 0 ? `+${earthEl.toFixed(2)}` : earthEl.toFixed(2)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Earth Azimuth</span>
                <span className="text-slate-200">+{earthAz.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400 font-sans">Moon Phase</span>
                <span className="text-slate-200">{lunarPhase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Hours to Sunset</span>
                <span className={hoursToSunset != null && hoursToSunset <= 24 ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                  {hoursToSunset != null ? `${hoursToSunset.toFixed(1)} h` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Solar η (panel)</span>
                <span className="text-emerald-400">{solarEfficiencyPct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400 font-sans">DTE Visibility</span>
                <span className={hasDte ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {hasDte ? '✓ Direct' : '❌ Occulted'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de Herramientas Científicas (Gráficas, Comparador, Benchmark) */}
      <div className="pt-3 border-t border-[#1e293b] space-y-1.5 mt-3">
        <button
          onClick={onOpenChart}
          className="w-full text-xs font-semibold py-1.5 px-3 rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-800 flex items-center justify-between transition cursor-pointer"
        >
          <span>📊 View Elevation Profile</span>
          <span className="text-[10px] text-cyan-400 font-mono">LOLA</span>
        </button>

        <button
          onClick={onOpenCompare}
          className="w-full text-xs font-semibold py-1.5 px-3 rounded bg-[#0f172a] hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-between transition cursor-pointer"
        >
          <span>⚖️ Site Comparator A/B</span>
          <span className="text-[10px] text-slate-400 font-mono">Sensitivity</span>
        </button>

        <button
          onClick={onOpenBenchmark}
          className="w-full text-xs font-semibold py-1.5 px-3 rounded bg-[#0f172a] hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-between transition cursor-pointer"
        >
          <span>📋 Physical Benchmark</span>
          <span className="text-[10px] text-slate-400 font-mono">5 Cases</span>
        </button>
      </div>
    </aside>
  );
}
