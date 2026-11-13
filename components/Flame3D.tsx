"use client";

import { useEffect, useRef } from "react";
import type { LabelText, Layers, SimStats } from "@/lib/flameEngine";
import { BOX, FlameEngine3D, T3, type Env3, type Params3 } from "@/lib/flameEngine3D";

type TH = typeof import("three");
export type ZoomPreset = "chamber" | "flame" | "molecules";

interface Props {
  params: Params3;
  layers: Layers;
  env: Env3;
  running: boolean;
  speed: number;
  aspect: number;
  labelText: LabelText;
  ariaLabel: string;
  reigniteKey: number;
  autoRotate: boolean;
  resetKey: number;
  cursorAir: boolean;
  zoomReq: { preset: ZoomPreset; n: number };
  onZoom?: (x: number) => void;
  onStats?: (s: SimStats) => void;
  onUnsupported?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ GLSL */
const NOISE = /* glsl */ `
float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
`;

const FLAME_VERT = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Volumetric flame: ray-marched emission through a noisy shell around the droplet.
// 0 g -> a blue sphere (diffusion flame); with gravity the shell stretches, tapers and flickers into a teardrop whose
// soot turns it yellow. Only radius, intensity, gravity and airflow come from the simulation; the look is qualitative.
const FLAME_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform float uTime, uRf, uI, uG, uSoot, uFlow;
uniform vec3 uWind;
uniform int uSteps;
const float RB = 3.7;
${NOISE}
vec4 flame(vec3 p){
  vec3 q = p;
  float g = uG;
  float lift = uRf * 0.42 * g;
  q.y -= lift;
  float h = q.y / uRf;
  float taper = mix(1.0, 1.0 - 0.60 * smoothstep(-0.3, 1.9, h), g);
  q.xz /= max(taper, 0.28);
  q.y /= (1.0 + 1.05 * g);
  q -= uWind * (clamp(uFlow, 0.0, 60.0) * 0.011) * uRf * 0.7;
  float flicker = 0.4 + 1.9 * g;
  vec3 np = q * 2.3 + vec3(0.0, -uTime * flicker, 0.0) + uWind * (-uTime * 0.15);
  float n = fbm(np);
  float n2 = noise(np * 4.1 + vec3(uTime * 0.6));          // fine flame licks
  float r = length(q) + (n - 0.5) * uRf * (0.20 + 0.60 * g) + (n2 - 0.5) * uRf * 0.06;
  float x = (r - uRf) / (0.15 * uRf + 1e-3);
  float sheet = exp(-x * x);
  float core = 0.12 * exp(-pow(r / (0.60 * uRf), 2.0));
  float halo = 0.10 * exp(-pow((r - 1.20 * uRf) / (0.40 * uRf), 2.0));
  float tip = 1.0 - g * 0.55 * smoothstep(0.9, 2.1, h);
  float d = (sheet * (0.82 + 0.28 * n2) + core + halo) * uI * tip;

  vec3 blue = vec3(0.10, 0.36, 1.00);
  vec3 cyan = vec3(0.35, 0.82, 1.00);
  vec3 yellow = vec3(1.00, 0.74, 0.28);
  vec3 orange = vec3(1.00, 0.40, 0.10);
  float soot = clamp(uSoot + 1.15 * g, 0.0, 1.0);
  float inner = 1.0 - smoothstep(0.30 * uRf, 1.08 * uRf, r);
  vec3 warm = mix(yellow, orange, 0.20 * inner + 0.55 * smoothstep(0.2, 2.0, h));
  vec3 col = mix(blue, warm, smoothstep(0.12, 0.72, soot) * (0.82 + 0.18 * inner));
  col = mix(col, cyan, 0.22 * sheet * (1.0 - soot));
  col = mix(col, vec3(1.0, 0.92, 0.78), 0.22 * core * soot * 4.0);
  col = mix(col, blue, 0.75 * g * (1.0 - smoothstep(-0.65, 0.05, h)) * (0.3 + 0.7 * sheet));
  return vec4(col, d);
}
void main(){
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - ro);
  float b = dot(ro, rd);
  float c = dot(ro, ro) - RB * RB;
  float disc = b * b - c;
  if (disc < 0.0) discard;
  disc = sqrt(disc);
  float t0 = max(-b - disc, 0.0);
  float t1 = -b + disc;
  float dt = (t1 - t0) / float(uSteps);
  float t = t0 + dt * hash(vec3(gl_FragCoord.xy, fract(uTime) * 37.0));
  vec3 acc = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < 96; i++) {
    if (i >= uSteps) break;
    vec4 s = flame(ro + rd * t);
    float a = 1.0 - exp(-s.a * dt * 2.2);
    acc += T * a * s.rgb * (1.05 - 0.3 * clamp(uSoot + 1.15 * uG, 0.0, 1.0));
    T *= (1.0 - a);
    t += dt;
    if (T < 0.02) break;
  }
  gl_FragColor = vec4(acc, 1.0 - T);
}`;

const EARTH_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = position;
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const EARTH_FRAG = /* glsl */ `
precision highp float;
varying vec3 vN; varying vec3 vP; varying vec3 vV;
uniform float uTime; uniform vec3 uSun; uniform float uR;
${NOISE}
void main(){
  vec3 p = normalize(vP) * 3.0;
  float land = smoothstep(0.50, 0.56, fbm(p * 1.1 + vec3(uTime * 0.004)));
  float cloud = smoothstep(0.55, 0.85, fbm(p * 2.2 + vec3(uTime * 0.012, 0.0, uTime * 0.007)));
  vec3 ocean = vec3(0.02, 0.12, 0.38);
  vec3 ground = mix(vec3(0.08, 0.26, 0.12), vec3(0.34, 0.30, 0.16), smoothstep(0.55, 0.8, fbm(p * 3.0)));
  vec3 base = mix(ocean, ground, land);
  base = mix(base, vec3(0.92), cloud * 0.85);
  float dif = clamp(dot(normalize(vN), normalize(uSun)) * 0.8 + 0.25, 0.04, 1.0);
  float rim = pow(1.0 - clamp(dot(normalize(vN), vV), 0.0, 1.0), 2.6);
  vec3 col = base * dif + vec3(0.25, 0.55, 1.0) * rim * 0.95;
  gl_FragColor = vec4(col, 1.0);
}`;
const SKY_FRAG = /* glsl */ `
precision highp float; varying vec3 vP; uniform vec3 uTop; uniform vec3 uBottom;
void main(){ float k = smoothstep(-0.25, 0.65, normalize(vP).y); gl_FragColor = vec4(mix(uBottom, uTop, k), 1.0); }`;
const SKY_VERT = /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const ATOM_HEX = { O: 0xe34948, N: 0x3987e5, C: 0x6f6e68, H: 0xf4f2ec, He: 0x8ee8e0, F: 0xeda100, S: 0x2b2a28 } as const;
const AR = { O: 0.044, N: 0.042, C: 0.048, H: 0.029, He: 0.043, F: 0.05, S: 0.042 } as const;
const LO_CAP = 6400;
const HI_CAP = 2600;
const BOND_CAP = 2600;

const LABEL_IDS = ["droplet", "fuelVapor", "zone", "oxygenIn", "products", "plume", "sphere"] as const;
type LabelId = (typeof LABEL_IDS)[number];
const LABEL_SIDE: Record<LabelId, "l" | "r"> = { droplet: "l", fuelVapor: "r", zone: "r", oxygenIn: "l", products: "r", plume: "r", sphere: "l" };

export default function Flame3D({ params, layers, env, running, speed, aspect, labelText, ariaLabel, reigniteKey, autoRotate, resetKey, cursorAir, zoomReq, onZoom, onStats, onUnsupported, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const live = useRef({ params, layers, env, running, speed, autoRotate, cursorAir, onStats, onZoom });
  live.current = { params, layers, env, running, speed, autoRotate, cursorAir, onStats, onZoom };
  const api = useRef<{ reignite: () => void; reset: () => void; setEnv: (e: Env3) => void; dirty: () => void; zoomTo: (p: ZoomPreset) => void } | null>(null);
  const labelEls = useRef<Partial<Record<LabelId, HTMLDivElement | null>>>({});

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const THREE: TH = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const { OutputPass } = await import("three/examples/jsm/postprocessing/OutputPass.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (cancelled) return;

      let renderer: InstanceType<TH["WebGLRenderer"]>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      } catch {
        onUnsupported?.();
        return;
      }
      renderer.toneMapping = THREE.NoToneMapping;
      const canvas = renderer.domElement;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", ariaLabel);
      canvas.className = "block w-full rounded-xl border border-line touch-none";
      host.prepend(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1.6, 0.02, 140);
      const HOME = new THREE.Vector3(1.4, 1.0, 8.8);
      const HOME_T = new THREE.Vector3(0, 0.55, 0);
      const HOME_DIST = HOME.distanceTo(HOME_T);
      camera.position.copy(HOME);
      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(HOME_T);
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.panSpeed = 0.8;
      controls.zoomToCursor = true; // zoom toward whatever the pointer is over: dive in to a single molecule
      controls.zoomSpeed = 1.25;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.2;
      controls.maxDistance = 18;
      controls.autoRotateSpeed = 1.1;
      controls.update();

      /* realistic reflections on atoms and droplet */
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.5;

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.26, 0.5, 0.7);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      /* ---------------- lights ---------------- */
      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const key = new THREE.DirectionalLight(0xdfe9ff, 0.8);
      key.position.set(-4, 7, 5);
      scene.add(key);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.03;
      const fireLight = new THREE.PointLight(0xff9a4c, 0, 14, 1.6);
      scene.add(fireLight);

      /* ---------------- chamber, droplet, fiber ---------------- */
      const boxGeo = new THREE.BoxGeometry(BOX.x * 2, BOX.yMax - BOX.yMin, BOX.z * 2);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x5aa3ff, transparent: true, opacity: 0.22 }));
      edges.position.y = (BOX.yMax + BOX.yMin) / 2;
      scene.add(edges);
      // glass walls (faint, reflective) and metal corner posts so the chamber reads as a real test rig
      const glass = new THREE.Mesh(boxGeo, new THREE.MeshPhysicalMaterial({ color: 0xb8d4ff, transparent: true, opacity: 0.045, roughness: 0.04, metalness: 0, envMapIntensity: 2.2, side: THREE.BackSide, depthWrite: false }));
      glass.position.y = edges.position.y;
      scene.add(glass);
      const postMat = new THREE.MeshStandardMaterial({ color: 0xa9b4c4, roughness: 0.28, metalness: 0.9, envMapIntensity: 1.3 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, BOX.yMax - BOX.yMin, 10), postMat);
        post.position.set(sx * BOX.x, edges.position.y, sz * BOX.z);
        scene.add(post);
      }

      const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe6f2, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, emissive: 0x222a38, emissiveIntensity: 0.3 });
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 48, 32), dropMat);
      scene.add(droplet);
      const fiber = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 2.6, 6), new THREE.MeshBasicMaterial({ color: 0xc8c6be, transparent: true, opacity: 0.55 }));
      fiber.rotation.z = Math.PI / 2 - 0.4;
      scene.add(fiber);

      /* ---------------- volumetric flame ---------------- */
      const flameMat = new THREE.ShaderMaterial({
        vertexShader: FLAME_VERT,
        fragmentShader: FLAME_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: {
          uTime: { value: 0 },
          uRf: { value: 0.6 },
          uI: { value: 0 },
          uG: { value: 0 },
          uSoot: { value: 0.1 },
          uFlow: { value: 0 },
          uWind: { value: new THREE.Vector3(1, 0, 0) },
          uSteps: { value: 72 },
        },
      });
      const flameMesh = new THREE.Mesh(new THREE.SphereGeometry(3.7, 48, 32), flameMat);
      flameMesh.renderOrder = 10;
      scene.add(flameMesh);

      /* ---------------- atoms (two levels of detail, per-instance colour) and bonds ---------------- */
      const atomMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.27, metalness: 0.02, envMapIntensity: 1.1 });
      const mkAtoms = (seg: [number, number], cap: number) => {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, seg[0], seg[1]), atomMat, cap);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.setColorAt(0, new THREE.Color(1, 1, 1));
        (m.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).setUsage(THREE.DynamicDrawUsage);
        m.count = 0;
        m.frustumCulled = false;
        scene.add(m);
        return m;
      };
      const atomsLo = mkAtoms([10, 8], LO_CAP);
      const atomsHi = mkAtoms([26, 18], HI_CAP);
      const loM = atomsLo.instanceMatrix.array as Float32Array;
      const loC = (atomsLo.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).array as Float32Array;
      const hiM = atomsHi.instanceMatrix.array as Float32Array;
      const hiC = (atomsHi.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).array as Float32Array;
      let nLo = 0, nHi = 0;

      const bondMat = new THREE.MeshStandardMaterial({ color: 0xd9d7d0, roughness: 0.35, metalness: 0.2, envMapIntensity: 1 });
      const bonds = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 9, 1, true), bondMat, BOND_CAP);
      bonds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      bonds.count = 0;
      bonds.frustumCulled = false;
      scene.add(bonds);
      const bondM = bonds.instanceMatrix.array as Float32Array;
      let nBond = 0;

      const lin = (hex: number) => {
        const c = new THREE.Color(hex);
        return [c.r, c.g, c.b] as const;
      };
      const COL = { O: lin(ATOM_HEX.O), N: lin(ATOM_HEX.N), C: lin(ATOM_HEX.C), H: lin(ATOM_HEX.H), He: lin(ATOM_HEX.He), F: lin(ATOM_HEX.F), S: lin(ATOM_HEX.S) };

      const camP = camera.position;
      let boost = 1;
      const putAtom = (x: number, y: number, z: number, s: number, c: readonly [number, number, number], heat = 0) => {
        const dx = x - camP.x, dy = y - camP.y, dz = z - camP.z;
        const near = dx * dx + dy * dy + dz * dz < 9;
        const rs = s * boost;
        let r = c[0], g = c[1], b = c[2];
        if (heat > 0.01) {
          // hot products glow orange and cool down: over-bright values feed the bloom
          r = r * (1 - 0.8 * heat) + 2.6 * heat;
          g = g * (1 - 0.8 * heat) + 0.55 * heat;
          b = b * (1 - 0.8 * heat) + 0.08 * heat;
        }
        if (near) {
          if (nHi >= HI_CAP) return;
          const o = nHi * 16, k = nHi * 3;
          hiM[o] = rs; hiM[o + 5] = rs; hiM[o + 10] = rs; hiM[o + 12] = x; hiM[o + 13] = y; hiM[o + 14] = z; hiM[o + 15] = 1;
          hiC[k] = r; hiC[k + 1] = g; hiC[k + 2] = b;
          nHi++;
        } else {
          if (nLo >= LO_CAP) return;
          const o = nLo * 16, k = nLo * 3;
          loM[o] = rs; loM[o + 5] = rs; loM[o + 10] = rs; loM[o + 12] = x; loM[o + 13] = y; loM[o + 14] = z; loM[o + 15] = 1;
          loC[k] = r; loC[k + 1] = g; loC[k + 2] = b;
          nLo++;
        }
      };
      const putBond = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, rad: number) => {
        if (nBond >= BOND_CAP) return;
        let dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
        const len = Math.hypot(dx, dy, dz);
        if (len < 1e-5) return;
        dx /= len; dy /= len; dz /= len;
        let ux: number, uy: number, uz: number;
        if (Math.abs(dy) < 0.9) { ux = -dz; uy = 0; uz = dx; } else { ux = 0; uy = dz; uz = -dy; }
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
        const o = nBond * 16;
        bondM[o] = ux * rad; bondM[o + 1] = uy * rad; bondM[o + 2] = uz * rad;
        bondM[o + 4] = dx * len; bondM[o + 5] = dy * len; bondM[o + 6] = dz * len;
        bondM[o + 8] = vx * rad; bondM[o + 9] = vy * rad; bondM[o + 10] = vz * rad;
        bondM[o + 12] = (x1 + x2) / 2; bondM[o + 13] = (y1 + y2) / 2; bondM[o + 14] = (z1 + z2) / 2; bondM[o + 15] = 1;
        nBond++;
      };

      /* ---------------- airflow arrows ---------------- */
      const arrowGroup = new THREE.Group();
      const arrows: InstanceType<TH["ArrowHelper"]>[] = [];
      for (let i = 0; i < 9; i++) {
        const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.5, 0x8ac8ff, 0.14, 0.09);
        a.visible = false;
        arrows.push(a);
        arrowGroup.add(a);
      }
      scene.add(arrowGroup);
      const cursorArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffd36b, 0.22, 0.14);
      cursorArrow.visible = false;
      scene.add(cursorArrow);

      /* ---------------- environments ---------------- */
      let envGroup: InstanceType<TH["Group"]> | null = null;
      const dispose = (o: InstanceType<TH["Object3D"]>) => {
        o.traverse((c) => {
          const m = c as InstanceType<TH["Mesh"]>;
          m.geometry?.dispose?.();
          const mat = m.material as InstanceType<TH["Material"]> | InstanceType<TH["Material"]>[] | undefined;
          const free = (x: InstanceType<TH["Material"]>) => {
            (x as InstanceType<TH["MeshStandardMaterial"]>).map?.dispose?.();
            x.dispose();
          };
          if (Array.isArray(mat)) mat.forEach(free);
          else if (mat) free(mat);
        });
      };
      const stars = (n: number, radius: number) => {
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
          pos[i * 3] = radius * s * Math.cos(th);
          pos[i * 3 + 1] = radius * u;
          pos[i * 3 + 2] = radius * s * Math.sin(th);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      };
      const earthMat = (sun: [number, number, number]) =>
        new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: { uTime: { value: 0 }, uSun: { value: new THREE.Vector3(...sun) }, uR: { value: 1 } } });
      const uniformsToAnimate: { value: number }[] = [];

      const buildEnv = (e: Env3) => {
        if (envGroup) {
          scene.remove(envGroup);
          dispose(envGroup);
          envGroup = null;
        }
        uniformsToAnimate.length = 0;
        const g = new THREE.Group();
        const bg: Record<Env3, number> = { earth: 0x0b1626, iss: 0x03050a, moon: 0x020306, suit: 0x07090e, none: 0x0d1017 };
        scene.background = new THREE.Color(bg[e]);
        scene.fog = new THREE.Fog(bg[e], 16, 46);
        key.castShadow = false;
        key.intensity = e === "moon" ? 1.1 : e === "iss" ? 0.7 : 0.8;
        key.color.set(e === "moon" ? 0xfff4e0 : 0xdfe9ff);
        controls.maxPolarAngle = e === "earth" || e === "moon" ? Math.PI * 0.515 : Math.PI;

        if (e === "earth") {
          g.add(new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color(0x1a3f66) }, uBottom: { value: new THREE.Color(0x0a1420) } } })));
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x101b28, roughness: 0.5, metalness: 0.15 }));
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = BOX.yMin - 0.02;
          g.add(floor);
          const grid = new THREE.GridHelper(60, 60, 0x2a4a6a, 0x16293b);
          grid.position.y = BOX.yMin - 0.01;
          (grid.material as InstanceType<TH["LineBasicMaterial"]>).transparent = true;
          (grid.material as InstanceType<TH["LineBasicMaterial"]>).opacity = 0.45;
          g.add(grid);
        } else if (e === "iss") {
          g.add(stars(1300, 80));
          const earth = new THREE.Mesh(new THREE.SphereGeometry(38, 96, 64), earthMat([0.4, 0.5, 0.8]));
          earth.position.set(0, -41.4, -14);
          g.add(earth);
          uniformsToAnimate.push((earth.material as InstanceType<TH["ShaderMaterial"]>).uniforms.uTime);
        } else if (e === "moon") {
          g.add(stars(1100, 80));
          // the whole Moon: a full cratered sphere with the chamber standing on its top (curved horizon when you orbit)
          scene.fog = new THREE.Fog(bg[e], 70, 260);
          const RM = 40, yTop = BOX.yMin - 0.15, cy = yTop - RM;
          const cv = document.createElement("canvas");
          cv.width = 2048;
          cv.height = 1024;
          const cx2 = cv.getContext("2d")!;
          let seed = 7;
          const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          cx2.fillStyle = "#8c8a86";
          cx2.fillRect(0, 0, cv.width, cv.height);
          for (let i = 0; i < 9000; i++) {
            const v = 110 + Math.floor(rnd() * 70);
            cx2.fillStyle = `rgba(${v},${v - 2},${v - 6},0.16)`;
            cx2.fillRect(rnd() * cv.width, rnd() * cv.height, 2 + rnd() * 10, 2 + rnd() * 10);
          }
          // maria: large dark basalt plains
          for (let i = 0; i < 9; i++) {
            const x = rnd() * cv.width, y = cv.height * (0.25 + rnd() * 0.5), r = 90 + rnd() * 170;
            const gr = cx2.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, "rgba(58,58,62,0.7)");
            gr.addColorStop(1, "rgba(58,58,62,0)");
            cx2.fillStyle = gr;
            cx2.fillRect(x - r, y - r, r * 2, r * 2);
          }
          // craters: dark floor, bright rim
          for (let i = 0; i < 1500; i++) {
            const x = rnd() * cv.width, y = rnd() * cv.height, r = 3 + Math.pow(rnd(), 3) * 46;
            const gr = cx2.createRadialGradient(x, y, r * 0.15, x, y, r * 1.25);
            gr.addColorStop(0, "rgba(40,40,42,0.5)");
            gr.addColorStop(0.7, "rgba(60,60,62,0.35)");
            gr.addColorStop(0.88, "rgba(210,208,200,0.5)");
            gr.addColorStop(1, "rgba(210,208,200,0)");
            cx2.fillStyle = gr;
            cx2.beginPath();
            cx2.arc(x, y, r * 1.25, 0, Math.PI * 2);
            cx2.fill();
          }
          // fine regolith grain
          for (let i = 0; i < 90000; i++) {
            const v = 70 + Math.floor(rnd() * 130);
            cx2.fillStyle = `rgba(${v},${v},${v},0.22)`;
            cx2.fillRect(rnd() * cv.width, rnd() * cv.height, 1, 1);
          }
          const moonTex = new THREE.CanvasTexture(cv);
          moonTex.colorSpace = THREE.SRGBColorSpace;
          moonTex.anisotropy = 8;
          const moon = new THREE.Mesh(new THREE.SphereGeometry(RM, 128, 96), new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 2.2, roughness: 1, metalness: 0, envMapIntensity: 0.15 }));
          moon.position.y = cy;
          moon.rotation.x = Math.PI / 2; // texture poles point sideways, so the chamber sits on the undistorted equator
          g.add(moon);

          // United States flag planted beside the chamber (Apollo style: pole with a horizontal bar holding the flag out)
          const fc = document.createElement("canvas");
          fc.width = 760;
          fc.height = 400;
          const f2 = fc.getContext("2d")!;
          const sh = fc.height / 13;
          for (let i = 0; i < 13; i++) {
            f2.fillStyle = i % 2 === 0 ? "#b22234" : "#ffffff";
            f2.fillRect(0, i * sh, fc.width, sh + 1);
          }
          f2.fillStyle = "#3c3b6e";
          f2.fillRect(0, 0, fc.width * 0.4, sh * 7);
          f2.fillStyle = "#ffffff";
          for (let r = 0; r < 9; r++) {
            const n = r % 2 === 0 ? 6 : 5;
            for (let c = 0; c < n; c++) {
              const sx = fc.width * 0.4 * ((r % 2 === 0 ? c + 0.5 : c + 1) / 6.2) + 4;
              const sy = (sh * 7 * (r + 0.7)) / 9.4;
              f2.beginPath();
              for (let k = 0; k < 10; k++) {
                const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 === 0 ? 9 : 3.6;
                f2.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
              }
              f2.closePath();
              f2.fill();
            }
          }
          const flagTex = new THREE.CanvasTexture(fc);
          flagTex.colorSpace = THREE.SRGBColorSpace;
          flagTex.anisotropy = 8;
          const fx = -5.6, fz = -2.2, fy = cy + Math.sqrt(RM * RM - fx * fx - fz * fz);
          const flagG = new THREE.Group();
          flagG.position.set(fx, fy, fz);
          flagG.rotation.y = 0.35;
          flagG.scale.setScalar(1.7);
          const metal = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.35, metalness: 0.8 });
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.75, 12), metal);
          pole.position.y = 0.875;
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 10), metal);
          bar.rotation.z = Math.PI / 2;
          bar.position.set(0.5, 1.7, 0);
          const cloth = new THREE.PlaneGeometry(0.95, 0.5, 14, 6);
          const cp = cloth.attributes.position as InstanceType<TH["BufferAttribute"]>;
          for (let i = 0; i < cp.count; i++) cp.setZ(i, 0.025 * Math.sin(cp.getX(i) * 9) * (0.4 + (cp.getX(i) + 0.475)));
          cloth.computeVertexNormals();
          const flag = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 }));
          flag.position.set(0.5, 1.45, 0);
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 16), metal);
          foot.position.y = 0.02;
          flagG.add(pole, bar, flag, foot);
          g.add(flagG);

          // fabric weave (bump) so the cloth catches the light like real nylon
          const wv = document.createElement("canvas");
          wv.width = 256;
          wv.height = 128;
          const w2 = wv.getContext("2d")!;
          w2.fillStyle = "#808080";
          w2.fillRect(0, 0, 256, 128);
          for (let i = 0; i < 256; i += 2) {
            w2.fillStyle = "#b4b4b4";
            w2.fillRect(i, 0, 1, 128);
          }
          for (let j = 0; j < 128; j += 2) {
            w2.fillStyle = "#5c5c5c";
            w2.fillRect(0, j, 256, 1);
          }
          const weave = new THREE.CanvasTexture(wv);
          weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
          weave.repeat.set(5, 3);
          (flag.material as InstanceType<TH["MeshStandardMaterial"]>).bumpMap = weave;
          (flag.material as InstanceType<TH["MeshStandardMaterial"]>).bumpScale = 0.5;
          for (const m of [pole, bar, flag, foot]) m.castShadow = true;
          moon.receiveShadow = true;

          // surface surface placement helper: point on the sphere top, plus its up-normal
          const onMoon = (x: number, z: number) => {
            const y = cy + Math.sqrt(RM * RM - x * x - z * z);
            const n = new THREE.Vector3(x, y - cy, z).normalize();
            return { p: new THREE.Vector3(x, y, z), n };
          };
          const up = new THREE.Vector3(0, 1, 0);

          // scattered boulders and pebbles (instanced), kept out of the chamber footprint
          const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7873, roughness: 1, metalness: 0, flatShading: true });
          const rockGeo = new THREE.DodecahedronGeometry(1, 1);
          const rg = rockGeo.attributes.position as InstanceType<TH["BufferAttribute"]>;
          for (let i = 0; i < rg.count; i++) {
            const k = 0.82 + 0.3 * Math.sin(rg.getX(i) * 7.3 + rg.getY(i) * 3.1 + rg.getZ(i) * 5.7);
            rg.setXYZ(i, rg.getX(i) * k, rg.getY(i) * k * 0.7, rg.getZ(i) * k);
          }
          rockGeo.computeVertexNormals();
          const NR = 170;
          const rocks = new THREE.InstancedMesh(rockGeo, rockMat, NR);
          const dm = new THREE.Object3D();
          let placed = 0;
          while (placed < NR) {
            const a = rnd() * Math.PI * 2, d = 4.6 + Math.pow(rnd(), 0.7) * 22;
            const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9;
            if (Math.abs(x) < BOX.x + 0.6 && Math.abs(z) < BOX.z + 0.6) continue;
            const s = 0.025 + Math.pow(rnd(), 4) * 0.34;
            const { p, n } = onMoon(x, z);
            dm.position.copy(p).addScaledVector(n, -s * 0.2);
            dm.quaternion.setFromUnitVectors(up, n);
            dm.rotateY(rnd() * 6.28);
            dm.scale.set(s * (0.8 + rnd() * 0.6), s, s * (0.8 + rnd() * 0.6));
            dm.updateMatrix();
            rocks.setMatrixAt(placed++, dm.matrix);
          }
          rocks.castShadow = true;
          rocks.receiveShadow = true;
          g.add(rocks);

          // boot prints and a rover track leading from the flag
          const printGeo = new THREE.CircleGeometry(1, 14);
          const printMat = new THREE.MeshBasicMaterial({ color: 0x2c2b2a, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
          const prints = new THREE.InstancedMesh(printGeo, printMat, 40);
          let pi = 0;
          for (let k = 0; k < 18 && pi < 36; k++) {
            const t = k / 17, side = k % 2 === 0 ? -0.09 : 0.09;
            const x = -5.1 + t * 1.2 + side, z = -1.6 + t * 7.6;
            const { p, n } = onMoon(x, z);
            dm.position.copy(p).addScaledVector(n, 0.004);
            dm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
            dm.rotateZ(0.12 * Math.sin(k));
            dm.scale.set(0.045, 0.11, 1);
            dm.updateMatrix();
            prints.setMatrixAt(pi++, dm.matrix);
          }
          prints.count = pi;
          g.add(prints);
          key.castShadow = true;
          const earth = new THREE.Mesh(new THREE.SphereGeometry(2.3, 48, 32), earthMat([-0.4, 0.4, 0.8]));
          earth.position.set(16, 9, -34);
          g.add(earth);
          uniformsToAnimate.push((earth.material as InstanceType<TH["ShaderMaterial"]>).uniforms.uTime);
        }
        scene.add(g);
        envGroup = g;
      };
      buildEnv(live.current.env);

      /* ---------------- labels: DOM chips projected every frame, de-overlapped ---------------- */
      const proj = new THREE.Vector3();
      type LItem = { id: LabelId; x: number; y: number; w: number; h: number };
      const sizeCache = new Map<LabelId, { w: number; h: number }>();
      const measure = (id: LabelId, el: HTMLDivElement) => {
        let s = sizeCache.get(id);
        if (!s || s.w === 0) {
          s = { w: el.offsetWidth || 100, h: el.offsetHeight || 22 };
          sizeCache.set(id, s);
        }
        return s;
      };
      const layoutLabels = (items: { id: LabelId; wx: number; wy: number; wz: number; show: boolean }[], W: number, H: number) => {
        const placed: LItem[] = [];
        for (const it of items) {
          const el = labelEls.current[it.id];
          if (!el) continue;
          if (!it.show) { el.style.display = "none"; continue; }
          proj.set(it.wx, it.wy, it.wz).project(camera);
          if (proj.z > 1) { el.style.display = "none"; continue; }
          el.style.display = "flex";
          const { w, h } = measure(it.id, el);
          placed.push({ id: it.id, x: ((proj.x + 1) / 2) * W, y: ((1 - proj.y) / 2) * H, w, h });
        }
        // push labels apart vertically when their text boxes collide
        placed.sort((a, b) => a.y - b.y);
        const boxes: { x0: number; x1: number; y: number; h: number }[] = [];
        for (const p of placed) {
          const left = LABEL_SIDE[p.id] === "l";
          const x0 = left ? p.x - p.w - 14 : p.x + 4;
          const x1 = x0 + p.w;
          let y = p.y;
          for (let pass = 0; pass < 6; pass++) {
            let moved = false;
            for (const b of boxes) {
              if (x0 < b.x1 + 4 && x1 > b.x0 - 4 && Math.abs(y - b.y) < (p.h + b.h) / 2 + 2) {
                y = b.y + (p.h + b.h) / 2 + 3;
                moved = true;
              }
            }
            if (!moved) break;
          }
          boxes.push({ x0, x1, y, h: p.h });
          const el = labelEls.current[p.id]!;
          el.style.transform = `translate(${p.x}px, ${y}px)`;
        }
      };

      /* ---------------- engine ---------------- */
      const eng = new FlameEngine3D();
      eng.setParams(live.current.params);
      eng.warmup(2.5);
      let dirty = true;

      /* camera tween between zoom presets */
      let tween: { t0: number; dur: number; p0: InstanceType<TH["Vector3"]>; p1: InstanceType<TH["Vector3"]>; q0: InstanceType<TH["Vector3"]>; q1: InstanceType<TH["Vector3"]> } | null = null;
      const zoomTo = (preset: ZoomPreset) => {
        const dir = camera.position.clone().sub(controls.target);
        if (dir.length() < 1e-3) dir.set(0.15, 0.1, 1);
        dir.normalize();
        const R = eng.rf, zy = eng.zoneY;
        const tgt = preset === "chamber" ? new THREE.Vector3(0, 0.55, 0) : preset === "flame" ? new THREE.Vector3(0, zy + 0.05, 0) : new THREE.Vector3(R * 0.95, zy, 0.25);
        const dist = preset === "chamber" ? HOME_DIST : preset === "flame" ? 3.6 : 0.85;
        tween = { t0: performance.now(), dur: 950, p0: camera.position.clone(), p1: tgt.clone().add(dir.multiplyScalar(dist)), q0: controls.target.clone(), q1: tgt };
        dirty = true;
      };

      api.current = {
        reignite: () => eng.reignite(),
        reset: () => {
          tween = null;
          camera.position.copy(HOME);
          controls.target.copy(HOME_T);
          controls.update();
          dirty = true;
        },
        setEnv: (e) => {
          buildEnv(e);
          dirty = true;
        },
        dirty: () => {
          dirty = true;
        },
        zoomTo,
      };
      controls.addEventListener("change", () => (dirty = true));
      controls.addEventListener("start", () => (tween = null));

      /* ---------------- sizing ---------------- */
      let quality = window.matchMedia("(pointer: coarse)").matches ? 1 : 2;
      const applyQuality = () => {
        const dpr = window.devicePixelRatio || 1;
        renderer.setPixelRatio(quality === 2 ? Math.min(1.5, dpr) : 1);
        flameMat.uniforms.uSteps.value = quality === 2 ? 72 : quality === 1 ? 48 : 32;
        bloom.enabled = quality > 0;
      };
      let W = 800, H = 500;
      const aspectRef = { current: aspect };
      const fit = () => {
        W = Math.max(280, Math.floor(host.clientWidth));
        H = Math.floor(W * aspectRef.current);
        applyQuality();
        renderer.setSize(W, H, false);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        composer.setPixelRatio(renderer.getPixelRatio());
        composer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        dirty = true;
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(host);
      let visible = true;
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.02 });
      io.observe(host);

      /* ---------------- "air from the cursor" ---------------- */
      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane();
      const hit = new THREE.Vector3();
      const ndc = new THREE.Vector2();
      const fwd = new THREE.Vector3();
      const onMove = (ev: PointerEvent) => {
        if (!live.current.cursorAir || ev.buttons !== 0) {
          if (eng.windOverride) { eng.windOverride = null; cursorArrow.visible = false; }
          return;
        }
        const r = canvas.getBoundingClientRect();
        ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        camera.getWorldDirection(fwd);
        plane.setFromNormalAndCoplanarPoint(fwd, new THREE.Vector3(0, 0.2, 0));
        if (!ray.ray.intersectPlane(plane, hit)) return;
        const d = new THREE.Vector3(0, 0.2, 0).sub(hit);
        const len = d.length();
        if (len < 0.5) return;
        d.normalize();
        eng.windOverride = { dir: [d.x, d.y, d.z], cmS: Math.max(live.current.params.flowCmS, 28) };
        cursorArrow.visible = true;
        cursorArrow.position.copy(hit);
        cursorArrow.setDirection(d);
        cursorArrow.setLength(Math.min(len * 0.55, 2.4), 0.22, 0.14);
        dirty = true;
      };
      const onLeave = () => {
        eng.windOverride = null;
        cursorArrow.visible = false;
        dirty = true;
      };
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);

      /* ---------------- loop ---------------- */
      let raf = 0;
      let last = performance.now();
      let statAcc = 0;
      let slow = 0;
      let frames = 0;
      let timeAcc = 0;
      const tmp = new THREE.Vector3();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const dtMs = now - last;
        const dt = Math.min(0.05, dtMs / 1000);
        last = now;
        if (!visible || document.hidden) return;
        const L = live.current;
        controls.autoRotate = L.autoRotate;
        if (L.running) {
          eng.setParams(L.params);
          eng.step(dt * L.speed);
          dirty = true;
        } else eng.params = L.params;
        if (L.autoRotate) dirty = true;

        if (tween) {
          const k = Math.min(1, (now - tween.t0) / tween.dur);
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          camera.position.lerpVectors(tween.p0, tween.p1, e);
          controls.target.lerpVectors(tween.q0, tween.q1, e);
          if (k >= 1) tween = null;
          dirty = true;
        }
        // keep the orbit target inside the chamber so panning cannot lose the scene
        controls.target.x = Math.max(-BOX.x, Math.min(BOX.x, controls.target.x));
        controls.target.y = Math.max(BOX.yMin, Math.min(BOX.yMax, controls.target.y));
        controls.target.z = Math.max(-BOX.z, Math.min(BOX.z, controls.target.z));
        controls.update();
        if (!dirty) return;
        dirty = false;

        const P = eng.params;
        const g = Math.min(1, P.gravityG);
        const Ly = L.layers;
        const wdir = eng.windOverride?.dir ?? P.wind ?? [1, 0, 0];
        const wflow = eng.windOverride?.cmS ?? P.flowCmS;
        const camDist = camera.position.distanceTo(controls.target);
        boost = Math.max(1, Math.min(1.9, camDist / 5.5));

        // flame
        const U = flameMat.uniforms;
        U.uTime.value += L.running ? dt * L.speed : 0;
        U.uRf.value = eng.rf;
        U.uI.value = eng.intensity;
        U.uG.value = g;
        U.uSoot.value = P.fuel === "heptane" ? 0.42 : 0.06;
        U.uFlow.value = wflow;
        (U.uWind.value as InstanceType<TH["Vector3"]>).set(wdir[0], wdir[1], wdir[2]);
        flameMesh.visible = Ly.flame && eng.intensity > 0.01;
        fireLight.visible = Ly.flame;
        fireLight.intensity = 3.0 * eng.intensity;
        fireLight.position.set(0, eng.zoneY + eng.rf * 0.3, 0);
        fireLight.color.setRGB(1, 0.62 + 0.18 * (1 - g), 0.3 + 0.55 * (1 - g));
        dropMat.color.set(P.fuel === "heptane" ? 0xe0b84a : 0xdfe6f2);

        // molecules
        nLo = 0; nHi = 0; nBond = 0;
        const n = eng.n;
        const ex = eng.x, ey = eng.y, ez = eng.z, eax = eng.ax, eay = eng.ay, eaz = eng.az, et = eng.type, ep = eng.prod, elf = eng.life;
        const heptane = P.fuel === "heptane";
        for (let i = 0; i < n; i++) {
          const ty = et[i];
          const x = ex[i], y = ey[i], z = ez[i];
          const ax = eax[i], ay = eay[i], az = eaz[i];
          switch (ty) {
            case T3.O2: {
              if (!Ly.o2) break;
              const x1 = x + ax * 0.05, y1 = y + ay * 0.05, z1 = z + az * 0.05, x2 = x - ax * 0.05, y2 = y - ay * 0.05, z2 = z - az * 0.05;
              putAtom(x1, y1, z1, AR.O, COL.O); putAtom(x2, y2, z2, AR.O, COL.O);
              putBond(x1, y1, z1, x2, y2, z2, 0.014);
              break;
            }
            case T3.N2: {
              if (!Ly.n2) break;
              const x1 = x + ax * 0.05, y1 = y + ay * 0.05, z1 = z + az * 0.05, x2 = x - ax * 0.05, y2 = y - ay * 0.05, z2 = z - az * 0.05;
              putAtom(x1, y1, z1, AR.N, COL.N); putAtom(x2, y2, z2, AR.N, COL.N);
              putBond(x1, y1, z1, x2, y2, z2, 0.017);
              break;
            }
            case T3.CO2: {
              const isProd = ep[i] === 1;
              if (isProd ? !Ly.products : !Ly.co2) break;
              const heat = isProd ? Math.exp(-(9 - Math.max(0, elf[i])) / 1.3) : 0;
              const x1 = x + ax * 0.115, y1 = y + ay * 0.115, z1 = z + az * 0.115, x2 = x - ax * 0.115, y2 = y - ay * 0.115, z2 = z - az * 0.115;
              putAtom(x, y, z, AR.C, COL.C, heat);
              putAtom(x1, y1, z1, 0.042, COL.O, heat); putAtom(x2, y2, z2, 0.042, COL.O, heat);
              putBond(x, y, z, x1, y1, z1, 0.013); putBond(x, y, z, x2, y2, z2, 0.013);
              break;
            }
            case T3.HE:
              if (!Ly.he) break;
              putAtom(x, y, z, AR.He, COL.He);
              break;
            case T3.H2O: {
              if (!Ly.products) break;
              const heat = Math.exp(-(9 - Math.max(0, elf[i])) / 1.3);
              // bent molecule: build a perpendicular to the axis
              let px = -az, py = 0, pz = ax;
              let pl = Math.hypot(px, py, pz);
              if (pl < 0.2) { px = 0; py = az; pz = -ay; pl = Math.hypot(px, py, pz) || 1; }
              px /= pl; py /= pl; pz /= pl;
              const c = 0.616 * 0.082, s = 0.788 * 0.082;
              const h1x = x + ax * c + px * s, h1y = y + ay * c + py * s, h1z = z + az * c + pz * s;
              const h2x = x + ax * c - px * s, h2y = y + ay * c - py * s, h2z = z + az * c - pz * s;
              putAtom(x, y, z, 0.044, COL.O, heat);
              putAtom(h1x, h1y, h1z, AR.H, COL.H, heat); putAtom(h2x, h2y, h2z, AR.H, COL.H, heat);
              putBond(x, y, z, h1x, h1y, h1z, 0.01); putBond(x, y, z, h2x, h2y, h2z, 0.01);
              break;
            }
            case T3.FUEL:
              if (!Ly.fuel) break;
              if (heptane) {
                const x1 = x - ax * 0.1, y1 = y - ay * 0.1, z1 = z - az * 0.1, x2 = x + ax * 0.1, y2 = y + ay * 0.1, z2 = z + az * 0.1;
                putAtom(x1, y1, z1, 0.046, COL.F); putAtom(x, y, z, 0.05, COL.F); putAtom(x2, y2, z2, 0.046, COL.F);
                putBond(x1, y1, z1, x, y, z, 0.013); putBond(x, y, z, x2, y2, z2, 0.013);
              } else {
                const x1 = x - ax * 0.05, y1 = y - ay * 0.05, z1 = z - az * 0.05, x2 = x + ax * 0.05, y2 = y + ay * 0.05, z2 = z + az * 0.05;
                putAtom(x1, y1, z1, AR.F, COL.F); putAtom(x2, y2, z2, AR.F, COL.F);
                putBond(x1, y1, z1, x2, y2, z2, 0.014);
              }
              break;
            case T3.SOOT: {
              if (!Ly.soot) break;
              // soot is a small aggregate of carbon spheres, glowing while it is hot
              const heat = Math.exp(-(11 - Math.max(0, elf[i])) / 1.8);
              putAtom(x, y, z, 0.045, COL.S, heat);
              putAtom(x + ay * 0.06, y - ax * 0.05, z + az * 0.03, 0.038, COL.S, heat);
              putAtom(x - az * 0.05, y + az * 0.04, z + ax * 0.05, 0.034, COL.S, heat);
              break;
            }
          }
        }
        atomsLo.count = nLo; atomsHi.count = nHi; bonds.count = nBond;
        atomsLo.instanceMatrix.needsUpdate = true; atomsHi.instanceMatrix.needsUpdate = true; bonds.instanceMatrix.needsUpdate = true;
        (atomsLo.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).needsUpdate = true;
        (atomsHi.instanceColor as InstanceType<TH["InstancedBufferAttribute"]>).needsUpdate = true;
        bonds.visible = camDist < 6.5;

        // arrows: forced airflow (blue) and buoyant convection (blue, rising)
        let ai = 0;
        const flowOn = Ly.flow && wflow > 0.5;
        const upOn = Ly.flow && g > 0.02;
        for (let r = 0; r < 4 && flowOn; r++) {
          for (let c = 0; c < 2; c++) {
            const a = arrows[ai++];
            if (!a) break;
            const phase = ((U.uTime.value * wflow * 0.012 + r * 0.31 + c * 0.5) % 1 + 1) % 1;
            const base = tmp.set(wdir[0], wdir[1], wdir[2]).multiplyScalar(-2.6 + phase * 3.4);
            a.position.set(base.x + (c ? 0.6 : -0.5), base.y - 1.2 + r * 0.8, base.z + (r % 2 ? 0.8 : -0.8));
            a.setDirection(new THREE.Vector3(wdir[0], wdir[1], wdir[2]));
            a.setLength(0.55 + Math.min(0.6, wflow * 0.012), 0.14, 0.09);
            a.visible = true;
          }
        }
        for (let k = 0; k < 3 && upOn; k++) {
          const a = arrows[ai++];
          if (!a) break;
          const phase = ((U.uTime.value * (0.5 + g) * 0.5 + k * 0.33) % 1 + 1) % 1;
          a.position.set((k - 1) * 0.35, 0.5 + phase * 2.4, 0);
          a.setDirection(new THREE.Vector3(0, 1, 0));
          a.setLength(0.4 + 0.5 * g, 0.12, 0.08);
          a.visible = true;
        }
        for (; ai < arrows.length; ai++) arrows[ai].visible = false;

        // labels
        const burning = eng.intensity > 0.15;
        const R = eng.rf, zy = eng.zoneY;
        const sL = Ly.labels && camDist > 1.6;
        layoutLabels(
          [
            { id: "droplet", wx: -0.12, wy: -0.3, wz: 0, show: sL },
            { id: "fuelVapor", wx: 0.34, wy: -0.3, wz: 0.15, show: sL && burning && Ly.fuel },
            { id: "zone", wx: R * 0.72, wy: zy + R * 0.55, wz: 0, show: sL && burning && Ly.flame },
            { id: "oxygenIn", wx: -R * 1.3, wy: zy + R * 0.55, wz: 0, show: sL && burning && Ly.o2 },
            { id: "products", wx: g > 0.3 ? R * 0.5 : R * 1.1, wy: g > 0.3 ? zy + R * 1.7 : zy - R * 0.6, wz: g > 0.3 ? 0 : R * 0.4, show: sL && burning && Ly.products },
            { id: "plume", wx: 0, wy: zy + R * 2.3, wz: 0, show: sL && burning && g > 0.3 },
            { id: "sphere", wx: -R * 0.7, wy: zy + R * 0.95, wz: 0, show: sL && burning && g < 0.03 },
          ],
          W,
          H,
        );

        for (const u of uniformsToAnimate) u.value += dt;
        composer.render();

        // adaptive quality: drop detail if the machine struggles
        timeAcc += dtMs;
        frames++;
        if (frames >= 60) {
          const avg = timeAcc / frames;
          if (avg > 36 && quality > 0) {
            slow++;
            if (slow >= 2) { quality--; slow = 0; fit(); }
          } else slow = 0;
          frames = 0;
          timeAcc = 0;
        }

        statAcc += dt;
        if (statAcc > 0.25) {
          statAcc = 0;
          L.onStats?.(eng.stats());
          L.onZoom?.(HOME_DIST / Math.max(0.05, camDist));
        }
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        controls.dispose();
        scene.traverse((o) => {
          const m = o as InstanceType<TH["Mesh"]>;
          m.geometry?.dispose?.();
          const mat = m.material as InstanceType<TH["Material"]> | InstanceType<TH["Material"]>[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        });
        envTex.dispose();
        pmrem.dispose();
        composer.dispose();
        renderer.dispose();
        canvas.remove();
        api.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // the scene is created once; props are read through refs and the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  useEffect(() => api.current?.dirty(), [params, layers, labelText]);
  useEffect(() => api.current?.setEnv(env), [env]);
  useEffect(() => {
    if (reigniteKey) api.current?.reignite();
  }, [reigniteKey]);
  useEffect(() => {
    if (resetKey) api.current?.reset();
  }, [resetKey]);
  useEffect(() => {
    if (zoomReq.n) api.current?.zoomTo(zoomReq.preset);
  }, [zoomReq]);

  const tag = (id: LabelId, text: string, color: string) => (
    <div
      key={id}
      ref={(el) => {
        labelEls.current[id] = el;
      }}
      className="pointer-events-none absolute left-0 top-0 hidden items-center"
      style={{ willChange: "transform" }}
    >
      <span className="h-1.5 w-1.5 shrink-0 -translate-x-1/2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span
        className={`whitespace-nowrap rounded-md border border-line bg-bg/75 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur ${LABEL_SIDE[id] === "l" ? "-translate-x-[calc(100%+10px)]" : "translate-x-1.5"}`}
        style={{ color }}
      >
        {text}
      </span>
    </div>
  );

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
        {tag("droplet", labelText.droplet, "#eceae4")}
        {tag("fuelVapor", labelText.fuelVapor, "#ffd36b")}
        {tag("zone", labelText.zone, "#ffb98a")}
        {tag("oxygenIn", labelText.oxygenIn, "#ff9d9c")}
        {tag("products", labelText.products, "#e9e7e0")}
        {tag("plume", labelText.plume, "#8ac8ff")}
        {tag("sphere", labelText.sphere, "#8ac8ff")}
        {env === "suit" && (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.78) 100%)", boxShadow: "inset 0 0 0 10px rgba(8,10,15,0.9), inset 0 0 0 11px rgba(138,200,255,0.18)" }} />
        )}
      </div>
    </div>
  );
}
