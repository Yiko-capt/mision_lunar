import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMission } from './store/useMission';
import { useAnalysis } from './hooks/useAnalysis';
import { TERRAIN } from './data/moon';
import LunarTerrain from './components/3d/LunarTerrain';
import { SunLight, EarthMarker } from './components/3d/Bodies';
import FilterPanel from './components/ui/FilterPanel';
import RiskPanel from './components/ui/RiskPanel';
import CabinView from './components/ui/CabinView';
import TimelineBar from './components/ui/TimeLineBar';

export default function App() {
  const analysis = useAnalysis();
  const simDays = useMission((s) => s.startDays + s.simDay);
  const total = TERRAIN.n * TERRAIN.n;

  return (
    <div className="h-screen flex flex-col bg-black text-slate-200">
      <header className="px-4 py-2 border-b border-slate-800 text-sm tracking-widest text-cyan-400">
        LUNAR LANDING SITE NAVIGATOR · POLO SUR (MVP)
      </header>

      <div className="flex flex-1 min-h-0">
        <FilterPanel analysis={analysis} total={total} />

        <main className="flex-1 relative min-w-0">
          <Canvas shadows camera={{ position: [0, 45, 80], fov: 45, far: 3000 }}>
            <ambientLight intensity={0.06} />
            <SunLight days={simDays} />
            <LunarTerrain analysis={analysis} />
            <EarthMarker days={simDays} />
            <OrbitControls minDistance={20} maxDistance={400} maxPolarAngle={Math.PI / 2.1} />
          </Canvas>
          <div className="absolute bottom-2 left-2 text-xs text-slate-500">
            Terreno sintético de prueba: reemplazar por LOLA DEM
          </div>
        </main>

        <div className="w-80 border-l border-slate-800 bg-slate-900/80 overflow-y-auto">
          <RiskPanel analysis={analysis} />
          <CabinView />
        </div>
      </div>

      <TimelineBar />
    </div>
  );
}