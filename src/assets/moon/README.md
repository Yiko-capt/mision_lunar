# Textura de la Luna

| Archivo | Qué es | Origen | Licencia |
|---|---|---|---|
| `albedo.jpg` | Mosaico global equirectangular 1024×512, centrado en 0° de longitud, norte arriba | Copia exacta de `examples/textures/planets/moon_1024.jpg` del repositorio de three.js (github.com/mrdoob/three.js) | Repositorio bajo licencia MIT. **El origen primario de la imagen no está documentado allí**: no la acredites como "NASA/LROC" |
| `lroc_color_2k.jpg` *(opcional)* | Mapa de color LROC WAC 2K | NASA SVS, *CGI Moon Kit* — https://svs.gsfc.nasa.gov/4720 | Material de NASA; crédito: "NASA's Scientific Visualization Studio" |
| `ldem_3_8bit.jpg` *(opcional)* | Mapa de alturas LOLA (desplazamiento) | NASA SVS, *CGI Moon Kit* — https://svs.gsfc.nasa.gov/4720 | Igual que arriba |

## Cómo pasar a la textura de la NASA

```bash
npm run fetch:moon     # descarga lroc_color_2k.jpg y ldem_3_8bit.jpg a esta carpeta
npm run build
```

`src/config/moonTexture.ts` detecta los archivos en tiempo de compilación: si existe
`lroc_color_2k.jpg` lo usa como color, y si existe `ldem_3_8bit.jpg` lo usa como relieve real.
Sin ellos se usa `albedo.jpg` y un relieve suave derivado del propio albedo (aproximado, no topografía).

Después de cambiar de textura, actualiza el crédito del pie de página en `src/App.tsx`.

## Orientación

Los tres mapas están centrados en la longitud 0° (centro de la cara visible) con el norte arriba.
El desplazamiento que los alinea con los marcadores de la escena está en
`MOON_TEXTURE_U_OFFSET` (`src/config/moonTexture.ts`). Comprobación rápida: el marcador de
Apolo 11 debe caer en el borde suroeste del Mar de la Tranquilidad.
