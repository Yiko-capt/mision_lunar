# KillaLand: cambios de interfaz y datos (15 nov. 2026)

El motor 3D no cambió: escena, cámara, controles, iluminación y picking siguen igual.
La única edición dentro de `components/3d` es la carga de la textura en `MoonGlobe.tsx`.

## Cómo probar

```bash
npm ci
npm run test      # 21 pruebas
npm run build
npm run preview
```

## Qué cambió, por archivo

### Modo de Vista (Estudiante / Profesional)
- `src/store/useMission.ts`: estado global `viewMode: 'student' | 'professional'` (por defecto `professional`), `setViewMode`, persistencia en `sessionStorage` con respaldo en memoria si el almacenamiento falla.
- `src/components/ui/ViewModeToggle.tsx` (nuevo): selector de la barra superior.
- `src/App.tsx`: el antiguo `viewMode` local (globo/parche) ahora se llama `sceneView`. El `<Canvas>` solo depende de `sceneView`, así que cambiar de modo no lo recrea. Sitio, fecha y selección viven fuera de los paneles y se conservan.
- `src/components/ui/StudentPanel.tsx` (nuevo): 3 escenarios de un clic y línea de tiempo por días.
- `src/config/studentScenarios.ts` (nuevo): objeto editable con sitio, fecha y filtros de cada escenario.
- `src/config/glossary.ts` (nuevo): etiqueta técnica, etiqueta sencilla y explicación de cada concepto.
- `src/components/ui/InfoTip.tsx` (nuevo): ícono (?) con la explicación.
- `src/components/ui/ObjectivePanel.tsx` (nuevo): tarjeta "OBJETIVO LUNAR" para los dos modos, con "Exportar punto" (JSON y CSV) en Profesional y el indicador de viabilidad y la ficha educativa en Estudiante.
- `src/lib/siteStatus.ts` (nuevo): `derivePointStatus`, única fuente de los números del punto para ambos modos.
- `src/lib/exportPoint.ts` (nuevo): JSON y CSV del punto.
- `src/config/regionFacts.ts` (nuevo): fichas por región; cada frase lleva su fuente. Faustini no tiene ficha porque no hay dato verificado.

### Menú de herramientas y secciones nuevas
- `src/components/ui/ToolsMenu.tsx` (nuevo): un solo menú; cada entrada declara en qué modo aparece. Estudiante no ve Gráfica de elevación, Comparador A/B ni Benchmark.
- `src/components/ui/SkyView.tsx` (nuevo): cielo visto desde el sitio (horizonte, Sol y Tierra, azimut/elevación).
- `src/components/ui/SiteMetricsPanel.tsx` (nuevo): métricas del sitio en la ventana de misión y en todo el periodo con datos.
- `src/components/ui/SitesComparisonTable.tsx` (nuevo): los 10 sitios en la misma ventana.
- `src/components/ui/TimelinePanel.tsx` (nuevo): línea del tiempo Sol/Tierra por hora; clic para saltar.
- `src/components/ui/MethodologyPanel.tsx` (nuevo): metodología, fuentes y limitaciones.
- `src/lib/trajectoryWindow.ts` (nuevo): índice por fecha y resúmenes por ventana.

### Datos
- `public/data/{shackleton_rim,shackleton_floor,malapert_peak,cabeus_rim,de_gerlache_rim}/{efemerides,metricas}.json`: reemplazados por los archivos de `horizons_b/` del propio repositorio. Los anteriores estaban calculados en otras coordenadas (por ejemplo, borde y fondo de Shackleton en −89.9°, 0°), no en el punto donde se trazó el horizonte.
- `public/data/apollo_11/{efemerides,metricas,efemerides_landing}.json`: añadidos desde `horizons_b/`. Su ausencia causaba los dos errores 404.
- `src/lib/io/dataManifest.ts` (nuevo): inventario de archivos por sitio; el cargador solo pide lo que existe. Rutas relativas a `BASE_URL`.
- `src/lib/io/dataLoader.ts`: usa el inventario; los sitios sin perfil de terreno (Faustini, Haworth, Nobile, IM-1) usan horizonte liso de 0°, etiquetado; `horizonSourceLabel`.
- `src/lib/io/schemas.ts`: campo opcional `efemeridesLanding`.
- `src/data/sites.ts`: sin cambios (mismos 10 sitios y coordenadas).

### Textura de la Luna
- `src/assets/moon/albedo.jpg` (nuevo): mosaico equirectangular 1024×512, empaquetado por Vite con hash.
- `src/assets/moon/README.md` (nuevo): origen y licencia de cada archivo.
- `src/config/moonTexture.ts` (nuevo): elección de mapa, relieve y desplazamiento de orientación.
- `scripts/fetch-moon-texture.mjs` y `package.json` (`npm run fetch:moon`): descargan el mapa de color LROC y el de alturas LOLA de NASA SVS.
- `src/components/3d/MoonGlobe.tsx`: carga la textura empaquetada, la orienta y recrea el material cuando llega (antes el shader no se recompilaba y la Luna quedaba lisa).

### Correcciones de la revisión
- `src/lib/validation/benchmark.ts`, `BenchmarkPanel.tsx`, prueba nueva en `__tests__/benchmark.test.ts`: el benchmark calcula con horizonte + efemérides, igual que el Comparador A/B; los criterios anuales se marcan "NO COMPARABLE" con 30 días de datos; Apolo 11 usa la época de 1969.
- `src/lib/eventCountdown.ts`: cuentas regresivas por fecha real; si el Sol o la Tierra están ocultos dice cuándo reaparecen.
- `src/components/ui/ElevationChart.tsx`, `MetricCards.tsx`: el cursor sigue la fecha simulada; se quitó la etiqueta "LOLA" donde el horizonte puede no venir del DEM.
- `src/App.tsx`: créditos del pie corregidos; "Celdas aptas" y la pendiente se rotulan como parche de demostración.

## Pendiente
Ver la lista en la respuesta de entrega (coordenadas propias, sitios de otras misiones, pendiente real del DEM, referencia de azimut de Apolo 11, textura NASA).
