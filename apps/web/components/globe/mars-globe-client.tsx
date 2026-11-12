"use client";

import { useEffect, useRef, useState } from "react";

import {
  focusHeight,
  routeDescriptors,
  routeKey,
  selectBasemap,
  stationDescriptors,
  stationsKey,
  type GlobeFocus,
  type GlobeStation,
  type MarsBasemap,
  type RouteFeatureCollection,
} from "./globe-model";
import {
  GLOBE_OVERVIEW_HEIGHT_M,
  TREK_MARS_CREDIT,
  TREK_MARS_MAX_LEVEL,
  TREK_MARS_TILE_URL,
} from "./globe-model";

import type * as CesiumNS from "cesium";

type CesiumModule = typeof CesiumNS;

export type MarsGlobeProps = {
  stations?: GlobeStation[];
  /** GeoJSON FeatureCollection with LineString features in lon/lat. */
  route?: RouteFeatureCollection;
  /** When set, the camera flies to this point. Without it, the whole globe is shown. */
  focus?: GlobeFocus;
  /** Called when the flight to `focus` lands (at once with Reduce Motion). */
  onFocusComplete?: () => void;
  onSelectStation?: (id: string) => void;
  /** Classes for the root element (it fills its positioned container by default). */
  className?: string;
  /** Classes for the Cesium credits container (attribution must stay visible). */
  creditsClassName?: string;
};

const CESIUM_BASE_URL = "/cesium";
const STYLE_ID = "cesium-widgets-css";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

/** The ion token is inlined at build time (NEXT_PUBLIC_*): read it literally. */
const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

function ensureWidgetsCss() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = `${CESIUM_BASE_URL}/Widgets/widgets.css`;
  document.head.appendChild(link);
}

function addTrekGlobe(Cesium: CesiumModule, viewer: CesiumNS.Viewer, basemap: Extract<MarsBasemap, { kind: "trek" }>) {
  const { Ellipsoid, Globe, GeographicTilingScheme, ImageryLayer, UrlTemplateImageryProvider, Color } = Cesium;
  const globe = new Globe(Ellipsoid.MARS);
  globe.showGroundAtmosphere = false;
  globe.enableLighting = false;
  globe.baseColor = Color.fromCssColorString("#1c120e");
  viewer.scene.globe = globe;
  viewer.imageryLayers.removeAll();
  viewer.imageryLayers.add(
    new ImageryLayer(
      new UrlTemplateImageryProvider({
        url: basemap.url,
        tilingScheme: new GeographicTilingScheme({ ellipsoid: Ellipsoid.MARS }),
        tileWidth: 256,
        tileHeight: 256,
        maximumLevel: basemap.maximumLevel,
        credit: new Cesium.Credit(basemap.credit, true),
      }),
    ),
  );
}

