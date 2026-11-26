"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/* -------------------------------------------------------------------------- */
/*  Shared pointer / scroll state, read inside useFrame (no re-renders).       */
/* -------------------------------------------------------------------------- */

type Interaction = { pointer: THREE.Vector2; scroll: number; reduced: boolean };

function useInteraction() {
  const state = useRef<Interaction>({ pointer: new THREE.Vector2(9, 9), scroll: 0, reduced: false });
  useEffect(() => {
    const s = state.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: PointerEvent) => {
      s.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onLeave = () => s.pointer.set(9, 9);
    const onScroll = () => (s.scroll = Math.min(1.5, window.scrollY / window.innerHeight));
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return state;
}

const damp = (dt: number, speed: number) => 1 - Math.exp(-speed * dt);

/* -------------------------------------------------------------------------- */
/*  Backdrop: deep space, a teal light shaft on the right, twinkling stars.    */
/*  Drawn as a full-screen quad so it always fills the canvas.                 */
/* -------------------------------------------------------------------------- */

const backdropVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const backdropFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform float uWide;
  uniform vec2 uPointer;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float stars(vec2 uv, float scale, float threshold, float t) {
    vec2 g = uv * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id);
    if (h < threshold) return 0.0;
    vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
    float d = length(f - off * 0.7);
    float size = mix(0.035, 0.11, hash(id + 1.3));
    float twinkle = 0.55 + 0.45 * sin(t * mix(0.6, 2.4, hash(id + 9.2)) + h * 40.0);
    return smoothstep(size, 0.0, d) * twinkle * (h - threshold) / (1.0 - threshold);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);

    vec3 col = vec3(0.012, 0.022, 0.02);

    // Light shaft: a soft diagonal beam coming down from the top right.
    // Wide: right of the headline. Narrow: hugging the right edge, behind the coins.
    vec2 c = vec2(mix(0.46, 0.36, uWide) * uAspect, mix(0.12, 0.02, uWide));
    vec2 dir = normalize(vec2(0.55, 1.0));
    vec2 q = p - c;
    float along = dot(q, dir);
    float across = dot(q, vec2(-dir.y, dir.x));
    float width = 0.36 + 0.12 * along;
    float beam = exp(-pow(across / width, 2.0) * 2.2) * smoothstep(-0.9, 0.5, along);
    float core = exp(-dot(q - dir * 0.35, q - dir * 0.35) * 5.0);

    vec3 teal = vec3(0.04, 0.32, 0.3);
    vec3 mint = vec3(0.36, 0.78, 0.66);
    vec3 lime = vec3(0.78, 0.92, 0.55);
    float k = mix(0.6, 1.0, uWide);
    col += teal * beam * 1.15 * k;
    col += mint * core * 0.55 * k;
    col += lime * exp(-dot(q - dir * 0.75, q - dir * 0.75) * 9.0) * 0.35 * k;

    // Slow breathing so the light feels alive.
    col *= 0.92 + 0.08 * sin(uTime * 0.4);

    // Stars, with a touch of pointer parallax per layer.
    vec2 par = uPointer * 0.006;
    float s = stars(p + par, 90.0, 0.86, uTime) * 0.9
            + stars(p + par * 2.0, 45.0, 0.9, uTime * 0.8) * 1.2
            + stars(p + par * 3.5, 22.0, 0.94, uTime * 0.6) * 1.5;
    col += vec3(0.95, 0.97, 1.0) * s * (1.0 - beam * 0.6);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Backdrop({ interaction }: { interaction: React.MutableRefObject<Interaction> }) {
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uWide: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
    }),
    [],
  );

  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uAspect.value = size.width / size.height;
    uniforms.uWide.value = size.width >= 1024 ? 1 : 0;
    const p = interaction.current.pointer;
    if (Math.abs(p.x) <= 1) uniforms.uPointer.value.lerp(p, damp(dt, 2));
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={backdropVert}
        fragmentShader={backdropFrag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Coin textures, painted once on a canvas.                                   */
/* -------------------------------------------------------------------------- */

/** The SynthPay mark (see LogoMark), in a 32-unit box. */
const MARK_PATH = "M21.5 10.5h-8a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6h-8";

function paintFace(ctx: CanvasRenderingContext2D, s: number, bump: boolean) {
  const r = s / 2;
  ctx.save();
  ctx.translate(r, r);

  if (bump) {
    ctx.fillStyle = "#000";
    ctx.fillRect(-r, -r, s, s);
  } else {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
    g.addColorStop(0, "#fff1c2");
    g.addColorStop(0.45, "#f3c867");
    g.addColorStop(1, "#c8902a");
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, s, s);
  }

  const ring = (rad: number, w: number, color: string) => {
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  // Raised outer lip, recessed field, two engraved rings.
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = bump ? "#ffffff" : "rgba(255,240,200,0.35)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.fillStyle = bump ? "#5a5a5a" : "rgba(150,95,20,0.18)";
  ctx.fill();
  ring(r * 0.86, s * 0.012, bump ? "#202020" : "rgba(110,64,8,0.55)");
  ring(r * 0.72, s * 0.014, bump ? "#d8d8d8" : "rgba(255,244,210,0.65)");
  ring(r * 0.69, s * 0.008, bump ? "#303030" : "rgba(120,72,10,0.45)");

  // The mark, embossed in the centre.
  const k = (r * 1.05) / 16;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(-16, -16.5);
  const path = new Path2D(MARK_PATH);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (!bump) {
    ctx.save();
    ctx.translate(0.35, 0.45);
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = "rgba(110,62,6,0.55)";
    ctx.stroke(path);
    ctx.beginPath();
    ctx.arc(22.5, 22.5, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(110,62,6,0.55)";
    ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = bump ? "#ececec" : "#ffe7a3";
  ctx.stroke(path);
  ctx.beginPath();
  ctx.arc(22.5, 22.5, 1.9, 0, Math.PI * 2);
  ctx.fillStyle = bump ? "#ececec" : "#ffe7a3";
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function useCoinTextures() {
  return useMemo(() => {
    const make = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, srgb: boolean) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      draw(canvas.getContext("2d")!, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      return tex;
    };

    const face = make((ctx, w) => paintFace(ctx, w, false), 512, 512, true);
    const faceBump = make((ctx, w) => paintFace(ctx, w, true), 512, 512, false);
    // Reeded edge: fine vertical ridges.
    const edgeBump = make(
      (ctx, w, h) => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fff";
        for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 2, h);
      },
      512,
      8,
      false,
    );
    edgeBump.wrapS = THREE.RepeatWrapping;
    edgeBump.repeat.set(3, 1);
    return { face, faceBump, edgeBump };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  The coin stream: instanced coins rising along a curved diagonal band.      */
/* -------------------------------------------------------------------------- */

type Seed = {
  t: number; // progress along the path, 0..1
  speed: number;
  lateral: number; // offset across the band
  z: number;
  scale: number;
  tilt: number;
  wobble: number;
  wobbleSpeed: number;
  spin: number;
  flip: number; // >0: this coin tumbles end over end
  phase: number;
};

const rand = (i: number, n: number) => {
  const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function makeSeed(i: number, round = 0): Seed {
  const r = (n: number) => rand(i + round * 97, n);
  return {
    t: r(1),
    speed: 0.045 + r(2) * 0.03,
    lateral: (r(3) - 0.5) * 2,
    z: -5 + r(4) * 7,
    scale: 0.55 + r(5) * 0.3,
    tilt: 0.75 + (r(6) - 0.5) * 0.5,
    wobble: 0.15 + r(7) * 0.3,
    wobbleSpeed: 0.4 + r(8) * 0.8,
    spin: (r(9) - 0.5) * 0.8,
    flip: r(10) > 0.78 ? 0.6 + r(11) * 1.2 : 0,
    phase: r(12) * Math.PI * 2,
  };
}

function CoinStream({ interaction }: { interaction: React.MutableRefObject<Interaction> }) {
  const { size, viewport, camera } = useThree();
  const wide = size.width >= 1024;
  const count = wide ? 34 : 16;

  const mesh = useRef<THREE.InstancedMesh>(null);
  const tex = useCoinTextures();
  const seeds = useRef<Seed[]>([]);
  const rounds = useRef<number[]>([]);
  const push = useRef<THREE.Vector3[]>([]);
  const speedBoost = useRef(1);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), p: new THREE.Vector3() }), []);

  if (seeds.current.length !== count) {
    seeds.current = Array.from({ length: count }, (_, i) => makeSeed(i));
    rounds.current = Array.from({ length: count }, () => 0);
    push.current = Array.from({ length: count }, () => new THREE.Vector3());
  }

  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 0.14, 72, 1), []);
  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({
      color: "#e2a93a",
      metalness: 1,
      roughness: 0.32,
      bumpMap: tex.edgeBump,
      bumpScale: 1.2,
      envMapIntensity: 1.4,
    });
    const face = new THREE.MeshStandardMaterial({
      map: tex.face,
      bumpMap: tex.faceBump,
      bumpScale: 3,
      metalness: 0.8,
      roughness: 0.27,
      envMapIntensity: 1.6,
    });
    // CylinderGeometry groups: [side, top cap, bottom cap]
    return [edge, face, face];
  }, [tex]);

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      Object.values(tex).forEach((t) => t.dispose());
    },
    [geometry, materials, tex],
  );

  // Subtle warm/cool variation per coin.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const k = rand(i, 20);
      m.setColorAt(i, c.setRGB(1, 0.94 + k * 0.06, 0.86 + k * 0.14));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.05);
    const time = clock.getElapsedTime();
    const { pointer, scroll, reduced } = interaction.current;

    // Coins rush faster as the page scrolls.
    const targetBoost = (reduced ? 0.25 : 1) * (1 + scroll * 4);
    speedBoost.current += (targetBoost - speedBoost.current) * damp(dt, 3);

    // The band: a gentle curve from below the fold up past the top right.
    const W = viewport.width;
    const H = viewport.height;
    const cx = wide ? W * 0.27 : W * 0.42;
    const p0x = cx - W * 0.14, p0y = -H * 0.5 - 2.2;
    const p1x = cx - W * 0.07, p1y = 0;
    const p2x = cx + W * 0.2, p2y = H * 0.5 + 2.2;
    const bandWidth = wide ? 1.9 : 1.1;

    // Pointer in world space at z = 0.
    const px = pointer.x * (W / 2);
    const py = pointer.y * (H / 2);
    const pointerActive = Math.abs(pointer.x) <= 1;

    for (let i = 0; i < count; i++) {
      const s = seeds.current[i];
      s.t += dt * s.speed * speedBoost.current;
      if (s.t > 1) {
        // Respawn at the bottom with fresh randomness.
        rounds.current[i] += 1;
        seeds.current[i] = { ...makeSeed(i, rounds.current[i]), t: s.t - 1 };
      }
      const c = seeds.current[i];
      const t = c.t;
      const u = 1 - t;

      // Quadratic bezier point and tangent.
      const x = u * u * p0x + 2 * u * t * p1x + t * t * p2x;
      const y = u * u * p0y + 2 * u * t * p1y + t * t * p2y;
      tmp.a.set(2 * u * (p1x - p0x) + 2 * t * (p2x - p1x), 2 * u * (p1y - p0y) + 2 * t * (p2y - p1y), 0).normalize();
      // Band widens towards the top, like light spreading.
      const spread = bandWidth * (0.75 + t * 0.6);
      tmp.p.set(x - tmp.a.y * c.lateral * spread, y + tmp.a.x * c.lateral * spread, c.z);

      // Pointer repels nearby coins (projected to the coin's depth).
      const pv = push.current[i];
      if (pointerActive) {
        const depthK = (camera.position.z - c.z) / camera.position.z;
        tmp.b.set(tmp.p.x - px * depthK, tmp.p.y - py * depthK, 0);
        const d = tmp.b.length();
        const reach = 2.2;
        const f = d < reach ? Math.pow(1 - d / reach, 2) * 1.6 : 0;
        tmp.b.normalize().multiplyScalar(f);
        pv.lerp(tmp.b, damp(dt, 6));
      } else {
        pv.multiplyScalar(1 - damp(dt, 3));
      }

      dummy.position.set(tmp.p.x + pv.x, tmp.p.y + pv.y + Math.sin(time * 0.8 + c.phase) * 0.08, c.z);

      const w = Math.sin(time * c.wobbleSpeed + c.phase) * c.wobble;
      const pushTilt = (pv.x + pv.y) * 0.35;
      dummy.rotation.set(
        c.tilt + w + c.flip * time * 2.2 + pushTilt,
        c.phase + time * c.spin,
        -0.35 + Math.cos(time * c.wobbleSpeed * 0.8 + c.phase) * c.wobble * 0.8,
        "XZY",
      );

      // Grow in at the bottom, fade by shrinking past the top edge.
      const edge = Math.min(1, t * 8, (1 - t) * 10);
      dummy.scale.setScalar(c.scale * (wide ? 1 : 0.7) * (0.6 + 0.4 * edge));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, materials, count]} frustumCulled={false} />;
}

