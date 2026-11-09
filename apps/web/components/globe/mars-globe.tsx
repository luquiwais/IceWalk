"use client";

import dynamic from "next/dynamic";

import type { MarsGlobeProps } from "./mars-globe-client";

export type { MarsGlobeProps } from "./mars-globe-client";
export type {
  GlobeFocus,
  GlobeStation,
  RouteFeatureCollection,
} from "./globe-model";

/**
 * Mars globe background (CesiumJS on Ellipsoid.MARS). Cesium loads only on the client.
 * The root is `absolute inset-0`: place it inside a positioned container.
 */
export const MarsGlobe = dynamic<MarsGlobeProps>(() => import("./mars-globe-client"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" aria-hidden />,
});