export default function MarsGlobe({
  stations,
  route,
  focus,
  onFocusComplete,
  onSelectStation,
  className,
  creditsClassName,
}: MarsGlobeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const viewerRef = useRef<CesiumNS.Viewer | null>(null);
  const stationSourceRef = useRef<CesiumNS.CustomDataSource | null>(null);
  const routeSourceRef = useRef<CesiumNS.CustomDataSource | null>(null);
  const tilesetModeRef = useRef(false);
  const onSelectRef = useRef(onSelectStation);
  const onFocusCompleteRef = useRef(onFocusComplete);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemapKind, setBasemapKind] = useState<MarsBasemap["kind"]>("trek");

  useEffect(() => {
    onSelectRef.current = onSelectStation;
    onFocusCompleteRef.current = onFocusComplete;
  }, [onSelectStation, onFocusComplete]);

  // Create the viewer once, on the client.
  useEffect(() => {
    let cancelled = false;
    let viewer: CesiumNS.Viewer | undefined;
    let handler: CesiumNS.ScreenSpaceEventHandler | undefined;
    let dragging = false;

    async function init() {
      const root = rootRef.current;
      const credits = creditsRef.current;
      if (!root || !credits) return;
      window.CESIUM_BASE_URL = CESIUM_BASE_URL;
      ensureWidgetsCss();
      const Cesium = await import("cesium");
      if (cancelled) return;
      cesiumRef.current = Cesium;
      const { Ellipsoid, Viewer, GeographicProjection, Color, Cartesian3 } = Cesium;

      // Mars everywhere: the default ellipsoid drives Cartesian3.fromDegrees, cameras and globes.
      Ellipsoid.default = Ellipsoid.MARS;

      const basemap = selectBasemap(ION_TOKEN);
      viewer = new Viewer(root, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        fullscreenButton: false,
        vrButton: false,
        baseLayer: false,
        // Cesium Mars (ion) is a 3D Tiles tileset with its own surface: no ellipsoid globe.
        globe: false,
        skyAtmosphere: false,
        creditContainer: credits,
        mapProjection: new GeographicProjection(Ellipsoid.MARS),
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        contextOptions: { webgl: { alpha: false } },
      });
      viewer.scene.backgroundColor = Color.BLACK;
      if (viewer.scene.sun) viewer.scene.sun.show = false;
      if (viewer.scene.moon) viewer.scene.moon.show = false;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = GLOBE_OVERVIEW_HEIGHT_M * 3;
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(0, 0, GLOBE_OVERVIEW_HEIGHT_M, Ellipsoid.MARS),
      });

      let kind: MarsBasemap["kind"] = "trek";
      if (basemap.kind === "ion-mars") {
        try {
          Cesium.Ion.defaultAccessToken = basemap.token;
          const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(basemap.assetId);
          if (cancelled) return;
          viewer.scene.primitives.add(tileset);
          viewer.creditDisplay.addStaticCredit(new Cesium.Credit(basemap.credit, true));
          tilesetModeRef.current = true;
          kind = "ion-mars";
        } catch (err) {
          console.warn("Cesium Mars (ion) failed to load; falling back to NASA Trek tiles.", err);
        }
      }
      if (kind === "trek") {
        addTrekGlobe(Cesium, viewer, {
          kind: "trek",
          url: TREK_MARS_TILE_URL,
          maximumLevel: TREK_MARS_MAX_LEVEL,
          credit: TREK_MARS_CREDIT,
        });
      }
      if (cancelled) return;

      const stationSource = new Cesium.CustomDataSource("stations");
      const routeSource = new Cesium.CustomDataSource("route");
      await viewer.dataSources.add(routeSource);
      await viewer.dataSources.add(stationSource);
      if (cancelled) return;
      stationSourceRef.current = stationSource;
      routeSourceRef.current = routeSource;

      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      viewer.scene.canvas.style.cursor = "grab";
      handler.setInputAction(() => {
        dragging = true;
        viewer!.scene.canvas.style.cursor = "grabbing";
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
      handler.setInputAction(() => {
        dragging = false;
        viewer!.scene.canvas.style.cursor = "grab";
      }, Cesium.ScreenSpaceEventType.LEFT_UP);
      handler.setInputAction((click: { position: CesiumNS.Cartesian2 }) => {
        const picked = viewer!.scene.pick(click.position);
        const id: unknown = picked?.id?.id;
        if (typeof id === "string" && id.startsWith("station:")) {
          onSelectRef.current?.(id.slice("station:".length));
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      handler.setInputAction((move: { endPosition: CesiumNS.Cartesian2 }) => {
        const id: unknown = viewer!.scene.pick(move.endPosition)?.id?.id;
        viewer!.scene.canvas.style.cursor = dragging ? "grabbing" :
          typeof id === "string" && id.startsWith("station:") ? "pointer" : "grab";
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      viewerRef.current = viewer;
      setBasemapKind(kind);
      setStatus("ready");
    }

    init().catch((err) => {
      console.error("MarsGlobe failed to initialise", err);
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      handler?.destroy();
      viewerRef.current = null;
      stationSourceRef.current = null;
      routeSourceRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  // Stations: points + labels. Keyed by content so identical re-renders do nothing.
  const sKey = stationsKey(stations);
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const source = stationSourceRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !source || !viewer) return;
    const {
      Cartesian3, Cartesian2, Color, Ellipsoid, HeightReference, LabelStyle, VerticalOrigin,
      HorizontalOrigin, DistanceDisplayCondition, NearFarScalar,
    } = Cesium;
    const heightReference = tilesetModeRef.current
      ? HeightReference.CLAMP_TO_3D_TILE
      : HeightReference.CLAMP_TO_GROUND;
    source.entities.suspendEvents();
    source.entities.removeAll();
    for (const s of stationDescriptors(stations)) {
      source.entities.add({
        id: `station:${s.id}`,
        position: Cartesian3.fromDegrees(s.lon, s.lat, 0, Ellipsoid.MARS),
        point: {
          pixelSize: s.selected ? 13 : 9,
          color: s.selected ? Color.WHITE : Color.WHITE.withAlpha(0.85),
          outlineColor: s.selected ? Color.fromCssColorString("#0091ff") : Color.BLACK.withAlpha(0.7),
          outlineWidth: s.selected ? 3 : 2,
          heightReference,
        },
        label: {
          text: s.label,
          font: "500 12px -apple-system, 'SF Pro Text', Inter, system-ui, sans-serif",
          style: LabelStyle.FILL_AND_OUTLINE,
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK.withAlpha(0.85),
          outlineWidth: 3,
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          pixelOffset: new Cartesian2(0, -12),
          heightReference,
          // Labels only make sense near the site; at planet scale they would pile up.
          distanceDisplayCondition: new DistanceDisplayCondition(0, 400_000),
          scaleByDistance: new NearFarScalar(1_000, 1.1, 400_000, 0.8),
        },
      });
    }
    source.entities.resumeEvents();
    viewer.scene.requestRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sKey]);

  // Route: neutral polyline clamped to the surface.
  const rKey = routeKey(route);
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const source = routeSourceRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !source || !viewer) return;
    const { Cartesian3, Color, ClassificationType } = Cesium;
    source.entities.suspendEvents();
    source.entities.removeAll();
    for (const r of routeDescriptors(route)) {
      source.entities.add({
        id: `route:${r.id}`,
        polyline: {
          positions: Cartesian3.fromDegreesArray(r.positions, Cesium.Ellipsoid.MARS),
          width: 3,
          material: Color.WHITE.withAlpha(0.9),
          clampToGround: true,
          classificationType: ClassificationType.BOTH,
        },
      });
    }
    source.entities.resumeEvents();
    viewer.scene.requestRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, rKey]);

  // Camera: whole globe by default, fly to the site when `focus` is given.
  const fLon = focus?.lonlat[0];
  const fLat = focus?.lonlat[1];
  const fHeight = focus ? focusHeight(focus) : undefined;
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (status !== "ready" || !Cesium || !viewer) return;
    const { Cartesian3, BoundingSphere, HeadingPitchRange, Math: CMath, Ellipsoid } = Cesium;
    if (fLon === undefined || fLat === undefined || fHeight === undefined) {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(0, 0, GLOBE_OVERVIEW_HEIGHT_M, Ellipsoid.MARS),
        duration: 1.5,
      });
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    viewer.camera.flyToBoundingSphere(
      new BoundingSphere(Cartesian3.fromDegrees(fLon, fLat, 0, Ellipsoid.MARS), 1),
      {
        offset: new HeadingPitchRange(0, CMath.toRadians(-70), fHeight),
        duration: reduce ? 0 : 3,
        complete: () => onFocusCompleteRef.current?.(),
      },
    );
  }, [status, fLon, fLat, fHeight]);

  return (
    <div
      className={className ?? "absolute inset-0"}
      data-testid="mars-globe"
      data-status={status}
      data-basemap={basemapKind}
    >
      <div ref={rootRef} className="absolute inset-0 [&_.cesium-viewer]:size-full" />
      <div
        ref={creditsRef}
        className={
          creditsClassName ??
          "pointer-events-auto absolute bottom-1 right-2 max-w-[60%] text-right text-[10px] leading-tight [&_.cesium-widget-credits]:static! [&_.cesium-widget-credits]:p-0! [&_.cesium-widget-credits]:text-[10px]! [&_.cesium-widget-credits]:text-white/70!"
        }
      />
    </div>
  );
}
