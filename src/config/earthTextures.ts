/**
 * Texturas de la Tierra (src/assets/earth). Vite las empaqueta con hash: no dependen de /public.
 *
 *   day.jpg     mosaico equirectangular de día (tipo NASA Blue Marble), 2048×1024
 *   night.jpg   luces nocturnas (luminancia), 2048×1024
 *   water.jpg   máscara de agua (blanco = océano), para el brillo especular
 *   clouds.png  nubes con canal alfa, 1024×512
 *   relief.jpg  relieve en escala de grises, 1024×512
 *
 * Origen y licencia: ver src/assets/earth/README.md.
 * Si falta alguno, CelestialEarth usa la versión procedural de src/lib/textures.ts.
 */
const files = import.meta.glob('../assets/earth/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const find = (name: string): string | null =>
  Object.entries(files).find(([path]) => path.endsWith(`/${name}`))?.[1] ?? null;

export const EARTH_DAY_URL = find('day.jpg');
export const EARTH_NIGHT_URL = find('night.jpg');
export const EARTH_WATER_URL = find('water.jpg');
export const EARTH_CLOUDS_URL = find('clouds.png');
export const EARTH_RELIEF_URL = find('relief.jpg');
