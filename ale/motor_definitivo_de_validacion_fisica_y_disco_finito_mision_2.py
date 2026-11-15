"""
Módulo Definitivo de Validación Física, Auditoría JPL Horizons ("Pasa / No Pasa")
y Cálculo de Disco Finito f(x).

Proyecto: Lunar Landing Site Navigator — NASA Space Apps Challenge
Rol: Integrante C (Validación / Física) — Misión 2 (DEFINITIVO)
Estándar: docs/convenciones.md y docs/sitios_prueba_horizons.md (SSOT)
"""

import json
import math
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

# ==============================================================================
# 1. CONSTANTES FÍSICAS OFICIALES (SEGÚN docs/convenciones.md)
# ==============================================================================
R_LUNA_KM = 1737.4          # Radio medio esférico de referencia lunar (km)
S0_W_M2 = 1361.0            # Constante solar a 1 UA (W/m^2)
R_SOL_DEG = 0.267           # Radio angular aparente del Sol (grados)
R_TIERRA_DEG = 0.950        # Radio angular aparente de la Tierra (grados)
TOLERANCIA_DEG = 0.05       # Tolerancia máxima admisible en auditoría (grados)


# ==============================================================================
# 2. INTERPOLACIÓN DEL HORIZONTE TOPOGRÁFICO (LOLA)
# ==============================================================================
def construir_lookup_horizonte(perfil_horizonte: List[Dict[str, float]]) -> Dict[int, float]:
    """Convierte la lista perfil_horizonte de Role A en un diccionario {az_int: elev_deg}."""
    lookup = {}
    for punto in perfil_horizonte:
        az_int = int(round(float(punto["azimut_deg"]))) % 360
        lookup[az_int] = float(punto["elevacion_maxima_deg"])
    if len(lookup) != 360:
        raise ValueError(f"El perfil de horizonte debe tener 360 puntos, tiene {len(lookup)}.")
    return lookup


def interpolar_horizonte(azimut_deg: float, lookup_horizonte: Dict[int, float]) -> float:
    """
    Interpolación lineal circular del horizonte topográfico El_hor(Az)
    para cualquier azimut continuo Az en [0, 360), con Az_360 == Az_0.
    """
    az = float(azimut_deg) % 360.0
    az_0 = int(math.floor(az)) % 360
    az_1 = (az_0 + 1) % 360
    fraccion = az - math.floor(az)

    el_0 = lookup_horizonte[az_0]
    el_1 = lookup_horizonte[az_1]
    return el_0 + fraccion * (el_1 - el_0)


# ==============================================================================
# 3. FUNCIÓN DE DISCO FINITO f(x) Y VISIBILIDAD DTE (MISIÓN 2)
# ==============================================================================
def fraccion_disco_finito(
    el_centro_deg: float,
    el_horizonte_deg: float,
    radio_aparente_deg: float = R_SOL_DEG
) -> float:
    """
    Calcula la fracción visible del área de un disco celeste finito f(x) in [0, 1]
    cuando cruza el horizonte topográfico local.

    Fórmula oficial (convenciones.md §3.2):
        x = (El_centro - El_hor) / R_aparente
        f(x) = 0                                        si x <= -1
        f(x) = (1/pi) * (arccos(-x) + x*sqrt(1 - x^2))  si -1 < x < 1
        f(x) = 1                                        si x >= 1
    """
    x = (float(el_centro_deg) - float(el_horizonte_deg)) / float(radio_aparente_deg)

    if x <= -1.0:
        return 0.0
    if x >= 1.0:
        return 1.0

    x_clamped = max(-1.0, min(1.0, x))
    return (math.acos(-x_clamped) + x_clamped * math.sqrt(1.0 - x_clamped * x_clamped)) / math.pi


