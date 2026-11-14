#!/usr/bin/env python3
"""Arma panel_metricas_demo.html (un solo archivo) con panel_metricas.js y los metricas_*.json."""
import json, sys
from pathlib import Path
sitios = sys.argv[1:] or ["shackleton_borde", "malapert"]
datos = {s: json.loads(Path(f"metricas_{s}.json").read_text(encoding="utf-8")) for s in sitios}
html = Path("plantilla_demo.html").read_text(encoding="utf-8")
html = html.replace("/*__PANEL_JS__*/", Path("panel_metricas.js").read_text(encoding="utf-8"))
html = html.replace("/*__DATOS__*/", json.dumps(datos, ensure_ascii=False).replace("</", "<\\/"))
Path("panel_metricas_demo.html").write_text(html, encoding="utf-8")
print("panel_metricas_demo.html:", round(len(html) / 1024), "KB")
