"""Compara el horizonte con d_max = 100, 150, 200 y 250 km para cada sitio. Uso: python comparar_dmax.py"""
import numpy as np
import rasterio
from generar_json_utils import a_xy, leer_ventana, ajustar_sitio, SITIOS, H_OBS_M, DEM
from horizonte import perfil_horizonte_rayos

DMAXS = [100.0, 150.0, 200.0, 250.0]
with rasterio.open(DEM) as ds:
    for site_id, (nombre, lat, lon, modo, radio) in SITIOS.items():
        x0, y0 = a_xy(lat, lon)
        xs, ys, zs = ajustar_sitio(ds, x0, y0, modo, radio)
        perfiles = {}
        for dm in DMAXS:
            Z, X, Y = leer_ventana(ds, xs, ys, dm * 1000 + 2000)
            _, h = perfil_horizonte_rayos(X, Y, Z, xs, ys, zs, h_obs=H_OBS_M, paso_az=1.0, d_max=dm * 1000, paso_s=40.0)
            perfiles[dm] = h
        print(site_id)
        for dm in DMAXS:
            print(f"   d_max {dm:5.0f} km: horizonte máx {perfiles[dm].max():6.2f}°")
        print("   convergencia (cada d_max contra el anterior):")
        for a, b in zip(DMAXS[:-1], DMAXS[1:]):
            dif = perfiles[b] - perfiles[a]
            i = dif.argmax()
            print(f"   {b:.0f} vs {a:.0f} km: cambia {int((dif > 0.01).sum())} de 360 azimuts; "
                  f"mayor subida {dif[i]:.2f}° en az {i}°")
