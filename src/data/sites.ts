export interface LunarSite {
  site_id: string;
  nombre: string;
  fuente: string;
  lat_deg: number;
  lon_deg: number; // [0, 360) hacia el Este
  alt_km: number;
  tipo: 'polar' | 'ecuatorial';
  isOfficial: boolean;
  descripcion: string;
}

export const SITES: LunarSite[] = [
  // --- 5 OFFICIAL BENCHMARK CATALOG SITES (Role C) ---
  {
    site_id: 'shackleton_rim',
    nombre: 'Shackleton Rim (Ridge)',
    fuente: 'Mazarico et al. (2011) / LOLA DEM (Role A)',
    lat_deg: -89.684,
    lon_deg: 196.739,
    alt_km: 1.52,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Peak of quasi-eternal light on connecting ridge toward de Gerlache.',
  },
  {
    site_id: 'shackleton_floor',
    nombre: 'Shackleton Floor (Deep PSR)',
    fuente: 'Zuber et al. (2012) / LOLA DEM (Role A)',
    lat_deg: -89.625,
    lon_deg: 118.80,
    alt_km: -2.8688,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Permanently Shadowed Region (PSR) deep on the polar crater floor.',
  },
  {
    site_id: 'malapert_peak',
    nombre: 'Malapert Mountain Peak',
    fuente: 'Sharpe & Schrunk (2003) / NASA ESAS',
    lat_deg: -86.0,
    lon_deg: 0.0,
    alt_km: 4.5,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Prominent peak 5 km above datum with continuous direct line of sight to Earth (DTE).',
  },
  {
    site_id: 'cabeus_rim',
    nombre: 'Cabeus Rim (Peak near Cabeus B)',
    fuente: 'Colaprete et al. (2010) / Artemis III SDT',
    lat_deg: -83.6,
    lon_deg: 291.2,
    alt_km: 2.1,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Artemis III candidate ridge with extreme local topographic sensitivity.',
  },
  {
    site_id: 'apollo_11',
    nombre: 'Tranquility Base (Apollo 11)',
    fuente: 'NASA SP-238 / JPL Horizons',
    lat_deg: 0.67416,
    lon_deg: 23.47315,
    alt_km: 0.0,
    tipo: 'ecuatorial',
    isOfficial: true,
    descripcion: 'Equatorial baseline calibration site in Mare Tranquillitatis.',
  },

  // --- ADDITIONAL SITES IN PUBLIC/DATA/ ---
  {
    site_id: 'de_gerlache_rim',
    nombre: 'de Gerlache Crater Rim',
    fuente: 'Cris (Role A) / Fabrizio (Role B)',
    lat_deg: -88.665,
    lon_deg: 291.623,
    alt_km: 1.814,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Elevated rim near southern polar massif (additional exploratory site).',
  },
  {
    site_id: 'faustini',
    nombre: 'Faustini Crater',
    fuente: 'Fabrizio (Role B)',
    lat_deg: -87.3,
    lon_deg: 77.0,
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Additional polar candidate site provided by Role B.',
  },
  {
    site_id: 'haworth',
    nombre: 'Haworth Crater',
    fuente: 'Fabrizio (Role B)',
    lat_deg: -87.1,
    lon_deg: 355.0, // normalized from -5.0°
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Southern rim cold trap candidate site (Role B).',
  },
  {
    site_id: 'nobile',
    nombre: 'Nobile Plateau (VIPER)',
    fuente: 'Fabrizio (Role B)',
    lat_deg: -85.2,
    lon_deg: 53.5,
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Landing region selected for NASA VIPER lunar rover mission.',
  },
  {
    site_id: 'im1',
    nombre: 'IM-1 Landing Site (Odysseus / Malapert A)',
    fuente: 'Fabrizio (Role B)',
    lat_deg: -80.13,
    lon_deg: 1.44,
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Commercial CLPS lunar landing site by Intuitive Machines.',
  },
];
