"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Hero canvas: ~7k particles flow as a turbulent stream from the left
 * ("raw data") and lock into a crisp 16:9 frame lattice on the right
 * ("the rendered film"). The morph loops slowly; pointer adds parallax.
 * Fully deterministic layout — no Math.random at module scope.
 */

const COUNT = 7000;

function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const Particles = () => {
  const points = useRef<THREE.Points>(null);
  const { pointer } = useThree();

  const { chaos, frame, colors } = useMemo(() => {
    const chaos = new Float32Array(COUNT * 3);
    const frame = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    const violet = new THREE.Color("#7C6CFF");
    const cyan = new THREE.Color("#4ADEDE");
    const white = new THREE.Color("#EDEDF7");

    // 16:9 frame lattice: perimeter (thick) + sparse scanlines inside.
    const W = 7.2;
    const H = 4.05;
    for (let i = 0; i < COUNT; i++) {
      // chaotic cloud, biased left and vertically spread
      const r1 = seeded(i, 1);
      const r2 = seeded(i, 2);
      const r3 = seeded(i, 3);
      chaos[i * 3] = -9 + r1 * 8 + Math.sin(i) * 0.6;
      chaos[i * 3 + 1] = (r2 - 0.5) * 9;
      chaos[i * 3 + 2] = (r3 - 0.5) * 6;

      const edge = seeded(i, 4);
      let fx: number, fy: number;
      if (edge < 0.62) {
        // perimeter
        const t = seeded(i, 5) * 4;
        if (t < 1) [fx, fy] = [-W / 2 + t * W, H / 2];
        else if (t < 2) [fx, fy] = [W / 2, H / 2 - (t - 1) * H];
        else if (t < 3) [fx, fy] = [W / 2 - (t - 2) * W, -H / 2];
        else [fx, fy] = [-W / 2, -H / 2 + (t - 3) * H];
        // slight thickness
        fx += (seeded(i, 6) - 0.5) * 0.12;
        fy += (seeded(i, 7) - 0.5) * 0.12;
      } else {
        // interior scanlines
        const row = Math.floor(seeded(i, 8) * 9);
        fy = -H / 2 + (row / 8) * H;
        fx = -W / 2 + seeded(i, 9) * W;
        fy += (seeded(i, 10) - 0.5) * 0.05;
      }
      frame[i * 3] = fx + 1.6;
      frame[i * 3 + 1] = fy;
      frame[i * 3 + 2] = (seeded(i, 11) - 0.5) * 0.4;

      const mix = seeded(i, 12);
      const c =
        mix < 0.55
          ? violet.clone().lerp(cyan, seeded(i, 13) * 0.7)
          : mix < 0.9
            ? cyan.clone().lerp(white, seeded(i, 14) * 0.4)
            : white;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { chaos, frame, colors };
  }, []);

  const positions = useMemo(() => new Float32Array(chaos), [chaos]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    // 0 → chaos, 1 → frame; slow breathing loop with a long hold on the frame.
    const cycle = (t % 14) / 14;
    const morphRaw =
      cycle < 0.35
        ? cycle / 0.35
        : cycle < 0.75
          ? 1
          : 1 - (cycle - 0.75) / 0.25;
    const morph = easeInOut(morphRaw);

    const pos = points.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const swirlX = Math.sin(t * 0.6 + i * 0.013) * 0.18 * (1 - morph);
      const swirlY = Math.cos(t * 0.5 + i * 0.017) * 0.22 * (1 - morph);
      const shimmerY = Math.sin(t * 2.2 + i * 0.29) * 0.015 * morph;
      pos[ix] = chaos[ix] + (frame[ix] - chaos[ix]) * morph + swirlX;
      pos[ix + 1] =
        chaos[ix + 1] + (frame[ix + 1] - chaos[ix + 1]) * morph + swirlY + shimmerY;
      pos[ix + 2] = chaos[ix + 2] + (frame[ix + 2] - chaos[ix + 2]) * morph;
    }
    points.current.geometry.attributes.position.needsUpdate = true;

    points.current.rotation.y = pointer.x * 0.06;
    points.current.rotation.x = -pointer.y * 0.05;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

function easeInOut(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export default function ParticleField() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.75]}
      style={{ position: "absolute", inset: 0 }}
    >
      <Particles />
    </Canvas>
  );
}
