"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

const SUN = new THREE.Color("#FFC928");
const CLOUD = new THREE.Color("#F2F4F1");
const GRAPHITE = new THREE.Color("#1C1D20");
/** Pushed past 1.0 so bloom picks it up as a light source. */
const SUN_HOT = new THREE.Color("#FFC928").multiplyScalar(3);

/** Outer radius of the hero composition (largest orbit + node). */
const SCENE_RADIUS = 3.15;
/** Seconds between "payment landed" pulses. */
const PULSE_EVERY = 3.2;

/* Shared, mutable interaction state read inside useFrame (no re-renders). */
type Interaction = { hover: boolean; scroll: number; pointer: { x: number; y: number } };

function useInteraction(): React.MutableRefObject<Interaction> {
  const state = useRef<Interaction>({ hover: false, scroll: 0, pointer: { x: 0, y: 0 } });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      state.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      state.current.scroll = Math.min(1.5, window.scrollY / window.innerHeight);
    };
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return state;
}

const damp = (dt: number, speed = 4) => 1 - Math.exp(-speed * dt);

/* -------------------------------------------------------------------------- */
/*  The coin                                                                   */
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

function Coin({
  radius = 1.35,
  spin = 0.45,
  interaction,
  interactive = false,
}: {
  radius?: number;
  spin?: number;
  interaction?: React.MutableRefObject<Interaction>;
  interactive?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const rimMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const speed = useRef(spin);
  const curve = useLogoCurve();
  const thickness = radius * 0.13;

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.075, 16, false), [curve]);
  const rim = useMemo(() => new THREE.TorusGeometry(radius * 0.86, 0.035, 16, 128), [radius]);

  useFrame((_, dt) => {
    const hover = interaction?.current.hover ?? false;
    // Hover: spin up and let the rim burn brighter (picked up by bloom).
    speed.current += ((hover ? 2.6 : spin) - speed.current) * damp(dt, 3);
    if (ref.current) ref.current.rotation.y += dt * speed.current;
    for (const m of rimMats.current) {
      if (m) m.emissiveIntensity += ((hover ? 3.2 : 0.9) - m.emissiveIntensity) * damp(dt, 4);
    }
  });

  const face = (z: number, flip: boolean, idx: number) => (
    <group position={[0, 0, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh geometry={tube} scale={radius}>
        <meshStandardMaterial color={GRAPHITE} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[radius * 0.6, -radius * 0.5, 0]}>
        <sphereGeometry args={[radius * 0.085, 24, 24]} />
        <meshStandardMaterial color={GRAPHITE} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh geometry={rim}>
        <meshStandardMaterial
          ref={(m) => {
            if (m) rimMats.current[idx] = m;
          }}
          color={SUN}
          emissive={SUN}
          emissiveIntensity={0.9}
          metalness={1}
          roughness={0.18}
          toneMapped={false}
        />
      </mesh>
    </group>
  );

  return (
    <group
      ref={ref}
      onPointerOver={interactive && interaction ? () => (interaction.current.hover = true) : undefined}
      onPointerOut={interactive && interaction ? () => (interaction.current.hover = false) : undefined}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, thickness, 128, 1]} />
        <meshStandardMaterial
          color={SUN}
          metalness={0.75}
          roughness={0.26}
          envMapIntensity={1.7}
          emissive={SUN}
          emissiveIntensity={0.16}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 1.004, radius * 1.004, thickness * 0.7, 160, 1, true]} />
        <meshStandardMaterial color="#e0a800" metalness={1} roughness={0.4} wireframe />
      </mesh>
      {face(thickness / 2 + 0.01, false, 0)}
      {face(-thickness / 2 - 0.01, true, 1)}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Payment pulse: a ring of light bursting out of the coin.                   */
/* -------------------------------------------------------------------------- */

