"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

/**
 * A slowly rotating, gently distorting torus knot — a wireframe-lit 3D
 * accent that sits behind the agent section for depth. Cheap, deterministic.
 */
function Knot() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.12;
      mesh.current.rotation.y += delta * 0.18;
    }
  });
  return (
    <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.6}>
      <mesh ref={mesh} scale={1.05}>
        <torusKnotGeometry args={[1, 0.26, 200, 32]} />
        <MeshDistortMaterial
          color="#6C5CE7"
          emissive="#4ADEDE"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.9}
          distort={0.18}
          speed={1.3}
        />
      </mesh>
    </Float>
  );
}

export default function FloatingKnot() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.4} color="#8B7CFF" />
      <pointLight position={[-5, -3, 2]} intensity={1} color="#4ADEDE" />
      <Knot />
    </Canvas>
  );
}
