import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { createRealisticEarthTexture } from '../../lib/textures';
import {
  EARTH_DAY_URL,
  EARTH_NIGHT_URL,
  EARTH_WATER_URL,
  EARTH_CLOUDS_URL,
} from '../../config/earthTextures';

interface CelestialEarthProps {
  position: [number, number, number];
  radius?: number;
  targetPos?: [number, number, number];
  showVector?: boolean;
  /** Rotación simple alrededor de Y (solo si no se da `orientation`). */
  earthRotationRad?: number;
  isOccluded?: boolean;
  /** Orientación real (eje inclinado + giro por hora UTC). Ver lib/earthOrientation.ts. */
  orientation?: THREE.Quaternion;
  /** Dirección unitaria hacia el Sol en coordenadas de la escena (para el día/noche). */
  sunDir?: [number, number, number];
}

/* ───────────────────────────── shaders ───────────────────────────── */

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Superficie: día (albedo × luz solar), noche (luces de ciudades), brillo especular en los océanos,
// crepúsculo y borde atmosférico. Todo se calcula con la dirección real del Sol.
const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uWater;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, uSunDir);
    float lit = smoothstep(-0.06, 0.22, ndl);

    vec3 day = texture2D(uDay, vUv).rgb;
    float water = texture2D(uWater, vUv).r;
    float lum = max(ndl, 0.0);

    // Difusa + un mínimo de luz de la Tierra misma ("earthshine" del propio planeta)
    vec3 col = day * (0.015 + 1.35 * lum);

    // Brillo especular solo en el agua
    vec3 R = reflect(-uSunDir, N);
    float spec = pow(max(dot(R, V), 0.0), 140.0) * water * lit * 0.5;
    col += vec3(1.0, 0.97, 0.9) * spec;

    // Crepúsculo: banda anaranjada estrecha junto al terminador
    float twi = exp(-pow((ndl - 0.02) / 0.09, 2.0));
    col = mix(col, col * vec3(1.35, 0.78, 0.5), twi * 0.55);

    // Luces nocturnas, solo donde no hay Sol
    float n = texture2D(uNight, vUv).r;
    col += vec3(1.0, 0.76, 0.42) * n * 2.6 * (1.0 - lit);

    // Borde atmosférico (dispersión de Rayleigh): azul, más intenso del lado iluminado
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.2);
    float sunSide = smoothstep(-0.35, 0.45, ndl);
    col += vec3(0.28, 0.52, 1.0) * rim * (0.06 + 0.9 * sunSide);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uClouds;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    float ndl = dot(N, uSunDir);
    float shade = 0.025 + 1.15 * smoothstep(-0.08, 0.5, ndl);
    float a = texture2D(uClouds, vUv).a * 0.88;
    gl_FragColor = vec4(vec3(1.0) * shade, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Halo exterior: cascarón visto por dentro, brillante junto al limbo y que se desvanece hacia afuera.
const ATMOS_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const ATMOS_FRAG = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uCenter;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 V = normalize(cameraPosition - vPosW);
    float d = -dot(normalize(vNormalW), V);              // 0 en el borde exterior, ~0.48 en el limbo
    float i = pow(clamp(d / 0.48, 0.0, 1.0), 3.0);
    vec3 up = normalize(vPosW - uCenter);
    float sunSide = smoothstep(-0.45, 0.5, dot(up, uSunDir));
    vec3 col = mix(vec3(0.25, 0.5, 1.0), vec3(0.45, 0.72, 1.0), sunSide);
    gl_FragColor = vec4(col * i * (0.08 + 0.55 * sunSide), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ──────────────────────── carga de texturas ──────────────────────── */

const solid = (r: number, g: number, b: number, a = 255) => {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
};

interface EarthMaps {
  day: THREE.Texture;
  night: THREE.Texture;
  water: THREE.Texture;
  clouds: THREE.Texture;
}

function useEarthMaps(): EarthMaps {
  // Mientras llegan los archivos (o si faltan) se usa la Tierra procedural y se omiten nubes/luces/brillo
  const fallback = useMemo<EarthMaps>(
    () => ({
      day: createRealisticEarthTexture(),
      night: solid(0, 0, 0),
      water: solid(0, 0, 0),
      clouds: solid(255, 255, 255, 0),
    }),
    []
  );
  const [maps, setMaps] = useState<Partial<EarthMaps>>({});

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const load = (key: keyof EarthMaps, url: string | null, srgb: boolean) => {
      if (!url) return;
      loader.load(
        url,
        (tex) => {
          if (cancelled) return;
          tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.anisotropy = 8;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.needsUpdate = true;
          setMaps((prev) => ({ ...prev, [key]: tex }));
        },
        undefined,
        (err) => console.warn(`No se pudo cargar la textura de la Tierra (${key}):`, err)
      );
    };
    load('day', EARTH_DAY_URL, true);
    load('night', EARTH_NIGHT_URL, false);
    load('water', EARTH_WATER_URL, false);
    load('clouds', EARTH_CLOUDS_URL, true);
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...fallback, ...maps };
}

/* ───────────────────────────── componente ───────────────────────────── */

export default function CelestialEarth({
  position,
  radius = 0.25,
  targetPos,
  showVector = true,
  earthRotationRad,
  isOccluded = false,
  orientation,
  sunDir = [1, 0, 0],
}: CelestialEarthProps) {
  const spinRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const maps = useEarthMaps();

  const sunVec = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir]);

  // Uniformes estables; se actualizan por referencia cuando cambian mapas o Sol
  const earthUniforms = useMemo(
    () => ({
      uDay: { value: maps.day },
      uNight: { value: maps.night },
      uWater: { value: maps.water },
      uSunDir: { value: sunVec },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const cloudUniforms = useMemo(
    () => ({ uClouds: { value: maps.clouds }, uSunDir: { value: sunVec } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const atmosUniforms = useMemo(
    () => ({ uSunDir: { value: sunVec }, uCenter: { value: new THREE.Vector3(...position) } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // R3F no garantiza que los uniformes sean el mismo objeto que se le pasó, así que se
  // actualizan por referencia al material real en cada cuadro (mapas que llegan tarde, Sol, centro).
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const cloudMatRef = useRef<THREE.ShaderMaterial>(null);
  const atmosMatRef = useRef<THREE.ShaderMaterial>(null);

  // Orientación: real (eje inclinado + hora UTC) o rotación simple de respaldo
  useFrame((_, delta) => {
    const eu = earthMatRef.current?.uniforms;
    if (eu) {
      eu.uDay.value = maps.day;
      eu.uNight.value = maps.night;
      eu.uWater.value = maps.water;
      (eu.uSunDir.value as THREE.Vector3).copy(sunVec);
    }
    const cu = cloudMatRef.current?.uniforms;
    if (cu) {
      cu.uClouds.value = maps.clouds;
      (cu.uSunDir.value as THREE.Vector3).copy(sunVec);
    }
    const au = atmosMatRef.current?.uniforms;
    if (au) {
      (au.uSunDir.value as THREE.Vector3).copy(sunVec);
      (au.uCenter.value as THREE.Vector3).set(position[0], position[1], position[2]);
    }
    const g = spinRef.current;
    if (!g) return;
    if (orientation) {
      g.quaternion.copy(orientation);
    } else if (earthRotationRad !== undefined) {
      g.rotation.set(0, earthRotationRad, 0);
    } else {
      g.rotation.y += delta * 0.08;
    }
    // Las nubes se desplazan un poco más rápido que el suelo (vientos del oeste)
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.004;
  });

  return (
    <group position={position}>
      {/* Vector Tierra (celeste si hay visión directa, rojo tenue si está tras el horizonte) */}
      {showVector && targetPos && (
        <Line
          points={[
            [0, 0, 0],
            [targetPos[0] - position[0], targetPos[1] - position[1], targetPos[2] - position[2]],
          ]}
          color={isOccluded ? '#f43f5e' : '#38bdf8'}
          lineWidth={isOccluded ? 1.5 : 2.2}
          dashed
          dashScale={12}
          dashSize={0.16}
          gapSize={0.08}
          transparent
          opacity={isOccluded ? 0.35 : 0.9}
        />
      )}

      {/* Planeta + nubes giran juntos con el eje inclinado de la Tierra */}
      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[radius, 96, 64]} />
          <shaderMaterial
            ref={earthMatRef}
            vertexShader={EARTH_VERT}
            fragmentShader={EARTH_FRAG}
            uniforms={earthUniforms}
          />
        </mesh>
        <mesh ref={cloudsRef} scale={1.008}>
          <sphereGeometry args={[radius, 96, 64]} />
          <shaderMaterial
            ref={cloudMatRef}
            vertexShader={EARTH_VERT}
            fragmentShader={CLOUD_FRAG}
            uniforms={cloudUniforms}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Atmósfera: halo azul que no gira (depende de la vista y del Sol, no del eje) */}
      <mesh scale={1.14}>
        <sphereGeometry args={[radius, 64, 48]} />
        <shaderMaterial
          ref={atmosMatRef}
          vertexShader={ATMOS_VERT}
          fragmentShader={ATMOS_FRAG}
          uniforms={atmosUniforms}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Aro rojo si la Tierra está oculta tras el horizonte local */}
      {isOccluded && (
        <mesh scale={[1.05, 1.05, 1.05]}>
          <ringGeometry args={[radius * 1.2, radius * 1.32, 32]} />
          <meshBasicMaterial color="#f43f5e" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
