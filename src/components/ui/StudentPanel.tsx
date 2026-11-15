import { STUDENT_SCENARIOS, type StudentScenario } from '../../config/studentScenarios';
import type { CountdownInfo } from '../../lib/eventCountdown';
import InfoTip from './InfoTip';
import { help } from '../../config/glossary';

interface StudentPanelProps {
  siteName: string;
  activeScenarioId: string | null;
  onApplyScenario: (s: StudentScenario) => void;
  durationDays: number;
  simDayOffset: number;
  onSetDay: (dayIndex: number) => void;
  isAnimating: boolean;
  onToggleAnimation: () => void;
  countdowns: CountdownInfo;
}

/** Panel izquierdo del modo Estudiante: 3 escenarios de un clic + línea de tiempo por días. */
export default function StudentPanel({
  siteName,
  activeScenarioId,
  onApplyScenario,
  durationDays,
  simDayOffset,
  onSetDay,
  isAnimating,
  onToggleAnimation,
  countdowns,
}: StudentPanelProps) {
  const currentDay = Math.min(durationDays - 1, Math.floor(simDayOffset));
  const days = Array.from({ length: durationDays }, (_, i) => i);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Elige una misión
        </div>
        <div className="space-y-1.5">
          {STUDENT_SCENARIOS.map((s) => {
            const active = s.id === activeScenarioId;
            return (
              <button
                key={s.id}
                onClick={() => onApplyScenario(s)}
                aria-pressed={active}
                className={`w-full text-left rounded-xl border px-3 py-2 transition cursor-pointer flex gap-2.5 items-start ${
                  active
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-md'
                    : 'bg-[#0b1526] border-slate-700 hover:border-cyan-600 hover:bg-[#101d33]'
                }`}
              >
                <span className="text-xl leading-none pt-0.5">{s.icon}</span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-bold ${active ? 'text-cyan-200' : 'text-white'}`}>
                    {s.title}
                  </span>
                  <span className="block text-[11px] text-slate-300 leading-snug">{s.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-2 rounded-xl bg-[#070e1b] border border-slate-800 text-[11px] text-slate-300">
        Estás viendo: <span className="text-white font-semibold">{siteName}</span>
        <div className="text-[10px] text-slate-400 pt-0.5">También puedes tocar otro punto de la Luna.</div>
      </div>

      <div className="pt-2.5 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            Línea de tiempo
            <InfoTip term="Línea de tiempo" text={help('duration') + ' Toca un día para ver cómo cambian el Sol y la Tierra.'} />
          </span>
          <span className="text-cyan-300 font-bold">
            Día {currentDay + 1} de {durationDays}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => onSetDay(d)}
              aria-current={d === currentDay ? 'true' : undefined}
              className={`py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                d === currentDay
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
              title={`Ir al día ${d + 1}`}
            >
              {d + 1}
            </button>
          ))}
        </div>

        <button
          onClick={onToggleAnimation}
          className={`w-full py-1.5 rounded-lg text-[12px] font-semibold transition cursor-pointer ${
            isAnimating ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {isAnimating ? '⏸ Pausar' : '▶ Ver pasar los días'}
        </button>

        <div className="p-2 bg-[#050b14] rounded-lg border border-slate-800 text-[11px] space-y-1">
          <div className="text-amber-300" title={countdowns.sunDetailText}>{countdowns.sunStatusText}</div>
          <div className="text-cyan-300" title={countdowns.earthDetailText}>{countdowns.earthStatusText}</div>
        </div>
      </div>
    </div>
  );
}
