"""Dibuja el perfil de horizonte de cada sitio (lee salida_horizonte/horizonte_*.json) y guarda horizontes.png."""
import glob, json
import matplotlib.pyplot as plt

archivos = sorted(glob.glob("salida_horizonte/horizonte_*.json"))
fig, ejes = plt.subplots(len(archivos), 1, figsize=(10, 3 * len(archivos)), sharex=True)
if len(archivos) == 1:
    ejes = [ejes]
for ax, ruta in zip(ejes, archivos):
    d = json.load(open(ruta, encoding="utf-8"))
    az = [p["azimut_deg"] for p in d["perfil_horizonte"]]
    el = [p["elevacion_maxima_deg"] for p in d["perfil_horizonte"]]
    ax.fill_between(az, el, min(el) - 2, color="0.75")
    ax.plot(az, el, color="k", lw=1)
    ax.axhspan(-1.5, 1.5, color="gold", alpha=0.35, label="rango de elevación del Sol en el polo (~±1.5°)")
    ax.axhline(0, color="0.4", lw=0.5, ls="--")
    ax.set_ylabel("elevación (°)")
    ax.set_title(f"{d['nombre']}  ({d['lat_deg']:.2f}°, {d['lon_deg']:.2f}°E, {d['elevacion_sitio_m']:.0f} m)", fontsize=10)
    al_norte = el[0]
    print(f"{d['site_id']}: horizonte al Norte (az 0°) = {al_norte:.2f}°, al Este (90°) = {el[90]:.2f}°, "
          f"al Sur (180°) = {el[180]:.2f}°, al Oeste (270°) = {el[270]:.2f}°")
ejes[0].legend(loc="upper right", fontsize=8)
ejes[-1].set_xlabel("azimut (°, 0 = Norte, 90 = Este)")
ejes[-1].set_xlim(0, 359)
plt.tight_layout()
plt.savefig("horizontes.png", dpi=130)
print("Guardado: horizontes.png")
plt.show()
