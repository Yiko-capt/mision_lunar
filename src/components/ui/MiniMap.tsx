import { useMemo, useState } from 'react';
import { SITES } from '../../data/sites';

/**
 * Minimapa del polo sur lunar (proyección estereográfica polar simplificada:
 * radio ∝ distancia angular al polo, acimut = longitud selenográfica).
 * Muestra todos los sitios del catálogo; clic = saltar a ese sitio conservando
 * fecha y modo. Plegable para no tapar la vista.
 *
 * El fondo es un retículo de paralelos (85°S y 80°S); no se dibuja relieve
 * porque el mapa sombreado del LDEM no está empaquetado (ver npm run fetch:moon).
 */

interface MiniMapProps {
  activeSiteId: string;
  onSelectSite: (id: string) => void;
}

const R_VIEW = 86; // px del radio útil
const MAX_COLAT = 10; // grados desde el polo que abarca el mapa (hasta 80°S)

function project(latDeg: number, lonDeg: number): { x: number; y: number; inside: boolean } {
  const colat = 90 + latDeg; // 0 en el polo sur
  const r = (Math.min(colat, MAX_COLAT) / MAX_COLAT) * R_VIEW;
  const a = (lonDeg * Math.PI) / 180;
  // Lon 0° hacia arriba (hacia la cara visible/Tierra), crece en sentido horario
  return { x: r * Math.sin(a), y: -r * Math.cos(a), inside: colat <= MAX_COLAT };
}

export default function MiniMap({ activeSiteId, onSelectSite }: MiniMapProps) {
  const [open, setOpen] = useState(true);

  const sites = useMemo(
    () =>
      SITES.map((s) => ({
        id: s.site_id,
        nombre: s.nombre,
        ...project(s.lat_deg, s.lon_deg),
      })),
    []
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[#0b1320]/85 hover:bg-[#121e33] text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition cursor-pointer shadow-lg"
        title="Show South Pole minimap"
      >
        🗺️ Minimap
      </button>
    );
  }

  return (
    <div className="bg-[#09111e]/92 border border-slate-700/70 rounded-2xl p-3 shadow-2xl backdrop-blur-md pointer-events-auto w-56">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold tracking-widest text-slate-300">
          SOUTH POLE · MAP
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-500 hover:text-white text-xs cursor-pointer px-1"
          title="Collapse minimap"
        >
          ─
        </button>
      </div>
      <svg viewBox="-100 -100 200 200" className="w-full aspect-square">
        {/* Fondo y retículo: paralelos 85°S y 80°S, meridianos 0/90/180/270 */}
        <circle cx="0" cy="0" r={R_VIEW} fill="#0c1018" stroke="#334155" strokeWidth="1" />
        <circle cx="0" cy="0" r={R_VIEW / 2} fill="none" stroke="#1e293b" strokeWidth="0.8" />
        <line x1="0" y1={-R_VIEW} x2="0" y2={R_VIEW} stroke="#1e293b" strokeWidth="0.8" />
        <line x1={-R_VIEW} y1="0" x2={R_VIEW} y2="0" stroke="#1e293b" strokeWidth="0.8" />
        <text x="0" y={-R_VIEW + 9} textAnchor="middle" fill="#64748b" fontSize="8">
          0°E
        </text>
        <text x={R_VIEW - 9} y="3" textAnchor="middle" fill="#64748b" fontSize="8">
          90°E
        </text>
        <text x="0" y={-R_VIEW / 2 + 8} textAnchor="middle" fill="#475569" fontSize="7">
          85°S
        </text>
        <text x="4" y="8" fill="#64748b" fontSize="7">
          ⌖ pole
        </text>

        {/* Sitios del catálogo */}
        {sites.map((s) => {
          const isActive = s.id === activeSiteId;
          if (!s.inside) {
            // Outside polar cap (e.g. Apollo 11)
            const n = Math.hypot(s.x, s.y) || 1;
            const bx = (s.x / n) * (R_VIEW - 4);
            const by = (s.y / n) * (R_VIEW - 4);
            return (
              <g key={s.id} className="cursor-pointer" onClick={() => onSelectSite(s.id)}>
                <title>{`${s.nombre} (outside 80°S polar cap)`}</title>
                <path
                  d={`M ${bx} ${by} l 4 6 l -8 0 Z`}
                  fill={isActive ? '#22c55e' : '#f87171'}
                  opacity="0.9"
                />
              </g>
            );
          }
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => onSelectSite(s.id)}>
              <title>{s.nombre}</title>
              {isActive && (
                <circle cx={s.x} cy={s.y} r="7" fill="none" stroke="#4ade80" strokeWidth="1.5" />
              )}
              <circle cx={s.x} cy={s.y} r={isActive ? 4 : 3} fill={isActive ? '#22c55e' : '#f87171'} />
            </g>
          );
        })}
      </svg>
      <div className="text-[9px] text-slate-500 leading-tight mt-1">
        Polar projection (down to 80°S). Click a marker to jump to site. High-res relief:
        install with <span className="font-mono">npm run fetch:moon</span>.
      </div>
    </div>
  );
}
