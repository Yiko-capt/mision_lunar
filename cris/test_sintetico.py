import numpy as np
from horizonte import perfil_horizonte, R0

# DEM sintetico: esfera lisa (Z=0) + una montana gaussiana de 3 km a ~20 km del sitio
paso = 50.0
x = np.arange(-60_000, 60_000, paso)
X, Y = np.meshgrid(x, x)
Z = np.zeros_like(X)
cx, cy = 10_000 + 20_000, 0.0                 # sitio en (10 km, 0); montana 20 km al "+X"
Z += 3000.0 * np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * 1500.0 ** 2))

az, h = perfil_horizonte(X, Y, Z, 10_000.0, 0.0, 0.0, h_obs=2.0, paso_az=1.0)
k = np.argmax(h)
print("pico del horizonte: %.2f deg en azimut %.1f" % (h[k], az[k]))
print("horizonte 'liso' (mediana): %.3f deg" % np.median(h))
print("esperado liso ~ -sqrt(2h/R) = %.3f deg" % (-np.degrees(np.sqrt(2 * 2.0 / R0))))
s = 20_000.0
print("esperado montana ~ %.2f deg" % np.degrees(np.arctan((3000 - s**2 / (2 * R0)) / s)))
