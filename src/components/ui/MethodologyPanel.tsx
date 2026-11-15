import { useMission } from '../../store/useMission';

/** "Metodología y fuentes": qué se calcula, con qué datos y qué limitaciones tiene. */
export default function MethodologyPanel() {
  const isPro = useMission((s) => s.viewMode) === 'professional';
  const H = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider pt-1">{children}</h3>
  );
  return (
    <div className="space-y-2.5 text-[12.5px] leading-relaxed text-slate-200" data-testid="methodology">
      <H>Qué muestra KillaLand</H>
      <p>
        Para cada sitio y fecha, dónde están el Sol y la Tierra en el cielo y si las montañas de alrededor los tapan.
        Con eso se estima cuánto tiempo hay luz para los paneles y cuánto tiempo se puede hablar directamente con la Tierra.
      </p>

      <H>Datos</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <b>Posición del Sol y la Tierra:</b> NASA JPL Horizons (observador sobre la superficie lunar, sin refracción),
          una muestra por hora del 14 nov. al 14 dic. de 2026. Para Apolo 11 hay además dos muestras del 20 jul. 1969.
        </li>
        <li>
          <b>Horizonte del terreno:</b> trazado sobre el modelo de elevación LOLA de 80 m/píxel del polo sur
          (LDEM_80S_80MPP_ADJ, NASA PGDA; Barker et al. 2023, PSJ 4, 183), a 2 m de altura y hasta 100 km de distancia.
          Existe para seis sitios: borde y fondo de Shackleton, Malapert, Cabeus, de Gerlache y Apolo 11 (fuera del modelo: esfera lisa).
        </li>
        <li>
          <b>Textura del globo:</b> mosaico global equirectangular de la Luna (ver archivo <code>src/assets/moon/README.md</code> para origen y licencia).
        </li>
      </ul>

      <H>Cómo se decide si algo se ve</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>El Sol cuenta según la fracción de su disco que asoma sobre el horizonte (radio angular 0.267°).</li>
        <li>La Tierra cuenta como visible cuando su centro está por encima del horizonte.</li>
        {isPro && (
          <li>
            Potencia: P = f · 1361 W/m² · 0.28 · sen(elevación solar), para un panel horizontal de 1 m².
            La η instantánea es 0.28 · sen(elevación) cuando el Sol es visible.
          </li>
        )}
      </ul>

      <H>Limitaciones que debes conocer</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Solo hay 30 días de efemérides. Los porcentajes describen ese mes, no un año: no sirven para afirmar "luz casi eterna".</li>
        <li>
          Faustini, Haworth, Nobile e IM-1 no tienen perfil de terreno: se calculan con horizonte esférico liso y sus cifras son orientativas.
        </li>
        <li>
          La vista "Polo Sur (Parche)", el conteo de celdas aptas y la inclinación del suelo usan un <b>terreno de demostración
          generado por computadora</b> y un modelo solar simplificado. No son un mapa real ni salen del DEM LOLA.
        </li>
        <li>
          Las coordenadas del catálogo de sitios y las del punto donde se trazaron horizonte y efemérides difieren ligeramente
          en algunos casos{isPro ? ' (se muestran ambas en "Métricas del sitio")' : ''}.
        </li>
        <li>"Señal directa con la Tierra" significa solo que la Tierra se ve; no modela antenas ni estaciones en tierra.</li>
        <li>Fuera del periodo con datos se usa un modelo aproximado, siempre marcado con ⚠️.</li>
      </ul>

      {isPro && (
        <>
          <H>Validación</H>
          <p>
            Las efemérides de <code>public/data</code> se compararon con un motor independiente (astropy + rotación lunar
            IAU/WGCCRE 2009) en muestras diarias: diferencias máximas de 0.016° en azimut y 0.004° en elevación.
            El panel "Benchmark físico" audita cinco casos; los que piden un criterio anual se marcan "NO COMPARABLE"
            mientras solo haya 30 días de datos.
          </p>
        </>
      )}
    </div>
  );
}
