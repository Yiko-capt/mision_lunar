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
      aria-label="Bienvenida a KillaLand"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      style={{
        background:
          'radial-gradient(1200px 700px at 70% -10%, #312e81 0%, #1e1b4b 38%, #0b0a1a 75%, #050410 100%)',
      }}
    >
      <div className="max-w-3xl w-[92%] text-center py-10">
        {/* Luna + Tierra con la proporción real de tamaños (1 : 3.67) */}
        <div className="flex items-end justify-center gap-10 mb-6" aria-hidden="true">
          <div
            className={`rounded-full bg-gradient-to-br from-amber-100 via-stone-300 to-stone-500 shadow-[0_0_40px_rgba(251,191,36,0.25)] ${reduced ? '' : 'animate-[spin_60s_linear_infinite]'}`}
            style={{ width: 44, height: 44 }}
            title="Luna"
          />
          <div
            className="rounded-full bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-800 shadow-[0_0_60px_rgba(56,189,248,0.35)]"
            style={{ width: 161, height: 161 }}
            title="Tierra (3.67 veces el radio lunar)"
          />
        </div>
        <div className="text-[10px] text-indigo-300/70 mb-8 font-mono">
          Tamaños relativos reales: el radio de la Tierra es 3.67 veces el de la Luna
        </div>

        <h1
          className="text-5xl font-black tracking-tight text-amber-50 mb-3"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          🌙 KillaLand
        </h1>
        <p className="text-indigo-200 text-lg mb-2">
          Elige dónde alunizar en el polo sur de la Luna con luz solar, pendiente del
          terreno y línea directa con la Tierra calculadas con datos reales.
        </p>
        <p className="text-indigo-400/80 text-xs mb-10 font-mono">
          Efemérides JPL Horizons · horizontes sobre el DEM LOLA (80 m) · NASA Space Apps 2026
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
              Cargando datos de los sitios… {loaded}/{total} ({pct}%)
            </div>
            <div className="text-indigo-500/80 text-[11px] mt-1">
              Efemérides y horizontes de cada sitio del catálogo
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-amber-200 text-sm font-bold tracking-[0.3em] uppercase mb-4">
              ¿Cómo quieres explorar?
            </h2>
            <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-6">
              <button
                onClick={() => onChoose('student', true)}
                className="group text-left rounded-2xl border-2 border-indigo-700 hover:border-amber-400 focus-visible:border-amber-400 focus-visible:outline-none bg-indigo-950/60 hover:bg-indigo-900/60 p-6 transition cursor-pointer"
              >
                <div className="text-4xl mb-3">🎓</div>
                <div className="text-amber-50 font-bold text-xl mb-1.5">Estudiante</div>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  Explora y aprende con escenarios de un clic («Aterrizaje seguro», «Máxima
                  energía solar»…), etiquetas sencillas y fichas educativas con fuentes.
                </p>
                <div className="text-amber-300/90 text-xs mt-3 font-semibold group-hover:translate-x-1 transition-transform">
                  Empezar como estudiante →
                </div>
              </button>
              <button
                onClick={() => onChoose('professional', true)}
                className="group text-left rounded-2xl border-2 border-indigo-700 hover:border-cyan-300 focus-visible:border-cyan-300 focus-visible:outline-none bg-indigo-950/60 hover:bg-indigo-900/60 p-6 transition cursor-pointer"
              >
                <div className="text-4xl mb-3">🚀</div>
                <div className="text-amber-50 font-bold text-xl mb-1.5">Profesional</div>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  Todos los datos técnicos: gráfica de elevación, comparador A/B, benchmark
                  físico de 5 casos y exportación del punto en JSON o CSV.
                </p>
                <div className="text-cyan-300/90 text-xs mt-3 font-semibold group-hover:translate-x-1 transition-transform">
                  Empezar como profesional →
                </div>
              </button>
            </div>
            <button
              onClick={() => onChoose('professional', false)}
              className="text-indigo-400 hover:text-indigo-200 text-xs underline underline-offset-4 cursor-pointer focus-visible:outline-amber-300"
            >
              Entrar sin recorrido guiado
            </button>
            <p className="text-indigo-500/70 text-[11px] mt-4">
              Puedes cambiar de modo en cualquier momento desde la barra superior.
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
    title: 'El globo y los sitios',
    body: 'Cada punto rojo es un sitio candidato (regiones Artemis III y sitios históricos). Haz clic en la Luna para elegir un punto; el marcador verde es tu objetivo.',
  },
  {
    title: 'La fecha manda',
    body: 'La luz, la sombra y la visibilidad de la Tierra salen de las efemérides JPL del instante simulado. Avanza días con la línea de tiempo y verás moverse el terminador.',
  },
  {
    title: 'Objetivo lunar',
    body: 'La tarjeta de la derecha resume el punto: pendiente, eficiencia solar, potencia y si hay señal directa con la Tierra. Estudiante y Profesional leen los mismos datos.',
  },
  {
    title: 'Herramientas',
    body: 'En el menú superior derecho están el ranking de mejores días, el cielo desde el sitio, las métricas, las comparaciones y la metodología con sus fuentes.',
  },
  {
    title: 'Tres maneras de mirar',
    body: 'Globo 3D (contexto), Polo Sur en parche (terreno) y «Desde el sitio» (a 2 m del suelo, con minimapa para saltar entre sitios). Cambiar de vista no pierde tu selección.',
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
            GUÍA · {step + 1} de {TOUR_STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="text-indigo-300 hover:text-white text-xs cursor-pointer"
            aria-label="Cerrar la guía"
          >
            ✕ Saltar
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
            {last ? 'Terminar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
