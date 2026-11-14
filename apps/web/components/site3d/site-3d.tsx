"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CRATER_XY, HABITAT_XY } from "@/components/site/site-data";
import { orderedStations, type Plan } from "@/lib/plan";
import { circle, Heightfield, iceColor, pointAt, type Box, type PathPoint, type Site3DData, type Site3DLevelName } from "@/lib/site3d";

const SKY = "#d8b08a";
/** Sun of the HiRISE ortho ESP_073578_2155 (azimuth 238.45°, incidence 67.7°): the photographed shadows match. */
const SUN_AZIMUTH_DEG = 238.45;
const SUN_ELEVATION_DEG = 90 - 67.71;
const EYE_M = 1.7;
const WALKBACK_M = 1800;

export type Site3DProps = {
  data: Site3DData;
  level: Site3DLevelName;
  plan: Plan;
  path: PathPoint[];
  /** "orbit" lets the user fly around; "walk" puts the camera at eye height on the route at `progressM`. */
  mode: "orbit" | "walk";
  progressM: number;
  exaggeration: number;
  /** Ice map raster (data URL) and its bounds in grid meters, draped on the terrain. */
  ice?: { url: string; bounds: Box } | null;
  onError?: (message: string) => void;
};

type SceneContext = { scene: THREE.Scene; terrain: THREE.BufferGeometry; cx: number; cy: number };

type Label = { el: HTMLDivElement; pos: THREE.Vector3 };

