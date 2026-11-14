import numpy as np
import rasterio

R0 = 1_737_400.0
# (lat, lon Este 0-360). Corregidas tras revisar el benchmark de C.
sitios = {
    "shackleton_floor": (-89.66, 129.20),
    "shackleton_rim":   (-89.684, 196.739),
    "malapert_peak":    (-85.98, 358.33),
    "de_gerlache_rim":  (-88.5, 272.9),
    "cabeus_rim":       (-83.6, 291.2),
}
# modo de búsqueda y radio (m): min = punto más bajo, max = más alto, anillo = más alto en el borde
config = {
    "shackleton_floor": ("min", 3000),
    "shackleton_rim":   ("max", 1500),
    "malapert_peak":    ("max", 10000),
    "de_gerlache_rim":  ("anillo", 20000),
    "cabeus_rim":       ("max", 3000),
}

def a_xy(lat, lon):
    r = 2 * R0 * np.tan(np.radians(90.0 + lat) / 2)
    lam = np.radians(lon)
    return r * np.sin(lam), r * np.cos(lam)

def a_latlon(x, y):
    r = np.hypot(x, y)
    return -90 + np.degrees(2 * np.arctan(r / (2 * R0))), np.degrees(np.arctan2(x, y)) % 360

with rasterio.open("LDEM_80S_80MPP_ADJ.tiff") as ds:
    t = ds.transform
    for nombre, (lat, lon) in sitios.items():
        modo, radio = config[nombre]
        x0, y0 = a_xy(lat, lon)
        f, c = ds.index(x0, y0)
        w = int(radio / 80)
        Z = ds.read(1, window=((f - w, f + w + 1), (c - w, c + w + 1))).astype("float64")
        filas, cols = np.mgrid[0:Z.shape[0], 0:Z.shape[1]]
        X = t.c + t.a * (cols + c - w + 0.5)
        Y = t.f + t.e * (filas + f - w + 0.5)
        d = np.hypot(X - x0, Y - y0)
        if modo == "anillo":
            M = np.where((d > 14000) & (d < 18500), Z, np.nan)
        else:
            M = np.where(d <= radio, Z, np.nan)
        i = np.nanargmin(M) if modo == "min" else np.nanargmax(M)
        fi, ci = np.unravel_index(i, M.shape)
        la, lo = a_latlon(X[fi, ci], Y[fi, ci])
        print(f"{nombre}: lat {la:.3f}  lon {lo:.3f}  altura {Z[fi, ci]:.1f} m")