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


def perfil_horizonte_rayos(X, Y, Z, X0, Y0, Z0, h_obs=2.0, paso_az=1.0, d_max=120_000.0, paso_s=40.0):
    """Horizonte por trazado de rayos (recomendado). Devuelve (azimuts, elevacion_horizonte) en grados.

    Para cada azimut avanza sobre la esfera lunar cada `paso_s` metros hasta `d_max`, lee la altura del DEM
    por interpolacion bilineal y se queda con la mayor elevacion vista desde el observador (en 3D, con curvatura).
    Evita el defecto del metodo por celdas: cerca del observador un sector de 1 grado es mas angosto que una celda
    y quedaban sectores vacios (horizonte subestimado).
    X, Y, Z: rejilla regular 2D (x crece con la columna, y con la fila). (X0, Y0, Z0): sitio.
    """
    x00, dx = X[0, 0], X[0, 1] - X[0, 0]
    y00, dy = Y[0, 0], Y[1, 0] - Y[0, 0]
    nf, nc = Z.shape
    phi1 = -np.pi / 2 + 2.0 * np.arctan(np.hypot(X0, Y0) / (2.0 * R0))
    lam1 = np.arctan2(X0, Y0)
    sp, cp, sl, cl = np.sin(phi1), np.cos(phi1), np.sin(lam1), np.cos(lam1)
    arriba = np.array([cp * cl, cp * sl, sp])
    este = np.array([-sl, cl, 0.0])
    norte = np.array([-sp * cl, -sp * sl, cp])
    o = (R0 + Z0 + h_obs) * arriba

    na = int(round(360.0 / paso_az))
    a = np.radians(np.arange(na) * paso_az)[:, None]
    s = np.arange(paso_s, d_max + 0.5 * paso_s, paso_s)[None, :]
    dlt = s / R0
    sin_phi2 = sp * np.cos(dlt) + cp * np.sin(dlt) * np.cos(a)
    phi2 = np.arcsin(np.clip(sin_phi2, -1.0, 1.0))
    lam2 = lam1 + np.arctan2(np.sin(a) * np.sin(dlt) * cp, np.cos(dlt) - sp * sin_phi2)
    r2 = 2.0 * R0 * np.tan((phi2 + np.pi / 2) / 2.0)
    x, y = r2 * np.sin(lam2), r2 * np.cos(lam2)

    cf, rf = (x - x00) / dx, (y - y00) / dy
    j0, i0 = np.floor(cf).astype(int), np.floor(rf).astype(int)
    ok = (i0 >= 0) & (i0 < nf - 1) & (j0 >= 0) & (j0 < nc - 1)
    i0, j0 = np.where(ok, i0, 0), np.where(ok, j0, 0)
    u, v_ = cf - j0, rf - i0
    z = ((1 - u) * (1 - v_) * Z[i0, j0] + u * (1 - v_) * Z[i0, j0 + 1]
         + (1 - u) * v_ * Z[i0 + 1, j0] + u * v_ * Z[i0 + 1, j0 + 1])
    z = np.where(ok, z, np.nan)

    rad = R0 + z
    px, py, pz = rad * np.cos(phi2) * np.cos(lam2), rad * np.cos(phi2) * np.sin(lam2), rad * np.sin(phi2)
    vx, vy, vz = px - o[0], py - o[1], pz - o[2]
    up_ = vx * arriba[0] + vy * arriba[1] + vz * arriba[2]
    e_ = vx * este[0] + vy * este[1] + vz * este[2]
    n_ = vx * norte[0] + vy * norte[1] + vz * norte[2]
    elev = np.degrees(np.arctan2(up_, np.hypot(e_, n_)))
    elev = np.where(np.isfinite(elev), elev, -90.0)
    return np.arange(na) * paso_az, elev.max(axis=1)
