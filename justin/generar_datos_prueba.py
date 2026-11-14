#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera efemérides y horizontes SINTÉTICOS solo para probar el pipeline del rol D.
NO son datos reales: los reales vienen de JPL Horizons (rol B) y LOLA (rol A).

Modelo simplificado:
  - Latitud subsolar: ±1.54° con periodo de 346.62 d (fase arbitraria).
  - Longitud subsolar: retrocede 360° cada 29.53 d (mes sinódico).
  - Latitud sub-Tierra: ±6.7° (periodo 27.21 d); longitud sub-Tierra: ±7.9° (27.55 d).
Elevación:  sin e = sinφ·sinφs + cosφ·cosφs·cos(λ−λs)
Azimut: transformación a ejes locales (Este, Norte, Cenit).
"""
import json
from pathlib import Path
import numpy as np

SITIOS = {  # coordenadas aproximadas, solo para pruebas
    "shackleton_borde": dict(lat=-89.9, lon=0.0, h0=0.4, a1=0.6, ph1=40.0, a2=0.15, ph2=100.0),
    "malapert":         dict(lat=-85.9, lon=0.1, h0=0.6, a1=0.5, ph1=200.0, a2=0.1, ph2=10.0),
    "sitio_intermedio": dict(lat=-88.5, lon=30.0, h0=0.8, a1=1.0, ph1=300.0, a2=0.2, ph2=60.0),
}


def _az_el(lat, lon, lat_b, lon_b):
    p, l = np.radians(lat), np.radians(lon)
    pb, lb = np.radians(lat_b), np.radians(lon_b)
    b = np.array([np.cos(pb) * np.cos(lb), np.cos(pb) * np.sin(lb), np.sin(pb) * np.ones_like(lb)])
    up = np.array([np.cos(p) * np.cos(l), np.cos(p) * np.sin(l), np.sin(p)])
    este = np.array([-np.sin(l), np.cos(l), 0.0])
    norte = np.array([-np.sin(p) * np.cos(l), -np.sin(p) * np.sin(l), np.cos(p)])
    el = np.degrees(np.arcsin(np.clip(up @ b, -1, 1)))
    az = np.degrees(np.arctan2(este @ b, norte @ b)) % 360.0
    return az, el


def generar(carpeta="datos_prueba", inicio="2027-01-01T00:00:00", dias=150, paso_h=1.0):
    out = Path(carpeta)
    out.mkdir(exist_ok=True)
    n = int(dias * 24 / paso_h) + 1
    t_h = np.arange(n) * paso_h
    t_d = t_h / 24.0
    t = np.datetime64(inicio, "s") + (t_h * 3600).astype("timedelta64[s]")
    lat_s = 1.54 * np.sin(2 * np.pi * t_d / 346.62 + 1.78)
    lon_s = 90.0 - 360.0 * t_d / 29.530589
    lat_e = 6.7 * np.sin(2 * np.pi * t_d / 27.2122 + 1.0)
    lon_e = 7.9 * np.sin(2 * np.pi * t_d / 27.5546 + 2.0)
    dist_e = DIST = 384400.0 * (1 - 0.0549 * np.cos(2 * np.pi * t_d / 27.5546))
    r_ua = 1.0 - 0.0167 * np.cos(2 * np.pi * (t_d - 2.0) / 365.25)
    for nombre, s in SITIOS.items():
        saz, sel = _az_el(s["lat"], s["lon"], lat_s, lon_s)
        taz, tel = _az_el(s["lat"], s["lon"], lat_e, lon_e)
        efem = {
            "sitio": nombre, "lat": s["lat"], "lon": s["lon"], "sintetico": True,
            "t_utc": [np.datetime_as_string(x, unit="s") + "Z" for x in t],
            "sol": {"az": np.round(saz, 4).tolist(), "el": np.round(sel, 4).tolist(),
                    "r_ua": np.round(r_ua, 5).tolist()},
            "tierra": {"az": np.round(taz, 4).tolist(), "el": np.round(tel, 4).tolist(),
                       "dist_km": np.round(dist_e, 0).tolist()},
        }
        az = np.arange(0, 360, 1.0)
        h = (s["h0"] + s["a1"] * np.cos(np.radians(az - s["ph1"]))
             + s["a2"] * np.cos(np.radians(2 * (az - s["ph2"]))))
        hor = {"sitio": nombre, "sintetico": True, "az_deg": az.tolist(),
               "elev_deg": np.round(np.clip(h, 0, None), 3).tolist()}
        (out / f"efemerides_{nombre}.json").write_text(json.dumps(efem), encoding="utf-8")
        (out / f"horizonte_{nombre}.json").write_text(json.dumps(hor), encoding="utf-8")
    print(f"Datos sintéticos en {out}/ ({len(SITIOS)} sitios, {dias} días, paso {paso_h} h)")


if __name__ == "__main__":
    generar()
