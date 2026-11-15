"""
Extrae de efemerides_shackleton.json el mismo rango horario que Horizons
devolvio en los .txt de validacion, para que C compare numero a numero.
"""
import json

with open("efemerides_shackleton_rim.json") as f:
    data = json.load(f)

# Rango de validacion: 14 nov 2026, 15:00 a 18:00 UTC
INICIO = "2026-11-14T15:00:00+00:00"
FIN    = "2026-11-14T18:00:00+00:00"

print("Caso de validacion: Shackleton rim (-89.6863, 197.3684), 14 nov 2026 15:00-18:00 UTC")
print(f"{'Tiempo':<28} {'Sol az':>10} {'Sol el':>10} {'Tierra az':>12} {'Tierra el':>12}")
print("-" * 76)

for i, t in enumerate(data["t"]):
    if INICIO <= t <= FIN:
        print(f"{t:<28} "
              f"{data['sun']['az'][i]:>10.3f} "
              f"{data['sun']['el'][i]:>10.3f} "
              f"{data['earth']['az'][i]:>12.3f} "
              f"{data['earth']['el'][i]:>12.3f}")