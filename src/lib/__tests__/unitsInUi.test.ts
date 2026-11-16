import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fmtDeg,
  fmtKm,
  fmtWatts,
  fmtPercent,
  fmtHours,
  fmtUTC,
} from '../format';

/**
 * Regla del proyecto: ninguna cantidad se muestra sin unidad.
 *
 * La prueba recorre los componentes principales y exige que toda línea que
 * formatee un número para mostrarlo (`.toFixed(`) lleve su unidad en la misma
 * línea (°, %, W, km, m, h, UTC, días…), o use un formateador fmt* de lib/format.
 */

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dir, '..', '..');

const FILES: string[] = [
  join(SRC, 'App.tsx'),
  ...readdirSync(join(SRC, 'components', 'ui'))
    .filter((f: string) => f.endsWith('.tsx'))
    .map((f: string) => join(SRC, 'components', 'ui', f)),
];

// Marcas de unidad aceptadas en la misma línea del número
const UNIT =
  /°|%|\bW\b|W\/m²|Wh\/m²|\bkm\b|\bm\b|\bh\b|\bUTC\b|días|\bDía\b|days|\bDay\b|horas|hours|celdas|cells|UA|AU|fmt[A-Z]|toExportedPoint|\bLat\b|\bLon\b/;

// Líneas que no son cantidades para el usuario: claves, ids, nombres de archivo, estilos,
// coordenadas de dibujo SVG (paths) y auxiliares cuyos usos añaden la unidad.
const EXEMPT =
  /key=|stamp|toISOString|slice\(|padStart|JSON|console|className|data-|href|src=|viewBox|aria-|strokeW|fontSize|opacity|scale|position|args=|UTC|_deg|_pct|_km|_w_|zIndex|Path|pts\.push|const signed/;

describe('unidades en la interfaz', () => {
  it('toda cifra visible lleva su unidad en la misma línea', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line: string, i: number) => {
        if (!line.includes('.toFixed(')) return;
        if (EXEMPT.test(line)) return;
        if (UNIT.test(line)) return;
        offenders.push(`${file.split('/src/')[1]}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders, `Cifras sin unidad:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('formateadores', () => {
  it('añaden la unidad correcta', () => {
    expect(fmtDeg(27.43)).toBe('27.4°');
    expect(fmtKm(1.523)).toBe('1.52 km');
    expect(fmtWatts(10.63)).toBe('10.6 W');
    expect(fmtPercent(43.08)).toBe('43.1%');
    expect(fmtHours(378)).toBe('378.0 h');
    expect(fmtUTC(new Date(Date.UTC(2026, 10, 22, 0, 0)))).toBe('2026-11-22 00:00 UTC');
  });
  it('no muestran NaN: devuelven raya', () => {
    expect(fmtDeg(Number.NaN)).toBe('—°');
  });
});
