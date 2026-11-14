import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMission, type MainViewTab } from './store/useMission';
import { useAnalysis } from './hooks/useAnalysis';
import { SITES } from './data/sites';
import { loadSiteDataSet } from './lib/io/dataLoader';
import type { SiteDataSet } from './lib/io/schemas';
import { computeTrajectory, type ComputedTrajectory } from './lib/physics';

import LunarTerrain from './components/3d/LunarTerrain';
import { SunLight, EarthMarker } from './components/3d/Bodies';
import SiteSelector from './components/ui/SiteSelector';
import ElevationChart from './components/ui/ElevationChart';
import MetricCards from './components/ui/MetricCards';
import ComparisonPanel from './components/ui/ComparisonPanel';
import BenchmarkPanel from './components/ui/BenchmarkPanel';
import CabinView from './components/ui/CabinView';
import TimelineBar from './components/ui/TimeLineBar';

export default function App() {
  const analysis = useAnalysis();
  const simDays = useMission((s) => s.startDays + s.simDay);

  const activeSiteId = useMission((s) => s.activeSiteId);
  const selectedSiteBId = useMission((s) => s.selectedSiteBId) || 'shackleton_floor';
  const uiMode = useMission((s) => s.uiMode);
  const update = useMission((s) => s.update);

  const [activeTab, setActiveTab] = useState<MainViewTab>('dashboard');
  const [siteDataMap, setSiteDataMap] = useState<Record<string, SiteDataSet>>({});
  const [loadingSite, setLoadingSite] = useState(false);

  // Cargar datos para el sitio activo y sitio B
  useEffect(() => {
    let isMounted = true;
    async function loadData(id: string) {
      if (siteDataMap[id]) return;
      setLoadingSite(true);
      const data = await loadSiteDataSet(id);
      if (isMounted) {
        setSiteDataMap((prev) => ({ ...prev, [id]: data }));
        setLoadingSite(false);
      }
    }

    loadData(activeSiteId);
    if (selectedSiteBId && !siteDataMap[selectedSiteBId]) {
      loadData(selectedSiteBId);
    }

    return () => {
      isMounted = false;
    };
  }, [activeSiteId, selectedSiteBId, siteDataMap]);

  // Precargar los 5 sitios oficiales para la suite de Benchmark
  useEffect(() => {
    const officialIds = ['shackleton_rim', 'shackleton_floor', 'malapert_peak', 'cabeus_rim', 'apollo_11'];
    officialIds.forEach((id) => {
      loadSiteDataSet(id).then((data) => {
        setSiteDataMap((prev) => ({ ...prev, [id]: data }));
      });
    });
  }, []);

  const currentSiteData = siteDataMap[activeSiteId] || null;
  const siteBData = siteDataMap[selectedSiteBId] || null;

  // Calcular trayectoria física con horizonte e interpolación circular
  const trajA: ComputedTrajectory | null = useMemo(() => {
    if (!currentSiteData?.horizonte || !currentSiteData?.efemerides) return null;
    return computeTrajectory(currentSiteData.horizonte, currentSiteData.efemerides);
  }, [currentSiteData]);

  const trajB: ComputedTrajectory | null = useMemo(() => {
    if (!siteBData?.horizonte || !siteBData?.efemerides) return null;
    return computeTrajectory(siteBData.horizonte, siteBData.efemerides);
  }, [siteBData]);

  const activeSite = SITES.find((s) => s.site_id === activeSiteId) || SITES[0];

  // Mapa de estados de datos para el selector
  const siteStatuses: Record<string, 'completo' | 'parcial' | 'sin_datos'> = {};
  for (const site of SITES) {
    if (siteDataMap[site.site_id]) {
      siteStatuses[site.site_id] = siteDataMap[site.site_id].estadoDatos;
    } else {
      siteStatuses[site.site_id] = site.site_id === 'apollo_11' ? 'parcial' : 'completo';
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#02040a] text-slate-200 select-none overflow-hidden font-sans">
      {/* Header Principal con Controles Globales */}
      <header className="px-4 py-2 border-b border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-sm font-bold tracking-wider text-cyan-400">
            LUNAR LANDING SITE NAVIGATOR
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
            NASA Space Apps 2026
          </span>
        </div>

        {/* Pestañas de Vista Principal */}
        <nav className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'dashboard' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Tablero de Misión
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'compare' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚖️ Comparador A/B
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'benchmark' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Benchmark (5 Casos)
          </button>
          <button
            onClick={() => setActiveTab('patch')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'patch' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🗺️ Parche Polar 3D
          </button>
        </nav>

        {/* Toggles de Audiencia */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => update({ uiMode: uiMode === 'public' ? 'technical' : 'public' })}
            className="px-3 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition font-mono"
            title="Alternar entre presentación divulgativa y técnica"
          >
            {uiMode === 'public' ? '👥 Modo Público' : '⚙️ Modo Técnico'}
          </button>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Panel Lateral Izquierdo: Selector de Sitios */}
        <aside className="w-72 bg-slate-950/90 border-r border-slate-800 p-3.5 overflow-y-auto space-y-4 shrink-0">
          <SiteSelector
            siteStatuses={siteStatuses}
            selectedId={activeSiteId}
            onSelect={(id) => update({ activeSiteId: id })}
            label="Sitios de Alunizaje"
          />

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Información del Sitio Activo
            </div>
            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-emerald-400 font-bold">{activeSite.nombre}</div>
              <div className="text-slate-400 text-[11px]">
                Lat: {activeSite.lat_deg.toFixed(3)}° · Lon: {activeSite.lon_deg.toFixed(3)}° E
              </div>
              <div className="text-slate-400 text-[11px]">
                Alt: {activeSite.alt_km > 0 ? `+${activeSite.alt_km.toFixed(2)}` : activeSite.alt_km.toFixed(2)} km
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                {activeSite.descripcion}
              </div>
            </div>
          </div>
        </aside>

        {/* Área Central Dinámica según la Pestaña Activa */}
        <main className="flex-1 relative min-w-0 bg-[#02040a] overflow-y-auto p-4">
          {activeTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <ElevationChart trajectory={trajA} loading={loadingSite} />
              <MetricCards siteData={currentSiteData} trajectory={trajA} />
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="max-w-5xl mx-auto">
              <ComparisonPanel
                siteDataA={currentSiteData}
                trajA={trajA}
                siteDataB={siteBData}
                trajB={trajB}
                onSelectA={(id) => update({ activeSiteId: id })}
                onSelectB={(id) => update({ selectedSiteBId: id })}
              />
            </div>
          )}

          {activeTab === 'benchmark' && (
            <div className="max-w-4xl mx-auto">
              <BenchmarkPanel siteDataMap={siteDataMap} />
            </div>
          )}

          {activeTab === 'patch' && (
            <div className="h-full relative min-h-[500px]">
              <Canvas shadows camera={{ position: [0, 45, 80], fov: 45, far: 3000 }}>
                <ambientLight intensity={0.06} />
                <SunLight days={simDays} />
                <LunarTerrain analysis={analysis} />
                <EarthMarker days={simDays} />
                <OrbitControls minDistance={20} maxDistance={400} maxPolarAngle={Math.PI / 2.1} />
              </Canvas>
              <div className="absolute bottom-2 left-3 text-xs text-amber-400 bg-amber-950/70 border border-amber-800 px-2.5 py-1 rounded">
                ⚠️ Terreno sintético de prueba (64×64 celdas, 10 km): Modelo local fallback
              </div>
            </div>
          )}
        </main>

        {/* Panel Derecho de Cabina / Mini-Horizonte */}
        <div className="w-72 border-l border-slate-800 bg-slate-950/90 overflow-y-auto shrink-0 hidden lg:block">
          <CabinView />
        </div>
      </div>

      {/* Barra de Tiempo Sincronizada */}
      <TimelineBar />
    </div>
  );
}
