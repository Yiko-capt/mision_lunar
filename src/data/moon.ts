import { generateTerrain } from '../lib/terrain';
import { computeHorizons } from '../lib/horizon';

// Se calcula una sola vez al cargar la app
export const TERRAIN = generateTerrain(64, 10000, 7);
export const HORIZONS = computeHorizons(TERRAIN, 3000);