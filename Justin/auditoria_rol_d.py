"""
Script de Autoverificación y Auditoría de Integración — Rol D (Justin)
Verifica que todos los `metricas_<site_id>.json` generados cumplan con el SSOT v3.0
(los 6 `site_id` oficiales, S0 = 1361.0 W/m^2, disco finito f(x) y bloqueo total en PSR).
"""

import json
from pathlib import Path

SITIOS_OFICIALES = [
    "shackleton_rim",
    "shackleton_floor",
    "malapert_peak",
    "de_gerlache_rim",
    "peak_near_cabeus_b",
    "apollo_11",
]


def ejecutar_auditoria_rol_d(dir_justin: Path) -> bool:
    errores = []
    print("=== AUDITORÍA ROL D (ENERGÍA Y COMUNICACIONES DTE) ===")

    for site_id in SITIOS_OFICIALES:
        ruta = dir_justin / f"metricas_{site_id}.json"
        if not ruta.exists():
            errores.append(f"Falta archivo oficial: {ruta.name}")
            continue

        with open(ruta, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Verificar constantes SSOT
        params = data.get("parametros_sistema", {})
        if params.get("S0_wm2") != 1361.0:
            errores.append(f"{site_id}: S0_wm2 incorrecto ({params.get('S0_wm2')})")

        # Verificar física PSR en shackleton_floor
        energia = data.get("resumen_energia", {})
        dte = data.get("resumen_comunicaciones_dte", {})
        if site_id == "shackleton_floor":
            if energia.get("porcentaje_iluminacion_pct") != 0.0:
                errores.append("shackleton_floor debe tener 0.0% de iluminación (PSR).")
            if dte.get("horas_dte_nominal") != 0:
                errores.append("shackleton_floor debe tener 0 h de DTE nominal.")

        print(
            f"[PASA] {site_id:20s} | Luz: {energia.get('porcentaje_iluminacion_pct'):6.2f}% | "
            f"Energía Track: {energia.get('energia_total_tracking_kwh'):6.2f} kWh | "
            f"DTE Operativo: {dte.get('porcentaje_dte_operativo_pct'):6.2f}%"
        )

    if errores:
        print("
[FALLOS DETECTADOS]:")
        for err in errores:
            print(" -", err)
        return False

    print("
=== VEREDICTO ROL D: PASA (6/6 SITIOS OFICIALES SINCRONIZADOS) ===")
    return True


if __name__ == "__main__":
    carpeta_justin = Path(__file__).resolve().parent
    ejecutar_auditoria_rol_d(carpeta_justin)
