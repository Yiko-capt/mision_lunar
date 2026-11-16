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
    title: 'Shackleton Crater Rim',
    facts: [
      {
        text: 'Shackleton is a bowl-shaped impact crater, 21 km wide and ~4 km deep, located at the lunar South Pole.',
        ...SVS_SHACKLETON,
      },
      {
        text: 'Certain high points along its rim receive near-continuous solar illumination, making them prime candidates for solar power arrays.',
        ...SVS_SHACKLETON,
      },
    ],
  },
  shackleton_floor: {
    title: 'Shackleton Crater Floor',
    facts: [
      {
        text: 'The interior floor of Shackleton lies in perpetual darkness. Its cryogenic environment could preserve volatile water ice that would sublimate in sunlight.',
        ...SVS_SHACKLETON,
      },
      {
        text: 'The LOLA laser altimeter measured higher reflectance on the floor compared to surrounding craters, consistent with surface ice frost or grain scattering.',
        source: 'Zuber et al. (2012), Nature 486, 378-381; MIT News',
        url: 'https://news.mit.edu/2012/shackletons-crater-0620',
      },
    ],
  },
  cabeus_rim: {
    title: 'Cabeus Crater Rim',
    facts: [
      {
        text: 'On October 9, 2009, the NASA LCROSS impactor struck a permanently shadowed region of Cabeus crater, detecting 5.6 ± 2.9% water vapor by mass in the ejecta plume.',
        source: 'Colaprete et al. (2010), Science 330, 463-468',
        url: 'https://doi.org/10.1126/science.1186986',
      },
      {
        text: '"Peak near Cabeus B" is one of the candidate landing regions identified for the Artemis III crewed mission.',
        ...ARTEMIS_2024,
      },
    ],
  },
  malapert_peak: {
    title: 'Malapert Mountain Massif',
    facts: [
      {
        text: '"Malapert Massif" is one of the candidate landing regions identified for the Artemis III crewed mission.',
        ...ARTEMIS_2024,
      },
    ],
  },
  haworth: {
    title: 'Haworth Crater',
    facts: [
      {
        text: '"Haworth" is one of the candidate landing regions identified for the Artemis III crewed mission.',
        ...ARTEMIS_2024,
      },
    ],
  },
  nobile: {
    title: 'Nobile Region',
    facts: [
      {
        text: '"Nobile Rim 1" and "Nobile Rim 2" on the rim of Nobile crater are candidate regions for Artemis III.',
        ...ARTEMIS_2024,
      },
      {
        text: 'NASA VIPER lunar rover was planned to explore volatile distribution near the western rim of Nobile crater.',
        source: 'The Planetary Society, "VIPER, NASA’s Moon resource mapper"',
        url: 'https://www.planetary.org/space-missions/viper',
      },
    ],
  },
  de_gerlache_rim: {
    title: 'de Gerlache Crater Rim',
    facts: [
      {
        text: '"de Gerlache Rim 2" is one of the candidate landing regions for the Artemis III mission.',
        ...ARTEMIS_2024,
      },
    ],
  },
  im1: {
    title: 'IM-1 Landing Site (Odysseus)',
    facts: [
      {
        text: 'The Intuitive Machines Odysseus lander touched down near Malapert A crater on February 22, 2024, under NASA CLPS initiative.',
        source: 'Eos (AGU), "Commercial lander touches down on Moon" (Feb 22, 2024)',
        url: 'https://eos.org/articles/commercial-lander-touches-down-on-moon',
      },
    ],
  },
  apollo_11: {
    title: 'Tranquility Base (Apollo 11)',
    facts: [
      {
        text: 'The Apollo 11 Lunar Module Eagle touched down here on July 20, 1969 at 20:17:40 UTC in Mare Tranquillitatis.',
        source: 'Apollo 11 Mission Report (NASA SP-238)',
      },
    ],
  },
};
