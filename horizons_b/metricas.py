"""
Lee efemerides_*.json (de Horizons) y horizonte_*.json (de A), y calcula
metricas por sitio considerando el horizonte topografico real.

Un cuerpo es visible cuando su elevacion > horizonte(azimut del cuerpo).
"""
import glob
import json
import os
from datetime import datetime


# Mapa: nombre del archivo de efemerides -> archivo de horizonte correspondiente
HORIZONTES = {
    "shackleton_rim":   "horizonte_shackleton_rim.json",
    "shackleton_floor": "horizonte_shackleton_floor.json",
    "de_gerlache_rim":  "horizonte_de_gerlache_rim.json",
    "malapert_peak":    "horizonte_malapert_peak.json",
   "peak_near_cabeus_b": "horizonte_peak_near_cabeus_b.json",
    "apollo_11":        "horizonte_apollo_11.json",
}


def cargar_horizonte(path):
    """Devuelve una lista de 360 valores: elev. del horizonte para cada azimut 0-359."""
    with open(path) as f:
        data = json.load(f)
    perfil = {int(round(p["azimut_deg"])) % 360: p["elevacion_maxima_deg"]
              for p in data["perfil_horizonte"]}
    return [perfil.get(i, 0.0) for i in range(360)]


def horizonte_en(perfil, az):
    """Elev. del horizonte en el azimut az (interpolacion lineal entre 2 vecinos)."""
    az = az % 360
    i = int(az)
    j = (i + 1) % 360
    frac = az - i
    return perfil[i] * (1 - frac) + perfil[j] * frac


def visibilidad(elevaciones, azimuts, perfil):
    return [el > horizonte_en(perfil, az)
            for el, az in zip(elevaciones, azimuts)]


def ventanas(tiempos, visible):
    out = []
    inicio = None
    for i, v in enumerate(visible):
        if v and inicio is None:
            inicio = tiempos[i]
        elif not v and inicio is not None:
            fin = tiempos[i]
            dur = (datetime.fromisoformat(fin) - datetime.fromisoformat(inicio)).total_seconds() / 3600
            out.append({"inicio": inicio, "fin": fin, "horas": round(dur, 2)})
            inicio = None
    if inicio is not None:
        fin = tiempos[-1]
        dur = (datetime.fromisoformat(fin) - datetime.fromisoformat(inicio)).total_seconds() / 3600
        out.append({"inicio": inicio, "fin": fin, "horas": round(dur, 2)})
    return out


def horas_por_dia(tiempos, visible):
    conteo = {}
    for t, v in zip(tiempos, visible):
        dia = t[:10]
        conteo.setdefault(dia, 0)
        if v:
            conteo[dia] += 1
    return conteo


def tiempo_hasta_cambio(tiempos, visible):
    out = []
    for i in range(len(tiempos)):
        actual = visible[i]
        horas = None
        for j in range(i + 1, len(tiempos)):
            if visible[j] != actual:
                dt = datetime.fromisoformat(tiempos[j]) - datetime.fromisoformat(tiempos[i])
                horas = round(dt.total_seconds() / 3600, 2)
                break
        out.append(horas)
    return out


def procesar(path_ef):
    with open(path_ef) as f:
        data = json.load(f)
    sitio = data["site"]

    path_horiz = HORIZONTES.get(sitio)
    if path_horiz and os.path.exists(path_horiz):
        perfil = cargar_horizonte(path_horiz)
        fuente = "topografico"
    else:
        perfil = [0.0] * 360  # fallback esferico
        fuente = "esferico"

    t = data["t"]
    vis_sol = visibilidad(data["sun"]["el"],   data["sun"]["az"],   perfil)
    vis_tie = visibilidad(data["earth"]["el"], data["earth"]["az"], perfil)

    resultado = {
        "site": sitio,
        "horizonte_fuente": fuente,
        "horas_luz_por_dia":    horas_por_dia(t, vis_sol),
        "horas_tierra_por_dia": horas_por_dia(t, vis_tie),
        "ventanas_sol":    ventanas(t, vis_sol),
        "ventanas_tierra": ventanas(t, vis_tie),
        "t": t,
        "horas_hasta_cambio_sol":    tiempo_hasta_cambio(t, vis_sol),
        "horas_hasta_cambio_tierra": tiempo_hasta_cambio(t, vis_tie),
    }
    out = f"metricas_{sitio}.json"
    with open(out, "w") as f:
        json.dump(resultado, f, indent=2)
    total_sol    = sum(resultado["horas_luz_por_dia"].values())
    total_tierra = sum(resultado["horas_tierra_por_dia"].values())
    print(f"[{sitio:<20}] ({fuente:<11}) luz solar: {total_sol:>4} h | "
          f"tierra: {total_tierra:>4} h")


if __name__ == "__main__":
    for path in sorted(glob.glob("efemerides_*.json")):
        procesar(path)