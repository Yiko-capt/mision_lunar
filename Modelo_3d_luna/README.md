# SeleneHorizon (web)

Navegador del polo sur lunar: Luna 3D, posición del Sol y la Tierra por sitio y fecha, métricas de energía solar y enlace directo con la Tierra, y comparación A/B.

## Cómo correrlo

Necesita un servidor local (los módulos JS no cargan desde `file://`):

- **VS Code:** extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*.
- **Terminal:** `python -m http.server 8000` en esta carpeta y abrir `http://localhost:8000`.

Requiere internet (Three.js se carga desde un CDN).

## Estructura

```
index.html
css/style.css
js/main.js         escena 3D + interfaz
js/astronomy.js    efemérides y geometría (funciones puras)
js/sites.js        sitios candidatos
assets/moon_color_nearside.jpg   textura (cara visible)
tools/make_texture.py            reproyecta la captura de Quickmap a equirectangular
tools/validate_ephem.py          valida astronomy.js contra PyEphem (pip install ephem)
```

## Textura de la Luna: qué tiene y qué no

`assets/moon_color_nearside.jpg` sale de una captura de **Quickmap** (LROC / ASU / NASA, LRO) en proyección ortográfica centrada en lon 0°, lat 0°, reproyectada con `tools/make_texture.py`.

Limitaciones:
- **Solo cubre la cara visible.** La cara oculta se muestra en gris liso.
- **Cerca de los polos la imagen está emborronada**, porque la vista ortográfica casi no tiene resolución allí. Es un problema para el polo sur, que es el foco del proyecto.
- Es escala de grises y de baja resolución (~5 px/grado en el centro).

Para mejorarla, exportar desde Quickmap: (1) una vista ortográfica centrada en lon 180° para la cara oculta, y (2) una vista **estereográfica polar sur** para el polo. Una textura de mayor calidad es el *CGI Moon Kit* de NASA (https://svs.gsfc.nasa.gov/4720). Esa textura es para visualización; los cálculos científicos de horizonte deben usar el DEM de LOLA.

## Física

`js/astronomy.js` usa series truncadas de Meeus (Luna) y las fórmulas de libración. Validado contra PyEphem durante un año (cada 6 h): errores típicos de unas centésimas de grado y máximos < 0.2° en los puntos sub-solar y sub-Tierra. **Horizons sigue siendo la referencia final.**

Limitaciones actuales: el horizonte es esférico (no considera el terreno) y no hay paralaje Luna–Tierra respecto al Sol (~0.15°).

## Créditos

Imágenes: NASA / LRO / LROC (Arizona State University), exportadas desde Quickmap.
