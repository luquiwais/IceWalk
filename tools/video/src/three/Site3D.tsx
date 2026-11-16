import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { D } from "../ui/theme";
import { SITE, heightAt, loadGLB, loadHeights, loadTexture, useAsset, type Heights } from "./assets";

// Origen de la escena: E03S24. Ejes three: X = este, Y = arriba, Z = sur.
const ORIGIN = D.stations_before[0].xy as [number, number];
const HAB = D.route_before_xy[0][0] as [number, number];
const toScene = (x: number, y: number, z: number): [number, number, number] => [x - ORIGIN[0], z, -(y - ORIGIN[1])];

// Color de Marte que tiñe la ortoimagen HiRISE (que es pancromática).
const TINT = new THREE.Color("#c27a4a");
const SKY = new THREE.Color("#c9a07a");

export type CamKey = { f: number; pos: [number, number, number]; look: [number, number, number]; fov?: number };

function camAt(keys: CamKey[], f: number) {
  if (f <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (f <= b.f) {
      const t0 = (f - a.f) / (b.f - a.f);
      const t = t0 * t0 * (3 - 2 * t0);
      const mix = (p: number[], q: number[]) => p.map((v, k) => v + (q[k] - v) * t) as [number, number, number];
      return { f, pos: mix(a.pos, b.pos), look: mix(a.look, b.look), fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * t };
    }
  }
  return keys[keys.length - 1];
}

const Terrain: React.FC<{ hm: Heights; tex: THREE.Texture; zBase: number; drop?: number }> = ({ hm, tex, zBase, drop = 0 }) => {
  const geo = useMemo(() => {
    const { box_m: b } = hm.level;
    const g = new THREE.PlaneGeometry(b.xmax - b.xmin, b.ymax - b.ymin, hm.w - 1, hm.h - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    // PlaneGeometry rotada: vértices fila por fila de norte (z negativo) a sur.
    for (let i = 0; i < pos.count; i++) pos.setY(i, hm.z[i] + hm.level.z_min_m - zBase - drop);
    g.computeVertexNormals();
    const cx = (b.xmin + b.xmax) / 2, cy = (b.ymin + b.ymax) / 2;
    const [sx, , sz] = toScene(cx, cy, 0);
    g.translate(sx, 0, sz);
    return g;
  }, [hm, zBase, drop]);
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial map={tex} color={TINT} roughness={1} metalness={0} />
    </mesh>
  );
};

const Boulders: React.FC<{ hm: Heights; zBase: number }> = ({ hm, zBase }) => {
  const items = SITE.levels.detail.boulders as (number | string)[][];
  return (
    <group>
      {items.map((b, i) => {
        const [x, y, d, h] = b as [number, number, number, number];
        const z = heightAt(hm, x, y) + hm.level.z_min_m - zBase;
        const p = toScene(x, y, z + h * 0.3);
        return (
          <mesh key={i} position={p} scale={[d / 2, h / 1.6, d / 2.3]} rotation={[0, i * 1.7, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#5a3b2b" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
};

const Placed: React.FC<{ obj: THREE.Group; at: [number, number]; hm: Heights; zBase: number; height: number; rotY?: number; tint?: string }> = ({ obj, at, hm, zBase, height, rotY = 0, tint }) => {
  const clone = useMemo(() => {
    const c = obj.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const s = height / size.y;
    c.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(c);
    c.position.y -= box2.min.y;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        if (tint) (m.material as THREE.MeshStandardMaterial).color?.multiply(new THREE.Color(tint));
      }
    });
    return c;
  }, [obj, height, tint]);
  const z = heightAt(hm, at[0], at[1]) + hm.level.z_min_m - zBase;
  return <primitive object={clone} position={toScene(at[0], at[1], z)} rotation={[0, rotY, 0]} />;
};

/** Escena del sitio S1094b con terreno HiRISE real, sol bajo, dos trajes y el hábitat. */
export const Site3D: React.FC<{ keys: CamKey[]; crew?: boolean; habitat?: boolean }> = ({ keys, crew = true, habitat = true }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const det = useAsset("h-detail", loadHeights("detail"));
  const ovr = useAsset("h-overview", loadHeights("overview"));
  const tDet = useAsset("t-detail", loadTexture("site/s1094b-detail.webp"));
  const tOvr = useAsset("t-overview", loadTexture("site/s1094b-overview.webp"));
  const suit = useAsset("z2", loadGLB("models/z2.glb"));
  const hab = useAsset("hdu1", loadGLB("models/hdu1.glb"));
  const cam = camAt(keys, frame);
  const ready = det && ovr && tDet && tOvr;
  const zBase = det ? heightAt(det, ORIGIN[0], ORIGIN[1]) + det.level.z_min_m : 0;
  // Sol bajo desde el oeste-noroeste: sombras largas hacia el este.
  const sunDir = new THREE.Vector3(-Math.cos(0.2) * 1, Math.tan((14 * Math.PI) / 180), -0.35).normalize();
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: cam.fov ?? 40, near: 0.1, far: 20000, position: cam.pos }}
      onCreated={({ scene }) => { scene.background = SKY; scene.fog = new THREE.Fog(SKY, 400, 4200); }}>
      <CameraRig pos={cam.pos} look={cam.look} fov={cam.fov ?? 40} />
      <hemisphereLight args={["#e7c7a3", "#5a3424", 0.55]} />
      <directionalLight position={sunDir.clone().multiplyScalar(600).toArray() as [number, number, number]} intensity={3.2} color="#ffe2c2" castShadow
        shadow-mapSize-width={4096} shadow-mapSize-height={4096} shadow-camera-left={-120} shadow-camera-right={120} shadow-camera-top={120} shadow-camera-bottom={-120} shadow-camera-near={1} shadow-camera-far={2000} shadow-bias={-0.0004} />
      {ready ? (
        <>
          <Terrain hm={ovr!} tex={tOvr!} zBase={zBase} drop={0.6} />
          <Terrain hm={det!} tex={tDet!} zBase={zBase} />
          <Boulders hm={det!} zBase={zBase} />
          {crew && suit ? (
            <>
              <Placed obj={suit} at={[ORIGIN[0] - 0.6, ORIGIN[1] + 0.2]} hm={det!} zBase={zBase} height={1.85} rotY={0.6} />
              <Placed obj={suit} at={[ORIGIN[0] + 1.6, ORIGIN[1] - 0.4]} hm={det!} zBase={zBase} height={1.9} rotY={-0.9} />
            </>
          ) : null}
          {habitat && hab ? <Placed obj={hab} at={HAB} hm={det!} zBase={zBase} height={6} rotY={2.2} /> : null}
        </>
      ) : null}
    </ThreeCanvas>
  );
};

import { useThree } from "@react-three/fiber";
const CameraRig: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov: number }> = ({ pos, look, fov }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  (camera as THREE.PerspectiveCamera).fov = fov;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  camera.lookAt(...look);
  return null;
};