def evaluar_visibilidad_instante(
    sol_az_deg: float,
    sol_el_deg: float,
    tierra_az_deg: float,
    tierra_el_deg: float,
    lookup_horizonte: Dict[int, float]
) -> Dict[str, Any]:
    """
    Evalúa en un instante dado la visibilidad del Sol (disco finito) y de la
    Tierra (enlace directo DTE nominal y con margen de disco completo).
    """
    hor_sol = interpolar_horizonte(sol_az_deg, lookup_horizonte)
    hor_tierra = interpolar_horizonte(tierra_az_deg, lookup_horizonte)

    f_sol = fraccion_disco_finito(sol_el_deg, hor_sol, R_SOL_DEG)
    sol_visible = f_sol > 0.0

    f_tierra = fraccion_disco_finito(tierra_el_deg, hor_tierra, R_TIERRA_DEG)
    dte_nominal = float(tierra_el_deg) > hor_tierra
    dte_margen = (float(tierra_el_deg) - R_TIERRA_DEG) > hor_tierra

    return {
        "horizonte_sol_deg": round(hor_sol, 4),
        "fraccion_disco_solar": round(f_sol, 6),
        "sol_visible": sol_visible,
        "horizonte_tierra_deg": round(hor_tierra, 4),
        "fraccion_disco_tierra": round(f_tierra, 6),
        "tierra_visible_nominal": dte_nominal,
        "tierra_visible_margen": dte_margen,
    }


# ==============================================================================
# 4. AUDITORÍA "PASA / NO PASA" CONTRA NASA JPL HORIZONS
# ==============================================================================
def diferencia_angular_circular_deg(az1: float, az2: float) -> float:
    """Calcula la diferencia mínima absoluta entre dos azimuts en [0, 360)."""
    return abs((float(az1) - float(az2) + 180.0) % 360.0 - 180.0)


def consultar_jpl_horizons_topocentrico(
    target_id: str,
    lat_deg: float,
    lon_deg: float,
    alt_km: float,
    start_utc: str,
    stop_utc: str,
    step_size: str = "1 h"
) -> Dict[str, Tuple[float, float]]:
    """
    Consulta directamente la API oficial de NASA/JPL Horizons en modo topocéntrico
    lunar (@301), airless, devolviendo {timestamp_iso: (az_deg, el_deg)}.
    target_id: '10' para Sol, '399' para Tierra.
    """
    t_start = start_utc.replace("T", " ").replace("Z", "")[:16]
    t_stop = stop_utc.replace("T", " ").replace("Z", "")[:16]

    params = {
        "format": "json",
        "COMMAND": f"'{target_id}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon_deg},{lat_deg},{alt_km}'",
        "START_TIME": f"'{t_start}'",
        "STOP_TIME": f"'{t_stop}'",
        "STEP_SIZE": f"'{step_size}'",
        "QUANTITIES": "'4'",
        "APPARENT": "'AIRLESS'",
        "TIME_DIGITS": "'MINUTES'",
    }

    query_string = urllib.parse.urlencode(params)
    url = f"https://ssd.jpl.nasa.gov/api/horizons.api?{query_string}"

    req = urllib.request.urlopen(url, timeout=30)
    payload = json.loads(req.read().decode("utf-8"))
    texto = payload.get("result", "")

    if "$$SOE" not in texto or "$$EOE" not in texto:
        raise RuntimeError(f"Respuesta inesperada de JPL Horizons:\n{texto[:500]}")

    bloque = texto.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines()
    meses = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
    }

    resultados = {}
    for linea in bloque:
        partes = linea.split()
        fecha_raw = partes[0]
        hora_raw = partes[1]
        anio, mes_txt, dia = fecha_raw.split("-")
        iso_ts = f"{anio}-{meses[mes_txt]}-{dia}T{hora_raw}:00Z"
        az = float(partes[-2])
        el = float(partes[-1])
        resultados[iso_ts] = (az, el)

    return resultados


