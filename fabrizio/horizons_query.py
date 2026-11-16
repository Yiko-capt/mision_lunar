"""
Pipeline: consulta Horizons para cada sitio, parsea la tabla y guarda un JSON
con la serie de tiempo de Sol y Tierra.
"""
import json
import re
import requests
from datetime import datetime, timedelta, timezone

URL = "https://ssd.jpl.nasa.gov/api/horizons.api"

SITIOS = [
    {"id": "shackleton", "lat": -89.90, "lon":   0.0},
    {"id": "degerlache", "lat": -88.50, "lon": -87.1},
    {"id": "faustini",   "lat": -87.30, "lon":  77.0},
    {"id": "haworth",    "lat": -87.10, "lon":  -5.0},
    {"id": "nobile",     "lat": -85.20, "lon":  53.5},
    {"id": "malapert",   "lat": -85.90, "lon":   0.0},
    {"id": "cabeus",     "lat": -85.30, "lon": -42.1},
    {"id": "im1",        "lat": -80.13, "lon":   1.44},
]

# Ventana temporal: 30 dias desde el 14 nov 2026, cada hora
INICIO = datetime(2026, 11, 14, 0, 0, tzinfo=timezone.utc)
FIN    = INICIO + timedelta(days=30)
PASO   = "1h"


def consultar(target, lat, lon, start, stop, step):
    params = {
        "format":     "text",
        "COMMAND":    f"'{target}'",
        "OBJ_DATA":   "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER":     "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},0'",
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
    print(f"[{sitio['id']}] Sol...")
    sol = parsear(consultar("10",  sitio["lat"], sitio["lon"], start, stop, PASO))
    print(f"[{sitio['id']}] Tierra...")
    tie = parsear(consultar("399", sitio["lat"], sitio["lon"], start, stop, PASO))
    assert [r[0] for r in sol] == [r[0] for r in tie], "Timestamps distintos"
    data = {
        "site":  sitio["id"],
        "lat":   sitio["lat"],
        "lon":   sitio["lon"],
        "step":  PASO,
        "t":     [r[0] for r in sol],
        "sun":   {"az": [r[1] for r in sol], "el": [r[2] for r in sol]},
        "earth": {"az": [r[1] for r in tie], "el": [r[2] for r in tie]},
    }
    with open(f"efemerides_{sitio['id']}.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"[{sitio['id']}] guardado ({len(data['t'])} puntos)")


if __name__ == "__main__":
    for s in SITIOS:
        procesar(s)
    