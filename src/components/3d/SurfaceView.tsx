import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { topocentricToScenePosition } from '../../lib/ephemerisService';
import type { ComputedTrajectory } from '../../lib/physics';

/**
 * Piezas 3D de la vista "Desde el sitio" (primera persona):
 *  - LookControls: cámara fija en el punto de alunizaje a 2 m del suelo; arrastrar mira alrededor.
 *  - CardinalMarkers: letreros N/E/S/O sobre el horizonte.
 *  - SkyTracks: trayectoria del Sol y de la Tierra en las próximas 24 h (de las efemérides).
 * El terreno, el Sol, la Tierra y el fondo son LOS MISMOS componentes de la vista de parche:
 * no hay un segundo cálculo.
 */

interface LookControlsProps {
  /** Posición del ojo (unidades de escena; 1 u = 100 m). */
  eye: [number, number, number];
  /** Azimut inicial de la mirada (°, 0 = Norte). */
  initialAzDeg?: number;
  initialElDeg?: number;
}

export function LookControls({ eye, initialAzDeg = 0, initialElDeg = 8 }: LookControlsProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const yawPitch = useRef({ yaw: 0, pitch: 0 });

  // Mantiene una referencia estable al ojo para los listeners
  const eyeRef = useRef(eye);
  eyeRef.current = eye;

  useEffect(() => {
    // Azimut → yaw de three: az 0° (Norte) mira hacia -Z; az 90° (Este) hacia +X
    yawPitch.current.yaw = (-initialAzDeg * Math.PI) / 180;
    yawPitch.current.pitch = (initialElDeg * Math.PI) / 180;
  }, [initialAzDeg, initialElDeg]);

  useEffect(() => {
    const dom = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      const { yaw, pitch } = yawPitch.current;
      const e = eyeRef.current;
      camera.position.set(e[0], e[1], e[2]);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      camera.quaternion.copy(q);
    };

    const down = (ev: PointerEvent) => {
      dragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      dom.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!dragging) return;
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      yawPitch.current.yaw -= dx * 0.0032;
      yawPitch.current.pitch = Math.max(
        -Math.PI / 2 + 0.02,
        Math.min(Math.PI / 2 - 0.02, yawPitch.current.pitch + dy * 0.0032)
      );
      apply();
    };
    const up = (ev: PointerEvent) => {
      dragging = false;
      try {
        dom.releasePointerCapture(ev.pointerId);
      } catch {
        /* ya liberado */
      }
    };

    apply();
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    return () => {
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('pointercancel', up);
    };
  }, [camera, gl]);

  // Reaplicar si cambia el ojo (otro punto seleccionado)
  useEffect(() => {
    camera.position.set(eye[0], eye[1], eye[2]);
  }, [camera, eye]);

  return null;
}

/** Letrero plano (sprite) con texto, para los puntos cardinales. */
function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 10;
  ctx.strokeText(text, 64, 64);
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface CardinalMarkersProps {
  eye: [number, number, number];
  visible: boolean;
}

export function CardinalMarkers({ eye, visible }: CardinalMarkersProps) {
  const labels = useMemo(
    () =>
      [
        { text: 'N', az: 0, color: '#f87171' },
        { text: 'E', az: 90, color: '#e2e8f0' },
        { text: 'S', az: 180, color: '#e2e8f0' },
        { text: 'O', az: 270, color: '#e2e8f0' },
      ].map((l) => ({ ...l, tex: makeLabelTexture(l.text, l.color) })),
    []
  );
  if (!visible) return null;
  const R = 220; // 22 km: sobre el horizonte aparente
  return (
    <group position={eye}>
      {labels.map((l) => {
        const p = topocentricToScenePosition(l.az, 1.6, R);
        return (
          <sprite key={l.text} position={p} scale={[14, 14, 1]}>
            <spriteMaterial map={l.tex} transparent depthTest={false} />
          </sprite>
        );
      })}
    </group>
  );
}

interface SkyTracksProps {
  eye: [number, number, number];
  traj: ComputedTrajectory | null;
  currentMs: number;
  visible: boolean;
}

/** Trayectorias del Sol (dorada) y la Tierra (celeste) durante las próximas 24 h. */
export function SkyTracks({ eye, traj, currentMs, visible }: SkyTracksProps) {
  const lines = useMemo(() => {
    const R = 200;
    const sunPts: THREE.Vector3[] = [];
    const earthPts: THREE.Vector3[] = [];
    if (traj) {
      const t0 = currentMs;
      const t1 = currentMs + 24 * 3600 * 1000;
      for (const p of traj.points) {
        const t = Date.parse(p.timestamp_utc);
        if (t < t0 || t > t1) continue;
        if (p.sun_el > -2) sunPts.push(new THREE.Vector3(...topocentricToScenePosition(p.sun_az, p.sun_el, R)));
        if (p.earth_el > -2) earthPts.push(new THREE.Vector3(...topocentricToScenePosition(p.earth_az, p.earth_el, R)));
      }
    }
    const mk = (pts: THREE.Vector3[], color: string) =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55, depthTest: false })
      );
    return [mk(sunPts, '#facc15'), mk(earthPts, '#38bdf8')];
  }, [traj, currentMs]);

  if (!visible || !traj) return null;
  return (
    <group position={eye}>
      <primitive object={lines[0]} />
      <primitive object={lines[1]} />
    </group>
  );
}
