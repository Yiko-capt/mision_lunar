// ============================================================================
// main.js — Escena 3D (Three.js) + UI + lógica de la app (MIEMBROS 3, 4 y 5)
// ----------------------------------------------------------------------------
// Estructura:
//   1. Utilidades 3D
//   2. Construcción de la escena (Luna, grid, Sol, Tierra, sitios)
//   3. Estado de la app y controles de UI
//   4. update(): recalcula métricas y actualiza la escena
//   5. Loop de render
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  DEG, daysSinceJ2000, subSolarPoint, subEarthPoint,
  moonPhase, phaseName, elevationAzimuth, solarEfficiency,
  timeToHorizonCrossing,
} from './astronomy.js';
import { SITES } from './sites.js';

// ----------------------------------------------------------------------------
// 1. Utilidades 3D
// ----------------------------------------------------------------------------

/**
 * (lat, lon selenográficas) → vector 3D.
 * Convención: +Y = polo norte lunar, +X = cara visible (lon 0°), y el Este (+lon)
 * queda hacia -Z. Así coincide con el mapeo UV estándar de SphereGeometry:
 * una textura equirectangular con lon creciente hacia la derecha se ve bien
 * (no en espejo) y los sitios caen donde corresponde.
 */
function latLonToVec3(lat, lon, radius = 1) {
  const la = lat * DEG, lo = lon * DEG;
  return new THREE.Vector3(
    radius * Math.cos(la) * Math.cos(lo),
    radius * Math.sin(la),
    -radius * Math.cos(la) * Math.sin(lo)
  );
}

// ----------------------------------------------------------------------------
// 2. Escena
// ----------------------------------------------------------------------------

const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050810);

const camera = new THREE.PerspectiveCamera(42, viewport.clientWidth / viewport.clientHeight, 0.05, 1000);
const DEFAULT_CAM = new THREE.Vector3(2.0, -3.4, 2.6);
const DEFAULT_TARGET = new THREE.Vector3(0, -0.5, 0);
camera.position.copy(DEFAULT_CAM);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.4;
controls.maxDistance = 12;
controls.target.copy(DEFAULT_TARGET);
controls.update();

// --- Estrellas de fondo ---
{
  const N = 1800;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 60 + Math.random() * 40;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[3 * i]     = r * Math.sin(p) * Math.cos(t);
    pos[3 * i + 1] = r * Math.sin(p) * Math.sin(t);
    pos[3 * i + 2] = r * Math.cos(p);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geom, new THREE.PointsMaterial({
    color: 0xaab3c5, size: 0.09, transparent: true, opacity: 0.75,
  })));
}

// --- Luna ---
// Textura: captura ortográfica de la cara visible exportada de Quickmap (LROC/ASU/NASA),
// reproyectada a equirectangular con tools/make_texture.py. La cara oculta y las zonas
// cercanas a los polos NO tienen datos buenos (ver README).
// TODO (Miembro 3/4): textura de la cara oculta, polo sur en estereográfica polar,
// y displacement LOLA (displacementMap).
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0x9fa4af, roughness: 0.95, metalness: 0,
  emissive: 0x0a0b10, emissiveIntensity: 1,
});
const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), moonMaterial);
scene.add(moon);

new THREE.TextureLoader().load(
  'assets/moon_color_nearside.jpg',
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    moonMaterial.map = tex;
    moonMaterial.color.setHex(0xffffff);
    moonMaterial.needsUpdate = true;
  },
  undefined,
  () => console.warn('No se pudo cargar assets/moon_color_nearside.jpg; se usa color liso.')
);

// --- Grid lat/lon ---
{
  const R = 1.001;
  const matNormal = new THREE.LineBasicMaterial({ color: 0x3a4660, transparent: true, opacity: 0.4 });
  const matPolar  = new THREE.LineBasicMaterial({ color: 0x5b7ec2, transparent: true, opacity: 0.7 });
  const matEq     = new THREE.LineBasicMaterial({ color: 0x4a6a9c, transparent: true, opacity: 0.6 });

  const addLine = (pts, mat) =>
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));

  for (let lon = 0; lon < 360; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 2) pts.push(latLonToVec3(lat, lon, R));
    addLine(pts, matNormal);
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue;
    const pts = [];
    for (let lon = 0; lon <= 360; lon += 3) pts.push(latLonToVec3(lat, lon, R));
    addLine(pts, matNormal);
  }
  const eq = [], ring = [];
  for (let lon = 0; lon <= 360; lon += 2) {
    eq.push(latLonToVec3(0, lon, R));
    ring.push(latLonToVec3(-80, lon, R)); // círculo de interés del polo sur
  }
  addLine(eq, matEq);
  addLine(ring, matPolar);
}

// --- Luces ---
scene.add(new THREE.AmbientLight(0x2a3350, 1.0));
const sunLight = new THREE.DirectionalLight(0xfff2d0, 2.2);
scene.add(sunLight);
scene.add(sunLight.target);

// --- Sol (marcador) ---
const sunMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.14, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xffcc55 })
);
sunMarker.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcc55, transparent: true, opacity: 0.18, side: THREE.BackSide })
));
scene.add(sunMarker);

