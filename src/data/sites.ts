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
  // --- 5 SITIOS OFICIALES DEL CATÁLOGO DE BENCHMARK (Ale - Rol C) ---
  {
    site_id: 'shackleton_rim',
    nombre: 'Borde Shackleton (Cresta)',
    fuente: 'Mazarico et al. (2011) / DEM LOLA (Rol A)',
    lat_deg: -89.684,
    lon_deg: 196.739,
    alt_km: 1.52,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Pico de luz casi eterna en la cresta de conexión con de Gerlache.',
  },
  {
    site_id: 'shackleton_floor',
    nombre: 'Interior Shackleton (Fondo PSR)',
    fuente: 'Zuber et al. (2012) / DEM LOLA (Rol A)',
    lat_deg: -89.625,
    lon_deg: 118.80,
    alt_km: -2.8688,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Región en Sombra Permanente (PSR) en el fondo del cráter polar.',
  },
  {
    site_id: 'malapert_peak',
    nombre: 'Cima del Macizo Malapert',
    fuente: 'Sharpe & Schrunk (2003) / NASA ESAS',
    lat_deg: -86.0,
    lon_deg: 0.0,
    alt_km: 4.5,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Cima elevada a 5 km sobre datum con línea de visión continua a la Tierra (DTE).',
  },
  {
    site_id: 'cabeus_rim',
    nombre: 'Borde de Cabeus (Peak near Cabeus B)',
    fuente: 'Colaprete et al. (2010) / Artemis III SDT',
    lat_deg: -83.6,
    lon_deg: 291.2,
    alt_km: 2.1,
    tipo: 'polar',
    isOfficial: true,
    descripcion: 'Cresta candidata Artemis III con extrema sensibilidad topográfica.',
  },
  {
    site_id: 'apollo_11',
    nombre: 'Base Tranquilidad (Apolo 11)',
    fuente: 'NASA SP-238 / JPL Horizons',
    lat_deg: 0.67416,
    lon_deg: 23.47315,
    alt_km: 0.0,
    tipo: 'ecuatorial',
    isOfficial: true,
    descripcion: 'Sitio de referencia ecuatorial en Mare Tranquillitatis para calibración.',
  },

  // --- SITIOS ADICIONALES PRESENTES EN PUBLIC/DATA/ (No oficiales) ---
  {
    site_id: 'de_gerlache_rim',
    nombre: 'Borde del Cráter de Gerlache',
    fuente: 'Cris (Rol A) / Fabrizio (Rol B)',
    lat_deg: -88.665,
    lon_deg: 291.623,
    alt_km: 1.814,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Borde elevado cerca del macizo polar austral (sitio exploratorio adicional).',
  },
  {
    site_id: 'faustini',
    nombre: 'Cráter Faustini',
    fuente: 'Fabrizio (Rol B)',
    lat_deg: -87.3,
    lon_deg: 77.0,
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Sitio polar adicional entregado por Rol B.',
  },
  {
    site_id: 'haworth',
    nombre: 'Cráter Haworth',
    fuente: 'Fabrizio (Rol B)',
    lat_deg: -87.1,
    lon_deg: 355.0, // normalizado de -5.0°
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Sitio con trampa fría en borde sur (Rol B).',
  },
  {
    site_id: 'nobile',
    nombre: 'Meseta Nobile (VIPER)',
    fuente: 'Fabrizio (Rol B)',
    lat_deg: -85.2,
    lon_deg: 53.5,
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Zona de alunizaje seleccionada para la misión de rover VIPER.',
  },
  {
    site_id: 'im1',
    nombre: 'Sitio IM-1 (Odysseus / Malapert A)',
    fuente: 'Fabrizio (Rol B)',
    lat_deg: -80.13,
    lon_deg: 1.44,
    alt_km: 0.0,
    tipo: 'polar',
    isOfficial: false,
    descripcion: 'Sitio de alunizaje comercial CLPS de Intuitive Machines.',
  },
];