/** Real S1094b terrain (HiRISE DTM + ortho), real boulders, the plan route and stations, in WebGL. */
export function Site3D({ data, level, plan, path, mode, progressM, exaggeration, ice, onError }: Site3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const labelsHost = useRef<HTMLDivElement>(null);
  const walk = useRef({ mode, progressM });
  const [ready, setReady] = useState(false);
  const ctx = useRef<SceneContext | null>(null);
  useEffect(() => { walk.current = { mode, progressM }; }, [mode, progressM]);

  useEffect(() => {
    const el = host.current;
    const labelsEl = labelsHost.current;
    if (!el || !labelsEl) return;
    const lv = data.levels[level];
    const cx = (lv.box_m.xmin + lv.box_m.xmax) / 2;
    const cy = (lv.box_m.ymin + lv.box_m.ymax) / 2;
    const width = lv.box_m.xmax - lv.box_m.xmin;
    const height = lv.box_m.ymax - lv.box_m.ymin;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onError?.("3D view needs WebGL, which this browser does not provide.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, Math.max(width, height) * 0.6, Math.max(width, height) * 2.2);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.3, Math.max(width, height) * 4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;

    scene.add(new THREE.HemisphereLight("#f4dcc0", "#5a3a26", 1.1));
    const sun = new THREE.DirectionalLight("#fff1dd", 2.2);
    const az = (SUN_AZIMUTH_DEG * Math.PI) / 180, el2 = (SUN_ELEVATION_DEG * Math.PI) / 180;
    sun.position.set(Math.sin(az) * Math.cos(el2), Math.sin(el2), -Math.cos(az) * Math.cos(el2)).multiplyScalar(1000);
    scene.add(sun);

    const labels: Label[] = [];
    const addLabel = (text: string, pos: THREE.Vector3, kind: string) => {
      const div = document.createElement("div");
      div.className = "site3d-label";
      div.dataset.kind = kind;
      div.textContent = text;
      labelsEl.appendChild(div);
      labels.push({ el: div, pos });
    };

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const load = async () => {
      const [buf, texture] = await Promise.all([
        fetch(lv.heightmap).then((r) => { if (!r.ok) throw new Error("heightmap"); return r.arrayBuffer(); }),
        new THREE.TextureLoader().loadAsync(lv.texture),
      ]);
      if (disposed) { texture.dispose(); return; }
      const field = new Heightfield(lv, new Uint16Array(buf));
      const ex = exaggeration;
      const toWorld = (x: number, y: number, lift = 0) => new THREE.Vector3(x - cx, field.at(x, y) * ex + lift, -(y - cy));

      // Terrain: one vertex per heightmap sample, rows north to south like PlaneGeometry.
      const [w, h] = lv.size;
      const geo = new THREE.PlaneGeometry(width, height, w - 1, h - 1);
      geo.rotateX(-Math.PI / 2);
      const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) posAttr.setY(i, field.cm[i] * lv.z_scale_m * ex);
      geo.computeVertexNormals();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const terrainMat = new THREE.MeshStandardMaterial({ map: texture, color: "#f0c49a", roughness: 1, metalness: 0 });
      scene.add(new THREE.Mesh(geo, terrainMat));
      geometries.push(geo); materials.push(terrainMat); textures.push(texture);
      ctx.current = { scene, terrain: geo, cx, cy };

      // Boulders: real detections, sized by shadow-measured diameter and height.
      const rock = new THREE.DodecahedronGeometry(0.5, 0);
      geometries.push(rock);
      const dummy = new THREE.Object3D();
      for (const form of ["b", "i"] as const) {
        const set = lv.boulders.filter((b) => b[4] === form);
        if (!set.length) continue;
        const mat = new THREE.MeshStandardMaterial({ color: form === "b" ? "#4a3b32" : "#7a6656", roughness: 0.95, transparent: form === "i", opacity: form === "i" ? 0.7 : 1 });
        const mesh = new THREE.InstancedMesh(rock, mat, set.length);
        set.forEach(([x, y, d, hgt], i) => {
          const visual = level === "overview" ? 2.5 : 1; // small rocks stay visible from the site view
          dummy.position.copy(toWorld(x, y, (hgt * ex * visual) / 2 - 0.1));
          dummy.scale.set(d * visual, Math.max(hgt, 0.3) * ex * visual, d * visual);
          dummy.rotation.set(0, (x * 13 + y * 7) % Math.PI, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        scene.add(mesh);
        materials.push(mat);
      }

      // Route: a tube a little above the ground.
      const inBox = (x: number, y: number) => x >= lv.box_m.xmin && x <= lv.box_m.xmax && y >= lv.box_m.ymin && y <= lv.box_m.ymax;
      const routePts = path.filter((p) => inBox(p.x, p.y)).map((p) => toWorld(p.x, p.y, level === "overview" ? 1.5 : 0.04));
      if (routePts.length > 1) {
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePts, false, "catmullrom", 0), routePts.length * 2, level === "overview" ? 2.2 : 0.05, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({ color: "#f5f8ff", transparent: true, opacity: level === "overview" ? 0.95 : 0.75 });
        scene.add(new THREE.Mesh(tube, tubeMat));
        geometries.push(tube); materials.push(tubeMat);
      }

      // Stations: pillars colored by P(ice), with labels.
      const pillarH = level === "overview" ? 40 : 8;
      for (const st of orderedStations(plan)) {
        const [x, y] = st.position;
        if (!inBox(x, y)) continue;
        const g = new THREE.CylinderGeometry(level === "overview" ? 6 : 1.2, level === "overview" ? 6 : 1.2, pillarH, 16);
        const m = new THREE.MeshStandardMaterial({ color: iceColor(st.p_ice), emissive: iceColor(st.p_ice), emissiveIntensity: 0.35 });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.copy(toWorld(x, y, pillarH / 2));
        scene.add(mesh);
        geometries.push(g); materials.push(m);
        if (level === "detail") addLabel(`${String(st.order).padStart(2, "0")} ${st.id} · P(ice) ${Math.round(st.p_ice * 100)}%`, toWorld(x, y, pillarH + 2), "station");
      }
      const shown = orderedStations(plan).filter((st) => inBox(...st.position));
      if (level === "overview" && shown.length) {
        const ps = shown.map((st) => Math.round(st.p_ice * 100));
        const mx = shown.reduce((a, st) => a + st.position[0], 0) / shown.length;
        const my = shown.reduce((a, st) => a + st.position[1], 0) / shown.length;
        addLabel(`${shown.length} stations · P(ice) ${Math.min(...ps)}–${Math.max(...ps)}%`, toWorld(mx, my - 120, pillarH + 30), "station");
      }

      // Habitat and crater.
      const [hx, hy] = HABITAT_XY;
      if (inBox(hx, hy)) {
        const g = new THREE.CylinderGeometry(level === "overview" ? 18 : 5, level === "overview" ? 22 : 6, level === "overview" ? 30 : 7, 24);
        const m = new THREE.MeshStandardMaterial({ color: "#eef1f5", roughness: 0.6 });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.copy(toWorld(hx, hy, level === "overview" ? 15 : 3.5));
        scene.add(mesh);
        geometries.push(g); materials.push(m);
        addLabel("Habitat", toWorld(hx, hy, level === "overview" ? 40 : 10), "habitat");
      }
      if (inBox(...CRATER_XY)) addLabel("S1094b · ice exposed by a 2021 impact", toWorld(CRATER_XY[0], CRATER_XY[1], 25), "crater");

      // Walkback limit ring (NASA ICES-2026-127: 30 min at 3.5 km/h).
      const ring = circle(HABITAT_XY, WALKBACK_M).filter(([x, y]) => inBox(x, y)).map(([x, y]) => toWorld(x, y, 1.5));
      if (ring.length > 1) {
        const g = new THREE.BufferGeometry().setFromPoints(ring);
        const m = new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 30, gapSize: 20 });
        const line = new THREE.Line(g, m);
        line.computeLineDistances();
        scene.add(line);
        geometries.push(g); materials.push(m);
        const top = ring.reduce((a, b) => (b.z < a.z ? b : a));
        addLabel("Walkback limit · 1.8 km", top.clone().add(new THREE.Vector3(0, 12, 0)), "ring");
      }

      // Opening shot: from above the crater toward the habitat, then free orbit.
      const target = inBox(hx, hy) ? toWorld(hx, hy) : new THREE.Vector3(0, 0, 0);
      const start = level === "overview" ? toWorld(CRATER_XY[0], CRATER_XY[1] + 600, 900) : toWorld(hx - 250, hy - 250, 160);
      const end = level === "overview" ? target.clone().add(new THREE.Vector3(-700, 650, 900)) : target.clone().add(new THREE.Vector3(-90, 55, 110));
      camera.position.copy(start);
      controls.target.copy(target);
      const t0 = performance.now();
      const fly = 3500;

      const resize = () => {
        const r = el.getBoundingClientRect();
        renderer.setSize(r.width, r.height, false);
        camera.aspect = r.width / Math.max(r.height, 1);
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      setReady(true);

      const v = new THREE.Vector3();
      const tick = () => {
        if (disposed) return;
        const { mode: m, progressM: s } = walk.current;
        if (m === "walk" && path.length > 1) {
          const p = pointAt(path, s), q = pointAt(path, s + 12);
          camera.position.copy(toWorld(p.x, p.y, EYE_M));
          const look = toWorld(q.x, q.y, EYE_M * 0.6);
          camera.lookAt(look);
          controls.enabled = false;
        } else {
          controls.enabled = true;
          const k = Math.min((performance.now() - t0) / fly, 1);
          if (k < 1) camera.position.lerpVectors(start, end, 1 - Math.pow(1 - k, 3));
          controls.update();
        }
        renderer.render(scene, camera);
        const rect = el.getBoundingClientRect();
        for (const { el: div, pos } of labels) {
          v.copy(pos).project(camera);
          const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
          div.style.display = visible ? "" : "none";
          if (visible) div.style.transform = `translate(${((v.x + 1) / 2) * rect.width}px, ${((1 - v.y) / 2) * rect.height}px) translate(-50%, -100%)`;
        }
        frame = requestAnimationFrame(tick);
      };
      tick();
      return () => observer.disconnect();
    };

    let cleanupResize: (() => void) | undefined;
    load().then((c) => { cleanupResize = c; }).catch(() => onError?.("Could not load the site terrain."));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanupResize?.();
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      labelsEl.replaceChildren();
      ctx.current = null;
      setReady(false);
    };
  }, [data, level, plan, path, exaggeration, onError]);

  // Ice map draped on the terrain: a copy of the terrain mesh with UVs in the raster's bounds.
  useEffect(() => {
    const c = ctx.current;
    if (!ready || !c || !ice) return;
    let mesh: THREE.Mesh | undefined;
    let texture: THREE.CanvasTexture | undefined;
    let geo: THREE.BufferGeometry | undefined;
    let mat: THREE.Material | undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      // One transparent pixel around the image so that clamped UVs outside the bounds are empty.
      const canvas = document.createElement("canvas");
      canvas.width = img.width + 2;
      canvas.height = img.height + 2;
      canvas.getContext("2d")?.drawImage(img, 1, 1);
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      geo = c.terrain.clone();
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      const uv = new Float32Array(pos.count * 2);
      const b = ice.bounds;
      const W = img.width, H = img.height;
      for (let i = 0; i < pos.count; i++) {
        const gx = pos.getX(i) + c.cx;
        const gy = -pos.getZ(i) + c.cy;
        uv[i * 2] = (1 + ((gx - b.xmin) / (b.xmax - b.xmin)) * W) / (W + 2);
        uv[i * 2 + 1] = (1 + ((gy - b.ymin) / (b.ymax - b.ymin)) * H) / (H + 2);
      }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 1;
      c.scene.add(mesh);
    };
    img.src = ice.url;
    return () => {
      cancelled = true;
      if (mesh) c.scene.remove(mesh);
      geo?.dispose();
      mat?.dispose();
      texture?.dispose();
    };
  }, [ice, ready]);

  return (
    <div className="site3d" data-ready={ready}>
      <div ref={host} className="site3d-canvas" />
      <div ref={labelsHost} className="site3d-labels" aria-hidden />
    </div>
  );
}