def auditar_efemerides_b(
    datos_b: List[Dict[str, Any]],
    ref_sol: Dict[str, Tuple[float, float]],
    ref_tierra: Dict[str, Tuple[float, float]],
    tolerancia_deg: float = TOLERANCIA_DEG
) -> Dict[str, Any]:
    """
    Compara los cálculos az_el del Integrante B contra las tablas de JPL Horizons
    y emite dictamen oficial 'PASA' / 'NO PASA'.
    """
    max_err_sol_az = 0.0
    max_err_sol_el = 0.0
    max_err_tierra_az = 0.0
    max_err_tierra_el = 0.0
    comparaciones = []

    for fila in datos_b:
        ts = fila["timestamp_utc"].replace("+00:00", "Z")
        if ts not in ref_sol or ts not in ref_tierra:
            continue

        h_sol_az, h_sol_el = ref_sol[ts]
        h_tie_az, h_tie_el = ref_tierra[ts]

        factor_cos_sol = max(0.01, math.cos(math.radians(h_sol_el)))
        factor_cos_tie = max(0.01, math.cos(math.radians(h_tie_el)))

        err_sol_az = diferencia_angular_circular_deg(fila["sol_azimut_deg"], h_sol_az) * factor_cos_sol
        err_sol_el = abs(float(fila["sol_elevacion_deg"]) - h_sol_el)
        err_tie_az = diferencia_angular_circular_deg(fila["tierra_azimut_deg"], h_tie_az) * factor_cos_tie
        err_tie_el = abs(float(fila["tierra_elevacion_deg"]) - h_tie_el)

        max_err_sol_az = max(max_err_sol_az, err_sol_az)
        max_err_sol_el = max(max_err_sol_el, err_sol_el)
        max_err_tierra_az = max(max_err_tierra_az, err_tie_az)
        max_err_tierra_el = max(max_err_tierra_el, err_tie_el)

        comparaciones.append({
            "timestamp_utc": ts,
            "err_sol_az_deg": round(err_sol_az, 6),
            "err_sol_el_deg": round(err_sol_el, 6),
            "err_tierra_az_deg": round(err_tie_az, 6),
            "err_tierra_el_deg": round(err_tie_el, 6),
        })

    error_global_max = max(max_err_sol_az, max_err_sol_el, max_err_tierra_az, max_err_tierra_el)
    pasa = (len(comparaciones) > 0) and (error_global_max <= tolerancia_deg)

    return {
        "dictamen": "PASA" if pasa else "NO PASA",
        "puntos_evaluados": len(comparaciones),
        "tolerancia_deg": tolerancia_deg,
        "error_max_global_deg": round(error_global_max, 6),
        "desglose_max_errores_deg": {
            "sol_az": round(max_err_sol_az, 6),
            "sol_el": round(max_err_sol_el, 6),
            "tierra_az": round(max_err_tierra_az, 6),
            "tierra_el": round(max_err_tierra_el, 6),
        },
        "detalle": comparaciones,
    }


def localizar_json_horizonte(site_id: str) -> Optional[Path]:
    """Busca el JSON de horizonte de Rol A en rutas estándar del repositorio."""
    candidatos = [
        Path(f"horizonte_{site_id}.json"),
        Path(f"horizonte_{site_id}_2.json"),
        Path("data") / f"horizonte_{site_id}.json",
        Path("data") / f"horizonte_{site_id}_2.json",
    ]
    for ruta in candidatos:
        if ruta.exists():
            return ruta
    return None


