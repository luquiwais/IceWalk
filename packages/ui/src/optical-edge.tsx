"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { opticalField } from "./optical-field";
import { useReducedMotion } from "./motion";

const textures = new Map<string, string>();

/** Optional, bounded SVG displacement shader for a glass edge. It samples the
 * real DOM backdrop in Chromium, not a copied screenshot. Safari currently
 * ignores SVG backdrop filters: keep normal MaterialLayers behind this layer.
 * No animation loop, map mutation per frame, or graphics context per control.
 */
function OpticalEdge({ enabled = false, radius, strength = 8 }: { enabled?: boolean; radius?: number; strength?: number }) {
  const host = useRef<HTMLSpanElement>(null);
  const id = `vision-optics-${useId().replaceAll(":", "")}`;
  const reduced = useReducedMotion();
  const [map, setMap] = useState<{ width: number; height: number; url: string } | null>(null);
  const active = enabled && !reduced;
  useLayoutEffect(() => {
    const node = host.current;
    if (!node || !active) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const prepare = () => {
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // Quantization/cache also bounds resize work. The same texture can be
      // reused across matching controls without a persistent canvas/context.
      const width = Math.ceil(box.width / 16) * 16, height = Math.ceil(box.height / 16) * 16;
      const corner = radius ?? (parseFloat(getComputedStyle(node).borderTopLeftRadius) || 36);
      const key = `${width}/${height}/${corner}`;
      let url = textures.get(key);
      if (!url) {
        const field = opticalField(width, height, corner);
        const canvas = document.createElement("canvas");
        canvas.width = field.width; canvas.height = field.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        const image = context.createImageData(field.width, field.height);
        image.data.set(field.pixels); context.putImageData(image, 0, 0);
        url = canvas.toDataURL();
        if (textures.size >= 8) textures.delete(textures.keys().next().value!);
        textures.set(key, url);
      }
      setMap(previous => previous?.url === url ? previous : { width, height, url: url! });
    };
    prepare();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => { clearTimeout(pending); pending = setTimeout(prepare, 100); });
    observer.observe(node);
    return () => { clearTimeout(pending); observer.disconnect(); };
  }, [active, radius]);
  return <span ref={host} aria-hidden data-optical-edge data-optical-active={active && map ? "" : undefined}
    className="pointer-events-none absolute inset-0 rounded-[inherit]"
    style={active && map ? { backdropFilter: `url("#${id}")` } : undefined}>
    {active && map ? <svg width="0" height="0" className="absolute" aria-hidden>
      <defs><filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feImage href={map.url} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="normal" />
        <feComponentTransfer in="normal" result="centered">
          <feFuncR type="linear" slope={255 / 254} intercept={-1 / 254} />
          <feFuncG type="linear" slope={255 / 254} intercept={-1 / 254} />
        </feComponentTransfer>
        <feDisplacementMap in="SourceGraphic" in2="centered" scale={Math.max(0, Math.min(16, strength))} xChannelSelector="R" yChannelSelector="G" />
      </filter></defs>
    </svg> : null}
  </span>;
}

export { OpticalEdge };
