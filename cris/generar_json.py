"""Genera horizonte_<site_id>.json (contrato de C) para los sitios de sitios.py usando el DEM LOLA.
Uso:  python generar_json.py
Salida: carpeta 'salida_horizonte/' con un JSON por sitio.
"""
import json, os
import numpy as np
import rasterio
from rasterio.windows import Window
from horizonte import perfil_horizonte_rayos

R0 = 1_737_400.0
DEM = "LDEM_80S_80MPP_ADJ.tiff"
H_OBS_M = 2.0        # altura del observador (m)
D_MAX_KM = 250.0     # radio máximo de trazado (km); fijado por A tras comparar_dmax (converge en ~200-250 km)
PASO_AZ = 1.0        # paso de azimut (grados)

# site_id: (nombre, lat, lon Este 0-360, modo, radio de búsqueda en m)
SITIOS = {
    "shackleton_floor": ("Fondo del Cráter Shackleton (interior)", -89.66, 129.20, "min", 3000),
    "shackleton_rim":   ("Borde del Cráter Shackleton (cresta de conexión)", -89.684, 196.739, "max", 1500),
    "malapert_peak":    ("Cima del Macizo Malapert", -85.98, 358.33, "max", 10000),
    "de_gerlache_rim":  ("Borde del Cráter de Gerlache", -88.5, 272.9, "anillo", 20000),
    "peak_near_cabeus_b": ("Peak Near Cabeus B (candidato Artemis III, centro LROC)", -83.6, 291.2, "max", 3000),
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

os.makedirs("salida_horizonte", exist_ok=True)
with rasterio.open(DEM) as ds:
    for site_id, (nombre, lat, lon, modo, radio) in SITIOS.items():
        x0, y0 = a_xy(lat, lon)
        xs, ys, zs = ajustar_sitio(ds, x0, y0, modo, radio)
        lat_s, lon_s = a_latlon(xs, ys)
        Z, X, Y = leer_ventana(ds, xs, ys, D_MAX_KM * 1000 + 2000)
        azs, horiz = perfil_horizonte_rayos(X, Y, Z, xs, ys, zs, h_obs=H_OBS_M, paso_az=PASO_AZ,
                                            d_max=D_MAX_KM * 1000, paso_s=40.0)
        vacio = horiz <= -89.0
        if vacio.any():
            print("  aviso: azimuts sin datos:", int(vacio.sum()), "- se rellenan por interpolación")
            horiz[vacio] = np.interp(azs[vacio], azs[~vacio], horiz[~vacio], period=360.0)
        salida = {
            "site_id": site_id,
            "nombre": nombre,
            "lat_deg": round(float(lat_s), 4),
            "lon_deg": round(float(lon_s), 4),
            "elevacion_sitio_m": round(float(zs), 1),
            "parametros": {"h_obs_m": H_OBS_M, "d_max_km": D_MAX_KM, "paso_azimut_deg": PASO_AZ},
            "perfil_horizonte": [
                {"azimut_deg": float(a), "elevacion_maxima_deg": round(float(h), 3)}
                for a, h in zip(azs, horiz)
            ],
        }
        ruta = os.path.join("salida_horizonte", f"horizonte_{site_id}.json")
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(salida, fh, ensure_ascii=False, indent=1)
        print(f"{site_id}: horizonte mín {horiz.min():.2f}°, máx {horiz.max():.2f}° "
              f"(en az {azs[horiz.argmax()]:.0f}°) -> {ruta}")

# apollo_11 está en el ecuador, fuera del DEM polar: horizonte esférico liso (sin relieve), solo para completar el contrato.
dip = -float(np.degrees(np.arccos(R0 / (R0 + H_OBS_M))))
salida = {
    "site_id": "apollo_11",
    "nombre": "Base Tranquilidad (Apolo 11) - horizonte esférico liso (fuera del DEM)",
    "lat_deg": 0.67416, "lon_deg": 23.47315, "elevacion_sitio_m": 0.0,
    "parametros": {"h_obs_m": H_OBS_M, "d_max_km": D_MAX_KM, "paso_azimut_deg": PASO_AZ},
    "perfil_horizonte": [{"azimut_deg": float(a), "elevacion_maxima_deg": round(dip, 3)}
                         for a in np.arange(0, 360, PASO_AZ)],
}
with open(os.path.join("salida_horizonte", "horizonte_apollo_11.json"), "w", encoding="utf-8") as fh:
    json.dump(salida, fh, ensure_ascii=False, indent=1)
print(f"apollo_11: horizonte liso {dip:.3f}° -> salida_horizonte\\horizonte_apollo_11.json")
