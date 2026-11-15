/**
 * Inventario de los archivos que existen en public/data/<site_id>/.
 * El cargador solo pide lo que aparece aquí, así no se generan errores 404
 * por archivos que el equipo todavía no ha entregado.
 * Al añadir un archivo nuevo a public/data, actualiza esta tabla.
 */
export interface SiteDataFiles {
  horizonte: boolean;
  efemerides: boolean;
  metricas: boolean;
  /** Efemérides puntuales de una época histórica (p. ej. alunizaje de 1969). */
  efemeridesLanding?: boolean;
}

export const DATA_MANIFEST: Record<string, SiteDataFiles> = {
  shackleton_rim: { horizonte: true, efemerides: true, metricas: true },
  shackleton_floor: { horizonte: true, efemerides: true, metricas: true },
  malapert_peak: { horizonte: true, efemerides: true, metricas: true },
  cabeus_rim: { horizonte: true, efemerides: true, metricas: true },
  apollo_11: { horizonte: true, efemerides: true, metricas: true, efemeridesLanding: true },
  de_gerlache_rim: { horizonte: true, efemerides: true, metricas: true },
  faustini: { horizonte: false, efemerides: true, metricas: true },
  haworth: { horizonte: false, efemerides: true, metricas: true },
  nobile: { horizonte: false, efemerides: true, metricas: true },
  im1: { horizonte: false, efemerides: true, metricas: true },
};

/** URL relativa a la base del despliegue (funciona en raíz y en subcarpetas). */
export function dataUrl(siteId: string, file: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : base + '/'}data/${siteId}/${file}`;
}