function PaymentPulse({ radius, delay = 0 }: { radius: number; delay?: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = ((clock.getElapsedTime() + delay) % PULSE_EVERY) / PULSE_EVERY; // 0..1
    const e = 1 - Math.pow(1 - t, 3); // ease-out
    if (ring.current) ring.current.scale.setScalar(1 + e * 0.75);
    if (mat.current) mat.current.opacity = t < 0.03 ? t * 20 : (1 - e) * 0.55;
  });

  return (
    <mesh ref={ring}>
      <torusGeometry args={[radius, 0.009, 12, 160]} />
      <meshBasicMaterial
        ref={mat}
        color={SUN_HOT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Comet tail: a glowing arc along the orbit, fading from head to tail.       */
/*  Built once; it simply rotates with its agent, so it never glitches.        */
/* -------------------------------------------------------------------------- */

function useCometGeometry(radius: number, arc: number, direction: 1 | -1) {
  return useMemo(() => {
    const steps = 64;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      // i = 0 is the far end of the tail, i = steps is the head (angle 0)
      const a = -direction * arc * (1 - i / steps);
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    const radial = 8;
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, 0.028, radial, false);
    const colors: number[] = [];
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const u = Math.floor(v / (radial + 1)) / steps; // 0 tail → 1 head
      const k = Math.pow(u, 2.2) * 2.4; // >1 at the head so bloom catches it
      colors.push(SUN.r * k, SUN.g * k, SUN.b * k);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [radius, arc, direction]);
}

function CometTail({ radius, angle, direction }: { radius: number; angle: React.MutableRefObject<number>; direction: 1 | -1 }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useCometGeometry(radius, 1.1, direction);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = angle.current;
  });
  return (
    <mesh ref={ref} geometry={geo}>
      <meshBasicMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Orbits: agents circling the core, the lead agent leaves a comet tail.     */
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
  const leadAngle = useRef(offset);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    leadAngle.current = t;
    nodes.current.forEach((m, i) => {
      if (!m) return;
      const a = t + (i / agents) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    });
  });

  const node = (i: number) => (
    <mesh
      ref={(el) => {
        nodes.current[i] = el;
      }}
      position={[
        Math.cos(offset + (i / agents) * Math.PI * 2) * radius,
        Math.sin(offset + (i / agents) * Math.PI * 2) * radius,
        0,
      ]}
    >
      <sphereGeometry args={[i === 0 ? 0.07 : 0.045, 24, 24]} />
      <meshBasicMaterial color={i === 0 ? SUN_HOT : CLOUD} toneMapped={false} />
    </mesh>
  );

  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.005, 8, 220]} />
        <meshBasicMaterial color={CLOUD} transparent opacity={0.12} />
      </mesh>
      <CometTail radius={radius} angle={leadAngle} direction={speed >= 0 ? 1 : -1} />
      {Array.from({ length: agents }).map((_, i) => (
        <group key={i}>{node(i)}</group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Depth field: small gold coins drifting at different distances.            */
/* -------------------------------------------------------------------------- */

function DriftingCoins({ count = 16 }: { count?: number }) {
  const { viewport, size } = useThree();
  const wide = size.width >= 1024;
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          x: (r(1) - 0.5) * 1.15,
          y: (r(2) - 0.5) * 1.1,
          z: -2 - r(3) * 7,
          s: 0.12 + r(4) * 0.22,
          spin: 0.2 + r(5) * 0.8,
          bob: r(6) * Math.PI * 2,
          tilt: r(7) * Math.PI,
        };
      }),
    [count],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      // spread across the visible area at that depth
      const depthScale = (9 - s.z) / 9;
      // On wide screens the left half holds the headline: keep coins above/below it.
      let y = s.y;
      if (wide && s.x < 0.05 && Math.abs(y) < 0.38) y = Math.sign(y || 1) * (0.4 + Math.abs(y) * 0.25);
      m.position.set(
        s.x * viewport.width * depthScale,
        y * viewport.height * depthScale + Math.sin(t * 0.5 + s.bob) * 0.25,
        s.z,
      );
      m.rotation.x += dt * s.spin * 0.6;
      m.rotation.y += dt * s.spin;
    });
  });

  return (
    <>
      {seeds.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          rotation={[s.tilt, 0, 0]}
          scale={s.s}
        >
          <cylinderGeometry args={[1, 1, 0.14, 40]} />
          <meshStandardMaterial color={SUN} metalness={0.9} roughness={0.3} envMapIntensity={0.9} />
        </mesh>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout + motion                                                           */
/* -------------------------------------------------------------------------- */

/** Fits the composition inside the canvas: right of the copy on wide screens, centered on narrow. */
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

/** Pointer parallax + scroll-driven flip of the whole composition. */
function Rig({
  children,
  interaction,
  strength = 1,
  scrollFlip = true,
}: {
  children: React.ReactNode;
  interaction: React.MutableRefObject<Interaction>;
  strength?: number;
  scrollFlip?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { pointer, scroll } = interaction.current;
    const s = scrollFlip ? scroll : 0;
    const k = damp(dt, 3.5);
    g.rotation.y += (pointer.x * 0.22 * strength + s * 0.9 - g.rotation.y) * k;
    g.rotation.x += (-pointer.y * 0.16 * strength + s * 0.7 - g.rotation.x) * k;
    g.position.y += (s * 1.4 - g.position.y) * k;
    g.position.z += (-s * 1.5 - g.position.z) * k;
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

/* -------------------------------------------------------------------------- */
/*  Public scenes                                                             */
/* -------------------------------------------------------------------------- */

function MiniScene() {
  const interaction = useInteraction();
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 4.6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <Lighting />
      <Rig interaction={interaction} strength={0.6} scrollFlip={false}>
        <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.4}>
          <group rotation={[0.25, -0.35, 0.08]}>
            <Coin radius={1.25} spin={0.6} />
          </group>
        </Float>
      </Rig>
    </Canvas>
  );
}

function HeroScene({ active }: { active: boolean }) {
  const interaction = useInteraction();
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      // The canvas sits behind the copy with pointer-events off; listen on the
      // whole document so the coin still reacts to hover.
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      {/* Opaque page color so bloom composites cleanly. */}
      <color attach="background" args={["#1C1D20"]} />
      <Lighting />
      <DriftingCoins />
      <Layout>
        <Rig interaction={interaction}>
          <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.35}>
            <group rotation={[0.22, -0.32, 0.06]}>
              <Coin radius={1.5} spin={0.35} interaction={interaction} interactive />
              <PaymentPulse radius={1.55} />
              <PaymentPulse radius={1.55} delay={PULSE_EVERY / 2} />
            </group>
          </Float>
          <Orbit radius={2.25} tilt={[1.25, 0.2, 0]} speed={0.3} agents={3} />
          <Orbit radius={2.7} tilt={[1.0, -0.5, 0.4]} speed={-0.2} agents={4} offset={1.3} />
          <Orbit radius={3.05} tilt={[1.45, 0.6, -0.2]} speed={0.13} agents={2} offset={2.1} />
          <Sparkles count={50} scale={[6.5, 5, 3]} size={1.8} speed={0.3} color="#FFC928" opacity={0.5} />
        </Rig>
      </Layout>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={1.1} radius={0.75} />
      </EffectComposer>
    </Canvas>
  );
}

export function CoinScene({ variant = "hero", active = true }: { variant?: "hero" | "mini"; active?: boolean }) {
  return variant === "mini" ? <MiniScene /> : <HeroScene active={active} />;
}

export default CoinScene;
