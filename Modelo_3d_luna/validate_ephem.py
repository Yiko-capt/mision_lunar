"""
Valida js/astronomy.js contra PyEphem (implementación independiente).
Uso (desde la raiz del proyecto):   pip install ephem   &&   python tools/validate_ephem.py
Requiere Node.js. Compara punto sub-solar y sub-Tierra cada 6 h durante un año.
"""
import json, math, subprocess, sys, tempfile, shutil, os
from datetime import datetime, timedelta, timezone
import ephem

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
start = datetime(2026, 11, 1, tzinfo=timezone.utc)
dates = [start + timedelta(hours=6 * i) for i in range(4 * 365)]

tmp = tempfile.mkdtemp()
shutil.copy(os.path.join(ROOT, "js", "astronomy.js"), os.path.join(tmp, "astro.mjs"))
js = f"""
import * as A from './astro.mjs';
const out = [];
for (const ts of {json.dumps([d.isoformat() for d in dates])}) {{
  const D = A.daysSinceJ2000(new Date(ts));
  const s = A.subSolarPoint(D), e = A.subEarthPoint(D);
  out.push([s.lat, s.lon, e.lat, e.lon, A.moonPhase(D)]);
}}
console.log(JSON.stringify(out));
"""
open(os.path.join(tmp, "run.mjs"), "w").write(js)
mine = json.loads(subprocess.check_output(["node", os.path.join(tmp, "run.mjs")], cwd=tmp))

def wrap(x): return (x + 180) % 360 - 180
errs = {"sun_lat": [], "sun_lon": [], "earth_lat": [], "earth_lon": [], "phase_deg": []}
for d, m in zip(dates, mine):
    mo = ephem.Moon(d.strftime("%Y/%m/%d %H:%M:%S"))
    sun_lat = math.degrees(mo.subsolar_lat)
    sun_lon = wrap(90 - math.degrees(mo.colong))
    errs["sun_lat"].append(abs(m[0] - sun_lat))
    errs["sun_lon"].append(abs(wrap(m[1] - sun_lon)))
    errs["earth_lat"].append(abs(m[2] - math.degrees(mo.libration_lat)))
    errs["earth_lon"].append(abs(wrap(m[3] - math.degrees(mo.libration_long))))
    errs["phase_deg"].append(abs(wrap(m[4] * 360 - math.degrees(mo.elong) % 360)))

print(f"{len(dates)} fechas (1 anio, cada 6 h). Error absoluto vs PyEphem, en grados:")
for k, v in errs.items():
    v.sort()
    print(f"  {k:<10} mediana={v[len(v)//2]:.3f}  p95={v[int(len(v)*.95)]:.3f}  max={v[-1]:.3f}")
shutil.rmtree(tmp)
