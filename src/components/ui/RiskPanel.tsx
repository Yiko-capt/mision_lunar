import { useMission } from '../../store/useMission';
import { TERRAIN } from '../../data/moon';
import type { Analysis } from '../../lib/analysis';

export default function RiskPanel({ analysis }: { analysis: Analysis }) {
  const s = useMission();

  if (s.selected === null) {
    return (
      <aside className="p-4 text-sm text-slate-400">
        Haz clic en el terreno para inspeccionar una celda.
      </aside>
    );
  }

  const c = s.selected;
  const L = analysis.light[c] * 100;
  const E = analysis.earth[c] * 100;
  const S = TERRAIN.slopeDeg[c];

  const fails: string[] = [];
  if (L < s.minLight) fails.push(`Luz ${L.toFixed(0)}% (mínimo ${s.minLight}%)`);
  if (S > s.maxSlope) fails.push(`Pendiente ${S.toFixed(1)}° (máximo ${s.maxSlope}°)`);
  if (s.requireEarth && E < s.minEarth) fails.push(`Tierra visible ${E.toFixed(0)}% (mínimo ${s.minEarth}%)`);
  const ok = fails.length === 0;

  return (
    <aside className="p-4 text-sm">
      <h2 className="text-lg font-semibold mb-3">Medidor de riesgo</h2>
      <div className={`mb-3 px-3 py-2 rounded font-bold text-center ${ok ? 'bg-emerald-600' : 'bg-rose-700'}`}>
        {ok ? 'APTO' : 'NO APTO'}
      </div>
      <ul className="space-y-1 font-mono text-slate-300">
        <li>Luz solar: {L.toFixed(0)}%</li>
        <li>Tierra visible: {E.toFixed(0)}%</li>
        <li>Pendiente: {S.toFixed(1)}°</li>
      </ul>
      {!ok && (
        <div className="mt-3 text-rose-300">
          <p className="font-semibold">Motivos:</p>
          <ul className="list-disc ml-5">{fails.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}
    </aside>
  );
}