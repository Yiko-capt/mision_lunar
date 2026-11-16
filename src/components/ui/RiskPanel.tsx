import { useMission } from '../../store/useMission';
import { TERRAIN } from '../../data/moon';
import type { Analysis } from '../../lib/analysis';

export default function RiskPanel({ analysis }: { analysis: Analysis }) {
  const s = useMission();

  if (s.selected === null) {
    return (
      <aside className="p-4 text-sm text-slate-400">
        Click on terrain to inspect a cell.
      </aside>
    );
  }

  const c = s.selected;
  const L = analysis.light[c] * 100;
  const E = analysis.earth[c] * 100;
  const S = TERRAIN.slopeDeg[c];

  const fails: string[] = [];
  if (L < s.minLight) fails.push(`Sunlight ${L.toFixed(0)}% (minimum ${s.minLight}%)`);
  if (S > s.maxSlope) fails.push(`Slope ${S.toFixed(1)}° (maximum ${s.maxSlope}°)`);
  if (s.requireEarth && E < s.minEarth) fails.push(`Visible Earth ${E.toFixed(0)}% (minimum ${s.minEarth}%)`);
  const ok = fails.length === 0;

  return (
    <aside className="p-4 text-sm">
      <h2 className="text-lg font-semibold mb-3">Risk Assessment</h2>
      <div className={`mb-3 px-3 py-2 rounded font-bold text-center ${ok ? 'bg-emerald-600' : 'bg-rose-700'}`}>
        {ok ? 'SUITABLE' : 'UNSUITABLE'}
      </div>
      <ul className="space-y-1 font-mono text-slate-300">
        <li>Sunlight: {L.toFixed(0)}%</li>
        <li>Visible Earth: {E.toFixed(0)}%</li>
        <li>Slope: {S.toFixed(1)}°</li>
      </ul>
      {!ok && (
        <div className="mt-3 text-rose-300">
          <p className="font-semibold">Reasons:</p>
          <ul className="list-disc ml-5">{fails.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}
    </aside>
  );
}