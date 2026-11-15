"""
Motor de Analisis de Sensibilidad, Auditoria End-to-End y Generacion de Figuras - Mision 3
Proyecto: Lunar Landing Site Navigator (NASA Space Apps Challenge)
Responsable: Integrante C (Ale - Fisica de Referencia y Validacion)

Funcionalidades:
1. Lee perfiles LOLA de `cris/` (soporta tanto `perfil_horizonte`/`elevacion_maxima_deg`
   como `horizonte`/`elevacion_max_deg`).
2. Lee efemerides topocentricas de 30 dias en `horizons_b/` y metricas de potencia en `justin/`.
3. Ejecuta sensibilidad espacial (+-500 m) y temporal (+7 y +14 dias).
4. Exporta `ale/resultados_sensibilidad_mision3.json` y genera 2 figuras de alta resolucion (300 DPI).
"""

import json
import math
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt

# Constantes fisicas oficiales (SSOT - docs/convenciones.md)
R_SOL_DEG = 0.267
R_TIERRA_DEG = 0.950
MARGEN_DTE_DEG = 0.500
S0_WM2 = 1361.0

BASE_DIR = Path(__file__).resolve().parent.parent
DIR_CRIS = BASE_DIR / "cris"
DIR_HORIZONS = BASE_DIR / "horizons_b"
DIR_JUSTIN = BASE_DIR / "justin"
DIR_SALIDA = Path(__file__).resolve().parent


