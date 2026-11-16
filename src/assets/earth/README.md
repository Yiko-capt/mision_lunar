# Texturas de la Tierra

Archivos de este directorio y su procedencia. Se procesaron (reducción de tamaño, conversión a
JPG/PNG, la de noche reducida al canal rojo con umbral, para dejar solo las luces de ciudades) con Pillow; los originales no se modificaron de otro modo.

| Archivo | Origen del que se tomó | Licencia del repositorio |
|---|---|---|
| `day.jpg`, `night.jpg`, `water.jpg`, `relief.jpg` | `example/img/earth-blue-marble.jpg`, `earth-night.jpg`, `earth-water.png`, `earth-topology.png` del repositorio [vasturiano/three-globe](https://github.com/vasturiano/three-globe) | MIT (código) |
| `clouds.png` | `examples/textures/planets/earth_clouds_1024.png` del repositorio [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT (código) |

Aviso honesto sobre la procedencia: ninguno de los dos repositorios documenta el origen primario
de estas imágenes. Por su aspecto, `day.jpg` es de la familia NASA *Blue Marble* y `night.jpg` de
la de luces nocturnas (*Black Marble*), pero eso no está verificado en los repositorios, así que
**no se acreditan como NASA**. Para producción o publicación, sustituirlas por la descarga
oficial y acreditarla:

- NASA Visible Earth, *Blue Marble*: https://visibleearth.nasa.gov/collection/1484/blue-marble
- NASA Earth Observatory, *Earth at Night*: https://earthobservatory.nasa.gov/features/NightLights

(basta con reemplazar los archivos con el mismo nombre; la app los toma sola).
