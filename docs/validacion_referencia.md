# Casos de Validación de Referencia (Benchmark Físico)

**Proyecto:** Lunar Landing Site Navigator — NASA Space Apps Challenge  
**Misión 1 — Responsable:** Integrante C (Física de referencia y validación)  
**Propósito:** Proveer 5 casos científicos documentados con criterios numéricos *pasa / no pasa* para auditar en Misión 2 el perfil topográfico LOLA (Rol A), las efemérides JPL Horizons (Rol B) y la integración física (Roles C y D).

---

## Caso 1: Cresta de conexión Shackleton–de Gerlache ("Pico de luz casi eterna")
* **`site_id`:** `shackleton_rim`
* **Coordenadas:** `lat_deg = -89.68` ($89.68^\circ\text{S}$), `lon_deg = 230.80` ($129.20^\circ\text{W}$).
* **Fuente científica:** Mazarico, E. et al. (2011), *"Illumination conditions of the lunar polar regions using LOLA topography"*, *Icarus*, 211(2), 1066–1081 (NASA LRO).
* **Qué valida:** Que el cálculo de horizonte topográfico de LOLA (Rol A) no sobreestime obstrucciones y reproduzca las zonas de iluminación solar casi continua del Polo Sur.
* **Valores de referencia esperados:**
  * **Iluminación solar anual promedio (`iluminacion_solar_pct`):** Entre $80.0\%$ y $89.0\%$ (evaluado a `h_obs_m = 2.0`).
  * **Elevación solar máxima en solsticio de verano austral:** Entre $+1.50^\circ$ y $+2.00^\circ$.
* **Criterio de aprobación (*Pasa / No pasa*):** `iluminacion_solar_pct` anual dentro de $[78.0\%, 91.0\%]$.

---

## Caso 2: Interior del cráter Shackleton (Región en Sombra Permanente - PSR)
* **`site_id`:** `shackleton_floor`
* **Coordenadas:** `lat_deg = -89.90` ($89.90^\circ\text{S}$), `lon_deg = 0.00` (fondo del cráter, $\approx 4.2\text{ km}$ de profundidad respecto al borde).
* **Fuente científica:** Zuber, M. T. et al. (2012), *"Constraints on the volatile distribution within Shackleton crater at the lunar south pole"*, *Nature*, 486, 378–381 / NASA LRO LOLA Polar Data Archive.
* **Qué valida:** Que la topografía LOLA bloquee completamente al Sol y a la Tierra en el fondo de un cráter polar (mientras que el verificador esférico liso sin LOLA dará erróneamente $\approx 50\%$). Confirma la regla *"interior alto, borde bajo"* del Rol A.
* **Valores de referencia esperados:**
  * **Elevación mínima del perfil de horizonte:** $> +4.0^\circ$ en todos los $360^\circ$ de azimut.
  * **Iluminación solar directa anual (`iluminacion_solar_pct`):** $0.0\%$.
  * **Visibilidad directa de la Tierra (`visibilidad_tierra_nominal_pct`):** $0.0\%$.
* **Criterio de aprobación (*Pasa / No pasa*):** `iluminacion_solar_pct == 0.0` y `visibilidad_tierra_nominal_pct == 0.0` durante todo el año.

---

## Caso 3: Cima del Macizo Malapert (Enlace Directo Continuo con la Tierra - DTE)
* **`site_id`:** `malapert_peak`
* **Coordenadas:** `lat_deg = -86.00` ($86.00^\circ\text{S}$), `lon_deg = 0.00` (cima elevada a $\approx 5.0\text{ km}$ sobre el datum lunar).
* **Fuente científica:** Sharpe, B. L. & Schrunk, D. G. (2003), *"Malapert Mountain: Gateway to the Moon"*, *Advances in Space Research*, 31(11), 2467–2472 / NASA Exploration Systems Architecture Study (ESAS, NASA-TM-2005-214062).
* **Qué valida:** Las efemérides terrestres de JPL Horizons (incluyendo el bamboleo mensual por libración lunar de $\pm 6.7^\circ$) y el despeje topográfico de la línea de visión hacia el Norte ($Az \approx 0^\circ$).
* **Valores de referencia esperados:**
  * **Posición de la Tierra:** $Az \approx 0.0^\circ$, elevación media $\approx +4.0^\circ$ (oscilando entre $-2.7^\circ$ y $+10.7^\circ$ respecto a la horizontal matemática).
  * **Visibilidad directa de la Tierra (`visibilidad_tierra_nominal_pct`):** $\approx 100.0\%$ (la altitud del macizo deprime el horizonte norte y mantiene enlace continuo).
  * **Iluminación solar anual promedio (`iluminacion_solar_pct`):** Entre $70.0\%$ y $76.0\%$.
* **Criterio de aprobación (*Pasa / No pasa*):** `visibilidad_tierra_nominal_pct >= 95.0` e `iluminacion_solar_pct` en $[68.0\%, 78.0\%]$.

