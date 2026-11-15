import { useMission, type ViewMode } from '../../store/useMission';

export type ToolId =
  | 'bestDays'
  | 'sky'
  | 'siteMetrics'
  | 'sitesTable'
  | 'timeline'
  | 'chart'
  | 'compare'
  | 'benchmark'
  | 'method';

interface ToolEntry {
  id: ToolId;
  icon: string;
  text: string;
  tag: string;
  modes: ViewMode[];
  accent?: boolean;
}

/**
 * Entradas del menú de herramientas. `modes` decide en qué modo de vista aparece cada una:
 * el modo Estudiante oculta el Benchmark, el Comparador A/B y la gráfica técnica.
 */
export const TOOL_ENTRIES: ToolEntry[] = [
  { id: 'bestDays', icon: '🏆', text: 'Mejores días', tag: 'Ranking', modes: ['student', 'professional'], accent: true },
  { id: 'sky', icon: '🔭', text: 'Cielo visto desde el sitio', tag: 'Az / El', modes: ['student', 'professional'] },
  { id: 'siteMetrics', icon: '📈', text: 'Métricas del sitio', tag: 'Resumen', modes: ['student', 'professional'] },
  { id: 'sitesTable', icon: '🗺️', text: 'Comparación entre sitios', tag: '10 sitios', modes: ['student', 'professional'] },
  { id: 'timeline', icon: '🕒', text: 'Línea del tiempo', tag: 'Sol / Tierra', modes: ['student', 'professional'] },
  { id: 'chart', icon: '📊', text: 'Gráfica de elevación', tag: 'Horizonte', modes: ['professional'] },
  { id: 'compare', icon: '⚖️', text: 'Comparador A/B', tag: 'Sensibilidad', modes: ['professional'] },
  { id: 'benchmark', icon: '📋', text: 'Benchmark físico', tag: '5 casos', modes: ['professional'] },
  { id: 'method', icon: 'ℹ️', text: 'Metodología y fuentes', tag: 'Límites', modes: ['student', 'professional'] },
];

export function toolTitle(id: ToolId): string {
  const e = TOOL_ENTRIES.find((t) => t.id === id);
  return e ? `${e.icon} ${e.text}` : '';
}

export function isToolAllowed(id: ToolId, mode: ViewMode): boolean {
  return TOOL_ENTRIES.some((t) => t.id === id && t.modes.includes(mode));
}

export default function ToolsMenu({ onOpen }: { onOpen: (id: ToolId) => void }) {
  const viewMode = useMission((s) => s.viewMode);
  const entries = TOOL_ENTRIES.filter((t) => t.modes.includes(viewMode));

  return (
    <nav aria-label="Herramientas" className="flex flex-col gap-1 w-64">
      {entries.map((t) => (
        <button
          key={t.id}
          onClick={() => onOpen(t.id)}
          className={`w-full text-xs font-semibold py-1 px-3 rounded-xl backdrop-blur-md flex items-center justify-between transition cursor-pointer shadow-lg border ${
            t.accent
              ? 'bg-gradient-to-r from-emerald-950/90 to-[#09111e]/90 hover:from-emerald-900 text-emerald-300 border-emerald-600/70'
              : 'bg-[#09111e]/90 hover:bg-[#121e33] text-slate-200 border-slate-700/80'
          }`}
        >
          <span>
            {t.icon} {t.text}
          </span>
          <span className={`text-[10px] font-mono ${t.accent ? 'text-emerald-400' : 'text-slate-400'}`}>{t.tag}</span>
        </button>
      ))}
    </nav>
  );
}