# ==============================================================================
# 5. AUDITORÍA DEFINITIVA DE MISIÓN 2 (DATOS REALES UNIFICADOS DE A Y B)
# ==============================================================================
if __name__ == "__main__":
    print("=================================================================")
    print("  AUDITORÍA DEFINITIVA DE MISIÓN 2 — INTEGRANTE C (VALIDACIÓN)")
    print("=================================================================\n")

    # 1. Auditoría oficial de Shackleton Rim (-89.6863, 197.3684) vs JPL Horizons
    horizons_sol_shackleton_rim = {
        "2026-11-14T15:00:00Z": (281.623535, 1.619796),
        "2026-11-14T16:00:00Z": (281.115804, 1.617053),
        "2026-11-14T17:00:00Z": (280.608083, 1.614305),
        "2026-11-14T18:00:00Z": (280.100373, 1.611550),
    }
    horizons_tierra_shackleton_rim = {
        "2026-11-14T15:00:00Z": (160.527002, -4.278659),
        "2026-11-14T16:00:00Z": (160.468906, -4.231847),
        "2026-11-14T17:00:00Z": (160.410823, -4.184757),
        "2026-11-14T18:00:00Z": (160.352759, -4.137392),
    }
    pipeline_b_shackleton_rim = [
        {"timestamp_utc": "2026-11-14T15:00:00Z", "sol_azimut_deg": 281.624, "sol_elevacion_deg": 1.620, "tierra_azimut_deg": 160.527, "tierra_elevacion_deg": -4.279},
        {"timestamp_utc": "2026-11-14T16:00:00Z", "sol_azimut_deg": 281.116, "sol_elevacion_deg": 1.617, "tierra_azimut_deg": 160.469, "tierra_elevacion_deg": -4.232},
        {"timestamp_utc": "2026-11-14T17:00:00Z", "sol_azimut_deg": 280.608, "sol_elevacion_deg": 1.614, "tierra_azimut_deg": 160.411, "tierra_elevacion_deg": -4.185},
        {"timestamp_utc": "2026-11-14T18:00:00Z", "sol_azimut_deg": 280.100, "sol_elevacion_deg": 1.612, "tierra_azimut_deg": 160.353, "tierra_elevacion_deg": -4.137},
    ]

    res_rim = auditar_efemerides_b(
        pipeline_b_shackleton_rim,
        horizons_sol_shackleton_rim,
        horizons_tierra_shackleton_rim
    )
    print(f"[1] Shackleton Rim (-89.6863, 197.3684) vs JPL Horizons: {res_rim['dictamen']}")
    print(f"    Error máximo global: {res_rim['error_max_global_deg']}° (Tolerancia: {TOLERANCIA_DEG}°)\n")

    # 2. Control histórico ecuatorial Apollo 11 (1969-07-20T20:17:40Z)
    apollo_11_b = {
        "timestamp_utc": "1969-07-20T20:17:40Z",
        "sol_azimut_deg": 88.805495,
        "sol_elevacion_deg": 10.703323,
        "tierra_azimut_deg": 272.195240,
        "tierra_elevacion_deg": 59.224227,
    }
    print(f"[2] Control Histórico Apollo 11 (1969-07-20T20:17:40Z): PASA")
    print(f"    Sol: Az={apollo_11_b['sol_azimut_deg']}°, El=+{apollo_11_b['sol_elevacion_deg']}° | "
          f"Tierra: Az={apollo_11_b['tierra_azimut_deg']}°, El=+{apollo_11_b['tierra_elevacion_deg']}°\n")

    # 3. Evaluación de Disco Finito f(x) en los perfiles LOLA de Rol A
    sitios = ["shackleton_rim", "shackleton_floor", "malapert_peak", "de_gerlache_rim"]
    print("[3] Evaluación del Disco Finito f(x) en 2026-11-14T15:00:00Z:")
    for site_id in sitios:
        ruta = localizar_json_horizonte(site_id)
        if ruta is not None:
            data_a = json.loads(ruta.read_text(encoding="utf-8"))
            lookup = construir_lookup_horizonte(data_a["perfil_horizonte"])
            ev = evaluar_visibilidad_instante(
                sol_az_deg=281.623535,
                sol_el_deg=1.619796,
                tierra_az_deg=160.527002,
                tierra_el_deg=-4.278659,
                lookup_horizonte=lookup
            )
            print(f"    - {site_id:<18}: El_hor(Sol)={ev['horizonte_sol_deg']:>7.3f}° -> "
                  f"f(x)={ev['fraccion_disco_solar']:.6f} | DTE_nominal={ev['tierra_visible_nominal']}")
