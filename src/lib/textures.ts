import * as THREE from 'three';

/**
 * Genera una textura fotorrealista de la superficie de la Tierra (2048x1024)
 * con continentes detallados, biomas (bosques, desiertos, tundras, montañas),
 * plataformas continentales turquesa, océanos profundos y casquetes polares.
 * Estilo Solar System Scope / NASA Blue Marble.
 */
export function createRealisticEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Océanos de fondo con gradientes de profundidad
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#07162c');
  oceanGrad.addColorStop(0.2, '#0a2140');
  oceanGrad.addColorStop(0.5, '#0c284f');
  oceanGrad.addColorStop(0.8, '#0a2140');
  oceanGrad.addColorStop(1, '#07162c');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Función auxiliar para dibujar polígonos continentales suavizados
  const drawShape = (
    pts: [number, number][],
    fillColor: string,
    shelfColor?: string
  ) => {
    if (pts.length < 3) return;

    // Plataforma continental poco profunda (aguas turquesas en la costa)
    if (shelfColor) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * width, pts[0][1] * height);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0] * width, pts[i][1] * height);
      }
      ctx.closePath();
      ctx.lineWidth = 16;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = shelfColor;
      ctx.stroke();
      ctx.restore();
    }

    // Superficie continental
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * width, pts[0][1] * height);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0] * width, pts[i][1] * height);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();
  };

  // 1. Sudamérica
  const southAmerica: [number, number][] = [
    [0.26, 0.52], [0.29, 0.52], [0.33, 0.55], [0.36, 0.60], [0.35, 0.66],
    [0.32, 0.76], [0.30, 0.85], [0.29, 0.90], [0.28, 0.86], [0.27, 0.78],
    [0.26, 0.70], [0.24, 0.62], [0.23, 0.55], [0.24, 0.53]
  ];
  drawShape(southAmerica, '#2c5826', '#145c75');

  // Amazonía y vegetación exuberante
  const amazon: [number, number][] = [
    [0.26, 0.54], [0.32, 0.55], [0.34, 0.62], [0.30, 0.68], [0.26, 0.62]
  ];
  drawShape(amazon, '#1a4217');

  // Cordillera de los Andes (marrón montañoso)
  const andes: [number, number][] = [
    [0.24, 0.54], [0.25, 0.63], [0.27, 0.75], [0.28, 0.86],
    [0.27, 0.86], [0.25, 0.74], [0.24, 0.62], [0.23, 0.55]
  ];
  drawShape(andes, '#5a4931');

  // 2. Norteamérica
  const northAmerica: [number, number][] = [
    [0.10, 0.18], [0.15, 0.18], [0.20, 0.22], [0.26, 0.26], [0.30, 0.32],
    [0.28, 0.40], [0.25, 0.43], [0.23, 0.51], [0.21, 0.48], [0.19, 0.42],
    [0.16, 0.36], [0.13, 0.30], [0.10, 0.25], [0.08, 0.20]
  ];
  drawShape(northAmerica, '#385c2d', '#155e78');

  // Rocosas y desierto americano
  const rockies: [number, number][] = [
    [0.13, 0.25], [0.16, 0.28], [0.18, 0.38], [0.16, 0.40], [0.13, 0.32]
  ];
  drawShape(rockies, '#6d5637');

  // 3. Groenlandia (Blanco y tundra)
  const greenland: [number, number][] = [
    [0.34, 0.12], [0.41, 0.12], [0.40, 0.22], [0.35, 0.24], [0.33, 0.17]
  ];
  drawShape(greenland, '#e2e8f0', '#247392');

  // 4. África
  const africa: [number, number][] = [
    [0.47, 0.38], [0.55, 0.37], [0.61, 0.42], [0.64, 0.48], [0.62, 0.58],
    [0.58, 0.70], [0.54, 0.78], [0.51, 0.76], [0.49, 0.65], [0.46, 0.55],
    [0.44, 0.48], [0.45, 0.41]
  ];
  drawShape(africa, '#345929', '#176280');

  // Desierto del Sahara
  const sahara: [number, number][] = [
    [0.46, 0.39], [0.58, 0.38], [0.62, 0.43], [0.58, 0.48], [0.46, 0.48]
  ];
  drawShape(sahara, '#8d7241');

  // Selva del Congo
  const congo: [number, number][] = [
    [0.50, 0.52], [0.57, 0.52], [0.58, 0.62], [0.51, 0.62]
  ];
  drawShape(congo, '#183e15');

  // 5. Eurasia
  const eurasia: [number, number][] = [
    [0.46, 0.34], [0.53, 0.32], [0.60, 0.28], [0.70, 0.22], [0.82, 0.20],
    [0.92, 0.22], [0.94, 0.32], [0.88, 0.42], [0.82, 0.48], [0.76, 0.50],
    [0.72, 0.45], [0.66, 0.44], [0.63, 0.38], [0.58, 0.37], [0.50, 0.36]
  ];
  drawShape(eurasia, '#325828', '#16607e');

  // Desiertos de Arabia y Gobi
  const arabiaGobi: [number, number][] = [
    [0.59, 0.40], [0.65, 0.40], [0.66, 0.46], [0.60, 0.46],
    [0.72, 0.34], [0.80, 0.34], [0.80, 0.40], [0.72, 0.40]
  ];
  drawShape(arabiaGobi, '#836b3f');

  // Himalaya y meseta tibetana
  const himalayas: [number, number][] = [
    [0.68, 0.38], [0.76, 0.36], [0.76, 0.40], [0.68, 0.41]
  ];
  drawShape(himalayas, '#d4d4d8');

  // 6. Australia
  const australia: [number, number][] = [
    [0.80, 0.68], [0.87, 0.66], [0.90, 0.72], [0.88, 0.80], [0.82, 0.81], [0.79, 0.75]
  ];
  drawShape(australia, '#795e37', '#1c6a87');
  const ausOutback: [number, number][] = [
    [0.82, 0.70], [0.86, 0.70], [0.86, 0.77], [0.82, 0.76]
  ];
  drawShape(ausOutback, '#8f562b');

  // 7. Casquetes Polares
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(width * 0.5, 0, width * 0.5, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height, width * 0.5, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Mapa de rugosidad / especularidad de la Tierra:
 * Los océanos son lisos (rugosidad baja = brillo especular al Sol).
 * Los continentes son rugosos (mate).
 */
export function createEarthRoughnessMap(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Océanos: casi negro (muy liso = alto reflejo especular)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // Continentes: gris claro/blanco (rugoso = sin reflejo especular)
  ctx.fillStyle = '#e5e5e5';
  const drawR = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(cx * width, cy * height, rx * width, ry * height, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawR(0.28, 0.65, 0.08, 0.18); // Sudamérica
  drawR(0.20, 0.32, 0.11, 0.15); // Norteamérica
  drawR(0.55, 0.55, 0.09, 0.20); // África
  drawR(0.70, 0.35, 0.22, 0.15); // Eurasia
  drawR(0.85, 0.74, 0.06, 0.07); // Australia

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Mapa de luces nocturnas de ciudades en la Tierra (Emissive Map).
 * Brilla en el hemisferio no iluminado por el Sol.
 */
export function createEarthNightLightsTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Fondo negro espacial
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Función para aglomeraciones urbanas luminosas
  const addCityGlow = (cx: number, cy: number, count: number, spread: number) => {
    for (let i = 0; i < count; i++) {
      const x = cx * width + (Math.random() - 0.5) * spread;
      const y = cy * height + (Math.random() - 0.5) * spread * 0.7;
      const r = Math.random() < 0.2 ? 2.5 : 1.2;
      ctx.fillStyle = Math.random() < 0.3 ? '#fef08a' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Metrópolis de Norteamérica (costa este y oeste)
  addCityGlow(0.24, 0.36, 120, 70);
  addCityGlow(0.14, 0.35, 60, 40);
  // Europa metropolitana densa
  addCityGlow(0.52, 0.30, 220, 90);
  // Asia oriental (China, Japón, India)
  addCityGlow(0.78, 0.36, 260, 100);
  addCityGlow(0.68, 0.44, 140, 70);
  // Sudamérica y costas
  addCityGlow(0.32, 0.72, 80, 50);
  // Sudáfrica y Egipto/Nilo
  addCityGlow(0.56, 0.78, 40, 30);
  addCityGlow(0.55, 0.40, 45, 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura transparente de nubes atmosféricas giratorias (2048x1024)
 * con sistemas de baja presión y espirales ciclónicas.
 */
export function createRealisticCloudsTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, width, height);

  // Bandas nubosas ecuatoriales (ITCZ)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let i = 0; i < 20; i++) {
    const cx = (i / 20) * width + Math.random() * 50;
    const cy = height * 0.5 + (Math.sin(i * 0.6) * 35) + (Math.random() * 20 - 10);
    const rw = 120 + Math.random() * 90;
    const rh = 25 + Math.random() * 20;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Frentes de tormenta y borrascas espirales templadas
  const drawCyclone = (x: number, y: number, radius: number) => {
    ctx.save();
    ctx.translate(x, y);
    for (let a = 0; a < Math.PI * 4; a += 0.15) {
      const r = (a / (Math.PI * 4)) * radius;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r * 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 - (r / radius) * 0.35})`;
      ctx.beginPath();
      ctx.arc(px, py, 14 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  drawCyclone(width * 0.22, height * 0.35, 110);
  drawCyclone(width * 0.42, height * 0.68, 130);
  drawCyclone(width * 0.70, height * 0.32, 140);
  drawCyclone(width * 0.85, height * 0.65, 120);
  drawCyclone(width * 0.15, height * 0.62, 100);

  // Cúmulos dispersos
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 10 + Math.random() * 35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura fotorrealista del Sol (1024x1024)
 * Estilo Solar System Scope: fotosfera nuclear con granulación de plasma,
 * llamaradas ardientes, manchas solares y oscurecimiento al limbo.
 */
export function createRealisticSunTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Gradiente nuclear central hacia la corona
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffffff'); // Núcleo incandescente blanco
  grad.addColorStop(0.2, '#fff176'); // Oro blanco
  grad.addColorStop(0.45, '#ffb300'); // Naranja brillante
  grad.addColorStop(0.72, '#f57c00'); // Naranja solar
  grad.addColorStop(0.88, '#d84315'); // Rojo fotosfera
  grad.addColorStop(1, '#bf360c'); // Limbo exterior
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Células de convección de plasma (granulación fotosférica solar)
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 3 + Math.random() * 14;
    const alpha = 0.15 + Math.random() * 0.3;
    ctx.fillStyle = Math.random() > 0.4 ? `rgba(255, 245, 157, ${alpha})` : `rgba(216, 67, 21, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grupos de manchas solares activas con umbra y penumbra
  const drawSunspot = (x: number, y: number, r: number) => {
    ctx.fillStyle = 'rgba(150, 40, 5, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e1104';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  };

  drawSunspot(size * 0.45, size * 0.42, 18);
  drawSunspot(size * 0.48, size * 0.44, 10);
  drawSunspot(size * 0.43, size * 0.46, 8);
  drawSunspot(size * 0.65, size * 0.56, 16);
  drawSunspot(size * 0.68, size * 0.58, 9);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura de resplandor para la corona solar exterior
 */
export function createSolarCoronaTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
  grad.addColorStop(0, 'rgba(255, 250, 210, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 200, 60, 0.7)');
  grad.addColorStop(0.55, 'rgba(245, 130, 10, 0.35)');
  grad.addColorStop(0.80, 'rgba(220, 50, 20, 0.1)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Genera un mapa de relieve (Bump Map / Normal Map) para la Luna:
 * Micro-cráteres, crestas montañosas y llanuras basálticas
 * para que el terminador solar proyecte sombras topográficas reales.
 */
export function createLunarBumpMap(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Altura base (gris neutro 128)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);

  // Dibujar cientos de cráteres de impacto con relieve positivo en el borde y negativo en el fondo
  for (let i = 0; i < 900; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 2 + Math.random() * 28;

    // Borde elevado del cráter (más claro = relieve positivo)
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(128, 128, 128, 0)');
    rimGrad.addColorStop(0.8, 'rgba(220, 220, 220, 0.6)');
    rimGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Fondo hundido del cráter (más oscuro = relieve negativo)
    const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
    floorGrad.addColorStop(0, 'rgba(30, 30, 30, 0.8)');
    floorGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rugosidad de grano fino de regolito
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 4000; i++) {
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Genera una textura de fondo de espacio profundo con la Vía Láctea,
 * nebulosas cósmicas y polvo interestelar (Solar System Scope background).
 */
export function createMilkyWaySkyTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Espacio negro azabache
  ctx.fillStyle = '#010308';
  ctx.fillRect(0, 0, width, height);

  // Banda inclinada de la Vía Láctea y nubes moleculares
  ctx.save();
  ctx.translate(width * 0.5, height * 0.5);
  ctx.rotate(-0.35); // Inclinación galáctica

  // Polvo cósmico y resplandor de fondo
  const nebGrad = ctx.createRadialGradient(0, 0, 80, 0, 0, width * 0.6);
  nebGrad.addColorStop(0, 'rgba(49, 46, 129, 0.25)'); // Índigo galáctico
  nebGrad.addColorStop(0.3, 'rgba(126, 34, 206, 0.15)'); // Púrpura nebulosa
  nebGrad.addColorStop(0.6, 'rgba(14, 116, 144, 0.1)'); // Cian cósmico
  nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebGrad;
  ctx.fillRect(-width, -height, width * 2, height * 2);

  // Núcleo estelar brillante de la Vía Láctea
  const coreGrad = ctx.createLinearGradient(0, -90, 0, 90);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  coreGrad.addColorStop(0.5, 'rgba(240, 240, 255, 0.18)');
  coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(-width, -90, width * 2, 180);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Genera un sprite circular suave para estrellas brillantes (anti-aliased)
 * eliminando los artefactos de puntos cuadrados.
 */
export function createCircularStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(224, 238, 255, 0.85)');
  grad.addColorStop(0.6, 'rgba(147, 197, 253, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
