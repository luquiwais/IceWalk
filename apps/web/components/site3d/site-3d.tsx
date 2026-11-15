"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CRATER_XY, habitatOf, SITE_IMAGERY } from "@/components/site/site-data";
import { orderedStations, type Plan } from "@/lib/plan";
import { circle, Heightfield, walkPath, type Box, type PathPoint, type Site3DData, type Site3DLevelName } from "@/lib/site3d";

/**
 * Illustrative sky: no calibrated value is citable. Pathfinder saw a yellowish-brown daytime sky,
 * redder away from the Sun and toward the horizon (Maki et al. 1999; Thomas et al. 1999).
 */
const SKY = "#c9a88a";
/** Sun of the HiRISE ortho ESP_073578_2155 (azimuth 238.45°, incidence 67.7°): the photographed shadows match. */
const SUN_AZIMUTH_DEG = 238.45;
const SUN_ELEVATION_DEG = 90 - 67.71;
const EYE_M = 1.7;
const WALKBACK_M = 1800;
/** Free walk: rehearsal speed (faster than a suited walk so the whole site is reachable), Shift runs. */
const FREE_MPS = 6;
const FREE_FAST = 4;
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
/**
 * Waypoint overlays drawn over the terrain, in the spirit of NASA SUITS AR navigation (they are
 * HUD graphics, not terrain): three rings on the ground and a light column seen from afar.
 * Radii in meters per level; the inner ring is the station's working area.
 */
const RINGS_M: Record<Site3DLevelName, [number, number, number]> = { detail: [3, 6, 10], overview: [20, 35, 55] };
const BEACON: Record<Site3DLevelName, { radius: number; height: number }> = { detail: { radius: 0.5, height: 70 }, overview: { radius: 7, height: 420 } };
/**
 * NASA Habitat Demonstration Unit (NASA 3D Resources, github.com/nasa/NASA-3D-Resources), a surface
 * habitat prototype field-tested at Desert RATS. Footprint in meters per level: about its real size
 * standing at a station, enlarged from above like the rest of the overlays.
 */
const HABITAT_MODEL = "/site/habitat-hdu.glb";
const HABITAT_FOOTPRINT_M: Record<Site3DLevelName, number> = { detail: 12, overview: 48 };
/** Past the DTM the skirt eases from the terrain edge into the far DTM or the mean level over this distance (m). */
const SKIRT_BLEND_M: Record<Site3DLevelName, number> = { detail: 80, overview: 1500 };

/** Distance at which a station counts as reached (inner ring). */
export const ARRIVE_M = 3;

/** Where the free-walk camera stands: grid meters and heading (degrees clockwise from north). */
export type FreePose = { x: number; y: number; headingDeg: number };

export type Site3DProps = {
  data: Site3DData;
  level: Site3DLevelName;
  plan: Plan;
  /** The plan before the last replan: its route is drawn faded. */
  previousPlan?: Plan;
  path: PathPoint[];
  /** "orbit" flies around the site; "free" stands at eye height (drag to look; WASD to move when `allowMove`). */
  mode: "orbit" | "free";
  allowMove?: boolean;
  exaggeration: number;
  /** Station ids already measured (dim markers) and the one the crew heads to (bright beacon). */
  measured?: readonly string[];
  activeId?: string;
  /** Heading home: the bright light column stands at the habitat. */
  homeActive?: boolean;
  /** Ice map raster (data URL) and its bounds in grid meters, draped on the terrain. */
  ice?: { url: string; bounds: Box } | null;
  onError?: (message: string) => void;
  /** Starting pose of the free walk (kept by the parent across phase changes). */
  initialPose?: FreePose;
  /** A new `key` moves the camera to this pose. */
  teleport?: FreePose & { key: number };
  /** The camera pose, about 6 times a second. */
  onMove?: (pose: FreePose) => void;
};

type Ground = {
  scene: THREE.Scene;
  terrain: THREE.BufferGeometry;
  cx: number;
  cy: number;
  box: Box;
  toWorld: (x: number, y: number, lift?: number) => THREE.Vector3;
  addLabel: (text: string, pos: THREE.Vector3, kind: string) => () => void;
};
type Marker = { id: string; x: number; y: number; fill: THREE.MeshBasicMaterial; rings: THREE.LineBasicMaterial[]; beacon: THREE.MeshBasicMaterial; state: "active" | "planned" | "measured" };

