import { useMemo } from 'react';
import { SITES } from '../../data/sites';
import type { SiteDataSet } from '../../lib/io/schemas';
import type { ComputedTrajectory } from '../../lib/physics';
import { useMission } from '../../store/useMission';
import SiteSelector from './SiteSelector';

interface ComparisonPanelProps {
  siteDataA: SiteDataSet | null;
  trajA: ComputedTrajectory | null;
  siteDataB: SiteDataSet | null;
  trajB: ComputedTrajectory | null;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
}

export default function ComparisonPanel({
  siteDataA,
  trajA,
  siteDataB,
  trajB,
  onSelectA,
  onSelectB,
}: ComparisonPanelProps) {
  const activeSiteId = useMission((s) => s.activeSiteId);
  const selectedSiteBId = useMission((s) => s.selectedSiteBId) || 'shackleton_floor';

  const siteA = SITES.find((s) => s.site_id === activeSiteId) || SITES[0];
  const siteB = SITES.find((s) => s.site_id === selectedSiteBId) || SITES[1];

  // Métricas A
  const hasDataA = siteDataA && siteDataA.estadoDatos !== 'sin_datos';
  const sunHoursA = trajA?.summary.sun_hours ?? siteDataA?.metricas?.resumen.horas_luz_total ?? 0;
  const sunPctA = trajA?.summary.sun_pct ?? siteDataA?.metricas?.resumen.iluminacion_solar_pct ?? 0;
  const earthNominalA = trajA?.summary.earth_pct_nominal ?? siteDataA?.metricas?.resumen.visibilidad_tierra_nominal_pct ?? 0;
  const maxPowerA = trajA?.summary.max_power_w ?? siteDataA?.metricas?.resumen.potencia_pico_w ?? 0;

  // Métricas B
  const hasDataB = siteDataB && siteDataB.estadoDatos !== 'sin_datos';
  const sunHoursB = trajB?.summary.sun_hours ?? siteDataB?.metricas?.resumen.horas_luz_total ?? 0;
  const sunPctB = trajB?.summary.sun_pct ?? siteDataB?.metricas?.resumen.iluminacion_solar_pct ?? 0;
  const earthNominalB = trajB?.summary.earth_pct_nominal ?? siteDataB?.metricas?.resumen.visibilidad_tierra_nominal_pct ?? 0;
  const maxPowerB = trajB?.summary.max_power_w ?? siteDataB?.metricas?.resumen.potencia_pico_w ?? 0;

  // Cálculo de distancia selenográfica entre sitio A y B
  const deltaDistanceKm = useMemo(() => {
    const r = 1737.4; // km
    const lat1 = (siteA.lat_deg * Math.PI) / 180;
    const lat2 = (siteB.lat_deg * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((siteB.lon_deg - siteA.lon_deg) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
  }, [siteA, siteB]);

  // Generador de frases de impacto operativo
  const deltaLightHours = Math.abs(sunHoursA - sunHoursB);
  const deltaLightPct = Math.abs(sunPctA - sunPctB);

  const insightPhrase = useMemo(() => {
    if (!hasDataA || !hasDataB) {
      return 'No es posible calcular la sensibilidad diferencial debido a que uno de los sitios carece de efemérides.';
    }
    const distStr = deltaDistanceKm < 1 ? `${(deltaDistanceKm * 1000).toFixed(0)} m` : `${deltaDistanceKm.toFixed(1)} km`;
    if (sunPctA > sunPctB) {
      return `Moverse de ${siteA.nombre} a ${siteB.nombre} (${distStr}) reduce la disponibilidad solar en ${deltaLightHours.toFixed(1)} h (${deltaLightPct.toFixed(1)} %).`;
    } else if (sunPctB > sunPctA) {
      return `Moverse de ${siteA.nombre} a ${siteB.nombre} (${distStr}) incrementa las horas de luz en ${deltaLightHours.toFixed(1)} h (${deltaLightPct.toFixed(1)} %).`;
    }
    return `Ambos sitios presentan una exposición solar similar durante la ventana analizada a lo largo de ${distStr}.`;
  }, [hasDataA, hasDataB, siteA, siteB, deltaDistanceKm, sunPctA, sunPctB, deltaLightHours, deltaLightPct]);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <span>⚖️ Comparador de Sitios A / B</span>
          <span className="text-[10px] text-slate-400 font-normal">Análisis de Sensibilidad Espacial</span>
        </h2>
        <span className="text-xs font-mono text-slate-400">
          Distancia separación: <b className="text-cyan-300">{deltaDistanceKm < 1 ? `${(deltaDistanceKm * 1000).toFixed(0)} m` : `${deltaDistanceKm.toFixed(1)} km`}</b>
        </span>
      </div>

      {/* Frase de impacto de sensibilidad */}
      <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/80 text-cyan-200 text-xs font-medium leading-relaxed">
        💡 <span className="font-semibold">{insightPhrase}</span>
      </div>

      {/* Columnas Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* COLUMNA A */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-cyan-800/60 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-cyan-400 font-mono">SITIO A (ACTIVO)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
              {siteA.site_id}
            </span>
          </div>

          <SiteSelector
            selectedId={siteA.site_id}
            onSelect={onSelectA}
            label="Cambiar Sitio A"
          />

          {!hasDataA ? (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono text-center">
              SIN DATOS
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs text-slate-300">
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Iluminación solar:</span>
                <span className="font-bold text-amber-300">{sunPctA.toFixed(1)} %</span>
              </div>
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Horas de luz total:</span>
                <span>{sunHoursA.toFixed(1)} h</span>
              </div>
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Visibilidad Tierra DTE:</span>
                <span className="text-blue-400 font-bold">{earthNominalA.toFixed(1)} %</span>
              </div>
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Potencia pico (1 m²):</span>
                <span>{maxPowerA.toFixed(0)} W</span>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA B */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-slate-400 font-mono">SITIO B (COMPARATIVO)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {siteB.site_id}
            </span>
          </div>

          <SiteSelector
            selectedId={siteB.site_id}
            onSelect={onSelectB}
            label="Cambiar Sitio B"
          />

          {!hasDataB ? (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono text-center">
              SIN DATOS
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs text-slate-300">
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Iluminación solar:</span>
                <span className="font-bold text-amber-300">{sunPctB.toFixed(1)} %</span>
              </div>
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Horas de luz total:</span>
                <span>{sunHoursB.toFixed(1)} h</span>
              </div>
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Visibilidad Tierra DTE:</span>
                <span className="text-blue-400 font-bold">{earthNominalB.toFixed(1)} %</span>
              </div>
              <div className="flex justify-between p-1 rounded bg-slate-950/60">
                <span className="text-slate-400">Potencia pico (1 m²):</span>
                <span>{maxPowerB.toFixed(0)} W</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
