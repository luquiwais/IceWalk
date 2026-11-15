import React from "react";
import { OffthreadVideo, AbsoluteFill, staticFile } from "remotion";

/** Isolated model / deformation preview, separate from the film edit. */
export const AstronautProof: React.FC = () => (
  <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center" }}>
    <OffthreadVideo src={staticFile("v2/astronaut-proof-follow.mp4")} muted style={{ height: 1080 }} />
    <div style={{ position: "absolute", bottom: 28, color: "#bbc3c9", font: "18px sans-serif" }}>
      Astronaut: LasquetiSpice · CC BY 4.0 · Adapted materials and animation
    </div>
  </AbsoluteFill>
);
