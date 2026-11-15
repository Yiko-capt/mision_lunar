import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Ajustes globales del renderizador que dependen del modo de luz.
 * R3F ya usa ACESFilmicToneMapping + sRGB por defecto; aquí solo se controla la exposición:
 *   'realista' → 1.0 (el lado nocturno queda casi negro, como en el vacío)
 *   'legible'  → 1.45 (realce rotulado en la interfaz para poder leer el relieve)
 */
export default function SceneTuning({ lightMode }: { lightMode: 'realista' | 'legible' }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = lightMode === 'legible' ? 1.45 : 1.0;
  }, [gl, lightMode]);
  return null;
}
