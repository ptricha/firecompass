"use client";

import { useEffect, useRef } from "react";
import type { LabelText, Layers, SimStats } from "@/lib/flameEngine";
import { BOX, FlameEngine3D, T3, type Env3, type Params3 } from "@/lib/flameEngine3D";

type TH = typeof import("three");

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
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.02; a*=.5; } return s; }
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
// soot turns it yellow. Everything below is qualitative: only the radius, intensity, gravity and airflow come from the simulation.
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
  // forced flow drags the flame downstream
  q -= uWind * (clamp(uFlow, 0.0, 60.0) * 0.011) * uRf * 0.7;
  float flicker = 0.4 + 1.9 * g;
  vec3 np = q * 2.3 + vec3(0.0, -uTime * flicker, 0.0) + uWind * (-uTime * 0.15);
  float n = fbm(np);
  float r = length(q) + (n - 0.5) * uRf * (0.20 + 0.60 * g);
  float x = (r - uRf) / (0.15 * uRf + 1e-3);
  float sheet = exp(-x * x);
  float core = 0.12 * exp(-pow(r / (0.60 * uRf), 2.0));
  float halo = 0.10 * exp(-pow((r - 1.20 * uRf) / (0.40 * uRf), 2.0));
  float tip = 1.0 - g * 0.55 * smoothstep(0.9, 2.1, h);
  float d = (sheet * 0.9 + core + halo) * uI * tip;

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
  // a real flame has a blue base near the fuel
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

const ATOM = {
  O: { color: 0xe34948, r: 0.052 },
  N: { color: 0x3987e5, r: 0.05 },
  C: { color: 0x9a988f, r: 0.062 },
  H: { color: 0xf0efec, r: 0.036 },
  He: { color: 0x8ee8e0, r: 0.05 },
  F: { color: 0xeda100, r: 0.06 },
  S: { color: 0x5a5854, r: 0.075 },
} as const;
const ATOM_KEYS = ["O", "N", "C", "H", "He", "F", "S"] as const;
const ATOM_CAP = 3600;

const LABEL_IDS = ["droplet", "fuelVapor", "zone", "oxygenIn", "products", "plume", "sphere"] as const;
type LabelId = (typeof LABEL_IDS)[number];