---

## Caso 4: Sitio de alunizaje del Apolo 11 (Calibración de efemérides y modelo esférico)
* **`site_id`:** `apollo_11`
* **Coordenadas y época:** `lat_deg = 0.67416` ($0.67416^\circ\text{N}$), `lon_deg = 23.47315` ($23.47315^\circ\text{E}$), `timestamp_utc = "1969-07-20T20:17:40Z"`.
* **Fuente científica:** *Apollo 11 Mission Report* (NASA SP-238, 1971) & JPL Horizons System.
* **Qué valida:** Calibración puntual sin ambigüedad topográfica (llanura ecuatorial del *Mare Tranquillitatis*). Permite comprobar en segundos que el Rol B y el verificador esférico del Rol C no tienen errores de signos, latitud/longitud invertidas, husos horarios o refracción activada.
* **Valores de referencia esperados:**
  * **Elevación del centro del Sol (`sol_elevacion_deg`):** $+10.8^\circ$ sobre el horizonte este.
  * **Azimut del Sol (`sol_azimut_deg`):** $88.0^\circ$ (Este).
* **Criterio de aprobación (*Pasa / No pasa*):** Error absoluto $< 0.2^\circ$ tanto en `sol_elevacion_deg` como en `sol_azimut_deg`.

---

## Caso 5: Borde e interior del cráter Cabeus (Sensibilidad espacial extrema - CLPS / LCROSS)
* **`site_id`:** `cabeus_rim`
* **Coordenadas:** `lat_deg = -84.90` ($84.90^\circ\text{S}$), `lon_deg = 324.50` ($35.50^\circ\text{W}$).
* **Fuente científica:** Colaprete, A. et al. (2010), *"Detection of Water in the LCROSS Ejecta Plume"*, *Science*, 330(6003), 463–468 / NASA Artemis III Science Definition Team Report (NASA SP-20205009602).
* **Qué valida:** Caso de prueba para el análisis de sensibilidad espacial (Misión 3 del Rol C): demuestra cómo un desplazamiento corto entre el borde iluminado y el interior del cráter transforma la misión de operable ($60\% - 72\%$ de luz solar) a sombra permanente ($0\%$ de luz).
* **Valores de referencia esperados:**
  * **Borde iluminado (`cabeus_rim`):** `iluminacion_solar_pct` anual entre $60.0\%$ y $72.0\%$, con ventanas intermitentes de comunicación directa con la Tierra.
  * **Interior del cráter ($< 10\text{ km}$ hacia el centro):** `iluminacion_solar_pct` $= 0.0\%$.
* **Criterio de aprobación (*Pasa / No pasa*):** `iluminacion_solar_pct` en el borde dentro de $[58.0\%, 75.0\%]$ y caída a $0.0\%$ al desplazar las coordenadas hacia el fondo del cráter.

---

## Resumen Estructurado para Automatización (`test_validacion.py` en Misión 2)

```json
{
  "benchmark_version": "1.0",
  "casos_validacion": [
    {
      "site_id": "shackleton_rim",
      "lat_deg": -89.68,
      "lon_deg": 230.80,
      "tipo_prueba": "anual",
      "iluminacion_solar_pct_min": 78.0,
      "iluminacion_solar_pct_max": 91.0,
      "fuente": "Mazarico et al. (2011), Icarus 211(2)"
    },
    {
      "site_id": "shackleton_floor",
      "lat_deg": -89.90,
      "lon_deg": 0.00,
      "tipo_prueba": "anual",
      "iluminacion_solar_pct_max": 0.0,
      "visibilidad_tierra_nominal_pct_max": 0.0,
      "horizonte_minimo_deg": 4.0,
      "fuente": "Zuber et al. (2012), Nature 486"
    },
    {
      "site_id": "malapert_peak",
      "lat_deg": -86.00,
      "lon_deg": 0.00,
      "tipo_prueba": "anual",
      "visibilidad_tierra_nominal_pct_min": 95.0,
      "iluminacion_solar_pct_min": 68.0,
      "iluminacion_solar_pct_max": 78.0,
      "fuente": "Sharpe & Schrunk (2003), ASR 31(11)"
    },
    {
      "site_id": "apollo_11",
      "lat_deg": 0.67416,
      "lon_deg": 23.47315,
      "timestamp_utc": "1969-07-20T20:17:40Z",
      "tipo_prueba": "puntual",
      "sol_elevacion_deg_esperada": 10.8,
      "sol_azimut_deg_esperado": 88.0,
      "tolerancia_deg": 0.2,
      "fuente": "NASA SP-238 / JPL Horizons"
    },
    {
      "site_id": "cabeus_rim",
      "lat_deg": -84.90,
      "lon_deg": 324.50,
      "tipo_prueba": "anual",
      "iluminacion_solar_pct_min": 58.0,
      "iluminacion_solar_pct_max": 75.0,
      "fuente": "Colaprete et al. (2010), Science 330"
    }
  ]
}
```
