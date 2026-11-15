import type { ViewMode } from '../store/useMission';

/**
 * Glosario de la interfaz: cada concepto tiene su etiqueta técnica (modo Profesional),
 * su etiqueta en lenguaje sencillo (modo Estudiante) y una explicación de 1 o 2 frases
 * que se muestra en el ícono (?).
 */
export interface GlossaryEntry {
  pro: string;
  student: string;
  help: string;
}

export const GLOSSARY = {
  dte: {
    pro: 'Enlace DTE',
    student: 'Señal directa con la Tierra',
    help: 'Hay señal directa cuando la Tierra se ve sobre el horizonte del sitio: la antena puede apuntarle sin satélites intermedios.',
  },
  dteVisibility: {
    pro: 'Visibilidad DTE',
    student: '¿Se ve la Tierra?',
    help: 'Indica si en este momento la Tierra está por encima de las montañas que rodean el sitio.',
  },
  slope: {
    pro: 'Pendiente DEM',
    student: 'Inclinación del suelo',
    help: 'Cuántos grados está inclinado el terreno. Un suelo muy inclinado puede volcar la nave al posarse.',
  },
  maxSlope: {
    pro: 'Pendiente máxima',
    student: 'Inclinación máxima permitida',
    help: 'El límite de inclinación que aceptamos para aterrizar. Por encima de este valor el terreno se marca como peligroso.',
  },
  minLight: {
    pro: 'Luz solar mínima',
    student: 'Cuánta luz necesitamos',
    help: 'Porcentaje mínimo del tiempo de misión en que debe haber Sol para cargar las baterías.',
  },
  requireEarth: {
    pro: 'Exigir línea de visión con la Tierra',
    student: 'Necesitamos ver la Tierra',
    help: 'Si se activa, solo sirven los lugares desde donde la Tierra se ve sobre el horizonte.',
  },
  sunElevation: {
    pro: 'Elevación Sol',
    student: 'Altura del Sol en el cielo',
    help: 'Ángulo del Sol sobre el horizonte. En el polo sur lunar el Sol siempre está muy bajo, casi rozando las montañas.',
  },
  sunAzimuth: {
    pro: 'Azimut Sol',
    student: 'Dirección del Sol',
    help: 'Hacia dónde hay que mirar para ver el Sol: 0° es el norte, 90° el este, 180° el sur y 270° el oeste.',
  },
  earthElevation: {
    pro: 'Elevación Tierra',
    student: 'Altura de la Tierra en el cielo',
    help: 'Ángulo de la Tierra sobre el horizonte. Desde la Luna la Tierra casi no se mueve en el cielo: solo se balancea un poco.',
  },
  earthAzimuth: {
    pro: 'Azimut Tierra',
    student: 'Dirección de la Tierra',
    help: 'Hacia dónde hay que mirar para ver la Tierra: 0° es el norte, 90° el este, 180° el sur y 270° el oeste.',
  },
  solarEfficiency: {
    pro: 'η solar instantánea',
    student: 'Aprovechamiento de la luz',
    help: 'Qué parte de la luz del Sol se convierte en electricidad en este momento. Baja cuando el Sol está muy cerca del horizonte.',
  },
  power: {
    pro: 'Potencia (W, panel 1 m²)',
    student: 'Electricidad generada',
    help: 'Vatios que produce un panel horizontal de un metro cuadrado con la luz que llega ahora.',
  },
  altitude: {
    pro: 'Altitud (DEM)',
    student: 'Altura del terreno',
    help: 'Altura del sitio respecto al radio medio de la Luna (1737.4 km). Los valores negativos son hondonadas.',
  },
  latitude: {
    pro: 'Latitud',
    student: 'Latitud',
    help: 'Qué tan al norte o al sur está el punto. −90° es exactamente el polo sur de la Luna.',
  },
  longitude: {
    pro: 'Longitud',
    student: 'Longitud',
    help: 'Posición este-oeste. 0° es el centro de la cara que vemos desde la Tierra.',
  },
  horizon: {
    pro: 'Horizonte local',
    student: 'Montañas alrededor',
    help: 'La silueta del terreno que rodea el sitio. Si el Sol o la Tierra quedan detrás de ella, no se ven.',
  },
  lunarPhase: {
    pro: 'Fase lunar',
    student: 'Fase de la Luna',
    help: 'Cómo se ve la Luna desde la Tierra en esta fecha (nueva, creciente, llena o menguante).',
  },
  aptCells: {
    pro: 'Celdas aptas',
    student: 'Lugares aptos',
    help: 'Cuántos cuadros del mapa de demostración cumplen todos los requisitos. El mapa es un terreno de ejemplo, no un mapa real.',
  },
  missionStart: {
    pro: 'Inicio de misión',
    student: 'Día en que aterrizamos',
    help: 'Fecha (hora universal, UTC) en la que empieza la misión.',
  },
  duration: {
    pro: 'Duración',
    student: 'Cuántos días nos quedamos',
    help: 'Número de días terrestres que dura la misión en la superficie.',
  },
  sunPct: {
    pro: 'Energía solar útil',
    student: 'Tiempo con Sol',
    help: 'Porcentaje del tiempo con datos en que el Sol asoma sobre el horizonte del sitio.',
  },
  earthPct: {
    pro: 'Enlace directo Tierra (DTE)',
    student: 'Tiempo con la Tierra a la vista',
    help: 'Porcentaje del tiempo con datos en que la Tierra se ve sobre el horizonte del sitio.',
  },
  blackout: {
    pro: 'Apagón solar máximo',
    student: 'Noche más larga',
    help: 'El periodo seguido más largo sin Sol. La nave debe sobrevivirlo solo con baterías.',
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;

export function label(key: GlossaryKey, mode: ViewMode): string {
  return mode === 'student' ? GLOSSARY[key].student : GLOSSARY[key].pro;
}

export function help(key: GlossaryKey): string {
  return GLOSSARY[key].help;
}