export default function Flame3D({ params, layers, env, running, speed, aspect, labelText, ariaLabel, reigniteKey, autoRotate, resetKey, cursorAir, onStats, onUnsupported, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const live = useRef({ params, layers, env, running, speed, autoRotate, cursorAir, onStats });
  live.current = { params, layers, env, running, speed, autoRotate, cursorAir, onStats };
  const api = useRef<{ reignite: () => void; reset: () => void; setEnv: (e: Env3) => void; dirty: () => void } | null>(null);
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
      if (cancelled) return;

      let renderer: InstanceType<TH["WebGLRenderer"]>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      } catch {
        onUnsupported?.();
        return;
      }
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 0.95;
      const canvas = renderer.domElement;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", ariaLabel);
      canvas.className = "block w-full rounded-xl border border-line touch-none";
      host.prepend(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 200);
      const HOME = new THREE.Vector3(1.4, 1.0, 8.8);
      const HOME_T = new THREE.Vector3(0, 0.55, 0);
      camera.position.copy(HOME);
      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(HOME_T);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3.4;
      controls.maxDistance = 17;
      controls.autoRotateSpeed = 1.1;
      controls.update();

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.26, 0.5, 0.7);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      /* ---------------- lights ---------------- */
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xdfe9ff, 0.8);
      key.position.set(-4, 7, 5);
      scene.add(key);
      const fireLight = new THREE.PointLight(0xff9a4c, 0, 14, 1.6);
      scene.add(fireLight);

      /* ---------------- chamber, droplet, fiber ---------------- */
      const boxGeo = new THREE.BoxGeometry(BOX.x * 2, BOX.yMax - BOX.yMin, BOX.z * 2);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x5aa3ff, transparent: true, opacity: 0.22 }));
      edges.position.y = (BOX.yMax + BOX.yMin) / 2;
      scene.add(edges);

      const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe6f2, roughness: 0.08, metalness: 0, clearcoat: 1, emissive: 0x222a38, emissiveIntensity: 0.3 });
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 40, 28), dropMat);
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

      /* ---------------- molecules: one instanced mesh per atom colour ---------------- */
      const sphereGeo = new THREE.SphereGeometry(1, 14, 10);
      const atomMeshes = ATOM_KEYS.map((k) => {
        const mat = new THREE.MeshStandardMaterial({ color: ATOM[k].color, roughness: 0.38, metalness: 0.05, emissive: ATOM[k].color, emissiveIntensity: 0.14 });
        const m = new THREE.InstancedMesh(sphereGeo, mat, ATOM_CAP);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.count = 0;
        m.frustumCulled = false;
        scene.add(m);
        return m;
      });
      const mats = atomMeshes.map((m) => m.instanceMatrix.array as Float32Array);
      const cnt = new Int32Array(ATOM_KEYS.length);
      const IDX = { O: 0, N: 1, C: 2, H: 3, He: 4, F: 5, S: 6 } as const;
      const put = (k: number, x: number, y: number, z: number, s: number) => {
        const c = cnt[k];
        if (c >= ATOM_CAP) return;
        const m = mats[k];
        const o = c * 16;
        m[o] = s; m[o + 5] = s; m[o + 10] = s; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1;
        cnt[k] = c + 1;
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
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
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
        const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
        return p;
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
        key.intensity = e === "moon" ? 1.1 : e === "iss" ? 0.7 : 0.8;
        key.color.set(e === "moon" ? 0xfff4e0 : 0xdfe9ff);
        controls.maxPolarAngle = e === "earth" || e === "moon" ? Math.PI * 0.515 : Math.PI;

        if (e === "earth") {
          const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color(0x1a3f66) }, uBottom: { value: new THREE.Color(0x0a1420) } } }));
          g.add(sky);
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
          const N = 110, SZ = 44;
          const geo = new THREE.PlaneGeometry(SZ, SZ, N, N);
          geo.rotateX(-Math.PI / 2);
          const pa = geo.attributes.position as InstanceType<TH["BufferAttribute"]>;
          const craters: [number, number, number][] = Array.from({ length: 26 }, () => [(Math.random() - 0.5) * SZ, (Math.random() - 0.5) * SZ, 0.6 + Math.random() * 2.2]);
          for (let i = 0; i < pa.count; i++) {
            const x = pa.getX(i), z = pa.getZ(i);
            let h = 0.18 * Math.sin(x * 0.35) * Math.cos(z * 0.3) + 0.08 * Math.sin(x * 1.3 + z * 0.9);
            for (const [cx, cz, r] of craters) {
              const d = Math.hypot(x - cx, z - cz) / r;
              if (d < 1.5) h += (d < 1 ? -0.5 * (1 - d * d) : 0.25 * Math.exp(-(((d - 1) * 4) ** 2))) * Math.min(1, r / 1.4);
            }
            pa.setY(i, h);
          }
          geo.computeVertexNormals();
          const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6a6965, roughness: 1, metalness: 0, flatShading: false }));
          terrain.position.y = BOX.yMin - 0.15;
          g.add(terrain);
          const earth = new THREE.Mesh(new THREE.SphereGeometry(2.3, 48, 32), earthMat([-0.4, 0.4, 0.8]));
          earth.position.set(16, 9, -34);
          g.add(earth);
          uniformsToAnimate.push((earth.material as InstanceType<TH["ShaderMaterial"]>).uniforms.uTime);
        }
        scene.add(g);
        envGroup = g;
      };
      buildEnv(live.current.env);

      /* ---------------- labels (DOM, projected each frame) ---------------- */
      const proj = new THREE.Vector3();
      const placeLabel = (id: LabelId, x: number, y: number, z: number, show: boolean, w: number, h: number) => {
        const el = labelEls.current[id];
        if (!el) return;
        if (!show) {
          el.style.display = "none";
          return;
        }
        proj.set(x, y, z).project(camera);
        if (proj.z > 1) {
          el.style.display = "none";
          return;
        }
        el.style.display = "flex";
        el.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px)`;
      };

      /* ---------------- engine ---------------- */
      const eng = new FlameEngine3D();
      eng.setParams(live.current.params);
      eng.warmup(2.5);
      let dirty = true;
      api.current = {
        reignite: () => eng.reignite(),
        reset: () => {
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
      };
      controls.addEventListener("change", () => (dirty = true));

      /* ---------------- sizing ---------------- */
      let quality = window.matchMedia("(pointer: coarse)").matches ? 1 : 2;
      const applyQuality = () => {
        const dpr = window.devicePixelRatio || 1;
        renderer.setPixelRatio(quality === 2 ? Math.min(1.5, dpr) : 1);
        flameMat.uniforms.uSteps.value = quality === 2 ? 72 : quality === 1 ? 48 : 32;
        bloom.enabled = quality > 0;
      };
      let W = 800, H = 500;
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
      const aspectRef = { current: aspect };
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
      let cursorWind: { dir: [number, number, number]; cmS: number; from: InstanceType<TH["Vector3"]> } | null = null;
      const onMove = (ev: PointerEvent) => {
        if (!live.current.cursorAir || ev.buttons !== 0) { if (cursorWind) { cursorWind = null; eng.windOverride = null; cursorArrow.visible = false; } return; }
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
        cursorWind = { dir: [d.x, d.y, d.z], cmS: Math.max(live.current.params.flowCmS, 28), from: hit.clone() };
        eng.windOverride = { dir: cursorWind.dir, cmS: cursorWind.cmS };
        cursorArrow.visible = true;
        cursorArrow.position.copy(hit);
        cursorArrow.setDirection(d);
        cursorArrow.setLength(Math.min(len * 0.55, 2.4), 0.22, 0.14);
        dirty = true;
      };
      const onLeave = () => {
        cursorWind = null;
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
        controls.update();
        if (!dirty) return;
        dirty = false;

        const P = eng.params;
        const g = Math.min(1, P.gravityG);
        const Ly = L.layers;
        const wdir = eng.windOverride?.dir ?? P.wind ?? [1, 0, 0];
        const wflow = eng.windOverride?.cmS ?? P.flowCmS;

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
        cnt.fill(0);
        const n = eng.n;
        const ex = eng.x, ey = eng.y, ez = eng.z, eax = eng.ax, eay = eng.ay, eaz = eng.az, et = eng.type, ep = eng.prod;
        const heptane = P.fuel === "heptane";
        for (let i = 0; i < n; i++) {
          const ty = et[i];
          const x = ex[i], y = ey[i], z = ez[i];
          const ax = eax[i], ay = eay[i], az = eaz[i];
          switch (ty) {
            case T3.O2:
              if (!Ly.o2) break;
              put(IDX.O, x + ax * 0.052, y + ay * 0.052, z + az * 0.052, ATOM.O.r);
              put(IDX.O, x - ax * 0.052, y - ay * 0.052, z - az * 0.052, ATOM.O.r);
              break;
            case T3.N2:
              if (!Ly.n2) break;
              put(IDX.N, x + ax * 0.05, y + ay * 0.05, z + az * 0.05, ATOM.N.r);
              put(IDX.N, x - ax * 0.05, y - ay * 0.05, z - az * 0.05, ATOM.N.r);
              break;
            case T3.CO2:
              if (ep[i] ? !Ly.products : !Ly.co2) break;
              put(IDX.C, x, y, z, ATOM.C.r);
              put(IDX.O, x + ax * 0.12, y + ay * 0.12, z + az * 0.12, 0.052);
              put(IDX.O, x - ax * 0.12, y - ay * 0.12, z - az * 0.12, 0.052);
              break;
            case T3.HE:
              if (!Ly.he) break;
              put(IDX.He, x, y, z, ATOM.He.r);
              break;
            case T3.H2O: {
              if (!Ly.products) break;
              // bent molecule: build a perpendicular to the axis
              let px = ay * 0 - az * 1, py = az * 0 - ax * 0, pz = ax * 1 - ay * 0; // axis x (0,1,0)
              let pl = Math.hypot(px, py, pz);
              if (pl < 0.2) { px = 0; py = az; pz = -ay; pl = Math.hypot(px, py, pz) || 1; }
              px /= pl; py /= pl; pz /= pl;
              const c = 0.616 * 0.085, s = 0.788 * 0.085;
              put(IDX.O, x, y, z, 0.056);
              put(IDX.H, x + ax * c + px * s, y + ay * c + py * s, z + az * c + pz * s, ATOM.H.r);
              put(IDX.H, x + ax * c - px * s, y + ay * c - py * s, z + az * c - pz * s, ATOM.H.r);
              break;
            }
            case T3.FUEL:
              if (!Ly.fuel) break;
              if (heptane) {
                put(IDX.F, x - ax * 0.1, y - ay * 0.1, z - az * 0.1, 0.05);
                put(IDX.F, x, y, z, 0.055);
                put(IDX.F, x + ax * 0.1, y + ay * 0.1, z + az * 0.1, 0.05);
              } else {
                put(IDX.F, x - ax * 0.05, y - ay * 0.05, z - az * 0.05, ATOM.F.r);
                put(IDX.F, x + ax * 0.05, y + ay * 0.05, z + az * 0.05, ATOM.F.r);
              }
              break;
            case T3.SOOT:
              if (!Ly.soot) break;
              put(IDX.S, x, y, z, ATOM.S.r);
              break;
          }
        }
        for (let k = 0; k < atomMeshes.length; k++) {
          atomMeshes[k].count = cnt[k];
          atomMeshes[k].instanceMatrix.needsUpdate = true;
        }

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
        const sL = Ly.labels;
        placeLabel("droplet", -0.12, -0.3, 0, sL, W, H);
        placeLabel("fuelVapor", 0.34, -0.3, 0.15, sL && burning && Ly.fuel, W, H);
        placeLabel("zone", R * 0.72, zy + R * 0.55, 0, sL && burning && Ly.flame, W, H);
        placeLabel("oxygenIn", -R * 1.3, zy + R * 0.55, 0, sL && burning && Ly.o2, W, H);
        placeLabel("products", g > 0.3 ? R * 0.5 : R * 1.1, g > 0.3 ? zy + R * 1.7 : zy - R * 0.6, g > 0.3 ? 0 : R * 0.4, sL && burning && Ly.products, W, H);
        placeLabel("plume", 0, zy + R * 2.3, 0, sL && burning && g > 0.3, W, H);
        placeLabel("sphere", -R * 0.7, zy + R * 0.95, 0, sL && burning && g < 0.03, W, H);

        // animated planets
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
        if (statAcc > 0.25 && L.onStats) {
          statAcc = 0;
          L.onStats(eng.stats());
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

  const tag = (id: LabelId, text: string, color: string, side: "r" | "l") => (
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
        className={`whitespace-nowrap rounded-md border border-line bg-bg/75 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur ${side === "l" ? "-translate-x-[calc(100%+10px)]" : "translate-x-1.5"}`}
        style={{ color }}
      >
        {text}
      </span>
    </div>
  );

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
        {tag("droplet", labelText.droplet, "#eceae4", "l")}
        {tag("fuelVapor", labelText.fuelVapor, "#ffd36b", "r")}
        {tag("zone", labelText.zone, "#ffb98a", "r")}
        {tag("oxygenIn", labelText.oxygenIn, "#ff9d9c", "l")}
        {tag("products", labelText.products, "#e9e7e0", "r")}
        {tag("plume", labelText.plume, "#8ac8ff", "r")}
        {tag("sphere", labelText.sphere, "#8ac8ff", "l")}
        {env === "suit" && (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.78) 100%)", boxShadow: "inset 0 0 0 10px rgba(8,10,15,0.9), inset 0 0 0 11px rgba(138,200,255,0.18)" }} />
        )}
      </div>
    </div>
  );
}
