import React from "react";

type Pt = [number, number];

/** Matriz 3x3 que lleva el rectángulo (0,0)-(w,h) a los cuatro puntos dados (homografía). */
function homography(w: number, h: number, dst: [Pt, Pt, Pt, Pt]): number[] {
  const src: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Eliminación gaussiana 8x8.
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}

/**
 * Pone `children` (una pantalla de w×h) sobre una superficie de la escena definida por sus
 * esquinas en orden: arriba-izq, arriba-der, abajo-der, abajo-izq (en píxeles del cuadro).
 */
export const CornerPin: React.FC<{
  w: number;
  h: number;
  corners: [Pt, Pt, Pt, Pt];
  glow?: number;
  blur?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ w, h, corners, glow = 0.12, blur = 0.6, opacity = 0.96, children }) => {
  const [a, b, c, d, e, f, g, hh] = homography(w, h, corners);
  const m = [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
  return (
    <div
      style={{
        position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0",
        transform: `matrix3d(${m.join(",")})`, filter: `blur(${blur}px) brightness(${1 + glow})`, opacity,
      }}
    >
      {children}
      {/* Reflejo tenue del vidrio */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 40%)", pointerEvents: "none" }} />
    </div>
  );
};
