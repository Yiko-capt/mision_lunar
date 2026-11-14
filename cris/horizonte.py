"""Perfil de horizonte local sobre un DEM lunar en proyeccion estereografica polar sur.

Idea: convertir cada celda del DEM a 3D, llevarla al marco local del observador
(Este, Norte, Arriba) y quedarnos, en cada sector de azimut, con la mayor elevacion.
La curvatura de la Luna entra sola porque trabajamos en 3D.
"""
import numpy as np

R0 = 1_737_400.0  # m, radio de la proyeccion (verdadera en el polo)


def xyz_lunar(X, Y, Z):
    """(X,Y) estereograficos [m] y altura Z [m] -> coordenadas 3D [m] (eje z = polo norte)."""
    r = np.hypot(X, Y)
    colat = 2.0 * np.arctan(r / (2.0 * R0))      # angulo desde el polo sur
    lon = np.arctan2(X, Y)                        # VERIFICADO con Shackleton: x = rho*sin(lon), y = rho*cos(lon)
    rho = R0 + Z
    return (rho * np.sin(colat) * np.cos(lon),
            rho * np.sin(colat) * np.sin(lon),
            -rho * np.cos(colat))


def perfil_horizonte(X, Y, Z, X0, Y0, Z0, h_obs=2.0, paso_az=1.0, d_min=0.0, d_max=120_000.0):
    """Devuelve (azimuts, elevacion_horizonte) en grados.

    X, Y, Z : arreglos 2D del DEM. (X0, Y0, Z0): sitio. h_obs: altura del observador sobre el suelo.
    """
    ok = np.isfinite(Z.ravel())                   # descarta celdas NaN (sin dato)
    px, py, pz = xyz_lunar(X.ravel()[ok], Y.ravel()[ok], Z.ravel()[ok])
    ox, oy, oz = xyz_lunar(np.array(X0), np.array(Y0), np.array(Z0) + h_obs)
    o = np.array([ox, oy, oz]).ravel()

    arriba = o / np.linalg.norm(o)
    este = np.cross([0.0, 0.0, 1.0], arriba)
    este /= np.linalg.norm(este)                  # falla justo en el polo (lat=-90)
    norte = np.cross(arriba, este)

    v = np.stack([px - o[0], py - o[1], pz - o[2]], axis=1)
    d = np.linalg.norm(v, axis=1)
    sel = (d > d_min) & (d <= d_max) & (d > 0)
    v, d = v[sel], d[sel]

    up, e, n = v @ arriba, v @ este, v @ norte
    elev = np.degrees(np.arctan2(up, np.hypot(e, n)))
    az = np.degrees(np.arctan2(e, n)) % 360.0

    nb = int(round(360.0 / paso_az))
    idx = np.round(az / paso_az).astype(int) % nb   # contenedor i centrado en az = i*paso (contrato: 0,1,...,359)
    horiz = np.full(nb, -90.0)
    np.maximum.at(horiz, idx, elev)
    return np.arange(nb) * paso_az, horiz


def visible(elev_cuerpo, az_cuerpo, azs, horiz):
    """True si el cuerpo (centro) esta por encima del horizonte interpolado en su azimut."""
    h = np.interp(az_cuerpo % 360.0, azs, horiz, period=360.0)
    return elev_cuerpo > h