// Copies the static assets CesiumJS needs at runtime (Workers, ThirdParty, Assets, Widgets)
// from node_modules/cesium/Build/Cesium to public/cesium. The copy is gitignored and
// regenerated on postinstall / predev / prebuild. CESIUM_BASE_URL is "/cesium".
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, "..", "public", "cesium");
const require = createRequire(import.meta.url);

let pkgDir;
try {
  pkgDir = path.dirname(require.resolve("cesium/package.json"));
} catch {
  console.warn("[copy-cesium] cesium is not installed yet; skipping (run `bun install`).");
  process.exit(0);
}

const buildDir = path.join(pkgDir, "Build", "Cesium");
for (const dir of ["Workers", "ThirdParty", "Assets", "Widgets"]) {
  const from = path.join(buildDir, dir);
  if (!existsSync(from)) {
    console.error(`[copy-cesium] missing ${from}`);
    process.exit(1);
  }
  const to = path.join(dest, dir);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}
console.log(`[copy-cesium] assets copied to ${path.relative(process.cwd(), dest) || dest}`);
