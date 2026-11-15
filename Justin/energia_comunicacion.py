"""
Motor de Energía Solar, Disco Finito y Comunicaciones Direct-to-Earth (DTE)
Proyecto: Lunar Landing Site Navigator — NASA Space Apps Challenge
Responsable: Integrante D (Justin — Potencia, Energía y Comunicaciones)
Sincronizado con SSOT v3.0 (docs/convenciones.md)
"""

import json
import math
from pathlib import Path
import numpy as np

# Constantes físicas oficiales (SSOT - docs/convenciones.md)
S0_WM2 = 1361.0              # Constante solar a 1 UA (W/m^2)
R_SOL_DEG = 0.267            # Radio angular aparente del Sol (grados)
R_TIERRA_DEG = 0.950         # Radio angular aparente de la Tierra (grados)
MARGEN_DTE_DEG = 0.500       # Margen operativo mínimo sobre horizonte para enlace DTE (grados)

# Parámetros nominales de referencia del sistema fotovoltaico (lander clase CLPS)
EFICIENCIA_PANEL_DEFAULT = 0.28   # 28% (celdas triple unión espacial)
AREA_PANEL_M2_DEFAULT = 2.5       # 2.5 m^2


def cargar_horizonte(ruta_horizonte: Path) -> tuple[np.ndarray, np.ndarray]:
    """
    Lee el perfil de horizonte LOLA de `cris/horizonte_<site_id>.json`.
    Soporta tanto la clave `horizonte` como `perfil_horizonte`.
    """
    with open(ruta_horizonte, "r", encoding="utf-8") as f:
        data = json.load(f)

    lista_hor = data.get("horizonte") or data.get("perfil_horizonte")
    if not lista_hor:
        raise ValueError(f"El archivo {ruta_horizonte} no contiene perfil de horizonte válido.")

    puntos = sorted(lista_hor, key=lambda p: float(p["azimut_deg"]))
    az = np.array([float(p["azimut_deg"]) for p in puntos], dtype=float)
    clave_el = "elevacion_max_deg" if "elevacion_max_deg" in puntos[0] else "elevacion_maxima_deg"
    el = np.array([float(p[clave_el]) for p in puntos], dtype=float)
    return az, el


def interpolar_horizonte(az_query: np.ndarray, az_grid: np.ndarray, el_grid: np.ndarray) -> np.ndarray:
    """Interpolación lineal periódica en [0, 360) grados de azimut."""
    az_mod = np.mod(az_query, 360.0)
    az_ext = np.concatenate([az_grid, [360.0]])
    el_ext = np.concatenate([el_grid, [el_grid[0]]])
    return np.interp(az_mod, az_ext, el_ext)


def fraccion_disco_finito(el_sol: np.ndarray, el_hor: np.ndarray, r_sol: float = R_SOL_DEG) -> np.ndarray:
    """
    Calcula la fracción visible f(x) en [0.0, 1.0] del disco solar considerando
    el tamaño angular finito del Sol (R_sol = 0.267°).
    """
    x = (el_sol - el_hor) / r_sol
    f = np.zeros_like(x, dtype=float)
    f[x >= 1.0] = 1.0
    mask = (x > -1.0) & (x < 1.0)
    xm = x[mask]
    f[mask] = (1.0 / math.pi) * (np.arccos(-xm) + xm * np.sqrt(1.0 - xm**2))
    return f


