import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SITES, type LunarSite } from '../../data/sites';
import {
  getTopocentricFrame,
  topocentricToCartesian,
  getSiteSpherePosition,
} from '../../lib/celestial';
import {
  MOON_ALBEDO_URL,
  MOON_BUMP_URL,
  MOON_TEXTURE_U_OFFSET,
  MOON_BUMP_SCALE_LDEM,
  MOON_BUMP_SCALE_ALBEDO,
  MOON_ALBEDO_TINT,
} from '../../config/moonTexture';
import SpaceBackground from './SpaceBackground';
import CelestialSun from './CelestialSun';
import CelestialEarth from './CelestialEarth';

interface MoonGlobeProps {
  activeSite: LunarSite;
  candidateSites?: LunarSite[];
  selectedLat: number;
  selectedLon: number;
  sunAz: number;
  sunEl: number;
  earthAz: number;
  earthEl: number;
  isSpinning: boolean;
  zoomLevel: number;
  earthRotationRad?: number;
  isEarthOccluded?: boolean;
  onSelectSite: (siteId: string) => void;
  onMapClick?: (lat: number, lon: number) => void;
  controlsRef?: React.RefObject<OrbitControlsImpl | null>;
}

export default function MoonGlobe({
  activeSite,
  candidateSites = SITES,
  selectedLat,
  selectedLon,
  sunAz,
  sunEl,
  earthAz,
  earthEl,
  isSpinning,
  zoomLevel,
  earthRotationRad,
  isEarthOccluded = false,
  onSelectSite,
  onMapClick,
  controlsRef: externalControlsRef,
}: MoonGlobeProps) {
  const internalControlsRef = useRef<OrbitControlsImpl>(null);
  const controlsRef = externalControlsRef || internalControlsRef;

  const moonGroupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // 1. Textura de la Luna: mosaico equirectangular empaquetado por Vite (src/assets/moon).
  //    La ruta lleva hash y es relativa al despliegue, así que no puede dar 404 en producción.
  const [moonAlbedo, setMoonAlbedo] = useState<THREE.Texture | null>(null);
  const [moonRelief, setMoonRelief] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    const orient = (tex: THREE.Texture) => {
      // Lleva la longitud 0° del mapa al eje +Z de la escena (ver config/moonTexture.ts)
      tex.wrapS = THREE.RepeatWrapping;
      tex.offset.x = MOON_TEXTURE_U_OFFSET;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    };
    if (MOON_ALBEDO_URL) {
      loader.load(
        MOON_ALBEDO_URL,
        (tex) => {
          if (cancelled) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          orient(tex);
          setMoonAlbedo(tex);
        },
        undefined,
        (err) => console.warn('No se pudo cargar la textura lunar:', err)
      );
    }
    if (MOON_BUMP_URL) {
      loader.load(
        MOON_BUMP_URL,
        (tex) => {
          if (cancelled) return;
          orient(tex);
          setMoonRelief(tex);
        },
        undefined,
        () => undefined
      );
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Relieve suave: mapa de alturas LOLA si está instalado; si no, se deriva del propio albedo.
  const moonBumpMap = moonRelief ?? moonAlbedo;
  const moonBumpScale = moonRelief ? MOON_BUMP_SCALE_LDEM : MOON_BUMP_SCALE_ALBEDO;

  // 3. Marco topocéntrico y posiciones astronómicas del instante
  const frame = useMemo(
    () => getTopocentricFrame(selectedLat, selectedLon),
    [selectedLat, selectedLon]
  );

  const selectedTargetSpherePos = useMemo<[number, number, number]>(
    () => getSiteSpherePosition(selectedLat, selectedLon, 1.015),
    [selectedLat, selectedLon]
  );

  const sunDir = useMemo(() => topocentricToCartesian(frame, sunAz, sunEl), [frame, sunAz, sunEl]);
  const earthDir = useMemo(() => topocentricToCartesian(frame, earthAz, earthEl), [frame, earthAz, earthEl]);

  // Distancias de colocación visual en el viewport
  const D_SUN = 3.6;
  const D_EARTH = 2.4;

  const sunPos = useMemo<[number, number, number]>(
    () => [
      selectedTargetSpherePos[0] + sunDir[0] * D_SUN,
      selectedTargetSpherePos[1] + sunDir[1] * D_SUN,
      selectedTargetSpherePos[2] + sunDir[2] * D_SUN,
    ],
    [selectedTargetSpherePos, sunDir]
  );

  const earthPos = useMemo<[number, number, number]>(
    () => [
      selectedTargetSpherePos[0] + earthDir[0] * D_EARTH,
      selectedTargetSpherePos[1] + earthDir[1] * D_EARTH,
      selectedTargetSpherePos[2] + earthDir[2] * D_EARTH,
    ],
    [selectedTargetSpherePos, earthDir]
  );

  // Animaciones por cuadro
  useFrame((state, delta) => {
    if (isSpinning && moonGroupRef.current) {
      moonGroupRef.current.rotation.y += delta * 0.08;
    }
    if (pulseRef.current) {
      const s = 1.0 + 0.3 * Math.sin(state.clock.getElapsedTime() * 4.5);
      pulseRef.current.scale.set(s, s, s);
    }
  });

  // Slider de zoom sobre la cámara
  useEffect(() => {
    if (controlsRef.current) {
      const targetDist = 6.5 - (zoomLevel / 100) * 4.8;
      const cam = controlsRef.current.object as THREE.PerspectiveCamera;
      if (cam) {
        const dir = cam.position.clone().normalize();
        cam.position.copy(dir.multiplyScalar(targetDist));
        controlsRef.current.update();
      }
    }
  }, [zoomLevel, controlsRef]);

  // Clic interactivo en cualquier punto de la Luna
  const handleMoonClick = (e: any) => {
    e.stopPropagation();
    if (!e.point || !moonGroupRef.current) return;

    const localPoint = moonGroupRef.current.worldToLocal(e.point.clone());
    const r = localPoint.length();
    if (r === 0) return;

    // Calcular latitud y longitud selenográficas exactas del clic
    const lat = Math.asin(Math.max(-1, Math.min(1, localPoint.y / r))) * (180 / Math.PI);
    let lon = (Math.atan2(localPoint.x, localPoint.z) * 180) / Math.PI;
    lon = ((lon % 360) + 360) % 360;

    onMapClick?.(lat, lon);

    // Buscar sitio más cercano de la lista
    let closestSite = candidateSites[0];
    let minAngularDist = Infinity;

    for (const site of candidateSites) {
      const dLat = site.lat_deg - lat;
      let dLon = Math.abs(site.lon_deg - lon);
      if (dLon > 180) dLon = 360 - dLon;
      const dist = Math.hypot(dLat, dLon);

      if (dist < minAngularDist) {
        minAngularDist = dist;
        closestSite = site;
      }
    }

    if (closestSite) {
      onSelectSite(closestSite.site_id);
    }
  };

  return (
    <>
      {/* 1. Fondo espacial fotorrealista Solar System Scope */}
      <SpaceBackground showEclipticGrid={true} />

      {/* 2. Iluminación físicamente realista: 
             Luz ambiental casi nula (0.015) para que el lado nocturno de la Luna
             quede verdaderamente oscuro en el vacío del espacio */}
      <ambientLight color="#0f172a" intensity={0.018} />

      {/* 3. El Sol volumétrico con fotosfera nuclear, corona suave y luz direccional */}
      <CelestialSun
        position={sunPos}
        radius={0.38}
        targetPos={selectedTargetSpherePos}
        showVector={true}
      />

      {/* 4. La Tierra concéntrica (superficie, nubes y atmósfera Fresnel con rotación axial) */}
      <CelestialEarth
        position={earthPos}
        radius={0.25}
        targetPos={selectedTargetSpherePos}
        showVector={true}
        earthRotationRad={earthRotationRad}
        isOccluded={isEarthOccluded}
      />

      {/* 5. GLOBO LUNAR FOTORREALISTA */}
      <group ref={moonGroupRef}>
        <mesh castShadow receiveShadow onClick={handleMoonClick}>
          <sphereGeometry args={[1.0, 128, 96]} />
          {/* La key recrea el material cuando llega la textura: si no, three.js no recompila
              el shader con el mapa y la Luna se queda como una esfera lisa. */}
          <meshStandardMaterial
            key={`${moonAlbedo ? 'albedo' : 'liso'}-${moonRelief ? 'ldem' : 'bump'}`}
            map={moonAlbedo || undefined}
            bumpMap={moonBumpMap || undefined}
            bumpScale={moonBumpScale}
            color={moonAlbedo ? MOON_ALBEDO_TINT : 0x7c8494}
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>

        {/* Sitios candidatos (puntos rojos sutiles) */}
        {candidateSites.map((site) => {
          const isSelected = site.site_id === activeSite.site_id;
          const pos = getSiteSpherePosition(site.lat_deg, site.lon_deg, 1.015);

          if (isSelected) return null; // El seleccionado se dibuja con el marcador exacto

          return (
            <mesh
              key={site.site_id}
              position={pos}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSite(site.site_id);
              }}
            >
              <sphereGeometry args={[0.016, 16, 16]} />
              <meshBasicMaterial color="#f87171" />
            </mesh>
          );
        })}

        {/* Marcador exacto del objetivo seleccionado (círculo objetivo esmeralda) */}
        <group position={selectedTargetSpherePos}>
          <mesh>
            <sphereGeometry args={[0.024, 24, 24]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh ref={pulseRef}>
            <ringGeometry args={[0.028, 0.046, 32]} />
            <meshBasicMaterial
              color="#4ade80"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      </group>

      {/* Controles de cámara orbitales */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={1.2}
        maxDistance={10.0}
        target={[0, 0, 0]}
      />
    </>
  );
}
