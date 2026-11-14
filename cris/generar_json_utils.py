"""Genera horizonte_<site_id>.json (contrato de C) para los sitios de sitios.py usando el DEM LOLA.
Uso:  python generar_json.py
Salida: carpeta 'salida_horizonte/' con un JSON por sitio.
"""
import numpy as np
import rasterio
from rasterio.windows import Window

R0 = 1_737_400.0
DEM = "LDEM_80S_80MPP_ADJ.tiff"
H_OBS_M = 2.0        # altura del observador (m)
D_MAX_KM = 100.0     # radio máximo de trazado (km); contrato: 100, ajustable por A
PASO_AZ = 1.0        # paso de azimut (grados)

# site_id: (nombre, lat, lon Este 0-360, modo, radio de búsqueda en m)
SITIOS = {
    "shackleton_floor": ("Fondo del Cráter Shackleton (interior)", -89.66, 129.20, "min", 3000),
    "shackleton_rim":   ("Borde del Cráter Shackleton (cresta de conexión)", -89.684, 196.739, "max", 1500),
    "malapert_peak":    ("Cima del Macizo Malapert", -85.98, 358.33, "max", 10000),
    "de_gerlache_rim":  ("Borde del Cráter de Gerlache", -88.5, 272.9, "anillo", 20000),
    "cabeus_rim":       ("Borde del Cráter Cabeus (Peak near Cabeus B)", -83.6, 291.2, "max", 3000),
}

def a_xy(lat, lon):
    r = 2 * R0 * np.tan(np.radians(90.0 + lat) / 2)
    lam = np.radians(lon)
    return r * np.sin(lam), r * np.cos(lam)

def a_latlon(x, y):
    r = np.hypot(x, y)
    return -90 + np.degrees(2 * np.arctan(r / (2 * R0))), np.degrees(np.arctan2(x, y)) % 360

def leer_ventana(ds, x0, y0, radio_m):
    """Lee un cuadrado de ±radio_m alrededor de (x0,y0), recortado al borde del DEM. Devuelve Z, X, Y."""
    t = ds.transform
    f, c = ds.index(x0, y0)
    w = int(radio_m / abs(t.a)) + 1
    f0, f1 = max(0, f - w), min(ds.height, f + w + 1)
    c0, c1 = max(0, c - w), min(ds.width, c + w + 1)
    Z = ds.read(1, window=Window(c0, f0, c1 - c0, f1 - f0)).astype("float64")
    filas, cols = np.mgrid[f0:f1, c0:c1]
    X = t.c + t.a * (cols + 0.5)
    Y = t.f + t.e * (filas + 0.5)
    return Z, X, Y

def ajustar_sitio(ds, x0, y0, modo, radio):
    Z, X, Y = leer_ventana(ds, x0, y0, radio)
    d = np.hypot(X - x0, Y - y0)
    if modo == "anillo":
        M = np.where((d > 14000) & (d < 18500), Z, np.nan)
    else:
        M = np.where(d <= radio, Z, np.nan)
    i = np.nanargmin(M) if modo == "min" else np.nanargmax(M)
    fi, ci = np.unravel_index(i, M.shape)
    return X[fi, ci], Y[fi, ci], Z[fi, ci]

