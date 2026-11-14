import { HORIZONS } from '../../data/moon';
import { AZ } from '../../lib/horizon';
import { sunState } from '../../lib/solar';
import { useMission } from '../../store/useMission';

const W = 300, H = 160, YMIN = -10, YMAX = 30;
const yOf = (deg: number) => H - ((deg - YMIN) / (YMAX - YMIN)) * H;

export default function CabinView() {
  const selected = useMission((s) => s.selected);
  const startDays = useMission((s) => s.startDays);
  const simDay = useMission((s) => s.simDay);
  if (selected === null) return null;

  // Perfil del horizonte en 360° para la celda seleccionada
  const pts: string[] = [];
  for (let k = 0; k <= AZ; k++) {
    const hor = HORIZONS[selected * AZ + (k % AZ)];
    const clamped = Math.max(YMIN, Math.min(YMAX, hor));
    pts.push(`${(k / AZ) * W},${yOf(clamped)}`);
  }
  const poly = `0,${H} ${pts.join(' ')} ${W},${H}`;

  // Posición del Sol en el cielo local
  const st = sunState(startDays + simDay);
  const TWO_PI = 2 * Math.PI;
  const th = ((st.theta % TWO_PI) + TWO_PI) % TWO_PI;
  const sx = (th / TWO_PI) * W;
  const sy = yOf((st.el * 180) / Math.PI);

  return (
    <div className="p-4">
      <p className="text-xs text-slate-400 mb-1">Vista cabina 360° (horizonte local)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-black border border-slate-800 rounded">
        <polygon points={poly} fill="#334155" />
        <circle cx={sx} cy={sy} r={6} fill="#facc15" />
      </svg>
    </div>
  );
}