/**
 * Textura de la Luna para el globo 3D.
 *
 * Los archivos viven en src/assets/moon/ y Vite los empaqueta con hash, así que la ruta
 * nunca puede dar 404 en producción (no dependen de /public ni de la raíz del dominio).
 *
 * Prioridad:
 *   1. lroc_color_2k.jpg  (NASA SVS CGI Moon Kit; se descarga con `npm run fetch:moon`)
 *   2. albedo.jpg         (mosaico global 1024x512 incluido en el repositorio)
 * Relieve (opcional):
 *   ldem_3_8bit.jpg       (mapa de alturas LOLA del mismo kit). Si no está, se usa un relieve
 *                         suave derivado del propio albedo.
 * Ver src/assets/moon/README.md para origen y licencia de cada archivo.
 */
const files = import.meta.glob('../assets/moon/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const find = (name: string): string | null =>
  Object.entries(files).find(([path]) => path.endsWith(`/${name}`))?.[1] ?? null;

export const MOON_ALBEDO_URL: string = find('lroc_color_2k.jpg') ?? find('albedo.jpg') ?? '';
export const MOON_BUMP_URL: string | null = find('ldem_3_8bit.jpg');

/**
 * Orientación. Los mapas equirectangulares de la Luna (LROC/SVS y el incluido) están centrados
 * en la longitud 0° (centro de la cara visible), con el norte arriba.
 * La escena coloca la longitud 0° en el eje +Z y la esfera de three.js pone el centro de la
 * imagen (u = 0.5) en +X, así que hay que desplazar la textura un cuarto de vuelta:
 *     u_textura = u_esfera + 0.25
 * Con esto los marcadores de los sitios caen sobre el relieve que les corresponde,
 * la cara visible mira hacia la Tierra y el polo sur queda abajo.
 * Si usas un mapa que empieza en 0° (rango 0..360° E), cambia este valor a -0.25.
 */
export const MOON_TEXTURE_U_OFFSET = 0.25;

/** Intensidad del relieve: mapa de alturas real vs. relieve aproximado derivado del albedo. */
export const MOON_BUMP_SCALE_LDEM = 2.0;
export const MOON_BUMP_SCALE_ALBEDO = 0.6;

/**
 * Factor de color aplicado sobre el mapa. La luz solar de la escena es intensa.
 * Si un mapa claro se quema con ella, este factor lo atenúa sin tocar la iluminación.
 */
export const MOON_ALBEDO_TINT: string = '#ffffff';
