import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <div className="h-screen w-screen">
      <Canvas camera={{ position: [0, 3, 6] }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="gray" />
        </mesh>
      </Canvas>
    </div>
  )
}