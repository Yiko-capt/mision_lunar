import type { SiteDataSet } from '../../lib/io/schemas';
import type { ComputedTrajectory } from '../../lib/physics';
import { useMission } from '../../store/useMission';

interface MetricCardsProps {
  siteData: SiteDataSet | null;
  trajectory: ComputedTrajectory | null;
}

export default function MetricCards({ siteData, trajectory }: MetricCardsProps) {
  const uiMode = useMission((s) => s.uiMode);
  const simDay = useMission((s) => s.simDay);
  const durationDays = useMission((s) => s.durationDays);

  const pts = trajectory?.points || [];
  const N = pts.length;
  const progressFrac = Math.max(0, Math.min(1, simDay / Math.max(1, durationDays)));
  const curIdx = N > 0 ? Math.min(N - 1, Math.floor(progressFrac * N)) : null;
  const curPt = curIdx !== null ? pts[curIdx] : null;

  const summary = trajectory?.summary;
  const metrics = siteData?.metricas;

  // Determinar banderas de estado
  const isSynthetic = siteData?.horizonte?.sintetico || siteData?.efemerides?.sintetico || siteData?.metricas?.sintetico;
  const isFallback = siteData?.estadoDatos === 'sin_datos';

  if (isFallback) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 font-mono text-sm">
        <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
          <span>⚠️ ESTADO: SIN DATOS DISPONIBLES</span>
        </div>
        <p className="text-slate-400 text-xs mb-3">
          Este sitio no cuenta aún con perfiles de efemérides ni métricas precalculadas por los roles A, B o D.
        </p>
        <span className="inline-block bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700">
          Operando en modo de inspección topográfica preliminar
        </span>
      </div>
    );
  }

  // Valores a mostrar (priorizando los calculados dinámicamente con horizonte de LOLA)
  const sunHours = summary?.sun_hours ?? metrics?.resumen.horas_luz_total ?? 0;
  const sunPct = summary?.sun_pct ?? metrics?.resumen.iluminacion_solar_pct ?? 0;
  const sunMaxEl = summary?.sun_max_el ?? metrics?.resumen.elevacion_solar_max_deg ?? 0;
  const earthNominalPct = summary?.earth_pct_nominal ?? metrics?.resumen.visibilidad_tierra_nominal_pct ?? 0;
  const earthMargenPct = summary?.earth_pct_margen ?? metrics?.resumen.visibilidad_tierra_margen_pct ?? 0;
  const totalEnergy = summary?.total_energy_wh_m2 ?? metrics?.resumen.energia_especifica_wh_m2 ?? 0;
  const maxPower = summary?.max_power_w ?? metrics?.resumen.potencia_pico_w ?? 0;

  return (
    <div className="space-y-3">
      {/* Badges de origen de datos */}
      <div className="flex flex-wrap items-center gap-2">
        {isSynthetic && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
            MODELO APROXIMADO / DATOS SINTÉTICOS
          </span>
        )}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Fuente H: {siteData?.horizonte?.fuenteFormato || 'LOLA DEM'}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Efemérides: {siteData?.efemerides?.fuenteFormato || 'Horizons'}
        </span>
      </div>

      {/* Alertas críticas en tiempo real */}
      {curPt && (
        <div className="space-y-1.5">
          {curPt.sun_visible && curPt.hours_to_sun_sunset != null && curPt.hours_to_sun_sunset <= 24 && (
            <div className="p-2.5 rounded bg-amber-950/70 border border-amber-700/80 text-amber-200 text-xs flex items-center justify-between">
              <span>⚠️ <b>ALERTA TÉRMICA Y POTENCIA:</b> El Sol se oculta tras el horizonte en <b>{curPt.hours_to_sun_sunset.toFixed(1)} h</b></span>
            </div>
          )}
          {curPt.earth_nominal && curPt.hours_to_earth_loss != null && curPt.hours_to_earth_loss <= 24 && (
            <div className="p-2.5 rounded bg-rose-950/70 border border-rose-700/80 text-rose-200 text-xs flex items-center justify-between">
              <span>📡 <b>ALERTA DE TELEMETRÍA:</b> La Tierra se oculta bajo el horizonte en <b>{curPt.hours_to_earth_loss.toFixed(1)} h</b></span>
            </div>
          )}
        </div>
      )}

      {/* Tarjetas según el modo de audiencia */}
      {uiMode === 'public' ? (
        /* VISTA PÚBLICA (Lenguaje directo, accesible, divulgativo) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {/* Tarjeta de Iluminación y Energía */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>☀️ Luz Solar y Energía</span>
              <span className="text-xs font-mono font-normal text-slate-400">{sunPct.toFixed(0)} % de luz</span>
            </h3>
            <div className="text-xl font-bold text-slate-100">
              {sunHours.toFixed(0)} horas de luz
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El Sol alcanza una elevación máxima de <b>{sunMaxEl.toFixed(1)}°</b> sobre el terreno.
              Genera hasta <b>{maxPower.toFixed(0)} W</b> de potencia con un panel solar de 1 m².
            </p>
          </div>

          {/* Tarjeta de Comunicación Directa con la Tierra */}
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
              <span>📡 Enlace con la Tierra (DTE)</span>
              <span className="text-xs font-mono font-normal text-slate-400">{earthNominalPct.toFixed(0)} % visible</span>
            </h3>
            <div className="text-xl font-bold text-slate-100">
              {earthNominalPct >= 95 ? 'Línea de visión continua' : `${earthNominalPct.toFixed(0)} % de visibilidad`}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              La Tierra se mantiene a la vista durante la mayor parte de la misión, permitiendo comunicaciones directas de alta velocidad con las estaciones de la Red de Espacio Profundo.
            </p>
          </div>
        </div>
      ) : (
        /* VISTA TÉCNICA (Nombres de clave JSON, unidades ISO, exactitud) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {/* Parámetros de Radiación Solar */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="text-amber-400 font-bold border-b border-slate-800 pb-1">
              SUBSISTEMA EPS (ENERGÍA)
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">iluminacion_solar_pct:</span>
              <span className="font-bold">{sunPct.toFixed(2)} %</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">horas_luz_total:</span>
              <span>{sunHours.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">elevacion_solar_max_deg:</span>
              <span>{sunMaxEl > 0 ? `+${sunMaxEl.toFixed(2)}` : sunMaxEl.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">potencia_pico_w:</span>
              <span>{maxPower.toFixed(1)} W</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">energia_especifica_wh_m2:</span>
              <span>{totalEnergy.toFixed(1)} Wh/m²</span>
            </div>
          </div>

          {/* Parámetros de Enlace de Comunicaciones */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="text-blue-400 font-bold border-b border-slate-800 pb-1">
              SUBSISTEMA TT&C / DTE
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">visibilidad_tierra_nominal_pct:</span>
              <span className="font-bold">{earthNominalPct.toFixed(2)} %</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">visibilidad_tierra_margen_pct:</span>
              <span>{earthMargenPct.toFixed(2)} %</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">radio_angular_tierra_deg:</span>
              <span>0.950°</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">refraccion_aplicada:</span>
              <span className="text-emerald-400">false (airless)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
