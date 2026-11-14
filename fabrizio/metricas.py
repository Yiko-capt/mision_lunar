"""
Lee los efemerides_*.json y calcula métricas por sitio y por fecha.
Guarda metricas_<sitio>.json con:
 - horas_luz_por_dia: cuantas horas al dia el Sol esta sobre el horizonte
 - horas_tierra_por_dia: cuantas horas al dia la Tierra esta visible
 - ventanas_sol: lista de (inicio, fin, duracion_h) con el Sol sobre el horizonte
 - ventanas_tierra: lista de (inicio, fin, duracion_h) con la Tierra visible

De momento el "horizonte" es esferico (horizonte = 0 grados).
Cuando A entregue su horizonte topografico se cambia solo la linea 'HORIZONTE'.
"""
import glob
import json
from datetime import datetime, timedelta


HORIZONTE = 0.0  # grados. Cambiar cuando A entregue su perfil.


def cargar(path):
    with open(path) as f:
        return json.load(f)


def visibilidad(elevaciones):
    """True donde el cuerpo esta sobre el horizonte."""
    return [el > HORIZONTE for el in elevaciones]


def ventanas(tiempos, visible):
    """Lista de intervalos continuos (inicio, fin, horas) donde visible = True."""
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
    """Diccionario fecha (YYYY-MM-DD) -> horas visibles ese dia."""
    conteo = {}
    for t, v in zip(tiempos, visible):
        dia = t[:10]
        conteo.setdefault(dia, 0)
        if v:
            conteo[dia] += 1  # cada paso del JSON es 1h
    return conteo

def tiempo_hasta_cambio(tiempos, visible):
    """
    Para cada instante t, calcula cuantas horas faltan hasta que la visibilidad
    cambie (visible -> oculto, o viceversa). None si no cambia hasta el final.
    """
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

def procesar(path):
    data = cargar(path)
    t = data["t"]
    vis_sol = visibilidad(data["sun"]["el"])
    vis_tie = visibilidad(data["earth"]["el"])

    resultado = {
        "site": data["site"],
        "horas_luz_por_dia":    horas_por_dia(t, vis_sol),
        "horas_tierra_por_dia": horas_por_dia(t, vis_tie),
        "ventanas_sol":    ventanas(t, vis_sol),
        "ventanas_tierra": ventanas(t, vis_tie),
        "t": t,
        "horas_hasta_cambio_sol":    tiempo_hasta_cambio(t, vis_sol),
        "horas_hasta_cambio_tierra": tiempo_hasta_cambio(t, vis_tie),
    }
        
    out = f"metricas_{data['site']}.json"
    with open(out, "w") as f:
        json.dump(resultado, f, indent=2)
    total_sol    = sum(resultado["horas_luz_por_dia"].values())
    total_tierra = sum(resultado["horas_tierra_por_dia"].values())
    print(f"[{data['site']}] luz solar total: {total_sol} h | "
          f"tierra visible total: {total_tierra} h")


if __name__ == "__main__":
    for path in sorted(glob.glob("efemerides_*.json")):
        procesar(path)