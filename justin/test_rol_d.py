#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pruebas de validación del rol D. Ejecutar: python test_rol_d.py"""
import math
import numpy as np
import energia_comunicacion as ec
import generar_datos_prueba as gdp

OK = 0


def check(nombre, cond, detalle=""):
    global OK
    print(("PASA   " if cond else "FALLA  ") + nombre + (f"  [{detalle}]" if detalle else ""))
    OK += 0 if cond else 1


# 1. Panel horizontal con Sol en el cenit: P = S0·η·A
p = ec.Panel(inclinacion_deg=0.0, area_m2=2.0)
P = ec.potencia_solar(np.array([90.0]), np.array([0.0]), p, np.array([1.0]))[0]
check("Horizontal, e=90°: P = S0·η·A", abs(P - ec.S0_W_M2 * p.eta * 2.0) < 1e-6, f"P={P:.1f} W")

# 2. Panel horizontal, e=1.5°: P = S0·η·A·sin(e)
P = ec.potencia_solar(np.array([1.5]), np.array([10.0]), ec.Panel(inclinacion_deg=0.0), np.array([1.0]))[0]
esperado = ec.S0_W_M2 * ec.Panel().eta * math.sin(math.radians(1.5))
check("Horizontal, e=1.5°: P = S0·η·A·sin(e)", abs(P - esperado) < 1e-6, f"P={P:.2f} W/m²")

# 3. Vertical apuntando al Sol vs horizontal con Sol rasante: razón = 1/tan(e)
pv = ec.Panel(inclinacion_deg=90.0, az_panel_deg=10.0)
ph = ec.Panel(inclinacion_deg=0.0)
Pv = ec.potencia_solar(np.array([1.5]), np.array([10.0]), pv, np.array([1.0]))[0]
Ph = ec.potencia_solar(np.array([1.5]), np.array([10.0]), ph, np.array([1.0]))[0]
check("Vertical/horizontal = 1/tan(e) con el Sol de frente", abs(Pv / Ph - 1 / math.tan(math.radians(1.5))) < 1e-6,
      f"razón={Pv/Ph:.1f}")

# 4. Panel vertical de espaldas al Sol no genera
Pesp = ec.potencia_solar(np.array([1.5]), np.array([190.0]), pv, np.array([1.0]))[0]
check("Vertical de espaldas al Sol: P = 0", Pesp == 0.0)

# 5. Sin visibilidad (Sol bajo el horizonte): P = 0
check("Sol oculto (factor 0): P = 0", ec.potencia_solar(np.array([1.5]), np.array([10.0]), pv, np.array([0.0]))[0] == 0.0)

# 6. Pérdida en espacio libre Luna–Tierra a 8.4 GHz ≈ 222.6 dB
f = ec.fspl_db(384_400.0, 8.4e9)
check("FSPL a 384 400 km y 8.4 GHz ≈ 222.6 dB", abs(f - 222.6) < 0.2, f"{f:.2f} dB")

# 7. FSPL crece 6 dB al duplicar la distancia
check("FSPL: +6.02 dB al duplicar la distancia", abs(ec.fspl_db(2e5, 8.4e9) - ec.fspl_db(1e5, 8.4e9) - 6.0206) < 1e-3)

# 8. Consistencia de la tasa máxima: con esa tasa, el margen es exactamente el requerido
e = ec.Enlace()
R = ec.tasa_max_bps(384_400.0, e)
margen = ec.eb_n0_db(R, 384_400.0, e) - e.eb_n0_req_db
check("Tasa máx.: margen resultante = margen requerido", abs(margen - e.margen_req_db) < 1e-6, f"{margen:.3f} dB")

# 9. Ventanas con cruce lineal: seno con periodo 24 h → 12 h positivas al día
t = np.arange(0, 24 * 10 + 1, 1.0)
v = ec.ventanas(t, np.sin(2 * np.pi * t / 24.0 + 0.3))
total = sum(b - a for a, b in v)
check("Ventanas: seno de 24 h → ≈120 h positivas en 10 días", abs(total - 120.0) < 0.5, f"{total:.2f} h")

# 10. Energía = potencia media × duración (coherencia de unidades W·h)
gdp.generar("/tmp/dp_test", dias=40)
ef = ec.cargar_efemerides("/tmp/dp_test/efemerides_malapert.json")
hor = ec.cargar_horizonte("/tmp/dp_test/horizonte_malapert.json")
req = ec.Requisitos(duracion_h=240)
i0, i1 = ec._indices(ef, 0.0, req.duracion_h)
esc = ec.evaluar_escenario(ef, hor, ec.Panel(), ec.Enlace(), req, i0, i1)
en = esc["energia"]
dur = ef.t_h[i1] - ef.t_h[i0]
check("Energía [Wh] = potencia media [W] × duración [h]",
      abs(en["energia_total_wh"] - en["potencia_media_w"] * dur) / max(en["energia_total_wh"], 1) < 0.01,
      f"{en['energia_total_wh']:.0f} Wh vs {en['potencia_media_w'] * dur:.0f} Wh")

# 11. Rangos razonables (datos sintéticos, Malapert)
check("Elevación solar máxima ≤ 8° en el polo sur", en["el_sol_max_deg"] <= 8.0, f"{en['el_sol_max_deg']}°")
check("Potencia pico ≤ S0·η (nunca supera la ideal)", en["potencia_pico_w"] <= ec.S0_W_M2 * 1.04 * ec.Panel().eta * 1.0 + 1e-6,
      f"{en['potencia_pico_w']} W/m²")
check("Horas de luz ≤ duración del escenario", en["horas_luz_h"] <= dur + 1e-6)

# 12. En el polo exacto, la Tierra es visible ≈50 % del tiempo y el Sol nunca pasa de ~1.54°
gdp.SITIOS["polo_exacto"] = dict(lat=-89.99, lon=0.0, h0=0.0, a1=0.0, ph1=0.0, a2=0.0, ph2=0.0)
gdp.generar("/tmp/dp_test", dias=300)
ef = ec.cargar_efemerides("/tmp/dp_test/efemerides_polo_exacto.json")
vis_tierra = np.mean(ef.tierra_el > 0)
check("Polo sur: Tierra visible ≈ 50 % del tiempo", 0.42 < vis_tierra < 0.58, f"{vis_tierra:.1%}")
check("Polo sur: elevación solar máxima ≈ 1.54°", abs(ef.sol_el.max() - 1.54) < 0.1, f"{ef.sol_el.max():.2f}°")

# 13. Semáforo: umbrales
req = ec.Requisitos(horas_luz_min_h=100, oscuridad_max_h=None, potencia_media_min_w=None,
                    horas_dte_min_h=None, ventana_dte_min_h=None)
en_ok = {"horas_luz_util_h": 120, "oscuridad_continua_max_h": 0, "potencia_media_w": 1}
en_mid = {**en_ok, "horas_luz_util_h": 90}
en_mal = {**en_ok, "horas_luz_util_h": 50}
co = {"horas_dte_h": 0, "ventana_dte_max_h": 0}
sem = [ec.evaluar_viabilidad(x, co, req)["semaforo"] for x in (en_ok, en_mid, en_mal)]
check("Semáforo: 120 h→verde, 90 h→amarillo, 50 h→rojo (umbral 100 h)", sem == ["verde", "amarillo", "rojo"], str(sem))

print("\nRESULTADO:", "TODO PASA" if OK == 0 else f"{OK} prueba(s) fallaron")
raise SystemExit(1 if OK else 0)
