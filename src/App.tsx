import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SITES } from './data/sites';
import { TERRAIN } from './data/moon';
import { loadSiteDataSet } from './lib/io/dataLoader';
import type { SiteDataSet } from './lib/io/schemas';
import { computeTrajectory, type ComputedTrajectory } from './lib/physics';
import { useMission } from './store/useMission';
import { useAnalysis } from './hooks/useAnalysis';
import { estimateLunarPhase } from './lib/celestial';

import MoonGlobe from './components/3d/MoonGlobe';
import LunarTerrain from './components/3d/LunarTerrain';
import { SunLight, EarthMarker } from './components/3d/Bodies';
import SpaceBackground from './components/3d/SpaceBackground';
import ElevationChart from './components/ui/ElevationChart';
import MetricCards from './components/ui/MetricCards';
import ComparisonPanel from './components/ui/ComparisonPanel';
import BenchmarkPanel from './components/ui/BenchmarkPanel';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const mission = useMission();
  const analysis = useAnalysis();
  const totalCells = TERRAIN.n * TERRAIN.n;
  const aptCellsCount = analysis.viable ? analysis.viable.reduce((acc, v) => acc + v, 0) : 0;

  // Modo de vista: 'globo' o 'parche' (Polo Sur)
  const [viewMode, setViewMode] = useState<'globo' | 'parche'>('globo');

  // Control de rotación del globo
  const [isSpinning, setIsSpinning] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Nivel de zoom (slider inferior derecho)
  const [zoomLevel, setZoomLevel] = useState(29);

  // Pestaña activa en el panel de filtros izquierdo: 'filtros' | 'metricas'
  const [panelTab, setPanelTab] = useState<'filtros' | 'metricas'>('filtros');

  // Sitios de trabajo
  const [activeSiteId, setActiveSiteId] = useState<string>('shackleton_rim');
  const [siteBId, setSiteBId] = useState<string>('shackleton_floor');

  // Base temporal de la misión
  const [baseDate, setBaseDate] = useState('2026-11-27');
  const [baseTime, setBaseTime] = useState('23:57');
  const [simDayOffset, setSimDayOffset] = useState(0.0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Modales de herramientas científicas
  const [modalOpen, setModalOpen] = useState<'chart' | 'compare' | 'benchmark' | null>(null);

  // Caché de conjuntos de datos
  const [siteDataMap, setSiteDataMap] = useState<Record<string, SiteDataSet>>({});
  const [loadingSite, setLoadingSite] = useState(false);

  // Cargar datos del sitio activo y sitio B
  useEffect(() => {
    let isMounted = true;
    async function fetchSite(id: string) {
      if (siteDataMap[id]) return;
      setLoadingSite(true);
      const data = await loadSiteDataSet(id);
      if (isMounted) {
        setSiteDataMap((prev) => ({ ...prev, [id]: data }));
        setLoadingSite(false);
      }
    }

    fetchSite(activeSiteId);
    if (siteBId && !siteDataMap[siteBId]) {
      fetchSite(siteBId);
    }

    return () => {
      isMounted = false;
    };
  }, [activeSiteId, siteBId, siteDataMap]);

  // Precargar los 5 sitios oficiales para el Benchmark
  useEffect(() => {
    const officialIds = ['shackleton_rim', 'shackleton_floor', 'malapert_peak', 'cabeus_rim', 'apollo_11'];
    officialIds.forEach((id) => {
      if (!siteDataMap[id]) {
        loadSiteDataSet(id).then((data) => {
          setSiteDataMap((prev) => ({ ...prev, [id]: data }));
        });
      }
    });
  }, [siteDataMap]);

  // Animación continua del tiempo
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setSimDayOffset((prev) => {
        const next = prev + 0.05;
        return next > mission.durationDays ? 0.0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, mission.durationDays]);

  const activeSite = SITES.find((s) => s.site_id === activeSiteId) || SITES[0];
  const currentSiteData = siteDataMap[activeSiteId] || null;
  const siteBData = siteDataMap[siteBId] || null;

  // Trayectoria calculada
  const trajA: ComputedTrajectory | null = useMemo(() => {
    if (!currentSiteData?.horizonte || !currentSiteData?.efemerides) return null;
    return computeTrajectory(currentSiteData.horizonte, currentSiteData.efemerides);
  }, [currentSiteData]);

  const trajB: ComputedTrajectory | null = useMemo(() => {
    if (!siteBData?.horizonte || !siteBData?.efemerides) return null;
    return computeTrajectory(siteBData.horizonte, siteBData.efemerides);
  }, [siteBData]);

  // Calcular fecha/hora actual formateada en UTC
  const currentUtcDate = useMemo(() => {
    const baseMs = Date.parse(`${baseDate}T${baseTime}:00Z`) || Date.UTC(2026, 10, 27, 23, 57);
    const totalMs = baseMs + simDayOffset * 86400000;
    return new Date(totalMs);
  }, [baseDate, baseTime, simDayOffset]);

  const formattedUtcString = useMemo(() => {
    const y = currentUtcDate.getUTCFullYear();
    const m = String(currentUtcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentUtcDate.getUTCDate()).padStart(2, '0');
    const hh = String(currentUtcDate.getUTCHours()).padStart(2, '0');
    const mm = String(currentUtcDate.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm} UTC`;
  }, [currentUtcDate]);

  // Posición instantánea del Sol y de la Tierra
  const { sunAz, sunEl, earthAz, earthEl, hoursToSunset, solarEfficiencyPct, hasDte } = useMemo(() => {
    if (currentSiteData?.efemerides && currentSiteData.efemerides.datos.length > 0) {
      const datos = currentSiteData.efemerides.datos;
      const stepIdx = Math.min(
        datos.length - 1,
        Math.max(0, Math.floor(simDayOffset * 24))
      );
      const pt = datos[stepIdx];
      const trajPt = trajA?.points[stepIdx];

      const sEl = pt.sol_elevacion_deg;
      const sAz = pt.sol_azimut_deg;
      const eEl = pt.tierra_elevacion_deg;
      const eAz = pt.tierra_azimut_deg;
      const hToSunset = trajPt ? trajPt.hours_to_sun_sunset : null;
      const dteOk = trajPt ? trajPt.earth_nominal : eEl > 0;
      const eff = trajPt && trajPt.sun_visible ? 0.28 * Math.sin(Math.max(0, (sEl * Math.PI) / 180)) * 100 : 0;

      return {
        sunAz: sAz,
        sunEl: sEl,
        earthAz: eAz,
        earthEl: eEl,
        hoursToSunset: hToSunset,
        solarEfficiencyPct: eff,
        hasDte: dteOk,
      };
    }

    // Modelo analítico topocéntrico de respaldo
    const H = ((simDayOffset * 2 * Math.PI) / 29.530589) * (180 / Math.PI);
    const sAz = (H + 120.7) % 360;
    const sEl = 1.49 + 0.3 * Math.sin(simDayOffset * 0.2);
    const eAz = 5.3 + 1.2 * Math.sin((simDayOffset * 2 * Math.PI) / 27.321661);
    const eEl = 5.58 + 2.5 * Math.cos((simDayOffset * 2 * Math.PI) / 27.321661);

    return {
      sunAz: sAz,
      sunEl: sEl,
      earthAz: eAz,
      earthEl: eEl,
      hoursToSunset: null,
      solarEfficiencyPct: 2.59,
      hasDte: eEl > 0,
    };
  }, [currentSiteData, simDayOffset, trajA]);

  const lunarPhase = estimateLunarPhase(sunAz);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      if (viewMode === 'globo') {
        controlsRef.current.object.position.set(0, 0, 3.4);
      } else {
        controlsRef.current.object.position.set(0, 50, 95);
      }
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Posición 3D del objetivo seleccionado sobre el parche topográfico
  const terrainTargetPos = useMemo<[number, number, number]>(() => {
    const cell = mission.selected ?? 2048;
    const i = cell % TERRAIN.n;
    const j = Math.floor(cell / TERRAIN.n);
    const half = (TERRAIN.n - 1) / 2;
    return [
      (i - half) * TERRAIN.cellM * (1 / 100),
      TERRAIN.h[cell] * (1 / 100) * 2.8 + 0.6,
      (j - half) * TERRAIN.cellM * (1 / 100),
    ];
  }, [mission.selected]);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-black text-slate-200 select-none overflow-hidden font-sans">
        {/* ========================================================
            BARRA DE NAVEGACIÓN SUPERIOR (KILLALAND)
            ======================================================== */}
        <header className="h-12 border-b border-slate-800/80 bg-[#05070d]/95 backdrop-blur-md px-5 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl text-amber-400">🌙</span>
            <span className="font-bold text-lg tracking-wide text-white font-sans">
              KillaLand
            </span>
          </div>

          {/* Toggle de Modo de Vista */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('globo')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium ${
                viewMode === 'globo'
                  ? 'bg-[#0e2a47] text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌐</span>
              <span>Globo 3D</span>
            </button>
            <button
              onClick={() => setViewMode('parche')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium ${
                viewMode === 'parche'
                  ? 'bg-[#0e2a47] text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⛰️</span>
              <span>Polo Sur (Parche)</span>
            </button>
          </div>
        </header>

        {/* ========================================================
            CONTENEDOR 3D PRINCIPAL CON SUPERPOSICIONES FLOTANTES
            ======================================================== */}
        <div className="flex-1 relative min-h-0 bg-black">
          {/* 1. INFORMACIÓN SUPERIOR IZQUIERDA (SITIO, HORA Y BOTONES) */}
          <div className="absolute top-4 left-6 z-20 space-y-2 pointer-events-auto">
            <div>
              <div className="text-xs text-slate-400 font-medium">
                Sitio seleccionado · <span className="text-white font-bold">{activeSite.nombre}</span>
              </div>
              <div className="text-sm font-bold text-cyan-400 font-mono tracking-wider">
                {formattedUtcString}
              </div>
            </div>

            <div className="flex gap-2 pt-0.5">
              {viewMode === 'globo' && (
                <button
                  onClick={() => setIsSpinning(!isSpinning)}
                  className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  {isSpinning ? '⏸ Pausar rotación' : '▶ Reanudar rotación'}
                </button>
              )}
              <button
                onClick={handleResetCamera}
                className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                🔄 Resetear vista de frente
              </button>
            </div>
          </div>

          {/* 2. PANEL FLOTANTE DE FILTROS A LA IZQUIERDA (REQUISITOS + LÍNEA DE TIEMPO) */}
          <div className="absolute top-24 left-6 z-20 w-80 bg-[#09111e]/92 border border-slate-700/70 rounded-2xl p-4 shadow-2xl backdrop-blur-md pointer-events-auto font-sans text-xs space-y-3.5 max-h-[82vh] overflow-y-auto">
            {/* Selector de Sitio de Aterrizaje */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SITIO DE ATERRIZAJE
              </label>
              <select
                value={activeSite.site_id}
                onChange={(e) => {
                  const newId = e.target.value;
                  setActiveSiteId(newId);
                  const found = SITES.find((s) => s.site_id === newId);
                  if (found) {
                    mission.update({
                      activeSiteId: newId,
                      selectedLat: found.lat_deg,
                      selectedLon: found.lon_deg,
                      selectedAltKm: found.alt_km,
                    });
                  }
                }}
                className="w-full bg-[#111a2d] text-slate-100 text-xs rounded-lg px-2.5 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
              >
                <optgroup label="Sitios Oficiales (Benchmark)">
                  {SITES.filter((s) => s.isOfficial).map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.nombre} ({site.lat_deg.toFixed(1)}°, {site.lon_deg.toFixed(1)}°)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Sitios Adicionales (DEM LOLA)">
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

            {/* Pestañas: Filtros Misión vs Métricas 3D */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#060b14] rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setPanelTab('filtros')}
                className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                  panelTab === 'filtros'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Filtros Misión
              </button>
              <button
                onClick={() => setPanelTab('metricas')}
                className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                  panelTab === 'metricas'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Métricas 3D
              </button>
            </div>

            {/* PESTAÑA A: REQUISITOS DE MISIÓN */}
            {panelTab === 'filtros' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    REQUISITOS DE MISIÓN
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono px-1.5 py-0.5 bg-cyan-950/60 rounded border border-cyan-800">
                    CRITERIOS
                  </span>
                </div>

                {/* Inicio de misión */}
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">
                    Inicio de misión
                  </label>
                  <input
                    type="date"
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="w-full bg-[#111a2d] text-slate-100 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Duración */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">Duración</span>
                    <span className="font-mono text-cyan-300 font-bold">{mission.durationDays} días</span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={28}
                    step={1}
                    value={mission.durationDays}
                    onChange={(e) => mission.update({ durationDays: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Luz solar mínima */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">Luz solar mínima</span>
                    <span className="font-mono text-cyan-300 font-bold">{mission.minLight}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={mission.minLight}
                    onChange={(e) => mission.update({ minLight: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Pendiente máxima */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">Pendiente máxima</span>
                    <span className="font-mono text-cyan-300 font-bold">{mission.maxSlope}°</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={mission.maxSlope}
                    onChange={(e) => mission.update({ maxSlope: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Exigir línea de visión con la Tierra */}
                <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={mission.requireEarth}
                    onChange={(e) => mission.update({ requireEarth: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  Exigir línea de visión con la Tierra
                </label>

                {/* Contador de celdas aptas */}
                <div className="p-2.5 rounded-xl bg-[#070e1b] border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-300">Celdas aptas:</span>
                  <span className="font-mono font-bold">
                    <span className="text-emerald-400">{aptCellsCount}</span>{' '}
                    <span className="text-slate-500">/ {totalCells}</span>
                  </span>
                </div>
              </div>
            )}

            {/* PESTAÑA B: MÉTRICAS 3D EN TIEMPO REAL */}
            {panelTab === 'metricas' && (
              <div className="space-y-2 pt-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Elevación Sol</span>
                  <span className={`font-bold ${sunEl > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {sunEl > 0 ? `+${sunEl.toFixed(2)}` : sunEl.toFixed(2)}°
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Azimut Sol</span>
                  <span>+{sunAz.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Elevación Tierra</span>
                  <span className={`font-bold ${earthEl > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                    {earthEl > 0 ? `+${earthEl.toFixed(2)}` : earthEl.toFixed(2)}°
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Azimut Tierra</span>
                  <span>+{earthAz.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300">
                  <span className="text-slate-400 font-sans">Fase lunar</span>
                  <span>{lunarPhase}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Horas al ocaso</span>
                  <span className={hoursToSunset != null && hoursToSunset <= 24 ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                    {hoursToSunset != null ? `${hoursToSunset.toFixed(1)} h` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">η solar</span>
                  <span className="text-emerald-400">{solarEfficiencyPct.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400 font-sans">Visibilidad DTE</span>
                  <span className={hasDte ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {hasDte ? '✓ Directa' : '❌ Oculta'}
                  </span>
                </div>

                <div className="pt-1 text-slate-300 flex items-center justify-between font-sans">
                  <span>Hora base (UTC):</span>
                  <input
                    type="time"
                    value={baseTime}
                    onChange={(e) => setBaseTime(e.target.value)}
                    className="bg-[#111a2d] text-slate-100 text-xs rounded px-2 py-0.5 border border-slate-700 font-mono text-center"
                  />
                </div>
              </div>
            )}

            {/* ========================================================
                3. LÍNEA DE TIEMPO INTERACTIVA POR DÍAS (Día 1, 2, 3...)
                ======================================================== */}
            <div className="pt-2.5 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Línea de Tiempo
                </span>
                <span className="text-cyan-300 font-mono font-bold">
                  Día {Math.min(mission.durationDays, Math.floor(simDayOffset) + 1)} de {mission.durationDays}
                </span>
              </div>

              {/* Controles de reproducción y salto por días */}
              <div className="flex items-center gap-1.5 font-sans">
                <button
                  onClick={() => setSimDayOffset((prev) => Math.max(0, Math.floor(prev - 1)))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition"
                  title="Retroceder 1 día"
                >
                  -1 d
                </button>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                    isAnimating
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                  }`}
                >
                  {isAnimating ? '⏸ Pausar' : '▶ Reproducir'}
                </button>
                <button
                  onClick={() => setSimDayOffset((prev) => Math.min(mission.durationDays, Math.floor(prev + 1)))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition"
                  title="Avanzar 1 día"
                >
                  +1 d
                </button>
                <button
                  onClick={() => setSimDayOffset(0)}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-[11px]"
                  title="Reiniciar a Día 1"
                >
                  Día 1
                </button>
              </div>

              {/* Slider de días de misión */}
              <div className="pt-1">
                <input
                  type="range"
                  min={0}
                  max={mission.durationDays}
                  step={0.05}
                  value={simDayOffset}
                  onChange={(e) => setSimDayOffset(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono pt-1">
                  <span>Día 1</span>
                  {mission.durationDays >= 14 && <span>Día {Math.round(mission.durationDays / 2)}</span>}
                  <span>Día {mission.durationDays}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BOTONES DE ACCESO RÁPIDO SUPERIORES DERECHOS */}
          <div className="absolute top-4 right-6 z-20 space-y-2 pointer-events-auto flex flex-col items-end">
            <div className="flex flex-col gap-1.5 w-60">
              <button
                onClick={() => setModalOpen('chart')}
                className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl bg-[#09111e]/90 hover:bg-[#121e33] text-cyan-200 border border-slate-700/80 backdrop-blur-md flex items-center justify-between transition cursor-pointer shadow-lg"
              >
                <span>📊 Ver Gráfica de Elevación</span>
                <span className="text-[10px] text-cyan-400 font-mono">LOLA</span>
              </button>

              <button
                onClick={() => setModalOpen('compare')}
                className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl bg-[#09111e]/90 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 backdrop-blur-md flex items-center justify-between transition cursor-pointer shadow-lg"
              >
                <span>⚖️ Comparador A/B</span>
                <span className="text-[10px] text-slate-400 font-mono">Sensibilidad</span>
              </button>

              <button
                onClick={() => setModalOpen('benchmark')}
                className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl bg-[#09111e]/90 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 backdrop-blur-md flex items-center justify-between transition cursor-pointer shadow-lg"
              >
                <span>📋 Benchmark Físico</span>
                <span className="text-[10px] text-slate-400 font-mono">5 Casos</span>
              </button>
            </div>

            {/* TARJETA FLOTANTE "OBJETIVO LUNAR" (Sincronizada en ambas vistas) */}
            <div className="w-68 bg-[#09111e]/92 border border-cyan-500/40 rounded-2xl p-3.5 text-xs shadow-2xl backdrop-blur-md space-y-1 mt-1 text-slate-200">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  OBJETIVO LUNAR
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                  ENLACE 3D
                </span>
              </div>
              <div className="font-bold text-white text-sm">{activeSite.nombre}</div>
              <div className="text-[11px] text-slate-400 space-y-0.5 font-mono pt-0.5">
                <div>Latitud: <span className="text-slate-200">{(mission.selectedLat ?? -89.684).toFixed(3)}°</span></div>
                <div>Longitud: <span className="text-slate-200">{(mission.selectedLon ?? 196.739).toFixed(3)}° E</span></div>
                <div>Altitud (DEM): <span className="text-slate-200">{(mission.selectedAltKm ?? 1.52).toFixed(2)} km</span></div>
                <div className="text-cyan-300 pt-0.5 text-[10px]">
                  Coordenadas seleccionadas: {(mission.selectedLat ?? -89.684).toFixed(2)}°, {(mission.selectedLon ?? 196.739).toFixed(2)}°
                </div>
              </div>
              <div className="text-[10px] text-amber-300 pt-1 leading-tight flex items-center gap-1 font-sans">
                <span>💡</span>
                <span>Haz clic en la luna para seleccionar el sitio más cercano.</span>
              </div>
            </div>
          </div>

          {/* 4. CANVAS 3D (LUNA, TIERRA Y SOL ULTRA-REALISTAS / PARCHE LUNAR PBR) */}
          <Canvas
            shadows
            camera={
              viewMode === 'globo'
                ? { position: [0, 0, 3.4], fov: 42, near: 0.1, far: 1000 }
                : { position: [0, 45, 80], fov: 45, near: 0.1, far: 1000 }
            }
            className="w-full h-full"
          >
            {viewMode === 'globo' ? (
              <MoonGlobe
                activeSite={activeSite}
                candidateSites={SITES}
                selectedLat={mission.selectedLat}
                selectedLon={mission.selectedLon}
                sunAz={sunAz}
                sunEl={sunEl}
                earthAz={earthAz}
                earthEl={earthEl}
                isSpinning={isSpinning}
                zoomLevel={zoomLevel}
                controlsRef={controlsRef}
                onSelectSite={(id) => {
                  setActiveSiteId(id);
                  const found = SITES.find((s) => s.site_id === id);
                  if (found) {
                    mission.update({
                      activeSiteId: id,
                      selectedLat: found.lat_deg,
                      selectedLon: found.lon_deg,
                      selectedAltKm: found.alt_km,
                    });
                  }
                }}
                onMapClick={(lat, lon) => {
                  mission.update({
                    selectedLat: Number(lat.toFixed(4)),
                    selectedLon: Number(lon.toFixed(4)),
                  });
                }}
              />
            ) : (
              <>
                <SpaceBackground showEclipticGrid={true} />
                <ambientLight intensity={0.25} color="#1e293b" />
                <SunLight
                  days={mission.startDays + simDayOffset}
                  targetPos={terrainTargetPos}
                />
                <LunarTerrain analysis={analysis} />
                <EarthMarker
                  days={mission.startDays + simDayOffset}
                  targetPos={terrainTargetPos}
                />
                <OrbitControls minDistance={15} maxDistance={400} maxPolarAngle={Math.PI / 2.05} />
              </>
            )}
          </Canvas>

          {/* 5. BARRA INFERIOR DE ESTADO Y CONTROL DE ZOOM */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#05070d]/85 backdrop-blur-md border-t border-slate-800/80 px-6 flex items-center justify-between text-xs z-20 pointer-events-auto">
            {/* Texto de Sitio Activo y Fecha */}
            <div className="text-[11px] text-slate-300 font-mono">
              <span className="text-slate-500">Sitio activo:</span>{' '}
              <span className="text-white font-semibold">{activeSite.nombre}</span>{' '}
              <span className="text-cyan-400">
                ({(mission.selectedLat ?? -89.684).toFixed(3)}° Lat, {(mission.selectedLon ?? 196.739).toFixed(3)}° Lon)
              </span>{' '}
              <span className="text-slate-600">|</span>{' '}
              <span className="text-amber-300">{formattedUtcString}</span>
            </div>

            {/* Slider de Zoom con Porcentaje */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Zoom</span>
              <input
                type="range"
                min={5}
                max={95}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="font-mono text-slate-200 text-xs w-10 text-right font-bold">
                {zoomLevel}%
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            MODALES CIENTÍFICOS (GRÁFICA LOLA, COMPARADOR A/B, BENCHMARK)
            ======================================================== */}
        {modalOpen && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0b1222] border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0f172a]">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  {modalOpen === 'chart' && '📊 Perfil de Elevación y Horizonte Topográfico LOLA'}
                  {modalOpen === 'compare' && '⚖️ Comparador de Sitios A / B (Sensibilidad Espacial)'}
                  {modalOpen === 'benchmark' && '📋 Auditoría Física de Referencia (5 Casos Oficiales)'}
                </div>
                <button
                  onClick={() => setModalOpen(null)}
                  className="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {modalOpen === 'chart' && (
                  <>
                    <ElevationChart trajectory={trajA} loading={loadingSite} />
                    <MetricCards siteData={currentSiteData} trajectory={trajA} />
                  </>
                )}

                {modalOpen === 'compare' && (
                  <ComparisonPanel
                    siteDataA={currentSiteData}
                    trajA={trajA}
                    siteDataB={siteBData}
                    trajB={trajB}
                    onSelectA={(id) => setActiveSiteId(id)}
                    onSelectB={(id) => setSiteBId(id)}
                  />
                )}

                {modalOpen === 'benchmark' && (
                  <BenchmarkPanel siteDataMap={siteDataMap} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
