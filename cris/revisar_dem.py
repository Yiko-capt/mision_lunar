import numpy as np
import rasterio
from rasterio.windows import Window
import matplotlib.pyplot as plt

archivo = "LDEM_80S_80MPP_ADJ.tiff"

with rasterio.open(archivo) as ds:
    print("Tamaño:", ds.width, "x", ds.height, "| píxel (m):", ds.res)
    print("Tipo:", ds.dtypes[0], "| nodata:", ds.nodata)
    print("Sistema de coordenadas:", ds.crs)
    cx, cy = ds.width // 2, ds.height // 2
    Z = ds.read(1, window=Window(cx - 250, cy - 250, 500, 500)).astype("float64")

print("Mín / Máx (m):", np.nanmin(Z), np.nanmax(Z))
plt.imshow(Z, cmap="terrain")
plt.colorbar(label="altura (m)")
plt.show()