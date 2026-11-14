"""
Reproyecta una captura ortografica de Quickmap (lon_0=0, lat_0=0) a una textura
equirectangular para usar en Three.js.

Uso:  python make_texture.py quickmap-lroc.png assets/moon_color_nearside.jpg
Geometria tomada del .vrt: centro del disco (665.0, 299.5) px, radio 299.5 px.
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

src_path, out_path = sys.argv[1], sys.argv[2]
CX, CY, RPX = 665.0, 299.5, 299.5
W, H = 2048, 1024
FAR_SIDE_GRAY = 38        # relleno de la cara oculta (no hay datos)
MAX_ANG = 86.0            # mas alla de ~86 grados del centro el dato esta muy comprimido

im = np.array(Image.open(src_path).convert("L")).astype(np.float32)

# Rejilla equirectangular: u crece hacia el Este (lon -180..180), v hacia el sur
lon = (np.linspace(0, 1, W, endpoint=False) + 0.5 / W) * 360.0 - 180.0
lat = 90.0 - (np.linspace(0, 1, H, endpoint=False) + 0.5 / H) * 180.0
LON, LAT = np.meshgrid(np.radians(lon), np.radians(lat))

# Proyeccion ortografica centrada en (0,0): x hacia el Este, y hacia el Norte
x = np.cos(LAT) * np.sin(LON)
y = np.sin(LAT)
cos_c = np.cos(LAT) * np.cos(LON)             # coseno de la distancia angular al centro
ang = np.degrees(np.arccos(np.clip(cos_c, -1, 1)))

col = CX + x * RPX
row = CY - y * RPX
tex = map_coordinates(im, [row, col], order=1, mode="nearest")

valid = (cos_c > 0) & (ang <= MAX_ANG)
# Transicion suave hacia el gris en el borde
fade = np.clip((MAX_ANG - ang) / 6.0, 0, 1)
out = np.where(valid, FAR_SIDE_GRAY + (tex - FAR_SIDE_GRAY) * fade, FAR_SIDE_GRAY)

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "L").save(out_path, quality=90)
print("OK ->", out_path, out.shape)
