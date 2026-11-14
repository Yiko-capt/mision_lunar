import numpy as np
import rasterio
from rasterio.windows import Window

R0 = 1_737_400.0
with rasterio.open("LDEM_80S_80MPP_ADJ.tiff") as ds:
    cx, cy = ds.width // 2, ds.height // 2
    f0, c0 = cy - 250, cx - 250
    Z = ds.read(1, window=Window(c0, f0, 500, 500)).astype("float64")
    fila, col = np.unravel_index(np.nanargmin(Z), Z.shape)
    x, y = ds.xy(f0 + fila, c0 + col)
    print("Transform:", ds.transform)
    print("NaN en el recorte:", int(np.isnan(Z).sum()))
    print("Centro del mapa (x, y):", ds.xy(cy, cx))

r = np.hypot(x, y)
lat = -90 + np.degrees(2 * np.arctan(r / (2 * R0)))
print("Fondo del cráter: altura =", Z[fila, col], "m | x, y =", x, y)
print("Distancia al polo (km):", r / 1000, "| latitud:", lat)
print("Longitud (opción A, atan2(y,x)):", np.degrees(np.arctan2(y, x)) % 360)
print("Longitud (opción B, atan2(x,y)):", np.degrees(np.arctan2(x, y)) % 360)