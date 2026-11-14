import { useMission } from '../../store/useMission';
import { daysSince, dateFromDays } from '../../lib/solar';
import type { Analysis } from '../../lib/analysis';

function Slider(props: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, unit = '', onChange } = props;
  return (
    <label className="block text-sm mb-4">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-cyan-300">{value}{unit}</span>
      </div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function FilterPanel({ analysis, total }: { analysis: Analysis; total: number }) {
  const s = useMission();
  const apt = analysis.viable.reduce((a, b) => a + b, 0);

  return (
    <aside className="w-72 p-4 bg-slate-900/80 border-r border-slate-800 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Requisitos de misión</h2>

      <label className="block text-sm mb-4">
        Inicio de misión
        <input type="date" className="block w-full mt-1 bg-slate-800 rounded px-2 py-1"
          value={dateFromDays(s.startDays).toISOString().slice(0, 10)}
          onChange={(e) => s.update({ startDays: daysSince(new Date(e.target.value + 'T00:00:00Z')) })} />
      </label>

      <Slider label="Duración" value={s.durationDays} min={7} max={28} unit=" días"
        onChange={(v) => s.update({ durationDays: v, simDay: Math.min(s.simDay, v) })} />
      <Slider label="Luz solar mínima" value={s.minLight} min={0} max={100} unit="%"
        onChange={(v) => s.update({ minLight: v })} />
      <Slider label="Pendiente máxima" value={s.maxSlope} min={1} max={30} unit="°"
        onChange={(v) => s.update({ maxSlope: v })} />

      <label className="flex items-center gap-2 text-sm mb-4">
        <input type="checkbox" checked={s.requireEarth}
          onChange={(e) => s.update({ requireEarth: e.target.checked })} />
        Exigir línea de visión con la Tierra
      </label>
      {s.requireEarth && (
        <Slider label="Tierra visible mínima" value={s.minEarth} min={0} max={100} unit="%"
          onChange={(v) => s.update({ minEarth: v })} />
      )}

      <div className="mt-4 p-3 rounded bg-slate-800 text-sm">
        Celdas aptas: <b className="text-emerald-400">{apt}</b> / {total}
      </div>
    </aside>
  );
}