/** Whole-scene parallax: the stream leans toward the pointer and drifts up on scroll. */
function Rig({ children, interaction }: { children: React.ReactNode; interaction: React.MutableRefObject<Interaction> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { pointer, scroll } = interaction.current;
    const px = Math.abs(pointer.x) <= 1 ? pointer.x : 0;
    const py = Math.abs(pointer.y) <= 1 ? pointer.y : 0;
    const k = damp(dt, 2.5);
    g.rotation.y += (px * 0.08 - g.rotation.y) * k;
    g.rotation.x += (-py * 0.05 - g.rotation.x) * k;
    g.position.y += (scroll * 2 - g.position.y) * k;
  });
  return <group ref={ref}>{children}</group>;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[-6, 6, 8]} intensity={2.4} color="#fff1d0" />
      <pointLight position={[7, 2, 4]} intensity={14} distance={20} color="#5fe3c8" />
      <pointLight position={[2, -5, 5]} intensity={22} distance={16} color="#ffd36b" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={5} color="#fff4dc" position={[-2, 5, 5]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#9ff2dc" position={[6, 1, 2]} scale={[3, 10, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#2a7f74" position={[0, -5, 2]} scale={[12, 2, 1]} />
        <Lightformer form="circle" intensity={3} color="#ffe6a6" position={[-5, -1, 3]} scale={2} />
      </Environment>
    </>
  );
}

export function CoinStreamScene({ active = true }: { active?: boolean }) {
  const interaction = useInteraction();
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 12], fov: 38 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#030605"]} />
      <fog attach="fog" args={["#04100e", 12, 24]} />
      <Backdrop interaction={interaction} />
      <Lighting />
      <Rig interaction={interaction}>
        <CoinStream interaction={interaction} />
      </Rig>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.9} radius={0.7} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}

export default CoinStreamScene;
