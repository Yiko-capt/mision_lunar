// Descarga los mapas del "CGI Moon Kit" de NASA SVS (https://svs.gsfc.nasa.gov/4720)
// a src/assets/moon/. Uso: npm run fetch:moon
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720';
const FILES = ['lroc_color_2k.jpg', 'ldem_3_8bit.jpg'];
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/moon');

await mkdir(outDir, { recursive: true });
for (const name of FILES) {
  const url = `${BASE}/${name}`;
  process.stdout.write(`Descargando ${url} ... `);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`falló (HTTP ${res.status}). Descárgalo a mano desde https://svs.gsfc.nasa.gov/4720`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(outDir, name), buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
}
console.log('Listo. Ejecuta "npm run build" para que la app use estos mapas.');