// --- Tierra (marcador) ---
const earthMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.085, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0x4a90e2 })
);
scene.add(earthMarker);

// --- Pines de sitios ---
const siteObjects = {};
for (const s of SITES) {
  const pin = new THREE.Mesh(
    new THREE.SphereGeometry(0.017, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xff6b6b })
  );
  pin.position.copy(latLonToVec3(s.lat, s.lon, 1.012));
  scene.add(pin);
  siteObjects[s.id] = pin;
}

// --- Anillo del sitio seleccionado ---
const selectedRing = new THREE.Mesh(
  new THREE.RingGeometry(0.028, 0.045, 32),
  new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
);
scene.add(selectedRing);

// --- Rayos sitio → Sol / Tierra ---
function makeRay(color) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  return new THREE.Line(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
}
const sunRay = makeRay(0xffcc55);
const earthRay = makeRay(0x4a90e2);
scene.add(sunRay, earthRay);

window.addEventListener('resize', () => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
});

// ----------------------------------------------------------------------------
// 3. Estado y UI
// ----------------------------------------------------------------------------

const state = {
  siteId: 'shackleton',
  baseDate: new Date(),
  offsetDays: 0,
  playing: false,
  scenarioB: null,
};

const $ = (id) => document.getElementById(id);
const currentDate = () => new Date(state.baseDate.getTime() + state.offsetDays * 86400000);
const currentSite = () => SITES.find((s) => s.id === state.siteId);

// Sitio
const siteSelect = $('site-select');
for (const s of SITES) {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = `${s.name}  (${s.lat.toFixed(1)}°, ${s.lon.toFixed(1)}°)`;
  siteSelect.appendChild(opt);
}
siteSelect.value = state.siteId;
siteSelect.addEventListener('change', () => { state.siteId = siteSelect.value; update(); });

// Fecha y hora
const dateInput = $('date-input');
const timeInput = $('time-input');
const slider = $('time-slider');

function syncDateInputs() {
  const iso = state.baseDate.toISOString();
  dateInput.value = iso.slice(0, 10);
  timeInput.value = iso.slice(11, 16);
}
function readDateInputs() {
  if (!dateInput.value || !timeInput.value) return;
  state.baseDate = new Date(`${dateInput.value}T${timeInput.value}:00Z`);
  state.offsetDays = 0;
  slider.value = 0;
}
syncDateInputs();
dateInput.addEventListener('change', () => { readDateInputs(); update(); });
timeInput.addEventListener('change', () => { readDateInputs(); update(); });
slider.addEventListener('input', () => { state.offsetDays = parseFloat(slider.value); update(); });

// Botones
const playBtn = $('play-btn');
playBtn.addEventListener('click', () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? '⏸ Pausar' : '▶ Animar';
});
$('now-btn').addEventListener('click', () => {
  state.baseDate = new Date();
  state.offsetDays = 0;
  slider.value = 0;
  syncDateInputs();
  update();
});

$('reset-view-btn').addEventListener('click', () => {
  camera.position.copy(DEFAULT_CAM);
  controls.target.copy(DEFAULT_TARGET);
  controls.update();
});
$('earth-view-btn').addEventListener('click', () => {
  // Cámara sobre el eje +X (lon 0°), norte arriba: así se ve la Luna desde la Tierra.
  controls.target.set(0, 0, 0);
  camera.position.set(4.5, 0, 0);
  camera.up.set(0, 1, 0);
  controls.update();
});
$('follow-site-btn').addEventListener('click', () => {
  const s = currentSite();
  const p = latLonToVec3(s.lat, s.lon, 1);
  controls.target.copy(p);
  camera.position.copy(p.clone().multiplyScalar(2.4));
  controls.update();
});

// ----------------------------------------------------------------------------
// Cálculo de un "escenario" (sitio + fecha) → objeto con todas las métricas.
// Se usa para A (actual) y para B (snapshot). Reutilizable para export CSV.
// ----------------------------------------------------------------------------
function computeScenario(site, date) {
  const D = daysSinceJ2000(date);
  const sun = subSolarPoint(D);
  const earth = subEarthPoint(D);
  const sunEA = elevationAzimuth(site.lat, site.lon, sun.lat, sun.lon);
  const earthEA = elevationAzimuth(site.lat, site.lon, earth.lat, earth.lon);
  return {
    site, date, D, sun, earth, sunEA, earthEA,
    phase: moonPhase(D),
    eff: solarEfficiency(sunEA.el),
  };
}

$('snapshot-btn').addEventListener('click', () => {
  state.scenarioB = computeScenario(currentSite(), currentDate());
  renderComparePanel();
  update();
});
$('clear-b-btn').addEventListener('click', () => {
  state.scenarioB = null;
  renderComparePanel();
});

// ----------------------------------------------------------------------------
// 4. update(): recalcula todo y actualiza la UI + escena
// ----------------------------------------------------------------------------

const fmtDeg = (x, d = 2) => `${x >= 0 ? '+' : ''}${x.toFixed(d)}°`;
const fmtDate = (d) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const levelClass = (v, good, warn) => (v >= good ? 'good' : v >= warn ? 'warn' : 'bad');

