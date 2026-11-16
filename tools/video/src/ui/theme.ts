import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import data from "../../public/data/data.json";

const sans = loadSans("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const D = data;

export const T = {
  sans: sans.fontFamily,
  mono: mono.fontFamily,
  bg: "#090c10",
  panel: "#10151b",
  panel2: "#151b22",
  line: "rgba(255,255,255,0.09)",
  lineStrong: "rgba(255,255,255,0.22)",
  text: "#e9eef3",
  dim: "#8b97a4",
  faint: "#5b6672",
  // Color solo para alertas (advisory / caution / warning) y azules para hielo.
  advisory: "#a9c4e3",
  caution: "#f0b43c",
  warning: "#e5484d",
  ice: data.map.palette_probability.stops.map((s) => s.color),
};

export const fmtH = (h: number, m: number) => `${h} h ${String(m).padStart(2, "0")} min`;
export const round1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
export const pct = (v: number) => `${Math.round(v * 100)} %`;