def calcular_potencia_y_dte(
    efem: dict,
    az_hor: np.ndarray,
    el_hor: np.ndarray,
    eficiencia: float = EFICIENCIA_PANEL_DEFAULT,
    area_m2: float = AREA_PANEL_M2_DEFAULT,
) -> dict:
    """
    Calcula series horarias y métricas consolidadas de potencia solar (tracking y fijo horizontal)
    y ventanas de enlace directo con la Tierra (Direct-to-Earth / DTE).
    """
    tiempos = efem["t"]
    sun_az = np.array(efem["sun"]["az"], dtype=float)
    sun_el = np.array(efem["sun"]["el"], dtype=float)
    earth_az = np.array(efem["earth"]["az"], dtype=float)
    earth_el = np.array(efem["earth"]["el"], dtype=float)

    hor_sun = interpolar_horizonte(sun_az, az_hor, el_hor)
    hor_earth = interpolar_horizonte(earth_az, az_hor, el_hor)

    # 1. Iluminación con disco finito
    f_sol = fraccion_disco_finito(sun_el, hor_sun, R_SOL_DEG)

    # 2. Potencia eléctrica instantánea (W)
    p_max_w = S0_WM2 * eficiencia * area_m2
    potencia_tracking_w = p_max_w * f_sol
    seno_incidencia = np.maximum(0.0, np.sin(np.radians(sun_el)))
    potencia_horizontal_w = p_max_w * f_sol * seno_incidencia

    # 3. Enlace Directo con la Tierra (DTE)
    margen_tierra_deg = earth_el - hor_earth
    dte_nominal = margen_tierra_deg > 0.0
    dte_operativo = margen_tierra_deg >= MARGEN_DTE_DEG
    dte_disco_completo = margen_tierra_deg >= R_TIERRA_DEG

    # 4. Métricas acumuladas (asumiendo paso horario de 1h)
    horas_totales = len(tiempos)
    horas_luz_efectiva = float(np.sum(f_sol))
    horas_luz_parcial_o_total = int(np.sum(f_sol > 0.0))
    horas_sombra_total = int(np.sum(f_sol == 0.0))

    energia_tracking_kwh = float(np.sum(potencia_tracking_w)) / 1000.0
    energia_horizontal_kwh = float(np.sum(potencia_horizontal_w)) / 1000.0

    horas_dte_nominal = int(np.sum(dte_nominal))
    horas_dte_operativo = int(np.sum(dte_operativo))

    # Racha máxima continua sin luz solar (crítico para diseño de baterías)
    max_apagon_solar_h = 0
    racha_actual = 0
    for val in f_sol:
        if val == 0.0:
            racha_actual += 1
            max_apagon_solar_h = max(max_apagon_solar_h, racha_actual)
        else:
            racha_actual = 0

    return {
        "site_id": efem["site"],
        "lat_deg": efem["lat"],
        "lon_deg": efem["lon"],
        "alt_m": efem["alt_m"],
        "periodo_utc": {"inicio": tiempos[0], "fin": tiempos[-1], "horas_totales": horas_totales},
        "parametros_sistema": {
            "S0_wm2": S0_WM2,
            "eficiencia_panel": eficiencia,
            "area_panel_m2": area_m2,
            "potencia_pico_nominal_w": round(p_max_w, 2),
            "margen_dte_deg": MARGEN_DTE_DEG,
        },
        "resumen_energia": {
            "horas_luz_efectiva_fx": round(horas_luz_efectiva, 2),
            "horas_sol_visible": horas_luz_parcial_o_total,
            "horas_sombra_total": horas_sombra_total,
            "porcentaje_iluminacion_pct": round((horas_luz_efectiva / horas_totales) * 100.0, 2),
            "energia_total_tracking_kwh": round(energia_tracking_kwh, 2),
            "energia_total_horizontal_kwh": round(energia_horizontal_kwh, 2),
            "potencia_media_tracking_w": round(float(np.mean(potencia_tracking_w)), 2),
            "max_apagon_solar_continuo_h": max_apagon_solar_h,
        },
        "resumen_comunicaciones_dte": {
            "horas_dte_nominal": horas_dte_nominal,
            "horas_dte_operativo_margen_05deg": horas_dte_operativo,
            "porcentaje_dte_nominal_pct": round((horas_dte_nominal / horas_totales) * 100.0, 2),
            "porcentaje_dte_operativo_pct": round((horas_dte_operativo / horas_totales) * 100.0, 2),
            "elevacion_tierra_max_deg": round(float(np.max(earth_el)), 3),
            "elevacion_tierra_min_deg": round(float(np.min(earth_el)), 3),
        },
        "series_horarias": {
            "t": tiempos,
            "fraccion_disco_sol": [round(float(v), 4) for v in f_sol],
            "potencia_tracking_w": [round(float(v), 2) for v in potencia_tracking_w],
            "potencia_horizontal_w": [round(float(v), 2) for v in potencia_horizontal_w],
            "margen_tierra_deg": [round(float(v), 3) for v in margen_tierra_deg],
            "dte_operativo": [bool(v) for v in dte_operativo],
        },
    }


def procesar_todos_los_sitios(base_dir: Path) -> dict:
    """Procesa automáticamente los 6 sitios oficiales desde `horizons_b/` y `cris/`."""
    with open(base_dir / "justin" / "sitios.json", "r", encoding="utf-8") as f:
        catalogo = json.load(f)

    resumen_global = []
    for sitio in catalogo["sitios"]:
        site_id = sitio["site_id"]
        ruta_efem = base_dir / sitio["archivo_efemerides"]
        ruta_hor = base_dir / sitio["archivo_horizonte"]

        if not ruta_efem.exists():
            print(f"[AVISO] Falta archivo de efemérides: {ruta_efem}")
            continue

        with open(ruta_efem, "r", encoding="utf-8") as f:
            efem = json.load(f)

        # Si es apollo_11 y no hay archivo de horizonte DEM, usar horizonte plano ecuatorial 0.0°
        if ruta_hor.exists():
            az_hor, el_hor = cargar_horizonte(ruta_hor)
        elif site_id == "apollo_11":
            az_hor = np.arange(0.0, 360.0, 1.0)
            el_hor = np.zeros_like(az_hor)
        else:
            print(f"[AVISO] Falta archivo de horizonte: {ruta_hor}")
            continue

        resultado = calcular_potencia_y_dte(efem, az_hor, el_hor)
        ruta_salida = base_dir / "justin" / f"metricas_{site_id}.json"
        with open(ruta_salida, "w", encoding="utf-8") as f:
            json.dump(resultado, f, indent=2, ensure_ascii=False)

        resumen_global.append({
            "site_id": site_id,
            "nombre": sitio["nombre"],
            "iluminacion_pct": resultado["resumen_energia"]["porcentaje_iluminacion_pct"],
            "energia_tracking_kwh": resultado["resumen_energia"]["energia_total_tracking_kwh"],
            "dte_operativo_pct": resultado["resumen_comunicaciones_dte"]["porcentaje_dte_operativo_pct"],
            "max_apagon_solar_h": resultado["resumen_energia"]["max_apagon_solar_continuo_h"],
        })
        print(f"[OK] Generado: justin/metricas_{site_id}.json")

    ruta_resumen = base_dir / "justin" / "resumen_comparativo_6_sitios.json"
    with open(ruta_resumen, "w", encoding="utf-8") as f:
        json.dump({"sitios": resumen_global}, f, indent=2, ensure_ascii=False)

    return {"sitios": resumen_global}


if __name__ == "__main__":
    raiz_repo = Path(__file__).resolve().parent.parent
    procesar_todos_los_sitios(raiz_repo)
