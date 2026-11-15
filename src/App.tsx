import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SITES } from './data/sites';
import { TERRAIN } from './data/moon';
import { loadSiteDataSet } from './lib/io/dataLoader';
import type { SiteDataSet } from './lib/io/schemas';
import { computeTrajectory, type ComputedTrajectory } from './lib/physics';
import { useMission } from './store/useMission';
import { useAnalysis } from './hooks/useAnalysis';
import { estimateLunarPhase } from './lib/celestial';
import { getCelestialInstant } from './lib/ephemerisService';
import { computeCountdowns } from './lib/eventCountdown';

import MoonGlobe from './components/3d/MoonGlobe';
import SceneTuning from './components/3d/SceneTuning';
import PatchSurround from './components/3d/PatchSurround';
import { LookControls, CardinalMarkers, SkyTracks } from './components/3d/SurfaceView';
import MiniMap from './components/ui/MiniMap';
import { GLOBE_SCALES, type ScaleMode } from './config/sceneScale';
import LunarTerrain from './components/3d/LunarTerrain';
import { SunLight, EarthMarker } from './components/3d/Bodies';
import SpaceBackground from './components/3d/SpaceBackground';
import PatchErrorBoundary from './components/3d/PatchErrorBoundary';
import ElevationChart from './components/ui/ElevationChart';
import MetricCards from './components/ui/MetricCards';
import ComparisonPanel from './components/ui/ComparisonPanel';
import BenchmarkPanel from './components/ui/BenchmarkPanel';
import BestDaysModal from './components/ui/BestDaysModal';
import EnergyCommsWidget from './components/ui/EnergyCommsWidget';
import CabinView from './components/ui/CabinView';
import ErrorBoundary from './components/ErrorBoundary';
import ViewModeToggle from './components/ui/ViewModeToggle';
import ToolsMenu, { toolTitle, isToolAllowed, type ToolId } from './components/ui/ToolsMenu';
import StudentPanel from './components/ui/StudentPanel';
import ObjectivePanel from './components/ui/ObjectivePanel';
import SkyView from './components/ui/SkyView';
import SiteMetricsPanel from './components/ui/SiteMetricsPanel';
import SitesComparisonTable from './components/ui/SitesComparisonTable';
import TimelinePanel from './components/ui/TimelinePanel';
import MethodologyPanel from './components/ui/MethodologyPanel';
import InfoTip from './components/ui/InfoTip';
import { help } from './config/glossary';
import type { StudentScenario } from './config/studentScenarios';
import { derivePointStatus, VIABILITY_LABEL } from './lib/siteStatus';
import IntroOverlay, { TourOverlay, introAlreadyDone, markIntroDone } from './components/ui/IntroOverlay';
import { horizonSourceLabel } from './lib/io/dataLoader';

const DAY_MS = 86400000;
const isKnownSite = (id: string | undefined): id is string => !!id && SITES.some((s) => s.site_id === id);