function setMetric(id, text, cls = '') {
  const el = $(id);
  el.textContent = text;
  el.className = 'value ' + cls;
}

function update() {
  const site = currentSite();
  const date = currentDate();
  const sc = computeScenario(site, date);

  // --- HUD ---
  $('hud-site').textContent = site.name;
  $('hud-date').textContent = fmtDate(date);
  $('site-note').textContent = site.note;
  $('days-label').textContent = state.offsetDays.toFixed(2);

  // --- Métricas ---
  setMetric('m-sun-el', fmtDeg(sc.sunEA.el), levelClass(sc.sunEA.el, 1.5, 0));
  setMetric('m-sun-az', fmtDeg(sc.sunEA.az, 1));
  setMetric('m-earth-el', fmtDeg(sc.earthEA.el), levelClass(sc.earthEA.el, 2, 0));
  setMetric('m-earth-az', fmtDeg(sc.earthEA.az, 1));
  setMetric('m-phase', phaseName(sc.phase));
  setMetric('m-efficiency', `${(sc.eff * 100).toFixed(2)}%`, levelClass(sc.eff * 100, 2.5, 0.5));
  setMetric('m-dte', sc.earthEA.el > 0 ? '✓ Directa' : '✗ Sin línea de vista',
            sc.earthEA.el > 0 ? 'good' : 'bad');

  const cross = timeToHorizonCrossing(date, site.lat, site.lon, subSolarPoint);
  if (!cross) {
    setMetric('m-sunset', '— (>60 días)');
  } else if (cross.wasVisible) {
    setMetric('m-sunset', `🌅 ocaso en ${cross.hours.toFixed(1)} h`,
              cross.hours > 72 ? 'good' : cross.hours > 24 ? 'warn' : 'bad');
  } else {
    setMetric('m-sunset', `☀ orto en ${cross.hours.toFixed(1)} h`, 'warn');
  }

  // --- Escena ---
  const sunDir = latLonToVec3(sc.sun.lat, sc.sun.lon, 1).normalize();
  sunMarker.position.copy(sunDir.clone().multiplyScalar(4));
  sunLight.position.copy(sunDir.clone().multiplyScalar(10));

  earthMarker.position.copy(latLonToVec3(sc.earth.lat, sc.earth.lon, 3));

  const sitePos = latLonToVec3(site.lat, site.lon, 1.015);
  selectedRing.position.copy(sitePos);
  selectedRing.lookAt(sitePos.clone().multiplyScalar(2));

  const setRay = (ray, dir, len) => {
    const end = sitePos.clone().add(dir.clone().multiplyScalar(len));
    const a = ray.geometry.attributes.position;
    a.setXYZ(0, sitePos.x, sitePos.y, sitePos.z);
    a.setXYZ(1, end.x, end.y, end.z);
    a.needsUpdate = true;
  };
  setRay(sunRay, sunDir, 1.3);
  setRay(earthRay, earthMarker.position.clone().normalize(), 1.2);

  for (const [id, pin] of Object.entries(siteObjects)) {
    pin.material.color.setHex(id === state.siteId ? 0x4ade80 : 0xff6b6b);
  }

  // --- Delta vs B ---
  if (state.scenarioB) {
    const d = (sc.eff - state.scenarioB.eff) * 100;
    setMetric('b-delta', `${d >= 0 ? '+' : ''}${d.toFixed(2)} pp`, d > 0 ? 'good' : d < 0 ? 'bad' : '');
  }
}

function renderComparePanel() {
  const panel = $('compare-panel');
  const b = state.scenarioB;
  panel.classList.toggle('active', !!b);
  if (!b) return;
  $('b-site').textContent = `${b.site.name} · ${fmtDate(b.date)}`;
  $('b-sun-el').textContent = fmtDeg(b.sunEA.el);
  $('b-earth-el').textContent = fmtDeg(b.earthEA.el);
  $('b-eff').textContent = `${(b.eff * 100).toFixed(2)}%`;
  $('b-phase').textContent = phaseName(b.phase);
}

// ----------------------------------------------------------------------------
// 5. Loop de render
// ----------------------------------------------------------------------------

const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  if (state.playing) {
    state.offsetDays += dt * 2.5; // ~2.5 días simulados por segundo real
    if (state.offsetDays > 180) state.offsetDays = -180;
    slider.value = state.offsetDays;
    update();
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

update();
animate();

// Gancho de depuración: en la consola del navegador puedes usar window.selene
window.selene = { THREE, scene, camera, controls, state, update, latLonToVec3 };

// ============================================================================
// IDEAS DE EXTENSIÓN
//  - Horizon Dome View (canvas 2D fisheye desde el sitio)
//  - Cargar JSON pre-calculado con Python (skyfield) en vez de las fórmulas JS
//  - Heatmap "calendario de eficiencia" (sitio × día)
//  - Click en la esfera para elegir sitio (THREE.Raycaster)
//  - URL compartible: ?site=shackleton&date=2026-11-14T15:30
//  - Modo educativo vs. modo ingeniero
// ============================================================================
