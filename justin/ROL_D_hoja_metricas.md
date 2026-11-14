# LunarWindow · Rol D — Energía y comunicación
**Responsable:** Justin · **Disciplina:** Electrónica

## 1. Qué entrega el rol D
| Misión | Entregable | Archivo |
|---|---|---|
| 1 · Base | Métricas de potencia y de enlace con fórmulas y unidades | Este documento |
| 2 · Construcción | Modelo de potencia solar y ventana de comunicación directa (DTE) | `energia_comunicacion.py` |
| 3 · Integración | Panel de métricas para la web y revisión de unidades y valores | `panel_metricas.js`, `test_rol_d.py` |

Además, el rol D aporta la capa de **recomendación** (semáforo y ranking de fechas), que conecta el problema (retrasos) con la solución (fecha óptima).

## 2. Métricas de potencia solar
| Métrica | Fórmula | Unidad | Datos de entrada |
|---|---|---|---|
| Irradiancia solar | S = S₀ / r² , con S₀ = 1361 W/m² | W/m² | r: distancia Sol–Luna en UA (Horizons; si falta, r = 1) |
| Coseno de incidencia | cos θ = cos e · sin β · cos(az − az_p) + sin e · cos β | adimensional | e, az: elevación y azimut del Sol; β: inclinación del panel; az_p: azimut del panel |
| Potencia instantánea | P = S · A · η · cos θ · f | W | A: área; η = η_celda · f_sistema; f: fracción visible del disco solar |
| Energía | E = ∫ P dt (regla del trapecio) | Wh | P(t) a paso uniforme |
| Horas de luz | Tiempo con e > h(az), con h = elevación del horizonte | h | Máscara de horizonte del rol A |
| Luz continua máxima | Ventana de luz más larga | h | Cruces lineales entre muestras |
| Oscuridad continua máxima | Ventana sin Sol más larga (crítica para la supervivencia térmica) | h | Ídem |
| Tiempo hasta la puesta de Sol | Fin de la ventana de luz activa − instante de referencia | h | Ídem |

**Casos particulares de cos θ:**
- Panel horizontal (β = 0°): cos θ = sin e. Es la fórmula P ≈ S₀·η·A·sin e de la tabla del equipo.
- Panel vertical (β = 90°): cos θ = cos e · cos(az − az_p).
- Vertical con seguimiento en azimut: cos θ = cos e.

**Parámetros por defecto (supuestos a confirmar):** η_celda = 0,28 (celdas multiunión), f_sistema = 0,85 (cableado, empaquetado, temperatura, degradación), A = 1 m² (resultados normalizados: W = W/m²).

### Hallazgo que conviene mostrar
En el polo sur el Sol nunca sube más de ~1,5° sobre el horizonte, porque la inclinación del eje lunar es de 1,54°. Con la fórmula P ≈ S₀·η·A·sin e, un panel **horizontal** recibe como máximo sin(1,5°) ≈ 2,6 % de la irradiancia. Un panel **vertical** apuntado al Sol recibe cos(1,5°) ≈ 100 %, unas 38 veces más (comprobado en `test_rol_d.py`). Por eso el modelo incluye la inclinación del panel y compara cuatro configuraciones en `comparacion_paneles`.

## 3. Métricas de comunicación directa con la Tierra (DTE)
| Métrica | Fórmula | Unidad | Datos de entrada |
|---|---|---|---|
| Tierra visible | e_T > máx(h(az_T), e_mín_antena) | — | Efemérides de la Tierra (rol B), horizonte (rol A) |
| Horas DTE | Suma de las ventanas de Tierra visible | h | Cruces lineales |
| Ventana DTE más larga | Máximo de las duraciones | h | Ídem |
| Tiempo hasta la puesta de Tierra | Fin de la ventana activa − instante de referencia | h | Ídem |
| Pérdida en espacio libre | FSPL = 20·log₁₀(4π·d·f / c) | dB | d: distancia Tierra–Luna; f: frecuencia |
| Eb/N0 recibido | Eb/N0 = EIRP − FSPL − L_otras + G/T − k − 10·log₁₀(R) | dB | k = −228,6 dBW/(K·Hz); R: tasa en bit/s |
| Tasa máxima | R_máx = 10^((Eb/N0 con R = 1 − Eb/N0_req − margen_req) / 10) | bit/s | Se calcula con la distancia máxima del periodo |

**Importante:** los valores del enlace (banda X, EIRP 25 dBW, G/T 45 dB/K, pérdidas 3 dB, Eb/N0 requerido 3 dB, margen 3 dB) son **ilustrativos**. Hay que reemplazarlos con los del subsistema de comunicaciones o con datos publicados de la estación terrena. En el polo sur la Tierra queda siempre a menos de ~7° del horizonte, así que las pérdidas de apuntamiento y el relieve cercano pueden ser mayores que lo supuesto.

## 4. Viabilidad: semáforo y ranking (propuesta B + D)
Cada criterio tiene un umbral. Se calcula la razón r = valor/umbral (para criterios «mínimo») o umbral/valor (para criterios «máximo»).

