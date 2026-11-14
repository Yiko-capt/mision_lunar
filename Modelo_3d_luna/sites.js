// ============================================================================
// sites.js — Sitios de aterrizaje candidatos (cualquiera puede añadir)
// Coordenadas selenográficas en grados: lat (-S/+N), lon (+E).
// Para añadir un sitio: agregar un objeto nuevo con el mismo formato.
// ============================================================================

export const SITES = [
  { id: 'shackleton', name: 'Cráter Shackleton',         lat: -89.90, lon:   0.0,
    note: 'Candidato Artemis III. Borde con zonas iluminadas >80% del año.' },
  { id: 'degerlache', name: 'Cráter de Gerlache',        lat: -88.50, lon: -87.1,
    note: 'Interior con PSR (regiones permanentemente en sombra) y hielo.' },
  { id: 'faustini',   name: 'Cráter Faustini',           lat: -87.30, lon:  77.0,
    note: 'Volátiles. Target de misiones CLPS.' },
  { id: 'haworth',    name: 'Cráter Haworth',            lat: -87.10, lon:  -5.0,
    note: 'Gran PSR. Candidato para prospección de hielo.' },
  { id: 'nobile',     name: 'Cráter Nobile',             lat: -85.20, lon:  53.5,
    note: 'Región VIPER / Astrobotic Griffin.' },
  { id: 'malapert',   name: 'Malapert Massif',           lat: -85.90, lon:   0.0,
    note: 'Vista casi continua a la Tierra — ideal para comms DTE.' },
  { id: 'cabeus',     name: 'Cráter Cabeus',             lat: -85.30, lon: -42.1,
    note: 'Impacto LCROSS (2009) confirmó presencia de H₂O.' },
  { id: 'im1',        name: 'IM-1 Odysseus (histórico)', lat: -80.13, lon:   1.44,
    note: 'Intuitive Machines, aterrizó feb 2024.' },
];
