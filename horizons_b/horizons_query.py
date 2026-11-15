"""
Pipeline: consulta Horizons para los sitios con horizonte topografico de A,
parsea la tabla y guarda un JSON con la serie de tiempo de Sol y Tierra.
"""
import json
import re
import requests
from datetime import datetime, timedelta, timezone

URL = "https://ssd.jpl.nasa.gov/api/horizons.api"

SITIOS = [
    {"id": "shackleton_rim",     "lat": -89.6863, "lon": 197.3684, "alt_m": 1728.7},
    {"id": "shackleton_floor",   "lat": -89.6251, "lon": 118.8196, "alt_m": -2868.8},
    {"id": "de_gerlache_rim",    "lat": -88.6648, "lon": 291.6227, "alt_m": 1813.8},
    {"id": "malapert_peak",      "lat": -85.9876, "lon":   2.0528, "alt_m": 5172.5},
    {"id": "peak_near_cabeus_b", "lat": -83.5808, "lon": 291.5459, "alt_m": 4599.6},
    {"id": "apollo_11",          "lat":   0.67416, "lon":  23.47315, "alt_m": 0.0},
]

# Ventana temporal: 30 dias desde el 14 nov 2026, cada hora
INICIO = datetime(2026, 11, 14, 0, 0, tzinfo=timezone.utc)
FIN    = INICIO + timedelta(days=30)
PASO   = "1h"


def consultar(target, lat, lon, start, stop, step, alt_km=0.0):
    params = {
        "format":     "text",
        "COMMAND":    f"'{target}'",
        "OBJ_DATA":   "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER":     "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},{alt_km}'",
        "START_TIME": f"'{start}'",
        "STOP_TIME":  f"'{stop}'",
        "STEP_SIZE":  f"'{step}'",
        "QUANTITIES": "'4'",
        "APPARENT":   "'AIRLESS'",
        "ANG_FORMAT": "'DEG'",
    }
    r = requests.get(URL, params=params, timeout=60)
    r.raise_for_status()
    return r.text


def parsear(texto):
    """Extrae (ISO, azimut, elevacion) de la tabla entre $$SOE y $$EOE."""
    m = re.search(r"\$\$SOE(.*?)\$\$EOE", texto, re.S)
    if not m:
        raise ValueError("No se encontro la tabla $$SOE/$$EOE")
    filas = []
    for linea in m.group(1).strip().splitlines():
        partes = linea.split()
        fecha = datetime.strptime(partes[0] + " " + partes[1],
                                   "%Y-%b-%d %H:%M").replace(tzinfo=timezone.utc)
        az = float(partes[-2])
        el = float(partes[-1])
        filas.append((fecha.isoformat(), az, el))
    return filas


def procesar(sitio):
    start = INICIO.strftime("%Y-%m-%d %H:%M")
    stop  = FIN.strftime("%Y-%m-%d %H:%M")
    alt_km = sitio.get("alt_m", 0.0) / 1000.0
    print(f"[{sitio['id']}] Sol...")
    sol = parsear(consultar("10",  sitio["lat"], sitio["lon"], start, stop, PASO, alt_km))
    print(f"[{sitio['id']}] Tierra...")
    tie = parsear(consultar("399", sitio["lat"], sitio["lon"], start, stop, PASO, alt_km))
    assert [r[0] for r in sol] == [r[0] for r in tie], "Timestamps distintos"
    data = {
        "site":  sitio["id"],
        "lat":   sitio["lat"],
        "lon":   sitio["lon"],
        "alt_m": sitio.get("alt_m", 0.0),
        "step":  PASO,
        "t":     [r[0] for r in sol],
        "sun":   {"az": [r[1] for r in sol], "el": [r[2] for r in sol]},
        "earth": {"az": [r[1] for r in tie], "el": [r[2] for r in tie]},
    }
    with open(f"efemerides_{sitio['id']}.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"[{sitio['id']}] guardado ({len(data['t'])} puntos)")


def apollo_11_landing():
    """Calibración puntual del alunizaje: 1969-07-20 20:17:40 UTC."""
    sitio = {"lat": 0.67416, "lon": 23.47315, "alt_m": 0.0}
    start = "1969-07-20 20:17"
    stop  = "1969-07-20 20:18"
    alt_km = sitio["alt_m"] / 1000.0
    print("[apollo_11_landing] Sol...")
    sol = parsear(consultar("10",  sitio["lat"], sitio["lon"], start, stop, "1m", alt_km))
    print("[apollo_11_landing] Tierra...")
    tie = parsear(consultar("399", sitio["lat"], sitio["lon"], start, stop, "1m", alt_km))
    data = {
        "site":  "apollo_11_landing",
        "lat":   sitio["lat"],
        "lon":   sitio["lon"],
        "alt_m": sitio["alt_m"],
        "step":  "1m",
        "t":     [r[0] for r in sol],
        "sun":   {"az": [r[1] for r in sol], "el": [r[2] for r in sol]},
        "earth": {"az": [r[1] for r in tie], "el": [r[2] for r in tie]},
    }
    with open("efemerides_apollo_11_landing.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"[apollo_11_landing] guardado ({len(data['t'])} puntos)")


if __name__ == "__main__":
    for s in SITIOS:
        procesar(s)
    apollo_11_landing()