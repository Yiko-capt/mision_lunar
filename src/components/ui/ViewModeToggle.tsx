import { useMission, type ViewMode } from '../../store/useMission';

const OPTIONS: Array<{ id: ViewMode; icon: string; text: string; title: string }> = [
  { id: 'student', icon: '🎓', text: 'Estudiante', title: 'Vista simplificada con explicaciones' },
  { id: 'professional', icon: '🚀', text: 'Profesional', title: 'Vista completa con todas las métricas técnicas' },
];

/** Selector "Modo de Vista" de la barra superior. Solo cambia paneles: no toca la escena 3D. */
export default function ViewModeToggle() {
  const viewMode = useMission((s) => s.viewMode);
  const setViewMode = useMission((s) => s.setViewMode);

  return (
    <div
      role="radiogroup"
      aria-label="Modo de vista"
      className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs"
    >
      <span className="hidden lg:inline text-[10px] uppercase tracking-wider text-slate-500 font-mono px-1.5">
        Modo de vista
      </span>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={viewMode === o.id}
          title={o.title}
          onClick={() => setViewMode(o.id)}
          className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium ${
            viewMode === o.id
              ? 'bg-[#0e2a47] text-cyan-300 border border-cyan-700/60 shadow-sm'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <span>{o.icon}</span>
          <span>{o.text}</span>
        </button>
      ))}
    </div>
  );
}
