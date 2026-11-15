"""Misión 3 (rol A): horizonte precalculado en una rejilla regular para coordenadas libres.
Uso:  python generar_grilla.py [--paso-km 10] [--radio-km 150] [--dmax-km 250]
Salida: salida_horizonte/grilla_horizontes.json  (cada punto: lat, lon, altura, 360 elevaciones en centésimas de grado)
Los puntos de la rejilla son APROXIMADOS: el sitio exacto sigue siendo el JSON curado de generar_json.py.
"""
import argparse, json, os, time
import numpy as np
import rasterio
from horizonte import perfil_horizonte_rayos

R0 = 1_737_400.0
H_OBS_M = 2.0
DEM = "LDEM_80S_80MPP_ADJ.tiff"

def a_latlon(x, y):
    r = np.hypot(x, y)
    return -90 + np.degrees(2 * np.arctan(r / (2 * R0))), np.degrees(np.arctan2(x, y)) % 360

ap = argparse.ArgumentParser()
ap.add_argument("--paso-km", type=float, default=10.0)
ap.add_argument("--radio-km", type=float, default=150.0, help="radio de la rejilla medido desde el polo (km)")
ap.add_argument("--dmax-km", type=float, default=250.0)
ap.add_argument("--dem", default=DEM)
a = ap.parse_args()

os.makedirs("salida_horizonte", exist_ok=True)
t0 = time.time()
with rasterio.open(a.dem) as ds:
    Z = ds.read(1).astype("float64")
    t = ds.transform
    x00, y00, dx, dy = t.c + 0.5 * t.a, t.f + 0.5 * t.e, t.a, t.e
    # perfil_horizonte_rayos solo usa X[0,0], X[0,1], Y[0,0], Y[1,0]: basta una malla mínima
    X = np.array([[x00, x00 + dx], [x00, x00 + dx]])
    Y = np.array([[y00, y00], [y00 + dy, y00 + dy]])
    paso = a.paso_km * 1000.0
    n = int(a.radio_km * 1000 // paso)
    puntos, omitidos = [], 0
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            x, y = j * paso, i * paso
            if np.hypot(x, y) > a.radio_km * 1000:
                continue
            col = int(round((x - x00) / dx)); fil = int(round((y - y00) / dy))
            if not (0 <= fil < Z.shape[0] and 0 <= col < Z.shape[1]) or not np.isfinite(Z[fil, col]):
                omitidos += 1
                continue
            azs, h = perfil_horizonte_rayos(X, Y, Z, x, y, Z[fil, col], h_obs=H_OBS_M, paso_az=1.0,
                                            d_max=a.dmax_km * 1000, paso_s=40.0)
            bad = h <= -89.0
            if bad.any():
                if bad.all():
                    omitidos += 1
                    continue
                h[bad] = np.interp(azs[bad], azs[~bad], h[~bad], period=360.0)
            lat, lon = a_latlon(x, y)
            puntos.append({"lat_deg": round(float(lat), 4), "lon_deg": round(float(lon), 4),
                           "x_m": x, "y_m": y, "elevacion_m": round(float(Z[fil, col]), 1),
                           "horizonte_cdeg": [int(round(v * 100)) for v in h]})
        print(f"fila {i + n + 1}/{2 * n + 1}: {len(puntos)} puntos, {time.time() - t0:.0f} s", flush=True)

salida = {"tipo": "rejilla_aproximada", "paso_km": a.paso_km, "radio_km": a.radio_km,
          "parametros": {"h_obs_m": H_OBS_M, "d_max_km": a.dmax_km, "paso_azimut_deg": 1.0},
          "unidad_horizonte": "centésimas de grado, azimut 0..359 desde el norte lunar en sentido horario",
          "n_puntos": len(puntos), "puntos": puntos}
ruta = os.path.join("salida_horizonte", "grilla_horizontes.json")
with open(ruta, "w", encoding="utf-8") as fh:
    json.dump(salida, fh, separators=(",", ":"))
print(f"Listo: {len(puntos)} puntos ({omitidos} omitidos) -> {ruta} ({os.path.getsize(ruta)/1e6:.1f} MB, {time.time()-t0:.0f} s)")
