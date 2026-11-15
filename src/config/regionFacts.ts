/**
 * Fichas educativas por sitio (modo Estudiante).
 *
 * REGLA: cada dato lleva su fuente. Si no hay un dato verificado para un sitio,
 * no se escribe nada (la interfaz muestra "sin ficha verificada").
 * No añadir frases sin una fuente que se pueda abrir y comprobar.
 */
export interface RegionFact {
  text: string;
  source: string;
  url?: string;
}

export interface RegionCard {
  title: string;
  facts: RegionFact[];
}

const ARTEMIS_2024 = {
  source: 'NASA, "NASA Provides Update on Artemis III Moon Landing Regions" (28 oct. 2024)',
  url: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
};

const SVS_SHACKLETON = {
  source: 'NASA Scientific Visualization Studio, "Visualizing Shackleton Crater" (2012)',
  url: 'https://svs.gsfc.nasa.gov/4716/',
};

export const REGION_FACTS: Record<string, RegionCard> = {
  shackleton_rim: {
    title: 'Borde del cráter Shackleton',
    facts: [
      {
        text: 'Shackleton es un cráter con forma de cuenco, de 21 km de ancho y unos 4 km de profundidad, en el polo sur de la Luna.',
        ...SVS_SHACKLETON,
      },
      {
        text: 'Algunos puntos de su borde reciben luz del Sol de forma persistente, por lo que se consideran buenos lugares para paneles solares.',
        ...SVS_SHACKLETON,
      },
    ],
  },
  shackleton_floor: {
    title: 'Fondo del cráter Shackleton',
    facts: [
      {
        text: 'El fondo de Shackleton está en sombra perpetua. Su interior frío podría conservar hielo de agua y otros compuestos que se evaporarían al Sol.',
        ...SVS_SHACKLETON,
      },
      {
        text: 'El altímetro láser LOLA midió que el fondo refleja más luz que el de cráteres vecinos. Eso es compatible con algo de hielo en la capa más superficial, pero también puede tener otras causas.',
        source: 'Zuber et al. (2012), Nature 486, 378-381; nota de prensa del MIT',
        url: 'https://news.mit.edu/2012/shackletons-crater-0620',
      },
    ],
  },
  cabeus_rim: {
    title: 'Borde de Cabeus',
    facts: [
      {
        text: 'El 9 de octubre de 2009 la misión LCROSS hizo chocar una etapa de cohete contra una zona en sombra del cráter Cabeus. En el material expulsado se estimó 5.6 ± 2.9 % de agua en masa.',
        source: 'Colaprete et al. (2010), Science 330, 463-468',
        url: 'https://doi.org/10.1126/science.1186986',
      },
      {
        text: '"Peak near Cabeus B" es una de las nueve regiones candidatas para el alunizaje de Artemis III.',
        ...ARTEMIS_2024,
      },
    ],
  },
  malapert_peak: {
    title: 'Macizo Malapert',
    facts: [
      {
        text: '"Malapert Massif" es una de las nueve regiones candidatas para el alunizaje de Artemis III.',
        ...ARTEMIS_2024,
      },
    ],
  },
  haworth: {
    title: 'Cráter Haworth',
    facts: [
      {
        text: '"Haworth" es una de las nueve regiones candidatas para el alunizaje de Artemis III.',
        ...ARTEMIS_2024,
      },
    ],
  },
  nobile: {
    title: 'Región de Nobile',
    facts: [
      {
        text: '"Nobile Rim 1" y "Nobile Rim 2", en el borde del cráter Nobile, son dos de las nueve regiones candidatas de Artemis III.',
        ...ARTEMIS_2024,
      },
      {
        text: 'El rover VIPER de la NASA, diseñado para buscar hielo de agua, se planificó para aterrizar cerca del borde occidental del cráter Nobile.',
        source: 'The Planetary Society, "VIPER, NASA’s Moon resource mapper"',
        url: 'https://www.planetary.org/space-missions/viper',
      },
    ],
  },
  de_gerlache_rim: {
    title: 'Borde del cráter de Gerlache',
    facts: [
      {
        text: '"de Gerlache Rim 2" es una de las nueve regiones candidatas para el alunizaje de Artemis III.',
        ...ARTEMIS_2024,
      },
    ],
  },
  im1: {
    title: 'Sitio de IM-1 (Odysseus)',
    facts: [
      {
        text: 'El módulo Odysseus de Intuitive Machines (misión IM-1) se posó cerca del cráter Malapert A el 22 de febrero de 2024, dentro del programa CLPS de la NASA.',
        source: 'Eos (AGU), "Commercial lander touches down on Moon" (22 feb. 2024)',
        url: 'https://eos.org/articles/commercial-lander-touches-down-on-moon',
      },
    ],
  },
  apollo_11: {
    title: 'Base Tranquilidad (Apolo 11)',
    facts: [
      {
        text: 'Aquí se posó el módulo lunar del Apolo 11 el 20 de julio de 1969 a las 20:17:40 UTC, en el Mar de la Tranquilidad.',
        source: 'Apollo 11 Mission Report (NASA SP-238)',
      },
    ],
  },
  // faustini: sin dato verificado todavía -> no se muestra ficha.
};
