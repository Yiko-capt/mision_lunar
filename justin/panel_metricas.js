/* LunarWindow · Rol D — Panel de métricas (energía y comunicación)
 * Sin dependencias. Consume metricas_<sitio>.json generado por energia_comunicacion.py
 *
 *   LunarWindowPanel.render(elemento, datos)                 // un sitio
 *   LunarWindowPanel.renderComparacion(elemento, datosA, datosB)   // comparación A/B
 *   LunarWindowPanel.cargar("metricas_malapert.json")        // Promise -> datos
 */
(function (global) {
  "use strict";

  const CSS = `
  .lw{--card:#fff;--ink:#14213D;--mut:#5B6577;--line:#DDE3EC;--soft:#F3F6FA;--acc:#1F3A5F;
      --verde:#2E9E5B;--amarillo:#C98F00;--rojo:#D14343;
      font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink)}
  @media (prefers-color-scheme:dark){.lw:not([data-theme=light]){--card:#13204A;--ink:#EAF0FF;--mut:#A8B4D4;
      --line:#2A3A6B;--soft:#0F1B3F;--acc:#9CC0FF;--verde:#4CC183;--amarillo:#F0B429;--rojo:#F07171}}
  .lw[data-theme=dark]{--card:#13204A;--ink:#EAF0FF;--mut:#A8B4D4;--line:#2A3A6B;--soft:#0F1B3F;--acc:#9CC0FF;
      --verde:#4CC183;--amarillo:#F0B429;--rojo:#F07171}
  .lw *{box-sizing:border-box}
  .lw-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}
  .lw-title{font-size:20px;font-weight:700;margin:0}
  .lw-sub{color:var(--mut);font-size:13px}
  .lw-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;font-weight:700;
      color:#fff;background:var(--c)}
  .lw-badge i{width:9px;height:9px;border-radius:50%;background:#fff;opacity:.9}
  .lw-verde{--c:var(--verde)}.lw-amarillo{--c:var(--amarillo)}.lw-rojo{--c:var(--rojo)}
  .lw-resumen{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:14px}
  .lw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
  .lw-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px;margin-bottom:14px}
  @media (max-width:520px){.lw-grid2{grid-template-columns:1fr}}
  .lw-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .lw-card h3{margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--acc)}
  .lw-kpi{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line)}
  .lw-kpi:last-child{border-bottom:0}
  .lw-k{color:var(--mut)}.lw-v{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
  .lw table{width:100%;border-collapse:collapse}
  .lw th,.lw td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
  .lw th{color:var(--mut);font-weight:600;font-size:12px}
  .lw-ok{color:var(--verde);font-weight:700}.lw-no{color:var(--rojo);font-weight:700}
  .lw-scroll{overflow-x:auto}
  .lw-bar{display:grid;grid-template-columns:minmax(150px,230px) 1fr 110px;gap:10px;align-items:center;margin:6px 0}
  .lw-bar b{display:block;height:12px;border-radius:6px;background:var(--acc);min-width:2px}
  .lw-cal{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
  .lw-mes{font-size:11px;color:var(--mut);text-transform:uppercase;margin:0 4px 0 8px}
  .lw-day{width:26px;height:26px;border-radius:5px;background:var(--c);color:#fff;font-size:11px;font-weight:600;
      display:flex;align-items:center;justify-content:center}
  .lw-leyenda{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;color:var(--mut);font-size:12px}
  .lw-leyenda span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;
      background:var(--c)}
  .lw-nota{color:var(--mut);font-size:12px;margin-top:10px}
  .lw ol{margin:0;padding-left:20px}.lw li{margin:4px 0}
  .lw-top{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:700;color:#fff;background:var(--c)}
  `;

  const SEM = { verde: "Viable", amarillo: "Marginal", rojo: "No viable" };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (x, d = 1) => x == null ? "—" :
    Number(x).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const dur = (h) => {
    if (h == null) return "—";
    if (h < 48) return num(h, 1) + " h";
    let d = Math.floor(h / 24), r = Math.round(h - 24 * d);
    if (r === 24) { d += 1; r = 0; }
    return d + " d " + r + " h";
  };
  const fecha = (iso) => new Date(iso).toLocaleDateString("es-PE",
    { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const badge = (s, extra = "") => `<span class="lw-badge lw-${esc(s)}"><i></i>${SEM[s] || esc(s)}${extra}</span>`;
  const kpi = (k, v) => `<div class="lw-kpi"><span class="lw-k">${k}</span><span class="lw-v">${v}</span></div>`;
  const energia = (wh) => wh == null ? "—" : (wh >= 1000 ? num(wh / 1000, 2) + " kWh" : num(wh, 0) + " Wh");

  function injectCss() {
    if (document.getElementById("lw-panel-css")) return;
    const st = document.createElement("style");
    st.id = "lw-panel-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function tarjetaEnergia(en) {
    const sol = en.sol_visible_ahora
      ? kpi("Tiempo hasta la puesta de Sol", dur(en.t_hasta_puesta_h))
      : kpi("Sol bajo el horizonte · sale en", en.t_hasta_salida_h == null ? "no sale en el periodo" : dur(en.t_hasta_salida_h));
    return `<div class="lw-card"><h3>Energía solar</h3>
      ${kpi("Horas de luz", `${dur(en.horas_luz_h)} (${num(en.fraccion_luz * 100, 0)} %)`)}
      ${kpi("Luz continua más larga", dur(en.luz_continua_max_h))}
      ${kpi("Oscuridad continua más larga", dur(en.oscuridad_continua_max_h))}
      ${kpi("Elevación solar máxima", num(en.el_sol_max_deg, 2) + " °")}
      ${kpi("Potencia media / pico", `${num(en.potencia_media_w, 1)} / ${num(en.potencia_pico_w, 1)} W`)}
      ${kpi("Energía total", energia(en.energia_total_wh))}
      ${sol}</div>`;
  }

  function tarjetaCom(co) {
    const t = co.tierra_visible_ahora
      ? kpi("Tiempo hasta la puesta de Tierra", dur(co.t_hasta_tierra_puesta_h))
      : kpi("Tierra bajo el horizonte · sale en", co.t_hasta_tierra_salida_h == null ? "no sale en el periodo" : dur(co.t_hasta_tierra_salida_h));
    return `<div class="lw-card"><h3>Comunicación directa (DTE)</h3>
      ${kpi("Horas con Tierra visible", `${dur(co.horas_dte_h)} (${num(co.fraccion_dte * 100, 0)} %)`)}
      ${kpi("Ventanas · la más larga", `${co.n_ventanas_dte} · ${dur(co.ventana_dte_max_h)}`)}
      ${kpi("Elevación máxima de la Tierra", num(co.el_tierra_max_deg, 2) + " °")}
      ${t}
      ${kpi("Distancia media Tierra–Luna", num(co.distancia_media_km, 0) + " km")}
      ${kpi("Pérdida en espacio libre", num(co.fspl_db, 1) + " dB")}
      ${kpi("Tasa de datos máxima (ilustrativa)", num(co.tasa_max_mbps, 2) + " Mbit/s")}</div>`;
  }

  function tablaCriterios(v) {
    if (!v.criterios.length) return "";
    const filas = v.criterios.map((c) => `<tr><td>${esc(c.nombre)}</td>
      <td>${num(c.valor, 1)} ${esc(c.unidad)}</td>
      <td>${c.tipo === "min" ? "≥" : "≤"} ${num(c.umbral, 1)} ${esc(c.unidad)}</td>
      <td class="${c.cumple ? "lw-ok" : "lw-no"}">${c.cumple ? "✓ Cumple" : "✗ No cumple"}</td></tr>`).join("");
    return `<div class="lw-card"><h3>Criterios de la misión</h3><div class="lw-scroll"><table>
      <thead><tr><th>Criterio</th><th>Valor</th><th>Umbral</th><th>Estado</th></tr></thead>
      <tbody>${filas}</tbody></table></div></div>`;
  }

  function barrasPaneles(lista) {
    if (!lista || !lista.length) return "";
    const max = Math.max(...lista.map((p) => p.energia_wh), 1);
    const base = lista.find((p) => p.configuracion === "Horizontal");
    const filas = lista.map((p) => {
      const x = base && base.energia_wh > 0 ? ` (×${num(p.energia_wh / base.energia_wh, 0)})` : "";
      return `<div class="lw-bar"><span>${esc(p.configuracion)}</span>
        <b style="width:${Math.max(0.5, (100 * p.energia_wh) / max)}%"></b>
        <span class="lw-v">${energia(p.energia_wh)}${base && p !== base ? "<br><small>" + x.trim() + "</small>" : ""}</span></div>`;
    }).join("");
    return `<div class="lw-card"><h3>Tipo de panel</h3>${filas}
      <div class="lw-nota">${max > 1
        ? "Con el Sol a menos de ~1,5° del horizonte, un panel vertical capta mucha más energía que uno horizontal."
        : "En este periodo el Sol no supera el horizonte, así que ningún panel genera energía."}</div></div>`;
  }

  function calendario(d) {
    const cal = d.calendario || [];
    if (!cal.length) return "";
    let mes = "", celdas = "";
    cal.forEach((c) => {
      const f = new Date(c.fecha_utc);
      const m = f.toLocaleDateString("es-PE", { month: "short", timeZone: "UTC" });
      if (m !== mes) { celdas += `<span class="lw-mes">${esc(m)}</span>`; mes = m; }
      const tip = `${fecha(c.fecha_utc)} · ${SEM[c.semaforo]} · puntaje ${num(c.score, 0)} · luz ${dur(c.horas_luz_h)} · DTE ${dur(c.horas_dte_h)}`;
      celdas += `<div class="lw-day lw-${esc(c.semaforo)}" title="${esc(tip)}" aria-label="${esc(tip)}">${f.getUTCDate()}</div>`;
    });
    const top = (d.recomendadas || []).map((c) => `<li><b>${fecha(c.fecha_utc)}</b> ·
      <span class="lw-top lw-${esc(c.semaforo)}">${SEM[c.semaforo]}</span> · puntaje ${num(c.score, 0)} ·
      luz ${dur(c.horas_luz_h)} · DTE ${dur(c.horas_dte_h)}</li>`).join("");
    return `<div class="lw-card" style="grid-column:1/-1"><h3>Calendario de viabilidad (fecha de aterrizaje)</h3>
      <div class="lw-cal">${celdas}</div>
      <div class="lw-leyenda"><span class="lw-verde">Viable</span><span class="lw-amarillo">Marginal</span>
        <span class="lw-rojo">No viable</span></div>
      <h3 style="margin-top:14px">Mejores fechas recomendadas</h3><ol>${top}</ol></div>`;
  }

  function resumenReprogramacion(d) {
    const v = d.escenario.viabilidad, r = (d.recomendadas || [])[0];
    if (!r) return "";
    const mejor = r.fecha_utc === d.escenario.inicio_utc
      ? "La fecha original ya es la mejor de la ventana."
      : `La mejor alternativa es <b>${fecha(r.fecha_utc)}</b> (${SEM[r.semaforo]}, puntaje ${num(r.score, 0)}).`;
    return `<div class="lw-resumen">Fecha original <b>${fecha(d.escenario.inicio_utc)}</b>:
      <b>${SEM[v.semaforo]}</b> (puntaje ${num(v.score, 0)}). ${mejor}</div>`;
  }

  function render(el, d) {
    injectCss();
    el.classList.add("lw");
    const e = d.escenario, v = e.viabilidad;
    el.innerHTML = `
      <div class="lw-head"><div>
        <h2 class="lw-title">${esc(d.sitio.replace(/_/g, " "))}</h2>
        <div class="lw-sub">Misión de ${num(d.requisitos.duracion_h / 24, 1)} días desde ${fecha(e.inicio_utc)} ·
          latitud ${num(d.lat, 2)}° · panel ${d.panel.inclinacion_deg}° de inclinación, η = ${num(d.panel.eta * 100, 1)} %</div>
      </div>${badge(v.semaforo, ` · ${num(v.score, 0)}/100`)}</div>
      ${resumenReprogramacion(d)}
      <div class="lw-grid">${tarjetaEnergia(e.energia)}${tarjetaCom(e.comunicacion)}</div>
      <div class="lw-grid2">${tablaCriterios(v)}${barrasPaneles(d.comparacion_paneles)}${calendario(d)}</div>`;
  }

  const FILAS = [
    ["Semáforo", (d) => SEM[d.escenario.viabilidad.semaforo], null],
    ["Puntaje de viabilidad", (d) => d.escenario.viabilidad.score, 1],
    ["Horas de luz (h)", (d) => d.escenario.energia.horas_luz_h, 1],
    ["Oscuridad continua máx. (h)", (d) => d.escenario.energia.oscuridad_continua_max_h, -1],
    ["Elevación solar máx. (°)", (d) => d.escenario.energia.el_sol_max_deg, 1],
    ["Potencia media (W)", (d) => d.escenario.energia.potencia_media_w, 1],
    ["Energía total (Wh)", (d) => d.escenario.energia.energia_total_wh, 1],
    ["Horas con Tierra visible (h)", (d) => d.escenario.comunicacion.horas_dte_h, 1],
    ["Ventana DTE más larga (h)", (d) => d.escenario.comunicacion.ventana_dte_max_h, 1],
    ["Mejor fecha recomendada", (d) => (d.recomendadas[0] ? fecha(d.recomendadas[0].fecha_utc) : "—"), null],
  ];

  function renderComparacion(el, a, b) {
    injectCss();
    el.classList.add("lw");
    const filas = FILAS.map(([n, f, sentido]) => {
      const va = f(a), vb = f(b);
      let ma = "", mb = "";
      if (sentido && typeof va === "number" && typeof vb === "number" && va !== vb) {
        const aGana = sentido > 0 ? va > vb : va < vb;
        (aGana ? (ma = " ✓") : (mb = " ✓"));
      }
      const fm = (x) => typeof x === "number" ? num(x, 1) : esc(x);
      return `<tr><td>${n}</td><td class="${ma ? "lw-ok" : ""}">${fm(va)}${ma}</td>
        <td class="${mb ? "lw-ok" : ""}">${fm(vb)}${mb}</td></tr>`;
    }).join("");
    el.innerHTML = `<div class="lw-card"><h3>Comparación A / B</h3><div class="lw-scroll"><table>
      <thead><tr><th>Métrica</th><th>A · ${esc(a.sitio.replace(/_/g, " "))}</th><th>B · ${esc(b.sitio.replace(/_/g, " "))}</th></tr></thead>
      <tbody>${filas}</tbody></table></div>
      <div class="lw-nota">✓ marca el mejor valor de cada métrica. Ambos escenarios usan los mismos requisitos y el mismo panel.</div></div>`;
  }

  const cargar = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error("No se pudo cargar " + url); return r.json(); });

  global.LunarWindowPanel = { render, renderComparacion, cargar };
})(window);
