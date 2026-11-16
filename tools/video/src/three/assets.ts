import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import site from "../../public/site/s1094b-3d.json";

export type Level = (typeof site.levels)["detail"];
export const SITE = site;

/** Alturas en metros (fila 0 = norte) de un nivel del DTM HiRISE. */
export type Heights = { level: Level; z: Float32Array; w: number; h: number };

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, f: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, f());
  return cache.get(key) as Promise<T>;
}

/** Carga asíncrona compatible con el render de Remotion (delayRender/continueRender). */
export function useAsset<T>(key: string, load: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(null);
  const [handle] = useState(() => delayRender(`load ${key}`, { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    once(key, load).then((x) => { setV(x as T); continueRender(handle); }).catch((e) => { console.error(e); continueRender(handle); });
  }, [key, handle, load]);
  return v;
}

export const loadHeights = (name: "detail" | "overview") => async (): Promise<Heights> => {
  const level = site.levels[name] as Level;
  const buf = await (await fetch(staticFile(level.heightmap.replace(/^\//, "")))).arrayBuffer();
  const u = new Uint16Array(buf);
  const [w, h] = level.size;
  const z = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) z[i] = u[i] * level.z_scale_m;
  return { level, z, w, h };
};

export const loadTexture = (path: string) => async (): Promise<THREE.Texture> => {
  const tex = await new THREE.TextureLoader().loadAsync(staticFile(path));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

export const loadGLB = (path: string) => async (): Promise<THREE.Group> => {
  const g = await new GLTFLoader().loadAsync(staticFile(path));
  return g.scene;
};

/** Altura (m sobre z_min del nivel) en coordenadas de la grilla, bilineal. */
export function heightAt(hm: Heights, x: number, y: number): number {
  const { box_m: b, step_m: s } = hm.level;
  const fx = Math.min(hm.w - 1.001, Math.max(0, (x - b.xmin) / s));
  const fy = Math.min(hm.h - 1.001, Math.max(0, (b.ymax - y) / s));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const g = (c: number, r: number) => hm.z[r * hm.w + c];
  return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
}
