import { useMission } from '../../store/useMission';
import { dateFromDays } from '../../lib/solar';

export default function TimelineBar() {
  const s = useMission();
  const d = dateFromDays(s.startDays + s.simDay);
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-900 border-t border-slate-800">
      <span className="text-sm font-mono w-48">{d.toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
      <input type="range" className="flex-1" min={0} max={s.durationDays} step={0.25}
        value={s.simDay} onChange={(e) => s.update({ simDay: Number(e.target.value) })} />
      <span className="text-xs text-slate-400 w-40 text-right">
        Día {s.simDay.toFixed(2)} de {s.durationDays}
      </span>
    </div>
  );
}