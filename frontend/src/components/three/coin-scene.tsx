"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";

const SUN = new THREE.Color("#FFC928");
const CLOUD = new THREE.Color("#F2F4F1");
const GRAPHITE = new THREE.Color("#1C1D20");

/* -------------------------------------------------------------------------- */
/*  The coin: a beveled gold disc with the SynthPay "S" mark on both faces.    */
/* -------------------------------------------------------------------------- */

function useLogoCurve() {
  return useMemo(() => {
    // The logo's S, traced as a smooth 3D curve (units ≈ coin radius).
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

function Coin({ radius = 1.35 }: { radius?: number }) {
  const ref = useRef<THREE.Group>(null);
  const curve = useLogoCurve();
  const thickness = radius * 0.13;

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.075, 16, false), [curve]);
  const rim = useMemo(() => new THREE.TorusGeometry(radius * 0.86, 0.035, 16, 128), [radius]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.45;
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
      {/* body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, thickness, 128, 1]} />
        <meshStandardMaterial color={SUN} metalness={0.75} roughness={0.28} envMapIntensity={1.6} emissive={SUN} emissiveIntensity={0.18} />
      </mesh>
      {/* reeded edge */}
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
/*  Orbits: agents circling the settlement core, payments streaking inward.   */
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
  const group = useRef<THREE.Group>(null);
  const nodes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    nodes.current.forEach((m, i) => {
      if (!m) return;
      const a = t + (i / agents) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 3 + i) * 0.15;
      m.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={group} rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.006, 8, 200]} />
        <meshBasicMaterial color={CLOUD} transparent opacity={0.18} />
      </mesh>
      {Array.from({ length: agents }).map((_, i) => (
        <mesh key={i} ref={(el) => {
            nodes.current[i] = el;
          }}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial
            color={i % 2 ? CLOUD : SUN}
            emissive={i % 2 ? CLOUD : SUN}
            emissiveIntensity={i % 2 ? 0.6 : 1.6}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Leans the whole scene toward the pointer for a tactile parallax. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ pointer }, dt) => {
    if (!ref.current) return;
    const k = 1 - Math.pow(0.02, dt);
    ref.current.rotation.y += (pointer.x * 0.35 - ref.current.rotation.y) * k;
    ref.current.rotation.x += (-pointer.y * 0.25 - ref.current.rotation.x) * k;
  });
  return <group ref={ref}>{children}</group>;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 6]} intensity={2.2} color="#fff6dc" />
      <pointLight position={[-4, -2, 3]} intensity={18} color={SUN} distance={14} />
      {/* Procedural studio environment — no HDR download needed. */}
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
  const hero = variant === "hero";
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, hero ? 7 : 4.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Lighting />
      <Rig>
        <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.6}>
          <group rotation={[0.25, -0.35, 0.08]}>
            <Coin radius={hero ? 1.45 : 1.25} />
          </group>
        </Float>
        {hero && (
          <>
            <Orbit radius={2.2} tilt={[1.25, 0.2, 0]} speed={0.35} agents={3} />
            <Orbit radius={2.75} tilt={[1.0, -0.5, 0.4]} speed={-0.22} agents={4} offset={1.3} />
            <Orbit radius={3.0} tilt={[1.45, 0.6, -0.2]} speed={0.15} agents={2} offset={2.1} />
            <Sparkles count={70} scale={[8, 6, 4]} size={2.2} speed={0.35} color="#FFC928" opacity={0.7} />
            <Sparkles count={40} scale={[9, 7, 5]} size={1.4} speed={0.2} color="#F2F4F1" opacity={0.4} />
          </>
        )}
        {!hero && <Sparkles count={24} scale={[4, 3, 2]} size={1.6} speed={0.3} color="#FFC928" opacity={0.6} />}
      </Rig>
    </Canvas>
  );
}

export default CoinScene;
