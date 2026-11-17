"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";

const SUN = new THREE.Color("#FFC928");
const CLOUD = new THREE.Color("#F2F4F1");
const GRAPHITE = new THREE.Color("#1C1D20");

/** Outer radius of the whole hero composition (largest orbit + node). */
const SCENE_RADIUS = 3.15;

/* -------------------------------------------------------------------------- */
/*  The coin: a beveled gold disc with the SynthPay "S" mark on both faces.    */
/* -------------------------------------------------------------------------- */

function useLogoCurve() {
  return useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const push = (x: number, y: number) => pts.push(new THREE.Vector3(x, y, 0));
    push(0.52, 0.5);
    push(-0.12, 0.5);
    for (let i = 1; i < 12; i++) {
      const a = Math.PI / 2 + (i / 12) * Math.PI;
      push(-0.12 + Math.cos(a) * 0.25, 0.25 + Math.sin(a) * 0.25);
    }
    push(-0.12, 0);
    push(0.12, 0);
    for (let i = 1; i < 12; i++) {
      const a = Math.PI / 2 - (i / 12) * Math.PI;
      push(0.12 + Math.cos(a) * 0.25, -0.25 + Math.sin(a) * 0.25);
    }
    push(0.12, -0.5);
    push(-0.48, -0.5);
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05);
  }, []);
}

function Coin({ radius = 1.35, spin = 0.45 }: { radius?: number; spin?: number }) {
  const ref = useRef<THREE.Group>(null);
  const curve = useLogoCurve();
  const thickness = radius * 0.13;

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.075, 16, false), [curve]);
  const rim = useMemo(() => new THREE.TorusGeometry(radius * 0.86, 0.035, 16, 128), [radius]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * spin;
  });

  const face = (z: number, flip = false) => (
    <group position={[0, 0, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh geometry={tube} scale={radius}>
        <meshStandardMaterial color={GRAPHITE} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[radius * 0.6, -radius * 0.5, 0]}>
        <sphereGeometry args={[radius * 0.085, 24, 24]} />
        <meshStandardMaterial color={GRAPHITE} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh geometry={rim}>
        <meshStandardMaterial color={SUN} metalness={1} roughness={0.18} />
      </mesh>
    </group>
  );

  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, thickness, 128, 1]} />
        <meshStandardMaterial
          color={SUN}
          metalness={0.75}
          roughness={0.28}
          envMapIntensity={1.6}
          emissive={SUN}
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 1.004, radius * 1.004, thickness * 0.7, 160, 1, true]} />
        <meshStandardMaterial color="#e0a800" metalness={1} roughness={0.4} wireframe />
      </mesh>
      {face(thickness / 2 + 0.01)}
      {face(-thickness / 2 - 0.01, true)}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Orbits: agents circling the settlement core.                              */
/* -------------------------------------------------------------------------- */

function Orbit({
  radius,
  tilt,
  speed,
  agents,
  offset = 0,
}: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  agents: number;
  offset?: number;
}) {
  const nodes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    nodes.current.forEach((m, i) => {
      if (!m) return;
      const a = t + (i / agents) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    });
  });

  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.005, 8, 220]} />
        <meshBasicMaterial color={CLOUD} transparent opacity={0.14} />
      </mesh>
      {Array.from({ length: agents }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            nodes.current[i] = el;
          }}
        >
          <sphereGeometry args={[i === 0 ? 0.075 : 0.05, 24, 24]} />
          {/* One yellow node per orbit — the active agent. The rest stay quiet. */}
          <meshStandardMaterial
            color={i === 0 ? SUN : CLOUD}
            emissive={i === 0 ? SUN : CLOUD}
            emissiveIntensity={i === 0 ? 1.4 : 0.35}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Positions and scales the composition so it always fits inside the canvas:
 * on wide screens it sits to the right of the headline, on narrow screens it
 * is centered. Nothing is ever clipped by the canvas edge.
 */
function Layout({ children }: { children: React.ReactNode }) {
  const { size, viewport } = useThree();
  const wide = size.width >= 1024;

  const { x, scale } = useMemo(() => {
    const halfH = viewport.height / 2;
    if (wide) {
      const cx = viewport.width * 0.2;
      const room = Math.min(viewport.width / 2 - cx, halfH);
      return { x: cx, scale: Math.min(1.15, (room * 0.86) / SCENE_RADIUS) };
    }
    const room = Math.min(viewport.width / 2, halfH);
    return { x: 0, scale: (room * 0.86) / SCENE_RADIUS };
  }, [viewport.width, viewport.height, wide]);

  return (
    <group position={[x, 0, 0]} scale={scale}>
      {children}
    </group>
  );
}

/* Leans the scene toward the pointer anywhere on the page. */
function Rig({ children, strength = 1 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const k = 1 - Math.pow(0.02, dt);
    ref.current.rotation.y += (pointer.current.x * 0.22 * strength - ref.current.rotation.y) * k;
    ref.current.rotation.x += (-pointer.current.y * 0.16 * strength - ref.current.rotation.x) * k;
  });
  return <group ref={ref}>{children}</group>;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 6]} intensity={2.2} color="#fff6dc" />
      <pointLight position={[-4, -2, 3]} intensity={12} color={SUN} distance={14} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#FFC928" position={[-5, 0, 2]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#F2F4F1" position={[5, -1, 1]} scale={[2, 6, 1]} />
        <Lightformer form="ring" intensity={3} color="#ffffff" position={[0, 0, -6]} scale={6} />
      </Environment>
    </>
  );
}

export function CoinScene({ variant = "hero" }: { variant?: "hero" | "mini" }) {
  if (variant === "mini") {
    return (
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 4.6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <Lighting />
        <Rig strength={0.6}>
          <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.4}>
            <group rotation={[0.25, -0.35, 0.08]}>
              <Coin radius={1.25} spin={0.6} />
            </group>
          </Float>
        </Rig>
      </Canvas>
    );
  }

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Lighting />
      <Layout>
        <Rig>
          <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.35}>
            <group rotation={[0.22, -0.32, 0.06]}>
              <Coin radius={1.5} spin={0.35} />
            </group>
          </Float>
          <Orbit radius={2.25} tilt={[1.25, 0.2, 0]} speed={0.3} agents={3} />
          <Orbit radius={2.7} tilt={[1.0, -0.5, 0.4]} speed={-0.2} agents={4} offset={1.3} />
          <Orbit radius={3.05} tilt={[1.45, 0.6, -0.2]} speed={0.13} agents={2} offset={2.1} />
          <Sparkles count={36} scale={[6, 5, 3]} size={1.6} speed={0.25} color="#F2F4F1" opacity={0.35} />
        </Rig>
      </Layout>
    </Canvas>
  );
}

export default CoinScene;
