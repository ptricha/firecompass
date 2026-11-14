"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useLang } from "@/lib/i18n";

export type ImmersiveEnv = "earth" | "moon" | "mars" | "iss" | "isshd" | "suit";

type Built = {
  update: (dt: number, t: number) => void;
  cam: { pos: [number, number, number]; target: [number, number, number]; min: number; max: number; maxPolar?: number; autoRotate?: number };
  bloom: [number, number, number]; // strength, radius, threshold
  exposure: number;
  shadows?: boolean;
};

type Ctx = { scene: THREE.Scene; renderer: THREE.WebGLRenderer; progress: (fraction: number) => void };

// ---------- helpers ----------
const tl = new THREE.TextureLoader();
const draco = new DRACOLoader().setDecoderPath("/draco/");
const gl = new GLTFLoader().setDRACOLoader(draco);
// Loads a GLB and reports download progress (0..1) when the server announces the size.
// Known sizes are the fallback when the server (gzip/chunked) sends no Content-Length.
const MODEL_BYTES: Record<string, number> = {
  "/models/iss.glb": 476992,
  "/models/lm.glb": 716840,
  "/models/emu.glb": 3448904,
  "/models/perseverance.glb": 4987176,
  "/models/iss_hd.glb": 15411000,
};
const loadModel = (url: string, progress: Ctx["progress"]) =>
  gl.loadAsync(url, (e) => {
    const total = e.lengthComputable && e.total ? e.total : MODEL_BYTES[url];
    if (total) progress(e.loaded / total);
  });

const tex = async (url: string, srgb = true) => {
  const t = await tl.loadAsync(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const smallScreen = () => typeof window !== "undefined" && window.innerWidth < 768;
const shadowSize = () => (smallScreen() ? 2048 : 4096);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, oct = 5) => {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
};

function stars(n: number, radius: number) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    p.set([radius * s * Math.cos(th), radius * u, radius * s * Math.sin(th)], i * 3);
    const b = 0.35 + Math.pow(Math.random(), 3) * 0.65, k = Math.random();
    c.set([b * (k > 0.7 ? 1 : 0.85 + k * 0.15), b * 0.92, b * (k < 0.3 ? 1 : 0.88)], i * 3);
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false }));
}

function sunDisc(dir: THREE.Vector3, dist: number, size: number, tint = 0xfff2d8) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(size, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(6), toneMapped: false, fog: false }),
  );
  m.position.copy(dir).normalize().multiplyScalar(dist);
  return m;
}