/** Real S1094b terrain (HiRISE DTM + ortho), real boulders, the plan route and waypoint overlays, in WebGL. */
export function Site3D({ data, level, plan, previousPlan, path, mode, allowMove = true, exaggeration, measured, activeId, homeActive = false, ice, onError, initialPose, teleport, onMove }: Site3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const labelsHost = useRef<HTMLDivElement>(null);
  const modeRef = useRef({ mode, allowMove });
  const [ready, setReady] = useState(false);
  const ground = useRef<Ground | null>(null);
  const markers = useRef<Marker[]>([]);
  const keys = useRef(new Set<string>());
  const free = useRef(initialPose
    ? { x: initialPose.x, y: initialPose.y, yaw: (initialPose.headingDeg * Math.PI) / 180, pitch: -0.08 }
    : { x: habitatOf(plan)[0], y: habitatOf(plan)[1], yaw: 0, pitch: -0.08 });
  const moveCb = useRef(onMove);
  const measuredKey = (measured ?? []).join(",");
  useEffect(() => { modeRef.current = { mode, allowMove }; }, [mode, allowMove]);
  useEffect(() => { moveCb.current = onMove; }, [onMove]);
  // The terrain is built once per level; it reads the plan's habitat at that moment (set just before).
  const habitatRef = useRef<[number, number]>(habitatOf(plan));
  useEffect(() => { habitatRef.current = habitatOf(plan); }, [plan]);
  useEffect(() => {
    if (teleport) free.current = { ...free.current, x: teleport.x, y: teleport.y, yaw: (teleport.headingDeg * Math.PI) / 180 };
  }, [teleport]);

  // Free walk input: keys held (ignored while typing in a field) and drag to look.
  useEffect(() => {
    if (mode !== "free") return;
    const el = host.current;
    const held = keys.current;
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (MOVE_KEYS[e.code] || e.code.startsWith("Shift")) { held.add(e.code); if (MOVE_KEYS[e.code]) e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => held.delete(e.code);
    const blur = () => held.clear();
    let drag: { x: number; y: number } | null = null;
    const pdown = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; el?.setPointerCapture(e.pointerId); };
    const pmove = (e: PointerEvent) => {
      if (!drag) return;
      const f = free.current;
      f.yaw -= (e.clientX - drag.x) * 0.004;
      f.pitch = Math.max(-1.2, Math.min(0.9, f.pitch - (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    };
    const pup = () => { drag = null; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    el?.addEventListener("pointerdown", pdown);
    el?.addEventListener("pointermove", pmove);
    el?.addEventListener("pointerup", pup);
    el?.addEventListener("pointercancel", pup);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el?.removeEventListener("pointerdown", pdown);
      el?.removeEventListener("pointermove", pmove);
      el?.removeEventListener("pointerup", pup);
      el?.removeEventListener("pointercancel", pup);
      held.clear();
    };
  }, [mode]);

  // Ground: terrain, boulders, habitat, crater, walkback ring, camera and the render loop.
  useEffect(() => {
    const el = host.current;
    const labelsEl = labelsHost.current;
    if (!el || !labelsEl) return;
    const lv = data.levels[level];
    const box = lv.box_m;
    const cx = (box.xmin + box.xmax) / 2;
    const cy = (box.ymin + box.ymax) / 2;
    const width = box.xmax - box.xmin;
    const height = box.ymax - box.ymin;
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
    // Zoom out stops before the far edge of the skirt shows; the orbit centre stays over the site.
    controls.maxDistance = Math.max(width, height) * (level === "overview" ? 0.9 : 0.75);
    controls.minDistance = level === "overview" ? 60 : 8;

    scene.add(new THREE.HemisphereLight("#f4e8dc", "#4a4038", 1.1));
    const sun = new THREE.DirectionalLight("#fff4e8", 1.6);
    const az = (SUN_AZIMUTH_DEG * Math.PI) / 180, el2 = (SUN_ELEVATION_DEG * Math.PI) / 180;
    sun.position.set(Math.sin(az) * Math.cos(el2), Math.sin(el2), -Math.cos(az) * Math.cos(el2)).multiplyScalar(1000);
    scene.add(sun);

    const labels = new Set<{ el: HTMLDivElement; pos: THREE.Vector3 }>();
    const addLabel = (text: string, pos: THREE.Vector3, kind: string) => {
      const div = document.createElement("div");
      div.className = "site3d-label";
      div.dataset.kind = kind;
      div.textContent = text;
      labelsEl.appendChild(div);
      const entry = { el: div, pos };
      labels.add(entry);
      return () => { labels.delete(entry); div.remove(); };
    };

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const disposers: (() => void)[] = [];

    const load = async () => {
      const [buf, texture] = await Promise.all([
        fetch(lv.heightmap).then((r) => { if (!r.ok) throw new Error("heightmap"); return r.arrayBuffer(); }),
        new THREE.TextureLoader().loadAsync(lv.texture),
      ]);
      if (disposed) { texture.dispose(); return; }
      const field = new Heightfield(lv, new Uint16Array(buf));
      const ex = exaggeration;
      const toWorld = (x: number, y: number, lift = 0) => new THREE.Vector3(x - cx, field.at(x, y) * ex + lift, -(y - cy));
      const inBox = (x: number, y: number) => x >= box.xmin && x <= box.xmax && y >= box.ymin && y <= box.ymax;

      // Terrain: one vertex per heightmap sample, rows north to south like PlaneGeometry.
      const [w, h] = lv.size;
      const geo = new THREE.PlaneGeometry(width, height, w - 1, h - 1);
      geo.rotateX(-Math.PI / 2);
      const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) posAttr.setY(i, field.cm[i] * lv.z_scale_m * ex);
      geo.computeVertexNormals();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      // The HiRISE RED ortho as acquired (grayscale): no color is invented (docs/EXPERIMENTS.md, 2026-11-14).
      const terrainMat = new THREE.MeshStandardMaterial({ map: texture, color: "#ffffff", roughness: 1, metalness: 0 });
      scene.add(new THREE.Mesh(geo, terrainMat));
      geometries.push(geo); materials.push(terrainMat); textures.push(texture);
      // Past the DTM the ground goes on (no cliff into the sky): a skirt with the real imagery around.
      void addSkirt({ scene, field, level, levels: data.levels, ex, cx, cy, maxAniso: renderer.capabilities.getMaxAnisotropy(), alive: () => !disposed })
        .then((dispose) => { if (dispose) { if (disposed) dispose(); else disposers.push(dispose); } })
        .catch(() => { /* the terrain stands alone */ });

      // Boulders: real detections, sized by shadow-measured diameter and height; shapes illustrative.
      const rock = new THREE.DodecahedronGeometry(0.5, 0);
      geometries.push(rock);
      const dummy = new THREE.Object3D();
      for (const form of ["b", "i"] as const) {
        const set = lv.boulders.filter((b) => b[4] === form);
        if (!set.length) continue;
        const mat = new THREE.MeshStandardMaterial({ color: form === "b" ? "#545454" : "#7a7a7a", roughness: 0.95, transparent: form === "i", opacity: form === "i" ? 0.7 : 1 });
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

      // Habitat and crater.
      const [hx, hy] = habitatRef.current;
      if (inBox(hx, hy)) {
        const footprint = HABITAT_FOOTPRINT_M[level];
        void addHabitat(scene, toWorld(hx, hy), footprint, () => disposed).then((dispose) => { if (dispose) disposers.push(dispose); });
        addLabel("Habitat", toWorld(hx, hy, footprint * 0.8), "habitat");
      }
      if (inBox(...CRATER_XY)) addLabel("S1094b · ice exposed by a 2021 impact", toWorld(CRATER_XY[0], CRATER_XY[1], 25), "crater");

      // Walkback limit ring (NASA ICES-2026-127: 30 min at 3.5 km/h).
      const ring = circle(habitatRef.current, WALKBACK_M).filter(([x, y]) => inBox(x, y)).map(([x, y]) => toWorld(x, y, 1.5));
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
      ground.current = { scene, terrain: geo, cx, cy, box, toWorld, addLabel };

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
      let lastT = performance.now();
      let lastReport = 0;
      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const dt = Math.min((now - lastT) / 1000, 0.1);
        lastT = now;
        const { mode: m, allowMove: canMove } = modeRef.current;
        const f = free.current;
        if (m === "free") {
          let fwd = 0, side = 0;
          if (canMove) for (const code of keys.current) { const k = MOVE_KEYS[code]; if (k) { side += k[0]; fwd += k[1]; } }
          const fast = keys.current.has("ShiftLeft") || keys.current.has("ShiftRight");
          if (fwd || side) {
            const step = FREE_MPS * (fast ? FREE_FAST : 1) * dt / Math.hypot(fwd, side);
            const sx = Math.sin(f.yaw), sy = Math.cos(f.yaw);
            f.x = Math.max(box.xmin + 5, Math.min(box.xmax - 5, f.x + (sx * fwd + sy * side) * step));
            f.y = Math.max(box.ymin + 5, Math.min(box.ymax - 5, f.y + (sy * fwd - sx * side) * step));
          }
          camera.position.copy(toWorld(f.x, f.y, EYE_M));
          camera.rotation.set(f.pitch, -f.yaw, 0, "YXZ");
          controls.enabled = false;
          if (now - lastReport > 160) {
            lastReport = now;
            moveCb.current?.({ x: f.x, y: f.y, headingDeg: (((f.yaw * 180) / Math.PI) % 360 + 360) % 360 });
          }
        } else {
          controls.enabled = true;
          const k = Math.min((now - t0) / fly, 1);
          if (k < 1) camera.position.lerpVectors(start, end, 1 - Math.pow(1 - k, 3));
          const t = controls.target;
          const tx = Math.max(-width / 2, Math.min(width / 2, t.x)), tz = Math.max(-height / 2, Math.min(height / 2, t.z));
          if (tx !== t.x || tz !== t.z) { camera.position.x += tx - t.x; camera.position.z += tz - t.z; t.x = tx; t.z = tz; }
          controls.update();
        }
        // Waypoints: the inner disc fills as the crew walks into the rings; beacons pulse softly.
        const pulse = 0.8 + 0.2 * Math.sin(now / 450);
        const radii = RINGS_M[level];
        for (const mk of markers.current) {
          const d = m === "free" ? Math.hypot(f.x - mk.x, f.y - mk.y) : Infinity;
          const near = Math.max(0, Math.min(1, (radii[2] - d) / (radii[2] - ARRIVE_M)));
          mk.fill.opacity = mk.state === "measured" ? 0.12 : near * 0.55;
          const lit = mk.state === "active" ? 0.95 : mk.state === "planned" ? 0.5 : 0.18;
          mk.rings.forEach((r, i) => { r.opacity = Math.min(1, lit + (d <= radii[i] ? 0.4 : 0)); });
          mk.beacon.opacity = (mk.state === "active" ? 0.55 : mk.state === "planned" ? 0.22 : 0.06) * pulse * (d < radii[2] ? 0.35 : 1);
        }
        renderer.render(scene, camera);
        placeLabels(labels, camera, el.getBoundingClientRect(), v);
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
      disposers.forEach((d) => d());
      renderer.dispose();
      renderer.domElement.remove();
      labelsEl.replaceChildren();
      ground.current = null;
      markers.current = [];
      setReady(false);
    };
  }, [data, level, exaggeration, onError]);

  // Plan layer: route, the previous route faded, and the waypoint overlays. Rebuilt on each replan
  // without reloading the terrain.
  useEffect(() => {
    const g = ground.current;
    if (!ready || !g) return;
    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const removers: (() => void)[] = [];
    const { box, toWorld } = g;
    const inBox = (x: number, y: number) => x >= box.xmin && x <= box.xmax && y >= box.ymin && y <= box.ymax;
    const overview = level === "overview";

    const tube = (pts: { x: number; y: number }[], color: string, opacity: number, radius: number) => {
      const world = pts.filter((p) => inBox(p.x, p.y)).map((p) => toWorld(p.x, p.y, overview ? 1.5 : 0.05));
      if (world.length < 2) return;
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(world, false, "catmullrom", 0), world.length * 2, radius, 6, false);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      group.add(new THREE.Mesh(geo, mat));
      geos.push(geo); mats.push(mat);
    };
    if (previousPlan) tube(walkPath(previousPlan, 4), "#ffffff", 0.22, overview ? 1.6 : 0.035);
    tube(path, "#f5f8ff", overview ? 0.95 : 0.85, overview ? 3.2 : 0.09); // a ground line, a little wider so it reads

    const beamTexture = beamGradient();
    const done = new Set(measuredKey ? measuredKey.split(",") : []);
    const list: Marker[] = [];
    const [r1, r2, r3] = RINGS_M[level];
    const beacon = BEACON[level];
    const lift = overview ? 1 : 0.06;
    for (const st of orderedStations(plan)) {
      const [x, y] = st.position;
      if (!inBox(x, y)) continue;
      const state: Marker["state"] = done.has(st.id) ? "measured" : st.id === activeId ? "active" : "planned";
      const color = state === "active" ? "#9fe8ff" : "#ffffff";
      const rings = [r1, r2, r3].map((r) => {
        const geo = new THREE.BufferGeometry().setFromPoints(circle([x, y], r, 72).map(([px, py]) => toWorld(px, py, lift)));
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false });
        group.add(new THREE.LineLoop(geo, mat));
        geos.push(geo); mats.push(mat);
        return mat;
      });
      // Inner disc that fills on approach: a fan that follows the ground.
      const fanPts = [toWorld(x, y, lift + 0.01), ...circle([x, y], r1, 48).map(([px, py]) => toWorld(px, py, lift + 0.01))];
      const idx: number[] = [];
      for (let i = 1; i < fanPts.length - 1; i++) idx.push(0, i, i + 1);
      idx.push(0, fanPts.length - 1, 1);
      const fanGeo = new THREE.BufferGeometry().setFromPoints(fanPts);
      fanGeo.setIndex(idx);
      const fill = new THREE.MeshBasicMaterial({ color: "#9fe8ff", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      group.add(new THREE.Mesh(fanGeo, fill));
      geos.push(fanGeo); mats.push(fill);
      // Light column, visible from far away.
      const beamGeo = new THREE.CylinderGeometry(beacon.radius, beacon.radius, beacon.height, 16, 1, true);
      const beam = new THREE.MeshBasicMaterial({ color, map: beamTexture, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const beamMesh = new THREE.Mesh(beamGeo, beam);
      beamMesh.position.copy(toWorld(x, y, beacon.height / 2));
      group.add(beamMesh);
      geos.push(beamGeo); mats.push(beam);
      // From above only the station number (as on the plan map); standing, the full name.
      const name = overview ? String(st.order) : `${String(st.order).padStart(2, "0")} ${st.id}`;
      removers.push(g.addLabel(`${name}${state === "measured" ? " · measured" : state === "active" ? " · next" : ""}`, toWorld(x, y, overview ? 60 : 4), state === "active" ? "station-active" : "station"));
      list.push({ id: st.id, x, y, fill, rings, beacon: beam, state });
    }
    const home = habitatOf(plan);
    if (homeActive && inBox(home[0], home[1])) {
      const beamGeo = new THREE.CylinderGeometry(beacon.radius * 1.4, beacon.radius * 1.4, beacon.height, 16, 1, true);
      const beam = new THREE.MeshBasicMaterial({ color: "#9fe8ff", map: beamTexture, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(beamGeo, beam);
      mesh.position.copy(toWorld(home[0], home[1], beacon.height / 2));
      group.add(mesh);
      geos.push(beamGeo); mats.push(beam);
      const ringMats = [r1 * 2, r2 * 2, r3 * 2].map((r) => {
        const geo = new THREE.BufferGeometry().setFromPoints(circle(home, r, 72).map(([px, py]) => toWorld(px, py, lift)));
        const mat = new THREE.LineBasicMaterial({ color: "#9fe8ff", transparent: true, opacity: 0.9, depthWrite: false });
        group.add(new THREE.LineLoop(geo, mat));
        geos.push(geo); mats.push(mat);
        return mat;
      });
      const fill = new THREE.MeshBasicMaterial({ color: "#9fe8ff", transparent: true, opacity: 0, depthWrite: false });
      mats.push(fill);
      list.push({ id: "@habitat", x: home[0], y: home[1], fill, rings: ringMats, beacon: beam, state: "active" });
    }
    g.scene.add(group);
    markers.current = list;
    return () => {
      g.scene.remove(group);
      geos.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
      beamTexture.dispose();
      removers.forEach((r) => r());
      markers.current = [];
    };
  }, [ready, plan, previousPlan, path, measuredKey, activeId, homeActive, level]);

  // Ice map draped on the terrain: a copy of the terrain mesh with UVs in the raster's bounds.
  useEffect(() => {
    const c = ground.current;
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
      mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
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

/** Label priority when two overlap on screen: lower wins; ties go to the closer one. */
const LABEL_RANK: Record<string, number> = { "station-active": 0, habitat: 1, station: 2, crater: 3, ring: 4 };
const labelSize = new WeakMap<HTMLDivElement, [number, number]>();

/**
 * Projects the labels and hides the ones that would overlap a more important or closer label,
 * so station names never print on top of each other.
 */
function placeLabels(labels: Set<{ el: HTMLDivElement; pos: THREE.Vector3 }>, camera: THREE.Camera, rect: DOMRect, v: THREE.Vector3) {
  const items: { div: HTMLDivElement; x: number; y: number; z: number; rank: number }[] = [];
  for (const { el: div, pos } of labels) {
    v.copy(pos).project(camera);
    if (v.z >= 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { div.style.display = "none"; continue; }
    items.push({ div, x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, z: v.z, rank: LABEL_RANK[div.dataset.kind ?? ""] ?? 5 });
  }
  items.sort((a, b) => a.rank - b.rank || a.z - b.z);
  const placed: [number, number, number, number][] = [];
  const pad = 3;
  for (const it of items) {
    let size = labelSize.get(it.div);
    if (!size) { it.div.style.display = ""; size = [it.div.offsetWidth, it.div.offsetHeight]; if (size[0]) labelSize.set(it.div, size); }
    const box: [number, number, number, number] = [it.x - size[0] / 2 - pad, it.y - size[1] - pad, it.x + size[0] / 2 + pad, it.y + pad];
    const hit = placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
    it.div.style.display = hit ? "none" : "";
    if (!hit) { placed.push(box); it.div.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -100%)`; }
  }
}

/** Vertical alpha gradient for the light columns: bright at the ground, fading upward. */
function beamGradient(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.7, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
  }
  return new THREE.CanvasTexture(c);
}

let habitatGltf: Promise<THREE.Group | null> | null = null;
/** The habitat model, loaded once per page. */
function loadHabitat(): Promise<THREE.Group | null> {
  // The NASA file is Draco-compressed: the decoder ships with three (copied to public/draco).
  habitatGltf ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/")).loadAsync(HABITAT_MODEL).then((g) => {
    // Its glass-like material (transmission, specular) renders black without an environment map:
    // keep its texture on a matte material lit by the scene's sun, like the terrain.
    g.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const old = o.material as THREE.MeshStandardMaterial;
      o.material = new THREE.MeshStandardMaterial({ map: old.map ?? null, color: old.map ? "#ffffff" : "#e8e8e8", roughness: 0.75, metalness: 0 });
      old.dispose();
    });
    return g.scene;
  }).catch(() => null);
  return habitatGltf;
}

/**
 * Places the NASA habitat model on the ground at `at`, scaled to `footprint` meters; a plain
 * cylinder stands in if the model does not load. Returns how to remove what it added.
 */
async function addHabitat(scene: THREE.Scene, at: THREE.Vector3, footprint: number, gone: () => boolean): Promise<(() => void) | null> {
  const model = await loadHabitat();
  if (gone()) return null;
  if (!model) {
    const g = new THREE.CylinderGeometry(footprint * 0.4, footprint * 0.45, footprint * 0.6, 24);
    const m = new THREE.MeshStandardMaterial({ color: "#eef1f5", roughness: 0.6 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(at).add(new THREE.Vector3(0, footprint * 0.3, 0));
    scene.add(mesh);
    return () => { scene.remove(mesh); g.dispose(); m.dispose(); };
  }
  const obj = model.clone(true);
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(footprint / Math.max(size.x, size.z, 1e-6));
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  obj.position.add(new THREE.Vector3(at.x - center.x, at.y - box.min.y - footprint * 0.02, at.z - center.z));
  scene.add(obj);
  return () => { scene.remove(obj); }; // geometry and textures stay with the cached model
}

type SkirtArgs = {
  scene: THREE.Scene;
  field: Heightfield;
  level: Site3DLevelName;
  levels: Site3DData["levels"];
  ex: number;
  cx: number;
  cy: number;
  maxAniso: number;
  alive: () => boolean;
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(src));
  img.src = src;
});

/**
 * Scenery past the level's DTM, so the terrain does not end in a cliff: one even grid around the box
 * that continues the edge's relief and flattens out with distance (into the overview DTM when
 * standing at a station), textured with the real imagery around the site as on the plan map. Inside
 * the box it sits under the terrain. Only visual: walking and the orbit stay inside the box.
 */
async function addSkirt({ scene, field, level, levels, ex, cx, cy, maxAniso, alive }: SkirtArgs): Promise<(() => void) | null> {
  const lv = levels[level];
  const box = lv.box_m;
  const margin = Math.max(box.xmax - box.xmin, box.ymax - box.ymin) * 1.2;
  const ext = { xmin: box.xmin - margin, xmax: box.xmax + margin, ymin: box.ymin - margin, ymax: box.ymax + margin };
  const W = ext.xmax - ext.xmin, H = ext.ymax - ext.ymin;

  // Standing at a station, the far ground follows the overview DTM, in the detail datum.
  let far: ((x: number, y: number) => number | null) | null = null;
  if (level === "detail") {
    const ov = levels.overview;
    const buf = await fetch(ov.heightmap).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    if (buf) {
      const ovField = new Heightfield(ov, new Uint16Array(buf));
      const ob = ov.box_m;
      far = (x, y) => (x >= ob.xmin && x <= ob.xmax && y >= ob.ymin && y <= ob.ymax ? ovField.at(x, y) + ov.z_min_m - lv.z_min_m : null);
    }
  }
  let mean = 0, count = 0;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    for (const [x, y] of [[box.xmin + t * (box.xmax - box.xmin), box.ymin], [box.xmin + t * (box.xmax - box.xmin), box.ymax], [box.xmin, box.ymin + t * (box.ymax - box.ymin)], [box.xmax, box.ymin + t * (box.ymax - box.ymin)]]) { mean += field.at(x, y); count++; }
  }
  mean /= count;

  const blend = SKIRT_BLEND_M[level];
  const segs = 240;
  const geo = new THREE.PlaneGeometry(W, H, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const ox = (ext.xmin + ext.xmax) / 2, oy = (ext.ymin + ext.ymax) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox, y = -pos.getZ(i) + oy;
    const dx = Math.max(box.xmin - x, 0, x - box.xmax), dy = Math.max(box.ymin - y, 0, y - box.ymax);
    const d = Math.hypot(dx, dy);
    const t = Math.min(1, d / blend);
    const ease = t * t * (3 - 2 * t);
    // Heightfield.at clamps to the box: outside it reads the nearest edge, so the relief carries on.
    const ground = d === 0 ? field.at(x, y) - 1.5 : field.at(x, y) * (1 - ease) + (far?.(x, y) ?? mean) * ease;
    pos.setXYZ(i, x - cx, (ground - 0.3) * ex, -(y - cy));
  }
  // Only outside the DTM: cells wholly inside the box are dropped, so the terrain there is untouched.
  const row = segs + 1;
  const inside = (i: number) => { const x = pos.getX(i) + cx, y = -pos.getZ(i) + cy; return x > box.xmin && x < box.xmax && y > box.ymin && y < box.ymax; };
  const keep: number[] = [];
  for (let r = 0; r < segs; r++) {
    for (let c = 0; c < segs; c++) {
      const a = r * row + c, b = a + 1, d = a + row, e = d + 1;
      if (inside(a) && inside(b) && inside(d) && inside(e)) continue;
      keep.push(a, d, b, d, e, b);
    }
  }
  geo.setIndex(keep);
  geo.computeVertexNormals();

  // One texture: THEMIS, then the wide HiRISE strip, then the level's own ortho on top.
  const layers = [SITE_IMAGERY.context, SITE_IMAGERY.wide, { src: lv.texture, box }];
  const imgs = await Promise.all(layers.map((l) => loadImage(l.src).catch(() => null)));
  if (!alive()) { geo.dispose(); return null; }
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#6b6b6b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    layers.forEach((l, i) => {
      const img = imgs[i];
      if (!img) return;
      const b = l.box;
      ctx.drawImage(img, ((b.xmin - ext.xmin) / W) * canvas.width, ((ext.ymax - b.ymax) / H) * canvas.height, ((b.xmax - b.xmin) / W) * canvas.width, ((b.ymax - b.ymin) / H) * canvas.height);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAniso;
  const mat = new THREE.MeshStandardMaterial({ map: texture, color: "#ffffff", roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return () => { scene.remove(mesh); geo.dispose(); mat.dispose(); texture.dispose(); };
}
