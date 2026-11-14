#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LunarWindow · Rol D — Energía y comunicación
=============================================
Toma las efemérides (Sol y Tierra vistos desde el sitio) y la máscara de
horizonte, y calcula:

  * Potencia solar y energía disponible (modelo de panel con inclinación).
  * Ventanas de luz solar, de oscuridad y de enlace directo con la Tierra (DTE).
  * Presupuesto de enlace simplificado (pérdida en espacio libre y tasa máxima).
  * Semáforo de viabilidad y calendario de fechas candidatas (reprogramación).

Entradas (contrato con los roles A y B):
  efemerides_<sitio>.json  ->  ver `cargar_efemerides`
  horizonte_<sitio>.json   ->  ver `cargar_horizonte`

Salida (para el rol E):
  metricas_<sitio>.json    ->  consumido por panel_metricas.js

Uso:
  python energia_comunicacion.py --sitio shackleton_borde \
      --efem datos_prueba/efemerides_shackleton_borde.json \
      --horizonte datos_prueba/horizonte_shackleton_borde.json \
      --fecha-original 2027-02-10T00:00:00Z --ventana-dias 60
"""
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass, asdict, replace
from pathlib import Path
from typing import Optional

import numpy as np

_trapz = getattr(np, "trapezoid", None) or np.trapz

# ----------------------------------------------------------------------------
# Constantes físicas
# ----------------------------------------------------------------------------
S0_W_M2 = 1361.0                 # constante solar a 1 UA [W/m²]
C_M_S = 299_792_458.0            # velocidad de la luz [m/s]
K_BOLTZMANN_DBW = -228.6         # constante de Boltzmann [dBW/(K·Hz)]
DIST_TIERRA_LUNA_KM = 384_400.0  # distancia media Tierra–Luna [km]


# ----------------------------------------------------------------------------
# Parámetros configurables
# ----------------------------------------------------------------------------
@dataclass
class Panel:
    """Panel solar. inclinacion_deg: 0 = horizontal, 90 = vertical."""
    area_m2: float = 1.0
    eficiencia_celda: float = 0.28     # celdas multiunión (supuesto)
    factor_sistema: float = 0.85       # cableado, empaquetado, temperatura, degradación
    inclinacion_deg: float = 90.0      # en el polo sur el Sol rasa el horizonte
    az_panel_deg: float = 0.0          # azimut al que apunta la normal (0 = Norte)
    seguimiento_az: bool = False       # True: el panel gira para mirar al Sol en azimut

    @property
    def eta(self) -> float:
        return self.eficiencia_celda * self.factor_sistema


@dataclass
class Enlace:
    """Enlace directo a la Tierra (valores ilustrativos: confirmar con comunicaciones)."""
    frecuencia_hz: float = 8.4e9       # banda X
    eirp_dbw: float = 25.0
    g_t_dbk: float = 45.0              # G/T de la estación terrena [dB/K]
    perdidas_otras_db: float = 3.0     # apuntamiento, polarización, atmósfera
    eb_n0_req_db: float = 3.0
    margen_req_db: float = 3.0


@dataclass
class Requisitos:
    """Umbrales de la misión. None = criterio no evaluado. Valores por defecto = marcadores."""
    duracion_h: float = 336.0                      # 14 días terrestres
    el_sol_min_deg: float = 0.0                    # elevación solar mínima "útil"
    el_tierra_min_deg: float = 0.0                 # máscara de elevación de la antena
    horas_luz_min_h: Optional[float] = 168.0
    oscuridad_max_h: Optional[float] = 120.0
    potencia_media_min_w: Optional[float] = None
    horas_dte_min_h: Optional[float] = 120.0
    ventana_dte_min_h: Optional[float] = 24.0


# ----------------------------------------------------------------------------
# Lectura de datos
# ----------------------------------------------------------------------------
@dataclass
class Efem:
    sitio: str
    lat: float
    lon: float
    t_utc: np.ndarray                  # datetime64[s]
    t_h: np.ndarray                    # horas desde la primera muestra
    sol_az: np.ndarray
    sol_el: np.ndarray
    tierra_az: np.ndarray
    tierra_el: np.ndarray
    sol_f: Optional[np.ndarray] = None         # fracción visible del disco solar (rol C)
    sol_r_ua: Optional[np.ndarray] = None      # distancia Sol–Luna [UA]
    tierra_dist_km: Optional[np.ndarray] = None


@dataclass
class Horizonte:
    az_deg: np.ndarray
    elev_deg: np.ndarray


def cargar_efemerides(ruta: str | Path) -> Efem:
    """
    Formato esperado de efemerides_<sitio>.json:
    {
      "sitio": "shackleton_borde", "lat": -89.9, "lon": 0.0,
      "t_utc": ["2027-01-01T00:00:00Z", ...],        # paso uniforme
      "sol":    {"az": [...], "el": [...],            # grados, sin refracción
                 "f_visible": [...],                   # opcional (rol C), 0..1
                 "r_ua": [...]},                       # opcional
      "tierra": {"az": [...], "el": [...],
                 "dist_km": [...]}                     # opcional
    }
    """
    d = json.loads(Path(ruta).read_text(encoding="utf-8"))
    t = np.array([s.rstrip("Z") for s in d["t_utc"]], dtype="datetime64[s]")
    t_h = (t - t[0]) / np.timedelta64(1, "h")
    pasos = np.diff(t_h)
    if len(pasos) and (pasos.max() - pasos.min()) > 1e-6:
        raise ValueError("El paso de tiempo de las efemérides debe ser uniforme.")
    opt = lambda blk, k: np.array(d[blk][k], float) if k in d[blk] else None
    return Efem(
        sitio=d.get("sitio", Path(ruta).stem), lat=float(d.get("lat", np.nan)),
        lon=float(d.get("lon", np.nan)), t_utc=t, t_h=np.asarray(t_h, float),
        sol_az=np.array(d["sol"]["az"], float), sol_el=np.array(d["sol"]["el"], float),
        tierra_az=np.array(d["tierra"]["az"], float), tierra_el=np.array(d["tierra"]["el"], float),
        sol_f=opt("sol", "f_visible"), sol_r_ua=opt("sol", "r_ua"),
        tierra_dist_km=opt("tierra", "dist_km"),
    )


def cargar_horizonte(ruta: str | Path) -> Horizonte:
    """
    Formato esperado de horizonte_<sitio>.json:
    {"az_deg": [0, 1, ..., 359], "elev_deg": [...]}   # elevación máxima del terreno por azimut
    """
    d = json.loads(Path(ruta).read_text(encoding="utf-8"))
    az = np.array(d["az_deg"], float)
    el = np.array(d.get("elev_deg", d.get("h_deg")), float)
    orden = np.argsort(az)
    return Horizonte(az[orden] % 360.0, el[orden])


def elev_horizonte(az_deg: np.ndarray, hor: Optional[Horizonte]) -> np.ndarray:
    """Elevación del horizonte en cada azimut (interpolación periódica)."""
    az = np.asarray(az_deg, float) % 360.0
    if hor is None:
        return np.zeros_like(az)
    return np.interp(az, hor.az_deg, hor.elev_deg, period=360.0)


# ----------------------------------------------------------------------------
# Ventanas (intervalos donde g > 0), con cruce lineal para precisión sub-paso
# ----------------------------------------------------------------------------
def _cruce(t0: float, t1: float, g0: float, g1: float) -> float:
    return t0 + (t1 - t0) * (g0 / (g0 - g1))


def ventanas(t: np.ndarray, g: np.ndarray) -> list[tuple[float, float]]:
    """Intervalos (inicio_h, fin_h) donde g > 0. Si la ventana está abierta en un
    extremo de los datos, se recorta al extremo."""
    out: list[tuple[float, float]] = []
    if len(t) == 0:
        return out
    prev = g[0] > 0
    inicio = t[0] if prev else None
    for i in range(1, len(t)):
        pos = g[i] > 0
        if pos and not prev:
            inicio = _cruce(t[i - 1], t[i], g[i - 1], g[i])
        elif prev and not pos:
            out.append((float(inicio), float(_cruce(t[i - 1], t[i], g[i - 1], g[i]))))
            inicio = None
        prev = pos
    if prev and inicio is not None:
        out.append((float(inicio), float(t[-1])))
    return out


def _duraciones(vs: list[tuple[float, float]]) -> list[float]:
    return [b - a for a, b in vs]


# ----------------------------------------------------------------------------
# Modelo de potencia solar
# ----------------------------------------------------------------------------
def cos_incidencia(el_deg, az_deg, panel: Panel) -> np.ndarray:
    """
    Coseno del ángulo entre el rayo solar y la normal del panel.
        cos θ = cos(e)·sin(β)·cos(az − az_p) + sin(e)·cos(β)
    β = inclinación (0° horizontal → sin e ; 90° vertical → cos e · cos(Δaz)).
    Con seguimiento en azimut, cos(Δaz) = 1.
    """
    e = np.radians(np.asarray(el_deg, float))
    b = math.radians(panel.inclinacion_deg)
    cos_daz = np.ones_like(e) if panel.seguimiento_az else np.cos(
        np.radians(np.asarray(az_deg, float) - panel.az_panel_deg))
    c = np.cos(e) * math.sin(b) * cos_daz + np.sin(e) * math.cos(b)
    return np.clip(c, 0.0, None)


def potencia_solar(el_deg, az_deg, panel: Panel, factor_visible,
                   r_ua: Optional[np.ndarray] = None) -> np.ndarray:
    """
    P(t) = S0/r² · A · η · cos θ · f_visible     [W]
    - factor_visible: 0/1 (Sol sobre el horizonte) o fracción 0..1 del disco visible.
    - r_ua: distancia Sol–Luna [UA]; si es None se usa 1 UA.
    Para panel horizontal, cos θ = sin e  →  P ≈ S0·η·A·sin e.
    """
    s = S0_W_M2 / (np.ones_like(np.asarray(el_deg, float)) if r_ua is None else r_ua) ** 2
    return s * panel.area_m2 * panel.eta * cos_incidencia(el_deg, az_deg, panel) * factor_visible


# ----------------------------------------------------------------------------
# Enlace de comunicación
# ----------------------------------------------------------------------------
def fspl_db(dist_km: float, f_hz: float) -> float:
    """Pérdida en espacio libre: 20·log10(4π·d·f / c)  [dB]."""
    return 20.0 * math.log10(4.0 * math.pi * dist_km * 1e3 * f_hz / C_M_S)


def eb_n0_db(tasa_bps: float, dist_km: float, e: Enlace) -> float:
    """Eb/N0 = EIRP − FSPL − L_otras + G/T − k − 10·log10(R)   [dB]."""
    return (e.eirp_dbw - fspl_db(dist_km, e.frecuencia_hz) - e.perdidas_otras_db
            + e.g_t_dbk - K_BOLTZMANN_DBW - 10.0 * math.log10(tasa_bps))


def tasa_max_bps(dist_km: float, e: Enlace) -> float:
    """Tasa de datos máxima que cumple Eb/N0 requerido + margen."""
    exceso_db = eb_n0_db(1.0, dist_km, e) - e.eb_n0_req_db - e.margen_req_db
    return 10.0 ** (exceso_db / 10.0)


# ----------------------------------------------------------------------------
# Métricas de un escenario (tramo de efemérides)
# ----------------------------------------------------------------------------
def _r(x, n=2):
    return None if x is None else float(round(float(x), n))


def _sig(vs, t_ref):
    """Tiempo hasta fin de la ventana activa y hasta el inicio de la siguiente."""
    for a, b in vs:
        if a <= t_ref < b:
            return {"activa": True, "hasta_fin_h": b - t_ref, "hasta_inicio_h": None}
    sig = [a for a, _ in vs if a > t_ref]
    return {"activa": False, "hasta_fin_h": None,
            "hasta_inicio_h": (min(sig) - t_ref) if sig else None}


def metricas_energia(t, az, el, hor, panel, req, f_vis=None, r_ua=None, t_ref=None):
    t_ref = t[0] if t_ref is None else t_ref
    h = elev_horizonte(az, hor)
    g_luz = el - h
    g_util = el - np.maximum(h, req.el_sol_min_deg)
    v_luz, v_util = ventanas(t, g_luz), ventanas(t, g_util)
    v_osc = ventanas(t, -g_luz)
    fac = (f_vis if f_vis is not None else (g_luz > 0).astype(float))
    p = potencia_solar(el, az, panel, fac, r_ua)
    total_h = float(t[-1] - t[0]) if len(t) > 1 else 0.0
    horas_luz = sum(_duraciones(v_luz))
    sig = _sig(v_luz, t_ref)
    el_luz = el[g_luz > 0]
    return {
        "horas_luz_h": _r(horas_luz),
        "horas_luz_util_h": _r(sum(_duraciones(v_util))),
        "fraccion_luz": _r(horas_luz / total_h if total_h else 0.0, 3),
        "luz_continua_max_h": _r(max(_duraciones(v_luz), default=0.0)),
        "oscuridad_continua_max_h": _r(max(_duraciones(v_osc), default=0.0)),
        "n_periodos_luz": len(v_luz),
        "el_sol_max_deg": _r(el.max(), 3),
        "el_sol_media_iluminada_deg": _r(el_luz.mean() if el_luz.size else 0.0, 3),
        "potencia_pico_w": _r(p.max()),
        "potencia_media_w": _r(p.mean()),
        "energia_total_wh": _r(_trapz(p, t) if len(t) > 1 else 0.0, 1),
        "t_hasta_puesta_h": _r(sig["hasta_fin_h"]),
        "t_hasta_salida_h": _r(sig["hasta_inicio_h"]),
        "sol_visible_ahora": sig["activa"],
        "_ventanas_luz": [(_r(a), _r(b)) for a, b in v_luz],
    }


def metricas_comunicacion(t, az, el, hor, enlace, req, dist_km=None, t_ref=None):
    t_ref = t[0] if t_ref is None else t_ref
    h = elev_horizonte(az, hor)
    g = el - np.maximum(h, req.el_tierra_min_deg)
    v = ventanas(t, g)
    total_h = float(t[-1] - t[0]) if len(t) > 1 else 0.0
    horas = sum(_duraciones(v))
    sig = _sig(v, t_ref)
    d_med = float(np.mean(dist_km)) if dist_km is not None else DIST_TIERRA_LUNA_KM
    d_max = float(np.max(dist_km)) if dist_km is not None else DIST_TIERRA_LUNA_KM
    return {
        "horas_dte_h": _r(horas),
        "fraccion_dte": _r(horas / total_h if total_h else 0.0, 3),
        "n_ventanas_dte": len(v),
        "ventana_dte_max_h": _r(max(_duraciones(v), default=0.0)),
        "el_tierra_max_deg": _r(el.max(), 3),
        "t_hasta_tierra_puesta_h": _r(sig["hasta_fin_h"]),
        "t_hasta_tierra_salida_h": _r(sig["hasta_inicio_h"]),
        "tierra_visible_ahora": sig["activa"],
        "distancia_media_km": _r(d_med, 0),
        "fspl_db": _r(fspl_db(d_max, enlace.frecuencia_hz), 1),
        "tasa_max_mbps": _r(tasa_max_bps(d_max, enlace) / 1e6, 2),
        "_ventanas_dte": [(_r(a), _r(b)) for a, b in v],
    }


# ----------------------------------------------------------------------------
# Viabilidad (semáforo + puntaje)
# ----------------------------------------------------------------------------
def evaluar_viabilidad(en: dict, co: dict, req: Requisitos) -> dict:
    crit = []

    def add(nombre, valor, umbral, unidad, tipo):
        if umbral is None:
            return
        if tipo == "min":
            r = valor / umbral if umbral > 0 else 5.0
        else:  # "max": cuanto menor, mejor
            r = umbral / valor if valor > 0 else 5.0
        crit.append({"nombre": nombre, "valor": _r(valor), "umbral": _r(umbral),
                     "unidad": unidad, "tipo": tipo, "cumple": r >= 1.0,
                     "_r": min(r, 5.0)})

    add("Horas de luz útil", en["horas_luz_util_h"], req.horas_luz_min_h, "h", "min")
    add("Oscuridad continua máxima", en["oscuridad_continua_max_h"], req.oscuridad_max_h, "h", "max")
    add("Potencia media", en["potencia_media_w"], req.potencia_media_min_w, "W", "min")
    add("Horas de enlace directo (DTE)", co["horas_dte_h"], req.horas_dte_min_h, "h", "min")
    add("Ventana DTE más larga", co["ventana_dte_max_h"], req.ventana_dte_min_h, "h", "min")

    if not crit:
        return {"semaforo": "verde", "score": 100.0, "holgura_min": 5.0, "criterios": []}
    rs = [c["_r"] for c in crit]
    score = 100.0 * float(np.mean([min(r, 1.0) for r in rs]))
    semaforo = "verde" if min(rs) >= 1.0 else ("amarillo" if min(rs) >= 0.8 else "rojo")
    for c in crit:
        c.pop("_r")
    return {"semaforo": semaforo, "score": _r(score, 1), "holgura_min": _r(min(rs), 2),
            "criterios": crit}


# ----------------------------------------------------------------------------
# Escenario y calendario
# ----------------------------------------------------------------------------
def evaluar_escenario(ef: Efem, hor, panel, enlace, req, i0: int, i1: int) -> dict:
    s = slice(i0, i1 + 1)
    t = ef.t_h[s]
    f = None if ef.sol_f is None else ef.sol_f[s]
    r = None if ef.sol_r_ua is None else ef.sol_r_ua[s]
    d = None if ef.tierra_dist_km is None else ef.tierra_dist_km[s]
    en = metricas_energia(t, ef.sol_az[s], ef.sol_el[s], hor, panel, req, f, r)
    co = metricas_comunicacion(t, ef.tierra_az[s], ef.tierra_el[s], hor, enlace, req, d)
    return {"inicio_utc": np.datetime_as_string(ef.t_utc[i0], unit="s") + "Z",
            "fin_utc": np.datetime_as_string(ef.t_utc[i1], unit="s") + "Z",
            "energia": en, "comunicacion": co,
            "viabilidad": evaluar_viabilidad(en, co, req)}


def _indices(ef: Efem, inicio_h: float, duracion_h: float):
    i0 = int(np.searchsorted(ef.t_h, inicio_h))
    i1 = int(np.searchsorted(ef.t_h, inicio_h + duracion_h, side="right")) - 1
    return i0, i1


def calendario(ef, hor, panel, enlace, req, inicio_h=0.0, dias=60.0, paso_dias=1.0):
    """Evalúa una misión de req.duracion_h aterrizando cada `paso_dias` dentro de la ventana."""
    out = []
    k = 0
    while k * paso_dias <= dias:
        ini = inicio_h + k * paso_dias * 24.0
        if ini + req.duracion_h > ef.t_h[-1] + 1e-9:
            break
        i0, i1 = _indices(ef, ini, req.duracion_h)
        esc = evaluar_escenario(ef, hor, panel, enlace, req, i0, i1)
        v, en, co = esc["viabilidad"], esc["energia"], esc["comunicacion"]
        out.append({"fecha_utc": esc["inicio_utc"], "semaforo": v["semaforo"],
                    "score": v["score"], "holgura_min": v["holgura_min"],
                    "horas_luz_h": en["horas_luz_util_h"],
                    "oscuridad_max_h": en["oscuridad_continua_max_h"],
                    "potencia_media_w": en["potencia_media_w"],
                    "horas_dte_h": co["horas_dte_h"]})
        k += 1
    return out


def top_fechas(cal: list[dict], n: int = 3) -> list[dict]:
    """Ranking: mayor puntaje; desempata con la mayor holgura sobre los umbrales."""
    return sorted(cal, key=lambda c: (c["score"], c["holgura_min"]), reverse=True)[:n]


def comparar_paneles(ef: Efem, hor, panel: Panel, i0: int, i1: int) -> list[dict]:
    """Energía del mismo tramo con distintas configuraciones de panel.
    Muestra por qué en el polo sur no conviene un panel horizontal (el Sol nunca pasa de ~1.5°)."""
    s = slice(i0, i1 + 1)
    t, az, el = ef.t_h[s], ef.sol_az[s], ef.sol_el[s]
    f = ef.sol_f[s] if ef.sol_f is not None else ((el - elev_horizonte(az, hor)) > 0).astype(float)
    r = None if ef.sol_r_ua is None else ef.sol_r_ua[s]
    dur = float(t[-1] - t[0]) if len(t) > 1 else 1.0

    def evalua(p: Panel):
        pot = potencia_solar(el, az, p, f, r)
        return float(_trapz(pot, t)) if len(t) > 1 else 0.0

    fijo = replace(panel, inclinacion_deg=90.0, seguimiento_az=False)
    az_opt = max(range(0, 360, 10), key=lambda a: evalua(replace(fijo, az_panel_deg=float(a))))
    cfgs = [
        ("Horizontal", replace(panel, inclinacion_deg=0.0, seguimiento_az=False), None),
        ("Vertical fijo (azimut configurado)", fijo, fijo.az_panel_deg),
        ("Vertical fijo (azimut óptimo)", replace(fijo, az_panel_deg=float(az_opt)), float(az_opt)),
        ("Vertical con seguimiento en azimut", replace(panel, inclinacion_deg=90.0, seguimiento_az=True), None),
    ]
    out = []
    for nombre, p, az_p in cfgs:
        e = evalua(p)
        out.append({"configuracion": nombre, "energia_wh": _r(e, 1),
                    "potencia_media_w": _r(e / dur, 2), "az_panel_deg": az_p})
    return out


# ----------------------------------------------------------------------------
# Programa principal
# ----------------------------------------------------------------------------
def _limpiar(o):
    if isinstance(o, dict):
        return {k: _limpiar(v) for k, v in o.items() if not k.startswith("_")}
    if isinstance(o, list):
        return [_limpiar(x) for x in o]
    return o


def generar_metricas(ef, hor, panel, enlace, req, fecha_original=None, ventana_dias=60.0):
    t0 = ef.t_utc[0]
    if fecha_original:
        orig = np.datetime64(fecha_original.rstrip("Z"), "s")
        ini_h = float((orig - t0) / np.timedelta64(1, "h"))
    else:
        ini_h = 0.0
    i0, i1 = _indices(ef, ini_h, req.duracion_h)
    escenario = evaluar_escenario(ef, hor, panel, enlace, req, i0, i1)
    cal = calendario(ef, hor, panel, enlace, req, ini_h, ventana_dias)
    return _limpiar({
        "sitio": ef.sitio, "lat": ef.lat, "lon": ef.lon,
        "panel": {**asdict(panel), "eta": _r(panel.eta, 3)},
        "enlace": asdict(enlace), "requisitos": asdict(req),
        "escenario": escenario, "comparacion_paneles": comparar_paneles(ef, hor, panel, i0, i1),
        "calendario": cal, "recomendadas": top_fechas(cal, 3),
        "nota": "Métricas del escenario en horas y vatios; area_m2 = 1 implica W/m².",
    })


def main():
    ap = argparse.ArgumentParser(description="Rol D · Energía y comunicación")
    ap.add_argument("--sitio", required=True)
    ap.add_argument("--efem", required=True)
    ap.add_argument("--horizonte", default=None)
    ap.add_argument("--fecha-original", default=None)
    ap.add_argument("--ventana-dias", type=float, default=60.0)
    ap.add_argument("--duracion-h", type=float, default=None)
    ap.add_argument("--config", default=None, help="JSON con panel/enlace/requisitos")
    ap.add_argument("--salida", default=None)
    a = ap.parse_args()

    cfg = json.loads(Path(a.config).read_text(encoding="utf-8")) if a.config else {}
    panel, enlace = Panel(**cfg.get("panel", {})), Enlace(**cfg.get("enlace", {}))
    req = Requisitos(**cfg.get("requisitos", {}))
    if a.duracion_h:
        req.duracion_h = a.duracion_h
    ef = cargar_efemerides(a.efem)
    hor = cargar_horizonte(a.horizonte) if a.horizonte else None
    res = generar_metricas(ef, hor, panel, enlace, req, a.fecha_original, a.ventana_dias)
    salida = Path(a.salida or f"metricas_{a.sitio}.json")
    salida.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    v = res["escenario"]["viabilidad"]
    print(f"{a.sitio}: {v['semaforo'].upper()} (puntaje {v['score']}) -> {salida}")
    for c in res["recomendadas"]:
        print(f"  top: {c['fecha_utc']}  {c['semaforo']:8s} score={c['score']}")


if __name__ == "__main__":
    main()