const atmoMat = (color: THREE.ColorRepresentation, power = 3, bias = 0.72, gain = 1.6) =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uBias: { value: bias }, uGain: { value: gain } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uPow; uniform float uBias; uniform float uGain; varying vec3 vN;
      void main(){ float i = pow(max(uBias - dot(vN, vec3(0.0,0.0,1.0)), 0.0), uPow); gl_FragColor = vec4(uColor, 1.0) * i * uGain; }`,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });

async function makeEarth(radius: number, glow = 1.6) {
  const [map, normalMap, specularMap, cloudMap] = await Promise.all([
    tex("/textures/earth.jpg"), tex("/textures/earth_normal.jpg", false), tex("/textures/earth_spec.jpg", false), tex("/textures/earth_clouds.png"),
  ]);
  const g = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 128, 96),
    new THREE.MeshPhongMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), specularMap, specular: new THREE.Color(0x4a5a70), shininess: 22 }),
  );
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.008, 128, 96),
    new THREE.MeshLambertMaterial({ map: cloudMap, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 96, 64), atmoMat(0x4f9bff, 3.2, 0.74, glow));
  g.add(earth, clouds, atmo);
  return { group: g, earth, clouds };
}

function fitModel(obj: THREE.Object3D, target: number, axis: "x" | "y" | "max" = "max") {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = target / (axis === "max" ? Math.max(size.x, size.y, size.z) : size[axis]);
  obj.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  return new THREE.Box3().setFromObject(obj);
}

function shade(obj: THREE.Object3D, envIntensity = 1) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = envIntensity;
    }
  });
}

type TerrainOpts = { size: number; seg: number; amp: number; freq: number; craters: number; craterMax: number; seed: number; flat: number; low: THREE.Color; high: THREE.Color; roughness: number };

function makeTerrain(o: TerrainOpts) {
  const r = rng(o.seed);
  const cr = Array.from({ length: o.craters }, () => {
    const rad = 3 + Math.pow(r(), 2.2) * o.craterMax;
    return { x: (r() - 0.5) * o.size * 0.95, z: (r() - 0.5) * o.size * 0.95, r: rad, d: rad * (0.12 + r() * 0.1) };
  });
  const H = (x: number, z: number) => {
    let h = (fbm(x * o.freq + o.seed, z * o.freq + o.seed) - 0.5) * 2 * o.amp;
    h += (fbm(x * o.freq * 6, z * o.freq * 6, 3) - 0.5) * o.amp * 0.12;
    for (const c of cr) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) h -= c.d * (1 - (d / c.r) ** 2);
      else if (d < c.r * 1.35) h += c.d * 0.28 * (1 - (d - c.r) / (c.r * 0.35));
    }
    const dc = Math.hypot(x, z);
    const k = Math.min(Math.max((dc - o.flat) / (o.flat * 3), 0), 1);
    return h * (k * k * (3 - 2 * k));
  };
  const geo = new THREE.PlaneGeometry(o.size, o.size, o.seg, o.seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = H(x, z);
    pos.setY(i, h);
    const t = Math.min(Math.max(h / (o.amp * 1.2) * 0.5 + 0.5 + (fbm(x * 0.9, z * 0.9, 3) - 0.5) * 0.5, 0), 1);
    tmp.copy(o.low).lerp(o.high, t);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();

  // fine-grain regolith bump
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const cx = cv.getContext("2d")!;
  const img = cx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const v = (vnoise(x / 6, y / 6) * 0.5 + vnoise(x / 2, y / 2) * 0.3 + hash(x, y) * 0.2) * 255;
    const i = (y * 512 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  const bump = new THREE.CanvasTexture(cv);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(o.size / 6, o.size / 6);

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness, metalness: 0, bumpMap: bump, bumpScale: 1.2 }));
  mesh.receiveShadow = true;

  // scattered boulders
  const rockN = 420;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: tmp.copy(o.low).multiplyScalar(0.8), roughness: 1, flatShading: true }), rockN);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < rockN; i++) {
    let x = (r() - 0.5) * o.size * 0.9, z = (r() - 0.5) * o.size * 0.9;
    if (Math.hypot(x, z) < 5) { x += 12; z += 12; }
    const s = 0.08 + Math.pow(r(), 4) * 1.4;
    e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e);
    sc.set(s * (0.8 + r() * 0.6), s * (0.5 + r() * 0.4), s * (0.8 + r() * 0.6));
    p.set(x, H(x, z) + s * 0.15, z);
    rocks.setMatrixAt(i, m4.compose(p, q, sc));
  }
  rocks.castShadow = rocks.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh, rocks);
  return { group: g, H };
}

// Distant mountain ring that hides the terrain edge and gives the horizon some depth.
function makeRidge(radius: number, height: number, color: number, seed: number, freq = 2.2) {
  const seg = 360;
  const geo = new THREE.CylinderGeometry(radius, radius, 1, seg, 1, true);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), top = pos.getY(i) > 0;
    const a = Math.atan2(z, x);
    const n = fbm(Math.cos(a) * freq + seed, Math.sin(a) * freq + seed, 5) + 0.35 * fbm(Math.cos(a) * freq * 4 + seed, Math.sin(a) * freq * 4 + seed, 3);
    pos.setY(i, top ? 2 + n * height : -8);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide, flatShading: true }));
  m.receiveShadow = false;
  return m;
}

// ---------- scene builders ----------
async function buildEarth({ scene }: Ctx): Promise<Built> {
  scene.background = new THREE.Color(0x000004);
  scene.add(stars(5000, 900));
  scene.add(new THREE.AmbientLight(0x0b1226, 0.9));
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.4);
  sun.position.set(-40, 14, 30);
  scene.add(sun);
  const { group, earth, clouds } = await makeEarth(5);
  scene.add(group);
  return {
    update: (dt) => { earth.rotation.y += dt * 0.04; clouds.rotation.y += dt * 0.052; },
    cam: { pos: [0, 2.5, 15], target: [0, 0, 0], min: 7.5, max: 40, autoRotate: 0.25 },
    bloom: [0.3, 0.6, 0.85], exposure: 1.05,
  };
}

async function buildMoon({ scene, progress }: Ctx): Promise<Built> {
  scene.background = new THREE.Color(0x000000);
  scene.add(stars(6000, 900));
  const sunDir = new THREE.Vector3(0.85, 0.2, 0.45).normalize();
  const sun = new THREE.DirectionalLight(0xffffff, 4.6);
  sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
  sun.shadow.mapSize.set(shadowSize(), shadowSize());
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x1b2a44, 0x050505, 0.18)); // earthshine
  scene.add(sunDisc(sunDir, 700, 12, 0xffffff));

  const { group: terr, H } = makeTerrain({ size: 260, seg: 320, amp: 3.2, freq: 0.022, craters: 46, craterMax: 22, seed: 7, flat: 7, low: new THREE.Color(0x4d4b48), high: new THREE.Color(0x9a9791), roughness: 1 });
  scene.add(terr);
  scene.add(makeRidge(165, 16, 0x6b6966, 3));

  const [earth, lm] = await Promise.all([makeEarth(26), loadModel("/models/lm.glb", progress)]);
  earth.group.position.set(-260, 150, -430);
  earth.group.rotation.set(0.2, 2.2, 0.1);
  scene.add(earth.group);

  const m = lm.scene;
  const box = fitModel(m, 8);
  m.position.y += H(0, 0) - box.min.y + 0.05;
  shade(m, 0.3);
  scene.add(m);

  return {
    update: (dt) => { earth.clouds.rotation.y += dt * 0.01; },
    cam: { pos: [13, 3.2, 15], target: [0, 3, 0], min: 5, max: 70, maxPolar: Math.PI / 2 - 0.03 },
    bloom: [0.35, 0.5, 0.92], exposure: 0.95, shadows: true,
  };
}

async function buildMars({ scene, progress }: Ctx): Promise<Built> {
  const horizon = new THREE.Color(0xd9a074), zenith = new THREE.Color(0x7d6a68);
  scene.background = horizon.clone();
  scene.fog = new THREE.FogExp2(0xc78e62, 0.0085);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: { h: { value: horizon }, z: { value: zenith } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 h; uniform vec3 z; varying vec3 vP; void main(){ float t = pow(clamp(vP.y,0.0,1.0), 0.55); gl_FragColor = vec4(mix(h, z, t), 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    }),
  );
  scene.add(sky);
  const sunDir = new THREE.Vector3(-0.7, 0.42, -0.55).normalize();
  const sun = new THREE.DirectionalLight(0xffe2bd, 3.1);
  sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
  sun.shadow.mapSize.set(shadowSize(), shadowSize());
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xd8a37c, 0x5a2e1c, 0.75));
  scene.add(sunDisc(sunDir, 800, 11, 0xffe9cc));

  const { group: terr, H } = makeTerrain({ size: 300, seg: 320, amp: 4.5, freq: 0.018, craters: 22, craterMax: 18, seed: 21, flat: 6, low: new THREE.Color(0x6e3a22), high: new THREE.Color(0xbb7a4c), roughness: 0.95 });
  scene.add(terr);
  scene.add(makeRidge(185, 22, 0x8f5535, 11, 1.8));

  const rover = (await loadModel("/models/perseverance.glb", progress)).scene;
  const box = fitModel(rover, 4.2);
  rover.position.y += H(0, 0) - box.min.y;
  rover.rotation.y = 0.6;
  shade(rover, 0.4);
  scene.add(rover);

  // wind-blown dust
  const n = 900, dp = new Float32Array(n * 3), r = rng(5);
  for (let i = 0; i < n; i++) dp.set([(r() - 0.5) * 90, r() * 12, (r() - 0.5) * 90], i * 3);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xe0a679, size: 0.09, transparent: true, opacity: 0.45, depthWrite: false })));

  return {
    update: (dt, t) => {
      const a = dg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < n; i++) {
        let x = a.getX(i) + dt * 1.6;
        const y = a.getY(i) + Math.sin(t + i) * dt * 0.05;
        if (x > 45) x -= 90;
        a.setXYZ(i, x, y, a.getZ(i));
      }
      a.needsUpdate = true;
    },
    cam: { pos: [7.5, 2.6, 9], target: [0, 1.3, 0], min: 4, max: 45, maxPolar: Math.PI / 2 - 0.03 },
    bloom: [0.28, 0.6, 0.9], exposure: 1.0, shadows: true,
  };
}

async function buildIss({ scene, progress }: Ctx, url = "/models/iss.glb", dropStray = true): Promise<Built> {
  scene.background = new THREE.Color(0x000003);
  scene.add(stars(6000, 1800));
  scene.add(new THREE.AmbientLight(0x1a2440, 0.7));
  const sunDir = new THREE.Vector3(0.9, 0.5, 0.55).normalize();
  const sun = new THREE.DirectionalLight(0xfff6e8, 4.2);
  sun.position.copy(sunDir).multiplyScalar(100);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 240 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const [earth, iss] = await Promise.all([makeEarth(240, 0.22), loadModel(url, progress)]);
  earth.group.position.set(0, -285, -10);
  earth.group.rotation.set(0.15, 0.9, 0);
  scene.add(earth.group);
  const m = iss.scene;
  // this export carries 7 stray truss/cylinder pieces ~40 units above the station; drop them before fitting
  const stray: THREE.Object3D[] = [];
  if (dropStray) m.traverse((o) => { if (/^(bendedtru|pCylinder)/.test(o.name)) stray.push(o); });
  stray.forEach((o) => o.removeFromParent());
  fitModel(m, dropStray ? 15 : 23);
  m.position.y -= new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).y;
  shade(m, 0.6);
  scene.add(m);

  return {
    update: (dt, t) => { m.rotation.y = t * 0.03; m.rotation.z = Math.sin(t * 0.05) * 0.03; earth.earth.rotation.y += dt * 0.006; earth.clouds.rotation.y += dt * 0.008; },
    cam: { pos: [19, 3, 27], target: [0, -3.5, 0], min: 8, max: 120, autoRotate: 0.18 },
    bloom: [0.32, 0.6, 0.9], exposure: 1.0, shadows: true,
  };
}

// Sokol-type intravehicular pressure suit, modelled procedurally from a reference photo.
function makeSokolSuit() {
  const g = new THREE.Group();

  // fabric weave bump
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const cx = cv.getContext("2d")!;
  const img = cx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const v = 150 + hash(x, y) * 60 + (x % 4 < 2 ? 18 : 0) + (y % 4 < 2 ? 18 : 0);
    const i = (y * 256 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  const weave = new THREE.CanvasTexture(cv);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(10, 10);

  const cream = new THREE.MeshStandardMaterial({ color: 0xe9e6db, roughness: 0.92, bumpMap: weave, bumpScale: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.9, bumpMap: weave, bumpScale: 0.4 });
  const tan = new THREE.MeshStandardMaterial({ color: 0xcfc1a0, roughness: 0.95, bumpMap: weave, bumpScale: 0.6 });
  const cord = new THREE.MeshStandardMaterial({ color: 0x3e64c8, roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x1b55c0, roughness: 0.3, metalness: 0.75 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.2, clearcoat: 1, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
  const add = (m: THREE.Mesh, parent: THREE.Object3D = g) => { m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const cyl = (rt: number, rb: number, h: number, yTop: number, mat: THREE.Material, parent: THREE.Object3D, seg = 28) => {
    const m = add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), parent);
    m.position.y = yTop - h / 2;
    return m;
  };
  const ring = (r: number, tube: number, y: number, mat: THREE.Material, parent: THREE.Object3D, sx = 1, sz = 1) => {
    const m = add(new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 40), mat), parent);
    m.rotation.x = Math.PI / 2; m.position.y = y; m.scale.set(sx, sz, 1);
    return m;
  };
  const strap = (a: THREE.Vector3, b: THREE.Vector3, w: number, mat: THREE.Material) => {
    const d = b.clone().sub(a), len = d.length();
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.01), mat));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  };

  // legs, knees, boots
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.x = s * 0.105;
    g.add(leg);
    cyl(0.088, 0.078, 0.44, 0.52, cream, leg).position.y += 0;
    cyl(0.125, 0.105, 0.44, 0.96, cream, leg);
    for (let i = 0; i < 6; i++) ring(0.092, 0.009, 0.46 + i * 0.03, white, leg, 1, 1.05);
    const boot = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.14, 6, 14), tan), leg);
    boot.rotation.x = Math.PI / 2; boot.position.set(0, 0.065, 0.045);
    ring(0.082, 0.012, 0.16, metal, leg);
  }

  // hips and torso
  const hips = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), cream));
  hips.scale.set(1.12, 0.8, 0.78); hips.position.y = 0.99;
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.3, 8, 24), cream));
  torso.scale.set(1.38, 1, 0.86); torso.position.y = 1.3;
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), cream)).position.set(s * 0.255, 1.47, 0);

  // chest hardware: V harness, connector, crotch flap, waist ports, stripes
  strap(new THREE.Vector3(-0.135, 1.5, 0.16), new THREE.Vector3(0, 1.1, 0.172), 0.018, black);
  strap(new THREE.Vector3(0.135, 1.5, 0.16), new THREE.Vector3(0, 1.1, 0.172), 0.018, black);
  const conn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.035, 28), metal));
  conn.rotation.x = Math.PI / 2; conn.position.set(0, 1.4, 0.165);
  const knob = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.045, 16), metal));
  knob.rotation.x = Math.PI / 2; knob.position.set(0, 1.4, 0.18);
  const tri = new THREE.Shape();
  tri.moveTo(-0.14, 0); tri.lineTo(0.14, 0); tri.lineTo(0.02, -0.22); tri.lineTo(-0.02, -0.22); tri.closePath();
  const flap = add(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.012, bevelEnabled: false }), white));
  flap.position.set(0, 1.16, 0.168);
  for (const s of [-1, 1]) {
    const port = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.08, 20), metal));
    port.rotation.z = Math.PI / 2; port.rotation.y = s * 0.5; port.position.set(s * 0.15, 1.13, 0.14);
    const hip = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.011, 0.01), cord));
    hip.rotation.z = -s * 0.45; hip.position.set(s * 0.1, 0.99, 0.158);
  }

  // hose from the left waist port down the leg, plus a small end connector
  const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.15, 1.12, 0.16), new THREE.Vector3(-0.24, 0.92, 0.17), new THREE.Vector3(-0.245, 0.55, 0.14), new THREE.Vector3(-0.225, 0.2, 0.13)]);
  add(new THREE.Mesh(new THREE.TubeGeometry(hose, 40, 0.01, 8), new THREE.MeshStandardMaterial({ color: 0x5b5a78, roughness: 0.6 })));
  add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.03), new THREE.MeshStandardMaterial({ color: 0xaeb0b6, roughness: 0.4, metalness: 0.6 }))).position.set(-0.225, 0.17, 0.13);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }))).position.set(-0.222, 0.115, 0.13);

  // Spain flag patch texture (simplified, no coat of arms)
  const fc = document.createElement("canvas");
  fc.width = 192; fc.height = 128;
  const f = fc.getContext("2d")!;
  f.fillStyle = "#aa151b"; f.fillRect(0, 0, 192, 128);
  f.fillStyle = "#f1bf00"; f.fillRect(0, 32, 192, 64);
  const flagTex = new THREE.CanvasTexture(fc);
  flagTex.colorSpace = THREE.SRGBColorSpace;

  // arms: segments run down -y from the shoulder
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.26, 1.47, 0);
    arm.rotation.z = s * 0.1;
    g.add(arm);
    cyl(0.082, 0.078, 0.3, 0, cream, arm);
    cyl(0.08, 0.075, 0.27, -0.3, tan, arm);
    for (let i = 0; i < 9; i++) ring(0.079 - i * 0.0005, 0.0065, -0.315 - i * 0.03, cord, arm);
    cyl(0.07, 0.062, 0.2, -0.57, cream, arm);
    ring(0.064, 0.013, -0.775, metal, arm);
    ring(0.066, 0.009, -0.8, metal, arm);
    const glove = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.09, 6, 14), white), arm);
    glove.position.y = -0.87; glove.scale.set(1, 1, 0.75);
    for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5f6b55, roughness: 0.8 })), arm).position.set((i - 1) * 0.026, -0.965, 0.012);
    if (s === 1) {
      const flag = add(new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.07), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.85 })), arm);
      flag.position.set(0.0, -0.13, 0.083); flag.rotation.y = 0.0;
      const gauge = add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.018, 24), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3, metalness: 0.4 })), arm);
      gauge.rotation.x = Math.PI / 2; gauge.position.set(0, -0.68, 0.075);
    } else {
      add(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.075), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.9 })), arm).position.set(0, -0.14, 0.083);
    }
  }

  // neck ring, soft cap, red band, bubble visor
  cyl(0.11, 0.12, 0.06, 1.6, cream, g);
  ring(0.125, 0.02, 1.62, metal, g);
  const headY = 1.77;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshStandardMaterial({ color: 0x2a2b31, roughness: 1 }))).position.set(0, headY - 0.02, -0.01);
  const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), white));
  cap.scale.set(1, 1.08, 1.05); cap.position.y = headY;
  const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.17 * Math.sin(Math.PI * 0.42), 0.012, 10, 48), new THREE.MeshStandardMaterial({ color: 0xb53a2b, roughness: 0.6 })));
  band.rotation.x = Math.PI / 2; band.scale.set(1.0, 1.05, 1); band.position.y = headY + 0.17 * 1.08 * Math.cos(Math.PI * 0.42);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 28), glass);
  bubble.scale.set(1, 1.08, 1.05); bubble.position.y = headY; bubble.renderOrder = 2;
  g.add(bubble);
  ring(0.165, 0.012, headY - 0.14, metal, g, 1, 1.05);

  // blue shoulder cords
  for (const s of [-1, 1]) { const c = ring(0.09, 0.006, 1.5, cord, g); c.position.x = s * 0.255; c.rotation.z = s * 0.2; }
  return g;
}

async function buildSuit({ scene, renderer, progress }: Ctx): Promise<Built> {
  scene.background = new THREE.Color(0x06080e);
  scene.fog = new THREE.Fog(0x06080e, 14, 34);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;
  pm.dispose();

  const key = new THREE.SpotLight(0xfff1dc, 110, 30, 0.42, 0.5, 1.6);
  key.position.set(5, 8, 6);
  key.target.position.set(0, 1.6, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0002;
  const rim = new THREE.SpotLight(0x6fa8ff, 60, 30, 0.5, 0.6, 1.6);
  rim.position.set(-6, 5, -5);
  rim.target.position.set(0, 1.6, 0);
  scene.add(key, key.target, rim, rim.target);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 0.38, metalness: 0.6 }));
  floor.receiveShadow = true;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.18, 96), new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.25, metalness: 0.85 }));
  ped.position.y = 0.09;
  ped.receiveShadow = ped.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.012, 12, 128).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x58a6ff).multiplyScalar(4), toneMapped: false }));
  ring.position.y = 0.18;
  scene.add(floor, ped, ring);

  let suit: THREE.Object3D;
  try {
    suit = (await loadModel("/models/emu.glb", progress)).scene;
    const box = fitModel(suit, 3.1, "y");
    suit.position.y += 0.18 - box.min.y;
    shade(suit, 1.0);
    // The export marks almost every material fully transmissive (glass); only the visor layers are partial.
    suit.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mt = m.material as THREE.MeshPhysicalMaterial;
      if (mt.transmission >= 0.99) { mt.transmission = 0; mt.transparent = false; mt.opacity = 1; }
      else if (mt.transmission > 0) m.visible = false;
      // flat duplicate/helper layers baked into this export (large opaque plates through the torso)
      if (/_(4|5|6|7|9|13)$/.test(m.name)) m.visible = false;
    });
    const wrap = new THREE.Group();
    wrap.add(suit);
    wrap.rotation.y = Math.PI; // the model faces away from the default camera
    suit = wrap;
  } catch (e) {
    console.error("EMU model failed, using procedural suit", e);
    suit = makeSokolSuit();
    suit.scale.setScalar(1.6);
    suit.position.y = 0.18;
  }
  scene.add(suit);

  return {
    update: () => {},
    cam: { pos: [2.4, 2.1, 4.1], target: [0, 1.65, 0], min: 2, max: 10, maxPolar: Math.PI / 2 - 0.02, autoRotate: 0.7 },
    bloom: [0.3, 0.5, 1.1], exposure: 0.9, shadows: true,
  };
}

const BUILDERS: Record<ImmersiveEnv, (c: Ctx) => Promise<Built>> = { earth: buildEarth, moon: buildMoon, mars: buildMars, iss: (c) => buildIss(c), isshd: (c) => buildIss(c, "/models/iss_hd.glb", false), suit: buildSuit };

// ---------- component ----------
export default function ImmersiveScene({ env }: { env: ImmersiveEnv }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const { lang } = useLang();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setState("loading");
    setProgress(0);
    let disposed = false;
    let raf = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, smallScreen() ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 4000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    const composer = new EffectComposer(renderer);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.6, 0.9);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let built: Built | null = null;
    let last = performance.now(), elapsed = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!built) return;
      elapsed += dt;
      built.update(dt, elapsed);
      controls.update();
      composer.render();
    };

    BUILDERS[env]({ scene, renderer, progress: (f) => { if (!disposed) setProgress(Math.min(0.99, Math.max(0, f))); } })
      .then((b) => {
        if (disposed) return;
        built = b;
        renderer.toneMappingExposure = b.exposure;
        renderer.shadowMap.enabled = !!b.shadows;
        bloom.strength = b.bloom[0]; bloom.radius = b.bloom[1]; bloom.threshold = b.bloom[2];
        // portrait screens: pull the camera back so the subject still fits
        const k = camera.aspect < 1 ? Math.min(2, 1 / Math.pow(camera.aspect, 0.85)) : 1;
        const t = new THREE.Vector3(...b.cam.target);
        camera.position.copy(t).add(new THREE.Vector3(...b.cam.pos).sub(t).multiplyScalar(k));
        controls.target.copy(t);
        controls.minDistance = b.cam.min;
        controls.maxDistance = b.cam.max * k;
        controls.maxPolarAngle = b.cam.maxPolar ?? Math.PI;
        controls.autoRotate = !!b.cam.autoRotate;
        controls.autoRotateSpeed = b.cam.autoRotate ?? 0;
        controls.update();
        setState("ready");
      })
      .catch((e) => { console.error(e); if (!disposed) setState("error"); });
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat as unknown as Record<string, unknown>)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
      (scene.environment as THREE.Texture | null)?.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [env]);

  return (
    <div className="relative h-[68vh] min-h-[460px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <div ref={host} className="absolute inset-0" />
      {state === "loading" && (
        <div role="status" aria-live="polite" className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-64 max-w-[80%] text-center">
            <p className="mb-2 text-sm text-white/80">
              {lang === "es" ? "Cargando modelo" : "Loading model"}
              {progress > 0 ? ` · ${Math.round(progress * 100)}%` : "…"}
              {env === "isshd" ? " (~15 MB)" : ""}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full bg-sky-400 ${progress > 0 ? "transition-[width] duration-200" : "w-2/5 animate-pulse"}`}
                style={progress > 0 ? { width: `${progress * 100}%` } : undefined}
              />
            </div>
          </div>
        </div>
      )}
      {state === "error" && <div className="absolute inset-0 grid place-items-center text-sm text-red-300">Could not start the 3D scene (WebGL unavailable?).</div>}
      <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-white/50">Drag to orbit · scroll to zoom</div>
    </div>
  );
}