| Criterio | Tipo | Umbral por defecto (marcador) |
|---|---|---|
| Horas de luz útil | mínimo | 168 h en una misión de 14 días |
| Oscuridad continua máxima | máximo | 120 h |
| Potencia media | mínimo | No evaluado hasta definir la misión |
| Horas DTE | mínimo | 120 h |
| Ventana DTE más larga | mínimo | 24 h |

- **Verde (viable):** todos los criterios con r ≥ 1.
- **Amarillo (marginal):** el peor criterio tiene r ≥ 0,8.
- **Rojo (no viable):** el peor criterio tiene r < 0,8.
- **Puntaje (0–100):** 100 × promedio de min(r, 1). Si hay empate, el ranking usa la **holgura** (el menor r sin recortar).
- **Calendario:** para cada día candidato se simula una misión de `duracion_h` y se evalúa. Las tres mejores fechas se devuelven en `recomendadas`.

Los umbrales son marcadores: deben definirse con B y con la misión de referencia (por ejemplo, una carga CLPS) antes de la demo.

## 5. Contrato de datos
**Lo que D necesita de A y B**
- `horizonte_<sitio>.json` (rol A): `{"az_deg": [0, 1, …, 359], "elev_deg": […]}`.
- `efemerides_<sitio>.json` (rol B): `t_utc` (paso uniforme), `sol.az`, `sol.el`, `tierra.az`, `tierra.el`, en grados y sin refracción. Opcionales: `sol.f_visible` (rol C), `sol.r_ua`, `tierra.dist_km`.

**Lo que D entrega a E:** `metricas_<sitio>.json`, con estas secciones: `panel`, `enlace`, `requisitos`, `escenario` (energía, comunicación y viabilidad), `comparacion_paneles`, `calendario`, `recomendadas`. Todas las claves llevan la unidad en el nombre (`_h`, `_w`, `_wh`, `_deg`, `_km`, `_db`, `_mbps`).

**Integración en la web (rol E):**
```html
<script src="panel_metricas.js"></script>
<div id="panel"></div>
<script>
  LunarWindowPanel.cargar("metricas_malapert.json")
    .then(d => LunarWindowPanel.render(document.getElementById("panel"), d));
  // Comparación A/B: LunarWindowPanel.renderComparacion(el, datosA, datosB)
</script>
```

## 6. Cómo ejecutar
```bash
python test_rol_d.py                         # 16 pruebas de validación
python generar_datos_prueba.py               # datos sintéticos (solo para probar)
python energia_comunicacion.py --sitio malapert \
  --efem datos_prueba/efemerides_malapert.json \
  --horizonte datos_prueba/horizonte_malapert.json \
  --fecha-original 2027-01-10T00:00:00Z --ventana-dias 100
python construir_demo.py                     # panel_metricas_demo.html
```
Los umbrales, el panel y el enlace se cambian con `--config config.json` (claves `panel`, `enlace`, `requisitos`).

## 7. Validación realizada
| Prueba | Resultado |
|---|---|
| Panel horizontal con el Sol en el cenit: P = S₀·η·A | Pasa |
| Panel horizontal con e = 1,5°: P = S₀·η·A·sin e | Pasa |
| Razón vertical/horizontal = 1/tan e (≈ 38 con e = 1,5°) | Pasa |
| Panel de espaldas al Sol o Sol oculto: P = 0 | Pasa |
| FSPL a 384 400 km y 8,4 GHz = 222,6 dB; +6,02 dB al duplicar la distancia | Pasa |
| La tasa máxima deja exactamente el margen requerido | Pasa |
| Ventanas: un seno de 24 h da 120 h positivas en 10 días | Pasa |
| Energía [Wh] = potencia media [W] × duración [h] | Pasa |
| Polo sur (sintético): Tierra visible ≈ 50 % del tiempo, Sol ≤ 1,54° | Pasa |
| Semáforo: 120 h verde, 90 h amarillo, 50 h rojo (umbral 100 h) | Pasa |

**Limitación:** las pruebas de geometría usan efemérides **sintéticas** (modelo simplificado de libración y de declinación solar), porque este entorno no tiene acceso a JPL Horizons. Los resultados de `datos_prueba/` sirven para probar el flujo, **no** para presentar como resultados reales. Cuando A y B entreguen sus JSON reales, se ejecuta el mismo comando.

## 8. Pendientes para cerrar con el equipo
1. **B:** confirmar el formato de `efemerides_<sitio>.json` (nombres de claves y paso de tiempo). Si es distinto, solo se adapta `cargar_efemerides`.
2. **A:** confirmar `horizonte_<sitio>.json` y la altura del observador `h_obs`.
3. **C:** si entrega la fracción visible del disco solar, se usa en `sol.f_visible` y escala la potencia.
4. **Equipo:** fijar la misión de referencia (área de paneles, potencia requerida, duración) y los umbrales.
5. **Comunicaciones:** reemplazar los valores ilustrativos del enlace.
6. **Fuera de alcance por ahora:** efectos térmicos, polvo lunar y sombra parcial del panel por relieve cercano.
