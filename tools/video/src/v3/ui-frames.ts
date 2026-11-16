import type { Cam } from "./RealUI";

/** Folder with the real app captures (public/ui-real, see its manifest.json). */
export const UI_DIR = "ui-real";
export const UI = (name: string) => `${UI_DIR}/${name}`;

type Box = [number, number, number, number];
const cam = (x: number, y: number, scale: number): Cam => ({ x, y, scale });

/** Framing and call-outs for the Global, in 1920x1080 app pixels (boxes from manifest.json). */
export const GLOBAL_UI = {
  plan: {
    src: "plan.png",
    from: cam(960, 540, 1.0), to: cam(1180, 480, 1.18),
    ring: [538, 272, 304, 304] as Box, ringLabel: "P(ICE WITHIN 3 m) · 93 %",
    legend: [36, 786, 313, 134] as Box, legendLabel: "CERTAIN ↔ PRIOR ONLY",
    route: [840, 230, 230, 660] as Box, routeLabel: "GO · 6 STATIONS · 6 h 3 min",
  },
  update: {
    src: "iv-console.png",
    from: cam(1300, 400, 1.15), to: cam(1380, 380, 1.4),
    station: [954, 451, 68, 68] as Box, card: [1500, 370, 375, 135] as Box,
    label: "WAITING FOR EV1",
  },
  review: {
    src: "plan.png",
    from: cam(1700, 330, 1.5), to: cam(1700, 340, 1.58),
    cursorFrom: [1560, 300] as [number, number], button: [1696, 503] as [number, number],
  },
} as const;
