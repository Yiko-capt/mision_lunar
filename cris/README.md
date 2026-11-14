# Rol A – Horizonte y topografía (SeleneHorizon)

Calcula el perfil de horizonte local (elevación del terreno por azimut) a partir del DEM LOLA del polo sur lunar.

## Datos (no incluidos en el repositorio)
Descarga `LDEM_80S_80MPP_ADJ.TIF` (NASA PGDA, LOLA; DOI 10.60903/gsfcpgda-lola-spole) y guárdalo en esta carpeta como `LDEM_80S_80MPP_ADJ.tiff`.

## Uso
    pip install rasterio numpy matplotlib
    python revisar_dem.py     # tamaño, tipo, rango y gráfico del DEM
    python ubicar_crater.py   # verifica los ejes con Shackleton
    python sitios.py          # puntos de los sitios en el DEM
    python test_sintetico.py  # prueba del módulo con montaña sintética (esperado: 8.21°)

`horizonte.py` contiene `perfil_horizonte` (azimuts 0,1,...,359) y `visible`.
Ver `FICHA_DATOS.md` para las convenciones.
