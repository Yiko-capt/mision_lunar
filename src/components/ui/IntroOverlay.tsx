import { useEffect, useState } from 'react';
import type { ViewMode } from '../../store/useMission';

/**
 * Pantalla de carga + pantalla de inicio (onboarding).
 *
 * Paleta propia (índigo profundo y ámbar, tipografía grande) distinta de la
 * interfaz de trabajo (cian sobre azul petróleo), para que se lea como la
 * portada del producto y deje clarísimo que existen DOS modos de uso.
 *
 * - La barra de progreso es real: avanza con los conjuntos de datos de sitios
 *   que ya llegaron (efemérides + horizontes JPL/LOLA).
 * - Accesible: botones de verdad, foco visible, respeta prefers-reduced-motion.
 */

interface IntroOverlayProps {
  /** Sitios cargados / total (progreso real de datos). */
  loaded: number;
  total: number;
  onChoose: (mode: ViewMode, startTour: boolean) => void;
}

const SESSION_KEY = 'killaland_intro_done';

export function introAlreadyDone(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroDone(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* sin sessionStorage: la portada volverá a verse al recargar */
  }
}

export default function IntroOverlay({ loaded, total, onChoose }: IntroOverlayProps) {
  const ready = loaded >= total;
  const pct = Math.round((loaded / Math.max(1, total)) * 100);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Welcome to KillaLand"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      style={{
        background:
          'radial-gradient(1200px 700px at 70% -10%, #312e81 0%, #1e1b4b 38%, #0b0a1a 75%, #050410 100%)',
      }}
    >
      <div className="max-w-3xl w-[92%] text-center py-10">
        {/* Moon + Earth real size proportion (1 : 3.67) */}
        <div className="flex items-end justify-center gap-10 mb-6" aria-hidden="true">
          <div
            className={`rounded-full bg-gradient-to-br from-amber-100 via-stone-300 to-stone-500 shadow-[0_0_40px_rgba(251,191,36,0.25)] ${reduced ? '' : 'animate-[spin_60s_linear_infinite]'}`}
            style={{ width: 44, height: 44 }}
            title="Moon"
          />
          <div
            className="rounded-full bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-800 shadow-[0_0_60px_rgba(56,189,248,0.35)]"
            style={{ width: 161, height: 161 }}
            title="Earth (3.67 times Moon radius)"
          />
        </div>
        <div className="text-[10px] text-indigo-300/70 mb-8 font-mono">
          Actual relative sizes: Earth radius is 3.67× Moon radius
        </div>

        <h1
          className="text-5xl font-black tracking-tight text-amber-50 mb-3"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          🌙 KillaLand
        </h1>
        <p className="text-indigo-200 text-lg mb-2">
          Select landing zones at the lunar South Pole with solar illumination, terrain slope,
          and direct Earth line-of-sight computed from real planetary data.
        </p>
        <p className="text-indigo-400/80 text-xs mb-10 font-mono">
          JPL Horizons ephemerides · LOLA DEM horizons (80 m) · NASA Space Apps 2026
        </p>

        {!ready ? (
          <div className="max-w-md mx-auto" aria-live="polite">
            <div className="h-2.5 rounded-full bg-indigo-950 border border-indigo-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-indigo-300 text-sm mt-3 font-mono">
              Loading site data… {loaded}/{total} ({pct}%)
            </div>
            <div className="text-indigo-500/80 text-[11px] mt-1">
              Ephemerides and horizons for each catalog site
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-amber-200 text-sm font-bold tracking-[0.3em] uppercase mb-4">
              How would you like to explore?
            </h2>
            <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-6">
              <button
                onClick={() => onChoose('student', true)}
                className="group text-left rounded-2xl border-2 border-indigo-700 hover:border-amber-400 focus-visible:border-amber-400 focus-visible:outline-none bg-indigo-950/60 hover:bg-indigo-900/60 p-6 transition cursor-pointer"
              >
                <div className="text-4xl mb-3">🎓</div>
                <div className="text-amber-50 font-bold text-xl mb-1.5">Undergraduate</div>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  Explore and learn with 1-click scenarios ("Safe Landing", "Maximum Solar
                  Power"…), simplified labels, and educational sheets with sources.
                </p>
                <div className="text-amber-300/90 text-xs mt-3 font-semibold group-hover:translate-x-1 transition-transform">
                  Start as Undergraduate →
                </div>
              </button>
              <button
                onClick={() => onChoose('professional', true)}
                className="group text-left rounded-2xl border-2 border-indigo-700 hover:border-cyan-300 focus-visible:border-cyan-300 focus-visible:outline-none bg-indigo-950/60 hover:bg-indigo-900/60 p-6 transition cursor-pointer"
              >
                <div className="text-4xl mb-3">🚀</div>
                <div className="text-amber-50 font-bold text-xl mb-1.5">Professional</div>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  Full technical datasets: elevation profiles, A/B comparison, 5-case
                  physics benchmark, and target export to JSON or CSV.
                </p>
                <div className="text-cyan-300/90 text-xs mt-3 font-semibold group-hover:translate-x-1 transition-transform">
                  Start as Professional →
                </div>
              </button>
            </div>
            <button
              onClick={() => onChoose('professional', false)}
              className="text-indigo-400 hover:text-indigo-200 text-xs underline underline-offset-4 cursor-pointer focus-visible:outline-amber-300"
            >
              Enter without guided tour
            </button>
            <p className="text-indigo-500/70 text-[11px] mt-4">
              You can switch view modes at any time from the top bar.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Recorrido guiado ─────────────────────────── */

export interface TourStep {
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Globe and Landing Sites',
    body: 'Each marker is a candidate site (Artemis III regions and historic landing sites). Click anywhere on the Moon to select a target; the green ring marks your objective.',
  },
  {
    title: 'Date & Time Control',
    body: 'Illumination, shadows, and Earth visibility are calculated from JPL Horizons ephemerides at the simulated time. Move through days with the timeline to see the terminator shift.',
  },
  {
    title: 'Lunar Target',
    body: 'The right panel summarizes the active site: slope, solar efficiency, power, and line of sight to Earth. Both Undergraduate and Professional modes show identical physics.',
  },
  {
    title: 'Mission Tools',
    body: 'The top-right tools menu contains best days ranking, site sky view, metrics, side-by-side comparison, and scientific methodology with citations.',
  },
  {
    title: 'Three View Modes',
    body: '3D Globe (global context), South Pole Patch (high-res regional DEM), and Site View (first-person ground perspective at 2 m). Switching views keeps your target selection.',
  },
];

interface TourProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export function TourOverlay({ step, onNext, onClose }: TourProps) {
  const s = TOUR_STEPS[step];
  if (!s) return null;
  const last = step === TOUR_STEPS.length - 1;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-md w-[92%]">
      <div className="rounded-2xl border-2 border-amber-400/70 bg-[#1e1b4b]/95 backdrop-blur-md p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-amber-200 text-xs font-bold tracking-widest">
            GUIDE · {step + 1} of {TOUR_STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="text-indigo-300 hover:text-white text-xs cursor-pointer"
            aria-label="Close guide"
          >
            ✕ Skip
          </button>
        </div>
        <div className="text-white font-bold text-sm mb-1">{s.title}</div>
        <p className="text-indigo-100 text-xs leading-relaxed mb-3">{s.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1" aria-hidden="true">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`inline-block w-1.5 h-1.5 rounded-full ${i <= step ? 'bg-amber-300' : 'bg-indigo-700'}`}
              />
            ))}
          </div>
          <button
            onClick={last ? onClose : onNext}
            className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold text-xs px-4 py-1.5 rounded-lg cursor-pointer"
          >
            {last ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
