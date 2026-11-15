# Módulo de Potencia Solar y Comunicaciones Direct-to-Earth (DTE) — Rol D

**Proyecto:** Lunar Landing Site Navigator — NASA Space Apps Challenge  
**Responsable:** Integrante D (Justin — Energía, Potencia y Comunicaciones)  
**Estado:** SINCRONIZADO v3.0 — ALINEADO CON `docs/convenciones.md`, `cris/` Y `horizons_b/`

---

## 1. Resumen de Actualización (Corrección de Nombres y 6 Sitios Oficiales)

Se actualizaron los scripts y salidas JSON de `justin/` para eliminar los nombres antiguos de prueba (`malapert`, `shackleton_borde`, `sitio_intermedio`) y operar directamente sobre los **6 `site_id` oficiales** del repositorio:

1. `shackleton_rim` (`metricas_shackleton_rim.json`)
2. `shackleton_floor` (`metricas_shackleton_floor.json`)
3. `malapert_peak` (`metricas_malapert_peak.json`)
4. `de_gerlache_rim` (`metricas_de_gerlache_rim.json`)
5. `peak_near_cabeus_b` (`metricas_peak_near_cabeus_b.json`)
6. `apollo_11` (`metricas_apollo_11.json`)

---

## 2. Formulación Física Implementada (`justin/energia_comunicacion.py`)

* **Irradiancia Solar:** $S_0 = 1361.0\text{ W/m}^2$.
* **Fracción de Disco Solar Visible $f(x)$:** Calculada con radio angular $R_{\odot} = 0.267^\circ$ sobre el perfil topográfico LOLA interpolado (`cris/`).
* **Potencia Fotovoltaica Generada ($\text{W}$):**
  * **Seguidor Solar (*Solar Tracking*):** $P_{\text{track}}(t) = S_0 \cdot \eta \cdot A \cdot f(x(t))$
  * **Panel Fijo Horizontal:** $P_{\text{horiz}}(t) = S_0 \cdot \eta \cdot A \cdot f(x(t)) \cdot \max(0, \sin(El_{\odot}(t)))$
  * *(Parámetros de referencia de misión: $\eta = 0.28$, $A = 2.5\text{ m}^2$, potencia pico $P_{\max} = 952.7\text{ W}$).*
* **Ventanas de Enlace Directo a Tierra (*Direct-to-Earth* / DTE):**
  * **DTE Nominal:** $El_{\oplus}(t) > El_{\text{hor}}(Az_{\oplus}(t))$
  * **DTE Operativo (con margen de enlace):** $El_{\oplus}(t) - El_{\text{hor}}(Az_{\oplus}(t)) \ge 0.500^\circ$

---

## 3. Instrucciones de Ejecución en el Repositorio

Desde la raíz del repositorio `mision_lunar/`:
```bash
python justin/energia_comunicacion.py
python justin/auditoria_rol_d.py
```
Esto generará los 6 archivos `justin/metricas_<site_id>.json` y el consolidado `justin/resumen_comparativo_6_sitios.json` listos para ser consumidos por el frontend web (`src/`).