export default function App() {
  const mission = useMission();
  const analysis = useAnalysis();
  const totalCells = TERRAIN.n * TERRAIN.n;
  const aptCellsCount = analysis.viable ? analysis.viable.reduce((acc, v) => acc + v, 0) : 0;

  // Vista de la escena 3D: 'globo' o 'parche' (Polo Sur). Es independiente del Modo de Vista
  // (Estudiante / Profesional), que vive en el store y solo cambia los paneles.
  const [sceneView, setSceneView] = useState<'globo' | 'parche' | 'sitio'>('globo');

  // Vista "Desde el sitio": altura del ojo (m) y marcadores didácticos del cielo
  const [eyeHeightM, setEyeHeightM] = useState(2);
  const [showSkyMarks, setShowSkyMarks] = useState(true);

  // Control de rotación del globo
  const [isSpinning, setIsSpinning] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Escala de la escena (real / didáctica) y modo de luz (realista / legible)
  const [scaleMode, setScaleMode] = useState<ScaleMode>('didactica');
  const [lightMode, setLightMode] = useState<'realista' | 'legible'>('legible');

  // Nivel de zoom (slider inferior derecho)
  const [zoomLevel, setZoomLevel] = useState(29);

  // Pestaña activa en el panel de filtros izquierdo: 'filtros' | 'metricas' | 'cabina'
  const [panelTab, setPanelTab] = useState<'filtros' | 'metricas' | 'cabina'>('filtros');

  // Sitios de trabajo
  const viewMode = mission.viewMode;
  const isStudent = viewMode === 'student';
  const [activeSiteId, setActiveSiteId] = useState<string>(() =>
    isKnownSite(mission.activeSiteId) ? mission.activeSiteId : 'shackleton_rim'
  );
  // Escenario de un clic activo en modo Estudiante (null si el usuario cambió algo a mano)
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [siteBId, setSiteBId] = useState<string>('shackleton_floor');

  // Base temporal de la misión
  const [baseDate, setBaseDate] = useState('2026-11-15');
  const [baseTime, setBaseTime] = useState('00:00');
  const [simDayOffset, setSimDayOffset] = useState(0.0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Modales de herramientas científicas
  const [modalOpen, setModalOpen] = useState<ToolId | null>(null);

  // Portada (carga + elección de modo) y recorrido guiado
  const [showIntro, setShowIntro] = useState(() => !introAlreadyDone());
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Panel izquierdo plegable (recordado en la sesión) y modo enfoque (tecla F)
  const [leftOpen, setLeftOpen] = useState(() => {
    try {
      return sessionStorage.getItem('killaland_left_open') !== '0';
    } catch {
      return true;
    }
  });
  const toggleLeft = () =>
    setLeftOpen((v) => {
      try {
        sessionStorage.setItem('killaland_left_open', v ? '0' : '1');
      } catch {
        /* sin sessionStorage */
      }
      return !v;
    });
  const [focusMode, setFocusMode] = useState(false);

  // Calidad de render: limita devicePixelRatio y sombras; baja sola si el equipo no llega
  const [quality, setQuality] = useState<'alta' | 'media' | 'baja'>('alta');
  const dprRange: [number, number] =
    quality === 'alta' ? [1, 2] : quality === 'media' ? [1, 1.5] : [0.75, 1];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.key === 'f' || e.key === 'F') setFocusMode((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Caché de conjuntos de datos
  const [siteDataMap, setSiteDataMap] = useState<Record<string, SiteDataSet>>({});

  // Cargar una sola vez los datos de todos los sitios del catálogo (los usan el Benchmark,
  // el Comparador A/B y la Comparación entre sitios). Solo se piden archivos que existen.
  const requestedSites = useRef<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    SITES.forEach((site) => {
      if (requestedSites.current.has(site.site_id)) return;
      requestedSites.current.add(site.site_id);
      loadSiteDataSet(site.site_id).then((data) => {
        if (alive) setSiteDataMap((prev) => ({ ...prev, [site.site_id]: data }));
      });
    });
    return () => {
      alive = false;
      requestedSites.current.clear(); // StrictMode monta dos veces en desarrollo
    };
  }, []);

  const selectSite = (id: string, keepScenario = false) => {
    const found = SITES.find((x) => x.site_id === id);
    if (!found) return;
    setActiveSiteId(id);
    if (!keepScenario) setActiveScenarioId(null);
    mission.update({
      activeSiteId: id,
      selectedLat: found.lat_deg,
      selectedLon: found.lon_deg,
      selectedAltKm: found.alt_km,
    });
  };

  // Al arrancar, las coordenadas mostradas deben ser las del sitio activo (no restos de otra sesión)
  useEffect(() => {
    selectSite(activeSiteId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si se cambia a un modo que no ofrece la herramienta abierta, se cierra
  useEffect(() => {
    if (modalOpen && !isToolAllowed(modalOpen, viewMode)) setModalOpen(null);
  }, [viewMode, modalOpen]);

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
  const loadingSite = !currentSiteData;

  // Trayectoria calculada
  const trajA: ComputedTrajectory | null = useMemo(() => {
    if (!currentSiteData?.horizonte || !currentSiteData?.efemerides) return null;
    return computeTrajectory(currentSiteData.horizonte, currentSiteData.efemerides);
  }, [currentSiteData]);

  const trajB: ComputedTrajectory | null = useMemo(() => {
    if (!siteBData?.horizonte || !siteBData?.efemerides) return null;
    return computeTrajectory(siteBData.horizonte, siteBData.efemerides);
  }, [siteBData]);

  // Fecha y hora UTC instantánea
  const currentUtcDate = useMemo(() => {
    const baseMs = Date.parse(`${baseDate}T${baseTime}:00Z`) || Date.UTC(2026, 10, 15, 0, 0);
    const totalMs = baseMs + simDayOffset * DAY_MS;
    return new Date(totalMs);
  }, [baseDate, baseTime, simDayOffset]);
  const currentMs = currentUtcDate.getTime();
  const missionStartMs = currentMs - simDayOffset * DAY_MS;

  /** Salta a un instante (ms UTC). Si cae fuera de la misión, mueve el inicio de misión a ese día. */
  const jumpTo = (ms: number) => {
    const off = (ms - missionStartMs) / DAY_MS;
    if (off >= 0 && off <= mission.durationDays) {
      setSimDayOffset(off);
      return;
    }
    const dayStart = Math.floor(ms / DAY_MS) * DAY_MS;
    setBaseDate(new Date(dayStart).toISOString().slice(0, 10));
    setBaseTime('00:00');
    setSimDayOffset((ms - dayStart) / DAY_MS);
    setActiveScenarioId(null);
  };

  const applyScenario = (sc: StudentScenario) => {
    selectSite(sc.siteId, true);
    setActiveScenarioId(sc.id);
    setBaseDate(sc.baseDate);
    setBaseTime(sc.baseTime);
    setSimDayOffset(0);
    setIsAnimating(false);
    mission.update({
      durationDays: sc.durationDays,
      minLight: sc.minLight,
      maxSlope: sc.maxSlope,
      requireEarth: sc.requireEarth,
    });
  };

  const formattedUtcString = useMemo(() => {
    const y = currentUtcDate.getUTCFullYear();
    const m = String(currentUtcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentUtcDate.getUTCDate()).padStart(2, '0');
    const hh = String(currentUtcDate.getUTCHours()).padStart(2, '0');
    const mm = String(currentUtcDate.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm} UTC`;
  }, [currentUtcDate]);

  // Posición astronómica instantánea (JPL Horizons con fallback analítico etiquetado)
  const celestial = useMemo(() => {
    return getCelestialInstant(
      currentSiteData,
      currentUtcDate,
      activeSite.lat_deg,
      activeSite.lon_deg
    );
  }, [currentSiteData, currentUtcDate, activeSite.lat_deg, activeSite.lon_deg]);

  // Cálculo en tiempo real de horas restantes de luz y visibilidad terrestre
  const countdowns = useMemo(() => {
    return computeCountdowns(trajA, currentMs);
  }, [trajA, currentMs]);

  const lunarPhase = estimateLunarPhase(celestial.sunAz);

  // Estado del punto seleccionado: ÚNICA fuente de los dos modos de vista
  const selectedCell = mission.selected ?? 2048;
  const status = useMemo(
    () =>
      derivePointStatus({
        siteId: activeSite.site_id,
        siteName: activeSite.nombre,
        lat: Number(mission.selectedLat ?? activeSite.lat_deg),
        lon: Number(mission.selectedLon ?? activeSite.lon_deg),
        altKm: Number(mission.selectedAltKm ?? activeSite.alt_km),
        slopeDeg: TERRAIN.slopeDeg[selectedCell] ?? 0,
        maxSlopeDeg: mission.maxSlope,
        celestial,
        hasData: !!currentSiteData?.efemerides,
      }),
    [activeSite, mission.selectedLat, mission.selectedLon, mission.selectedAltKm, selectedCell, mission.maxSlope, celestial, currentSiteData]
  );
  const solarEfficiencyPct = status.etaPct;

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      if (sceneView === 'globo') {
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

  // Ojo de la vista "Desde el sitio": el suelo del punto seleccionado + altura del observador
  const surfaceEyePos = useMemo<[number, number, number]>(() => {
    const cell = mission.selected ?? 2048;
    const i = cell % TERRAIN.n;
    const j = Math.floor(cell / TERRAIN.n);
    const half = (TERRAIN.n - 1) / 2;
    return [
      (i - half) * TERRAIN.cellM * (1 / 100),
      TERRAIN.h[cell] * (1 / 100) * 2.8 + eyeHeightM / 100,
      (j - half) * TERRAIN.cellM * (1 / 100),
    ];
  }, [mission.selected, eyeHeightM]);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-black text-slate-200 select-none overflow-hidden font-sans">
        {/* ========================================================
            BARRA DE NAVEGACIÓN SUPERIOR (KILLALAND)
            ======================================================== */}
        <header className="h-12 border-b border-slate-800/80 bg-[#05070d]/95 backdrop-blur-md px-5 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-amber-400">🌙</span>
            <span className="font-bold text-lg tracking-wide text-white font-sans">
              KillaLand
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono hidden sm:inline-block">
              NASA Space Apps 2026
            </span>
          </div>

          {/* Selector "Modo de Vista": Estudiante / Profesional */}
          <ViewModeToggle />

          {/* Vista de la escena 3D */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSceneView('globo')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium ${
                sceneView === 'globo'
                  ? 'bg-[#0e2a47] text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌐</span>
              <span>Globo 3D</span>
            </button>
            <button
              onClick={() => setSceneView('parche')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium ${
                sceneView === 'parche'
                  ? 'bg-[#0e2a47] text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⛰️</span>
              <span>Polo Sur (Parche)</span>
            </button>
            <button
              onClick={() => setSceneView('sitio')}
              title="Párate en el punto seleccionado: arrastra para mirar alrededor"
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium ${
                sceneView === 'sitio'
                  ? 'bg-[#0e2a47] text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👁️</span>
              <span>Desde el sitio</span>
            </button>
          </div>
        </header>

        {/* ========================================================
            CONTENEDOR 3D PRINCIPAL CON SUPERPOSICIONES FLOTANTES
            ======================================================== */}
        <div className="flex-1 relative min-h-0 bg-black">
          {/* 1. INFORMACIÓN SUPERIOR IZQUIERDA (SITIO, HORA Y BOTONES) */}
          <div className={`absolute top-4 left-6 z-20 space-y-2 pointer-events-auto ${focusMode ? 'hidden' : ''}`}>
            <div>
              <div className="text-xs text-slate-400 font-medium">
                Sitio seleccionado · <span className="text-white font-bold">{activeSite.nombre}</span>
              </div>
              <div className="text-sm font-bold text-cyan-400 font-mono tracking-wider">
                {formattedUtcString}
              </div>
            </div>

            <div className="flex gap-2 pt-0.5 flex-wrap">
              {sceneView === 'globo' && (
                <button
                  onClick={() => setIsSpinning(!isSpinning)}
                  className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  {isSpinning ? '⏸ Pausar rotación' : '▶ Reanudar rotación'}
                </button>
              )}
              {sceneView !== 'sitio' && (
                <button
                  onClick={handleResetCamera}
                  className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  🔄 Resetear vista de frente
                </button>
              )}
              {!leftOpen && sceneView !== 'sitio' && (
                <button
                  onClick={toggleLeft}
                  title="Mostrar el panel de misión"
                  className="bg-[#0b1320]/85 hover:bg-[#121e33] text-cyan-300 border border-cyan-800/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg"
                >
                  ☰ Panel de misión
                </button>
              )}
              <button
                onClick={() =>
                  setQuality((q) => (q === 'alta' ? 'media' : q === 'media' ? 'baja' : 'alta'))
                }
                title="Calidad de render: resolución y sombras (baja sola si el equipo no llega)"
                className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg"
              >
                🎚 Calidad: {quality === 'alta' ? 'Alta' : quality === 'media' ? 'Media' : 'Baja'}
              </button>
              <button
                onClick={() => setFocusMode(true)}
                title="Modo enfoque: oculta los paneles (tecla F)"
                className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg"
              >
                ⛶ Enfoque
              </button>
              <button
                onClick={() => setTourStep(0)}
                title="Ver de nuevo el recorrido guiado"
                className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg"
              >
                ❓ Guía
              </button>
              {sceneView === 'sitio' && (
                <>
                  <button
                    onClick={() => setShowSkyMarks((v) => !v)}
                    title="Puntos cardinales y trayectorias del Sol y la Tierra (24 h)"
                    className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg"
                  >
                    {showSkyMarks ? '🧭 Marcadores: Sí' : '🧭 Marcadores: No'}
                  </button>
                  <label className="bg-[#0b1320]/85 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm shadow-lg flex items-center gap-1.5 cursor-pointer">
                    👤 Altura del ojo
                    <select
                      value={eyeHeightM}
                      onChange={(e) => setEyeHeightM(Number(e.target.value))}
                      className="bg-transparent text-cyan-300 outline-none cursor-pointer"
                    >
                      <option className="bg-slate-900" value={2}>2 m</option>
                      <option className="bg-slate-900" value={10}>10 m</option>
                      <option className="bg-slate-900" value={50}>50 m</option>
                    </select>
                  </label>
                </>
              )}
              {sceneView === 'globo' && (
                <button
                  onClick={() => setScaleMode((m) => (m === 'didactica' ? 'real' : 'didactica'))}
                  title={GLOBE_SCALES[scaleMode].label}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg border flex items-center gap-1.5 ${
                    scaleMode === 'real'
                      ? 'bg-emerald-950/85 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
                      : 'bg-[#0b1320]/85 text-slate-200 border-slate-700/80 hover:bg-[#121e33]'
                  }`}
                >
                  📏 Escala: {scaleMode === 'real' ? 'Real' : 'Didáctica'}
                </button>
              )}
              <button
                onClick={() => setLightMode((m) => (m === 'legible' ? 'realista' : 'legible'))}
                title={
                  lightMode === 'legible'
                    ? 'Exposición realzada (+45 %) para leer el relieve nocturno'
                    : 'Exposición física: el lado nocturno queda casi negro'
                }
                className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                {lightMode === 'legible' ? '💡 Luz: Legible' : '🌑 Luz: Realista'}
              </button>
            </div>
          </div>

          {/* 2. PANEL FLOTANTE DE FILTROS A LA IZQUIERDA (oculto en la vista inmersiva) */}
          <div className={`absolute top-24 left-6 z-20 w-84 bg-[#09111e]/92 border border-slate-700/70 rounded-2xl p-4 shadow-2xl backdrop-blur-md pointer-events-auto font-sans text-xs space-y-3 max-h-[72vh] overflow-y-auto ${sceneView === 'sitio' || focusMode || !leftOpen ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between -mb-1">
              <span className="text-[10px] font-bold tracking-widest text-slate-400">PANEL DE MISIÓN</span>
              <button
                onClick={toggleLeft}
                title="Plegar el panel (el lienzo 3D ocupa el espacio)"
                className="text-slate-400 hover:text-white cursor-pointer text-[11px] px-1"
              >
                ▲ plegar
              </button>
            </div>
            {isStudent ? (
              <StudentPanel
                siteName={activeSite.nombre}
                activeScenarioId={activeScenarioId}
                onApplyScenario={applyScenario}
                durationDays={mission.durationDays}
                simDayOffset={simDayOffset}
                onSetDay={(d) => {
                  setIsAnimating(false);
                  setSimDayOffset(d);
                }}
                isAnimating={isAnimating}
                onToggleAnimation={() => setIsAnimating((v) => !v)}
                countdowns={countdowns}
              />
            ) : (
              <>
            {/* Selector de Sitio de Aterrizaje */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SITIO DE ATERRIZAJE
              </label>
              <select
                value={activeSite.site_id}
                onChange={(e) => selectSite(e.target.value)}
                className="w-full bg-[#111a2d] text-slate-100 text-xs rounded-lg px-2.5 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
              >
                <optgroup label="Sitios Oficiales (Benchmark)">
                  {SITES.filter((s) => s.isOfficial).map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.nombre} ({site.lat_deg.toFixed(1)}°, {site.lon_deg.toFixed(1)}°)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Sitios adicionales">
                  {SITES.filter((s) => !s.isOfficial).map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.nombre} ({site.lat_deg.toFixed(1)}°, {site.lon_deg.toFixed(1)}°)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Pestañas: Filtros Misión vs Métricas 3D vs Cabina */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#060b14] rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                onClick={() => setPanelTab('filtros')}
                className={`py-1 rounded-lg transition cursor-pointer text-center ${
                  panelTab === 'filtros' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Filtros
              </button>
              <button
                onClick={() => setPanelTab('metricas')}
                className={`py-1 rounded-lg transition cursor-pointer text-center ${
                  panelTab === 'metricas' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Métricas
              </button>
              <button
                onClick={() => setPanelTab('cabina')}
                className={`py-1 rounded-lg transition cursor-pointer text-center ${
                  panelTab === 'cabina' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cabina
              </button>
            </div>

            {/* PESTAÑA A: REQUISITOS DE MISIÓN */}
            {panelTab === 'filtros' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
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
                    onChange={(e) => {
                      setBaseDate(e.target.value);
                      setActiveScenarioId(null);
                    }}
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
                <div className="p-2 rounded-xl bg-[#070e1b] border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1">
                    Celdas aptas (parche demo): <InfoTip term="Celdas aptas" text={help('aptCells')} />
                  </span>
                  <span className="font-mono font-bold">
                    <span className="text-emerald-400">{aptCellsCount}</span>{' '}
                    <span className="text-slate-500">/ {totalCells} celdas</span>
                  </span>
                </div>

                {/* Apartado de Energía y Comunicación (Problema 4C) */}
                <EnergyCommsWidget
                  trajectory={trajA}
                  minLightPct={mission.minLight}
                  loading={loadingSite}
                />
              </div>
            )}

            {/* PESTAÑA B: MÉTRICAS 3D EN TIEMPO REAL */}
            {panelTab === 'metricas' && (
              <div className="space-y-2 pt-1 font-mono text-xs">
                {/* Etiqueta de fuente astronómica */}
                <div className="p-1.5 rounded bg-[#070e1a] border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1.5">
                  <span>{celestial.isSynthetic ? '⚠️' : '✓'}</span>
                  <span className="truncate">{celestial.sourceLabel}</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Elevación Sol</span>
                  <span className={`font-bold ${celestial.sunEl > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {celestial.sunEl > 0 ? `+${celestial.sunEl.toFixed(2)}` : celestial.sunEl.toFixed(2)}°
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Azimut Sol</span>
                  <span>+{celestial.sunAz.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Elevación Tierra</span>
                  <span className={`font-bold ${celestial.earthEl > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                    {celestial.earthEl > 0 ? `+${celestial.earthEl.toFixed(2)}` : celestial.earthEl.toFixed(2)}°
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Azimut Tierra</span>
                  <span>+{celestial.earthAz.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300">
                  <span className="text-slate-400 font-sans">Fase lunar</span>
                  <span>{lunarPhase}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">η solar instantánea</span>
                  <span className="text-emerald-400">{solarEfficiencyPct.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400 font-sans">Potencia (W, panel 1 m²)</span>
                  <span className="text-amber-300">{status.powerW.toFixed(1)} W</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400 font-sans">Visibilidad DTE</span>
                  <span className={celestial.isEarthVisible ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {celestial.isEarthVisible ? '✓ Directa' : '❌ Oculta'}
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

            {/* PESTAÑA C: VISTA CABINA 360° */}
            {panelTab === 'cabina' && (
              <div className="pt-1">
                <CabinView siteData={currentSiteData} celestial={celestial} />
              </div>
            )}

            {/* ========================================================
                LÍNEA DE TIEMPO INTERACTIVA Y CUENTAS REGRESIVAS (4B)
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

              {/* Cuentas regresivas de eventos astronómicos (Problema 4B) */}
              <div className="p-2 bg-[#050b14] rounded-lg border border-slate-800 text-[10px] font-mono space-y-1">
                <div className="text-amber-300 truncate" title={countdowns.sunDetailText}>
                  {countdowns.sunStatusText}
                </div>
                <div className="text-cyan-300 truncate" title={countdowns.earthDetailText}>
                  {countdowns.earthStatusText}
                </div>
              </div>

              {/* Controles de reproducción y salto por días */}
              <div className="flex items-center gap-1.5 font-sans">
                <button
                  onClick={() => setSimDayOffset((prev) => Math.max(0, Math.floor(prev - 1)))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
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
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                  title="Avanzar 1 día"
                >
                  +1 d
                </button>
                <button
                  onClick={() => setSimDayOffset(0)}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-[11px] cursor-pointer"
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
              </>
            )}
          </div>

          {/* 3. BOTONES DE ACCESO RÁPIDO SUPERIORES DERECHOS */}
          <div className={`absolute top-4 right-6 z-20 space-y-2 pointer-events-auto flex flex-col items-end ${focusMode ? 'hidden' : ''}`}>
            {/* Menú de herramientas: las entradas dependen del Modo de Vista */}
            <ToolsMenu onOpen={setModalOpen} />

            {sceneView === 'sitio' ? (
              /* Minimapa del polo sur: clic para saltar entre sitios sin salir de la vista */
              <MiniMap activeSiteId={activeSiteId} onSelectSite={(id) => selectSite(id)} />
            ) : (
              /* TARJETA "OBJETIVO LUNAR": ambos modos leen el mismo estado del punto */
              <ObjectivePanel status={status} />
            )}
          </div>

          {/* HUD compacto de la vista "Desde el sitio" */}
          {sceneView === 'sitio' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-black/70 border border-slate-700/70 backdrop-blur-sm text-[11px] font-mono text-slate-200">
                <span title="Azimut y elevación del Sol">
                  ☀️ Az {celestial.sunAz.toFixed(1)}° · El {celestial.sunEl.toFixed(1)}°
                </span>
                <span className="text-slate-600">|</span>
                <span title="Azimut y elevación de la Tierra">
                  🌍 Az {celestial.earthAz.toFixed(1)}° · El {celestial.earthEl.toFixed(1)}°
                  {celestial.isEarthOccluded ? ' (oculta)' : ''}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-300">{countdowns.sunStatusText}</span>
                <span className="text-slate-600">|</span>
                <span
                  className={
                    status.viability === 'apt'
                      ? 'text-emerald-300'
                      : status.viability === 'danger'
                        ? 'text-red-300'
                        : 'text-amber-300'
                  }
                >
                  {VIABILITY_LABEL[status.viability]}
                </span>
              </div>
              <div className="text-center text-[10px] text-slate-500 mt-1">
                Arrastra para mirar alrededor · estás a {eyeHeightM} m del suelo en el punto seleccionado
              </div>
            </div>
          )}

          {/* 4. CANVAS 3D (LUNA, TIERRA Y SOL ULTRA-REALISTAS / PARCHE LUNAR PBR) */}
          <Canvas
            key={sceneView}
            shadows={quality !== 'baja'}
            dpr={dprRange}
            camera={
              sceneView === 'globo'
                ? { position: [0, 0, 3.4], fov: 42, near: 0.1, far: 1000 }
                : sceneView === 'sitio'
                  ? { position: surfaceEyePos, fov: 62, near: 0.01, far: 30000 }
                  : { position: [0, 45, 80], fov: 45, near: 0.5, far: 30000 }
            }
            className="w-full h-full"
          >
            <SceneTuning lightMode={lightMode} />
            {/* Si el equipo no sostiene el ritmo, baja un escalón de calidad automáticamente */}
            <PerformanceMonitor
              onDecline={() => setQuality((q) => (q === 'alta' ? 'media' : 'baja'))}
            />
            {sceneView === 'globo' ? (
              <MoonGlobe
                activeSite={activeSite}
                candidateSites={SITES}
                scaleMode={scaleMode}
                lightMode={lightMode}
                selectedLat={mission.selectedLat}
                selectedLon={mission.selectedLon}
                sunAz={celestial.sunAz}
                sunEl={celestial.sunEl}
                earthAz={celestial.earthAz}
                earthEl={celestial.earthEl}
                earthRotationRad={celestial.earthRotationRad}
                utcMs={currentMs}
                isEarthOccluded={celestial.isEarthOccluded}
                isSpinning={isSpinning}
                zoomLevel={zoomLevel}
                controlsRef={controlsRef}
                onSelectSite={(id) => selectSite(id)}
                onMapClick={(lat, lon) => {
                  mission.update({
                    selectedLat: lat,
                    selectedLon: lon,
                  });
                }}
              />
            ) : (
              <PatchErrorBoundary onReset={() => mission.resetCoordinates()}>
                <SpaceBackground showEclipticGrid={false} radius={24000} />
                <ambientLight
                  intensity={lightMode === 'legible' ? 0.2 : 0.03}
                  color="#1e293b"
                />
                <SunLight
                  sunAz={celestial.sunAz}
                  sunEl={celestial.sunEl}
                  targetPos={sceneView === 'sitio' ? surfaceEyePos : terrainTargetPos}
                  showVector={sceneView !== 'sitio' || showSkyMarks}
                />
                <LunarTerrain analysis={analysis} showMarker={sceneView !== 'sitio'} />
                {/* Entorno del parche: terreno hasta el horizonte curvo (fin del "rectángulo flotante") */}
                <PatchSurround />
                <EarthMarker
                  earthAz={celestial.earthAz}
                  earthEl={celestial.earthEl}
                  sunAz={celestial.sunAz}
                  sunEl={celestial.sunEl}
                  siteLatDeg={mission.selectedLat}
                  utcMs={currentMs}
                  targetPos={sceneView === 'sitio' ? surfaceEyePos : terrainTargetPos}
                  earthRotationRad={celestial.earthRotationRad}
                  isOccluded={celestial.isEarthOccluded}
                  showVector={sceneView !== 'sitio' || showSkyMarks}
                />
                {sceneView === 'sitio' ? (
                  <>
                    {/* Primera persona: parado en el punto seleccionado, arrastrar para mirar */}
                    <LookControls eye={surfaceEyePos} initialAzDeg={celestial.sunAz} initialElDeg={6} />
                    <CardinalMarkers eye={surfaceEyePos} visible={showSkyMarks} />
                    <SkyTracks eye={surfaceEyePos} traj={trajA} currentMs={currentMs} visible={showSkyMarks} />
                  </>
                ) : (
                  <OrbitControls minDistance={15} maxDistance={1200} maxPolarAngle={Math.PI / 2.05} />
                )}
              </PatchErrorBoundary>
            )}
          </Canvas>

          {/* Chip para salir del modo enfoque */}
          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="absolute top-4 right-6 z-20 pointer-events-auto bg-black/70 hover:bg-black/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm cursor-pointer shadow-lg"
              title="Salir del modo enfoque (tecla F)"
            >
              ⛶ Salir del enfoque (F)
            </button>
          )}

          {/* Etiqueta permanente de la escala activa (obligatoria: el espectador debe saber
              siempre si las distancias están comprimidas o son reales) */}
          {sceneView === 'globo' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[92%]">
              <span className="inline-block px-3 py-1 rounded-full bg-black/70 border border-slate-700/70 text-[10px] text-slate-300 font-mono backdrop-blur-sm text-center">
                {GLOBE_SCALES[scaleMode].label}
                {lightMode === 'legible' ? ' · exposición realzada (modo Legible)' : ''}
              </span>
            </div>
          )}

          {/* 5. BARRA INFERIOR DE ESTADO Y CONTROL DE ZOOM */}
          <div className="absolute bottom-6 left-0 right-0 h-10 bg-[#05070d]/85 backdrop-blur-md border-t border-slate-800/80 px-6 flex items-center justify-between text-xs z-20 pointer-events-auto">
            {/* Texto de Sitio Activo, Cobertura y Fecha */}
            <div className="text-[11px] text-slate-300 font-mono flex items-center gap-2">
              <span className="text-slate-500">Sitio activo:</span>{' '}
              <span className="text-white font-semibold">{activeSite.nombre}</span>{' '}
              <span className="text-cyan-400">
                ({Number(mission.selectedLat ?? -89.684).toFixed(3)}° Lat, {Number(mission.selectedLon ?? 196.739).toFixed(3)}° Lon)
              </span>{' '}
              <span className="text-slate-600">|</span>{' '}
              <span className="text-amber-300">{formattedUtcString}</span>
              <span className="text-slate-600">|</span>{' '}
              <span className="text-[10px] text-slate-400">
                {celestial.isSynthetic ? '⚠️ ' : '✓ '}{celestial.sourceLabel}
              </span>
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

          {/* 6. PIE DE PÁGINA CON CRÉDITOS OFICIALES DE TEXTURAS Y DATOS (Problema 1) */}
          <footer className="absolute bottom-0 left-0 right-0 h-6 bg-[#020409] border-t border-slate-850 px-6 flex items-center justify-between text-[9px] text-slate-400 font-mono z-20 pointer-events-auto select-text">
            <div className="flex items-center gap-4">
              <span><b>Texturas:</b> Luna y Tierra: mosaicos equirectangulares (ver Metodología) · Sol: generado por código · escala rotulada sobre el lienzo (real o didáctica)</span>
              <span className="text-slate-600">|</span>
              <span><b>Datos:</b> Horizontes sobre DEM LOLA 80 m (Rol A) · Efemérides JPL Horizons (Rol B) · Parche 3D: terreno de demostración</span>
            </div>
            <div className="text-slate-500">
              NASA Space Apps Challenge 2026
            </div>
          </footer>
        </div>

        {/* ========================================================
            MODALES CIENTÍFICOS
            ======================================================== */}
        {modalOpen && modalOpen !== 'bestDays' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0b1222] border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0f172a]">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  {toolTitle(modalOpen)} <span className="text-slate-400 normal-case">· {activeSite.nombre}</span>
                </div>
                <button
                  onClick={() => setModalOpen(null)}
                  className="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {modalOpen === 'sky' && (
                  <SkyView siteData={currentSiteData} trajectory={trajA} celestial={celestial} currentMs={currentMs} />
                )}

                {modalOpen === 'siteMetrics' && (
                  <SiteMetricsPanel
                    site={activeSite}
                    siteData={currentSiteData}
                    trajectory={trajA}
                    missionStartMs={missionStartMs}
                    durationDays={mission.durationDays}
                    countdowns={countdowns}
                    loading={loadingSite}
                  />
                )}

                {modalOpen === 'sitesTable' && (
                  <SitesComparisonTable
                    siteDataMap={siteDataMap}
                    activeSiteId={activeSiteId}
                    missionStartMs={missionStartMs}
                    durationDays={mission.durationDays}
                    onSelectSite={(id) => selectSite(id)}
                  />
                )}

                {modalOpen === 'timeline' && (
                  <TimelinePanel
                    trajectory={trajA}
                    currentMs={currentMs}
                    missionStartMs={missionStartMs}
                    durationDays={mission.durationDays}
                    onJump={jumpTo}
                  />
                )}

                {modalOpen === 'chart' && (
                  <>
                    <ElevationChart
                      trajectory={trajA}
                      loading={loadingSite}
                      currentMs={currentMs}
                      horizonLabel="Horizonte local"
                      onJump={jumpTo}
                    />
                    <div className="text-[10px] text-slate-400 font-mono">
                      {horizonSourceLabel(currentSiteData?.horizonte)} · {celestial.sourceLabel}
                    </div>
                    <MetricCards siteData={currentSiteData} trajectory={trajA} currentMs={currentMs} />
                  </>
                )}

                {modalOpen === 'compare' && (
                  <ComparisonPanel
                    siteDataA={currentSiteData}
                    trajA={trajA}
                    siteDataB={siteBData}
                    trajB={trajB}
                    onSelectA={(id) => selectSite(id)}
                    onSelectB={(id) => setSiteBId(id)}
                  />
                )}

                {modalOpen === 'benchmark' && <BenchmarkPanel siteDataMap={siteDataMap} />}

                {modalOpen === 'method' && <MethodologyPanel />}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Optimización de Mejores Días (Problema 4A) */}
        {modalOpen === 'bestDays' && (
          <BestDaysModal
            siteData={currentSiteData}
            siteName={activeSite.nombre}
            missionDurationDays={mission.durationDays}
            onSelectDay={(dayStr) => {
              setBaseDate(dayStr);
              setSimDayOffset(0);
              setActiveScenarioId(null);
            }}
            onClose={() => setModalOpen(null)}
          />
        )}

        {/* Recorrido guiado (se abre desde la portada o con el botón "❓ Guía") */}
        {tourStep !== null && !showIntro && (
          <TourOverlay
            step={tourStep}
            onNext={() => setTourStep((s) => (s === null ? null : s + 1))}
            onClose={() => setTourStep(null)}
          />
        )}

        {/* Portada: pantalla de carga con progreso real + elección del modo de uso */}
        {showIntro && (
          <IntroOverlay
            loaded={Object.keys(siteDataMap).length}
            total={SITES.length}
            onChoose={(mode, startTour) => {
              mission.setViewMode(mode);
              markIntroDone();
              setShowIntro(false);
              setTourStep(startTour ? 0 : null);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