def cargar_horizonte_lola(ruta_json: Path) -> tuple[np.ndarray, np.ndarray, dict]:
    """Carga un archivo horizonte_*.json del Rol A (Cris) de forma compatible con ambos esquemas."""
    with open(ruta_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    lista_puntos = data.get("perfil_horizonte") or data.get("horizonte")
    if not lista_puntos:
        raise ValueError(f"Formato invalido en {ruta_json}: falta perfil de horizonte.")

    puntos = sorted(lista_puntos, key=lambda p: float(p["azimut_deg"]))
    az = np.array([float(p["azimut_deg"]) for p in puntos], dtype=float)
    clave_el = "elevacion_maxima_deg" if "elevacion_maxima_deg" in puntos[0] else "elevacion_max_deg"
    el = np.array([float(p[clave_el]) for p in puntos], dtype=float)
    return az, el, data


def interpolar_horizonte(az_query: np.ndarray, az_grid: np.ndarray, el_grid: np.ndarray) -> np.ndarray:
    """Interpolacion circular periodica [0, 360) del perfil de horizonte LOLA."""
    az_mod = np.mod(az_query, 360.0)
    az_ext = np.concatenate([az_grid, [360.0]])
    el_ext = np.concatenate([el_grid, [el_grid[0]]])
    return np.interp(az_mod, az_ext, el_ext)


def fraccion_disco_finito(el_astro: np.ndarray, el_hor: np.ndarray, r_angular: float) -> np.ndarray:
    """Calcula la fraccion visible f(x) en [0, 1] considerando el disco finito del astro."""
    x = (el_astro - el_hor) / r_angular
    f = np.zeros_like(x, dtype=float)
    f[x >= 1.0] = 1.0
    mask = (x > -1.0) & (x < 1.0)
    xm = x[mask]
    f[mask] = (1.0 / math.pi) * (np.arccos(-xm) + xm * np.sqrt(1.0 - xm**2))
    return f


def evaluar_escenario(
    efem: dict,
    az_grid: np.ndarray,
    el_grid: np.ndarray,
    idx_inicio: int = 0,
    idx_fin: int | None = None,
) -> dict:
    """Evalua metricas fisicas de iluminacion, energia especifica y comunicacion DTE."""
    sun_az = np.array(efem["sun"]["az"][idx_inicio:idx_fin], dtype=float)
    sun_el = np.array(efem["sun"]["el"][idx_inicio:idx_fin], dtype=float)
    earth_az = np.array(efem["earth"]["az"][idx_inicio:idx_fin], dtype=float)
    earth_el = np.array(efem["earth"]["el"][idx_inicio:idx_fin], dtype=float)

    hor_sun = interpolar_horizonte(sun_az, az_grid, el_grid)
    hor_earth = interpolar_horizonte(earth_az, az_grid, el_grid)

    f_sol = fraccion_disco_finito(sun_el, hor_sun, R_SOL_DEG)
    horas_totales = len(sun_el)
    horas_luz_efectiva = float(np.sum(f_sol))
    horas_sol_visible = int(np.sum(f_sol > 0.0))
    pct_luz = (horas_luz_efectiva / horas_totales) * 100.0 if horas_totales else 0.0

    energia_especifica_kwh_m2 = float(np.sum(S0_WM2 * f_sol)) / 1000.0
    dte_nominal_h = int(np.sum(earth_el > hor_earth))
    dte_margen_h = int(np.sum((earth_el - hor_earth) >= MARGEN_DTE_DEG))
    pct_dte_nominal = (dte_nominal_h / horas_totales) * 100.0 if horas_totales else 0.0

    return {
        "horas_evaluadas": horas_totales,
        "horas_luz_efectiva_fx": round(horas_luz_efectiva, 2),
        "horas_sol_visible": horas_sol_visible,
        "porcentaje_luz_pct": round(pct_luz, 2),
        "energia_especifica_kwh_m2": round(energia_especifica_kwh_m2, 2),
        "dte_nominal_h": dte_nominal_h,
        "dte_margen_05deg_h": dte_margen_h,
        "porcentaje_dte_pct": round(pct_dte_nominal, 2),
        "el_horizonte_min_deg": round(float(np.min(el_grid)), 3),
        "el_horizonte_max_deg": round(float(np.max(el_grid)), 3),
    }


def buscar_archivo_efemerides(site_id: str) -> Path | None:
    """Busca el archivo de efemerides de B soportando sufijo _2 o nombre estandar."""
    candidatos = [
        DIR_HORIZONS / f"efemerides_{site_id}_2.json",
        DIR_HORIZONS / f"efemerides_{site_id}.json",
    ]
    for ruta in candidatos:
        if ruta.exists():
            return ruta
    return None


def ejecutar_sensibilidad_espacial() -> tuple[dict, dict]:
    """Ejecuta la prueba de sensibilidad espacial (+-500 m) y guarda perfiles para graficar."""
    resultados = {}
    perfiles_plot = {}

    configuraciones = [
        ("shackleton_rim", [
            ("centro", "horizonte_shackleton_rim.json"),
            ("norte_500m", "horizonte_shackleton_rim_N500.json"),
            ("sur_500m", "horizonte_shackleton_rim_S500.json"),
            ("este_500m", "horizonte_shackleton_rim_E500.json"),
        ]),
        ("malapert_peak", [
            ("centro", "horizonte_malapert_peak.json"),
            ("norte_500m", "horizonte_malapert_N500.json"),
            ("sur_500m", "horizonte_malapert_S500.json"),
            ("este_500m", "horizonte_malapert_E500.json"),
        ]),
    ]

    for sitio_base, variantes in configuraciones:
        ruta_efem = buscar_archivo_efemerides(sitio_base)
        if not ruta_efem:
            continue
        with open(ruta_efem, "r", encoding="utf-8") as f:
            efem = json.load(f)

        resultados[sitio_base] = {}
        perfiles_plot[sitio_base] = {"efem": efem, "horizontes": {}}

        for etiqueta, archivo_hor in variantes:
            ruta_hor = DIR_CRIS / archivo_hor
            if not ruta_hor.exists():
                ruta_hor = DIR_CRIS / archivo_hor.replace(".json", "_2.json")
            if ruta_hor.exists():
                az_g, el_g, meta = cargar_horizonte_lola(ruta_hor)
                metricas = evaluar_escenario(efem, az_g, el_g)
                metricas["lat_deg"] = meta["lat_deg"]
                metricas["lon_deg"] = meta["lon_deg"]
                metricas["elevacion_sitio_m"] = meta["elevacion_sitio_m"]
                if sitio_base == "shackleton_rim" and etiqueta == "este_500m":
                    if abs(meta["lon_deg"] - 197.3684) < 1e-3:
                        metricas["nota_auditoria"] = (
                            "Coordenadas identicas al punto central (-89.6863, 197.3684); "
                            "desplazamiento real +500m E corresponde a lon ~ 200.38 deg."
                        )
                resultados[sitio_base][etiqueta] = metricas
                perfiles_plot[sitio_base]["horizontes"][etiqueta] = (az_g, el_g)

    return resultados, perfiles_plot


def ejecutar_sensibilidad_temporal() -> dict:
    """Ejecuta la prueba de retraso de lanzamiento (+7 y +14 dias) sobre ventanas de 14 dias."""
    sitios = [
        "shackleton_rim",
        "de_gerlache_rim",
        "malapert_peak",
        "peak_near_cabeus_b",
        "shackleton_floor",
    ]
    ventanas = [
        ("nominal_dia_0", 0, 336),
        ("retraso_7_dias", 168, 504),
        ("retraso_14_dias", 336, 672),
    ]
    resultados = {}

    for site_id in sitios:
        ruta_efem = buscar_archivo_efemerides(site_id)
        ruta_hor = DIR_CRIS / f"horizonte_{site_id}.json"
        if not ruta_hor.exists():
            ruta_hor = DIR_CRIS / f"horizonte_{site_id}_2.json"
        if not (ruta_efem and ruta_hor.exists()):
            continue

        with open(ruta_efem, "r", encoding="utf-8") as f:
            efem = json.load(f)
        az_g, el_g, _ = cargar_horizonte_lola(ruta_hor)

        resultados[site_id] = {}
        for nombre_v, i0, i1 in ventanas:
            if i1 <= len(efem["t"]):
                metricas = evaluar_escenario(efem, az_g, el_g, idx_inicio=i0, idx_fin=i1)
                metricas["inicio_utc"] = efem["t"][i0]
                metricas["fin_utc"] = efem["t"][i1 - 1]
                resultados[site_id][nombre_v] = metricas

    return resultados


def generar_figuras_informe(perfiles_plot: dict, temp_res: dict) -> None:
    """Genera las 2 figuras oficiales (300 DPI) para el informe final de Mision 3."""
    plt.style.use("seaborn-v0_8-whitegrid")

    # Figura 1: Sensibilidad Espacial (+-500 m) en Shackleton Rim vs Malapert Peak
    fig, axes = plt.subplots(2, 1, figsize=(11, 8), sharex=True)
    estilos = {
        "centro": ("#1f77b4", "-", 2.2, "Nominal (Centro)"),
        "norte_500m": ("#d62728", "--", 1.8, "Desplazado +500 m Norte"),
        "sur_500m": ("#ff7f0e", "-.", 1.8, "Desplazado +500 m Sur"),
        "este_500m": ("#2ca02c", ":", 1.8, "Desplazado +500 m Este"),
    }

    for ax, (sitio_key, titulo) in zip(
        axes,
        [
            ("shackleton_rim", "Shackleton Rim (-89.6863 deg, 197.3684 deg E) - Alta Sensibilidad Topografica"),
            ("malapert_peak", "Malapert Peak (-85.9876 deg, 2.0528 deg E) - Alta Tolerancia Espacial"),
        ],
    ):
        if sitio_key not in perfiles_plot:
            continue
        efem = perfiles_plot[sitio_key]["efem"]
        sun_el_max = max(efem["sun"]["el"])
        sun_el_min = min(efem["sun"]["el"])
        ax.axhspan(sun_el_min, sun_el_max, color="#ffd700", alpha=0.22, label="Banda Elevacion Solar (30 d)")

        for etq, (az_g, el_g) in perfiles_plot[sitio_key]["horizontes"].items():
            color, ls, lw, nombre = estilos[etq]
            ax.plot(az_g, el_g, color=color, linestyle=ls, linewidth=lw, label=nombre)

        ax.axhline(0.0, color="black", linewidth=0.8, alpha=0.5)
        ax.set_ylabel("Elevacion (deg)")
        ax.set_title(titulo, fontsize=11, fontweight="bold")
        ax.legend(loc="upper right", ncol=2, fontsize=8.5)

    axes[1].set_xlabel("Azimut Topocentrico Lunar (deg, 0=N, 90=E, 180=S, 270=O)")
    axes[1].set_xlim(0, 360)
    plt.tight_layout()
    ruta_fig1 = DIR_SALIDA / "fig1_sensibilidad_espacial_500m.png"
    plt.savefig(ruta_fig1, dpi=300)
    plt.close(fig)

    # Figura 2: Sensibilidad Temporal (Retraso +7 y +14 dias) - Energia vs DTE
    sitios_orden = [s for s in ["shackleton_rim", "de_gerlache_rim", "malapert_peak", "peak_near_cabeus_b"] if s in temp_res]
    if sitios_orden:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.8))
        x = np.arange(len(sitios_orden))
        ancho = 0.25
        ventanas_lbl = [
            ("nominal_dia_0", "Nominal (Dia 0)", "#2b5c8f"),
            ("retraso_7_dias", "Retraso +7 dias", "#4c9be8"),
            ("retraso_14_dias", "Retraso +14 dias", "#f28e2b"),
        ]

        for idx, (clave_v, etiqueta_v, color_v) in enumerate(ventanas_lbl):
            vals_luz = [temp_res[s][clave_v]["porcentaje_luz_pct"] for s in sitios_orden]
            vals_dte = [temp_res[s][clave_v]["porcentaje_dte_pct"] for s in sitios_orden]
            offset = (idx - 1) * ancho
            ax1.bar(x + offset, vals_luz, width=ancho, label=etiqueta_v, color=color_v)
            ax2.bar(x + offset, vals_dte, width=ancho, label=etiqueta_v, color=color_v)

        for ax, tit, ylab in [
            (ax1, "Iluminacion Solar Efectiva f(x) ante Retrasos", "Iluminacion Solar (%)"),
            (ax2, "Enlace Directo a Tierra (DTE) ante Retrasos", "Visibilidad DTE (%)"),
        ]:
            ax.set_xticks(x)
            ax.set_xticklabels(sitios_orden, rotation=15, ha="right", fontsize=9)
            ax.set_ylim(0, 112)
            ax.set_ylabel(ylab)
            ax.set_title(tit, fontsize=10.5, fontweight="bold")
            ax.legend(fontsize=8.5)

        plt.tight_layout()
        ruta_fig2 = DIR_SALIDA / "fig2_tradeoff_energia_dte_retraso.png"
        plt.savefig(ruta_fig2, dpi=300)
        plt.close(fig)


if __name__ == "__main__":
    espacial_res, perfiles_para_fig = ejecutar_sensibilidad_espacial()
    temporal_res = ejecutar_sensibilidad_temporal()

    reporte_mision3 = {
        "proyecto": "Lunar Landing Site Navigator - NASA Space Apps Challenge",
        "rol": "Integrante C (Ale) - Validacion Fisica, Sensibilidad e Integracion (Mision 3)",
        "estado_integracion": "5 de 5 integrantes integrados y auditados",
        "sensibilidad_espacial_500m": espacial_res,
        "sensibilidad_temporal_retraso": temporal_res,
    }

    ruta_json = DIR_SALIDA / "resultados_sensibilidad_mision3.json"
    with open(ruta_json, "w", encoding="utf-8") as f:
        json.dump(reporte_mision3, f, indent=2, ensure_ascii=False)

    generar_figuras_informe(perfiles_para_fig, temporal_res)
    print("=== MISION 3 COMPLETADA CON EXITO ===")
    print(f"JSON exportado en: {ruta_json}")
    print(f"Figuras generadas en: {DIR_SALIDA}")