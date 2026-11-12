import type { Insets } from "@/components/site/camera";

type Rect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;
/** Derive map framing from measured chrome, including a bottom sheet on narrow screens and the map tools. */
export function sceneInsets(root: Rect, status: Rect, tabs: Rect, panel: Rect | undefined, timeline: Rect, tools: { above?: Rect; below?: Rect } = {}): Insets {
  const padding = 20;
  const bottomPanel = panel && panel.left < root.left + root.width * 0.25;
  const compact = bottomPanel || tabs.width > tabs.height;
  return {
    top: Math.max(0, status.bottom - root.top, compact ? tabs.bottom - root.top : 0, tools.above ? tools.above.bottom - root.top : 0) + padding,
    left: compact ? padding : Math.max(0, tabs.right - root.left) + padding,
    right: panel && !bottomPanel ? Math.max(0, root.right - panel.left) + padding : padding,
    bottom: Math.max(0, root.bottom - Math.min(bottomPanel ? panel.top : timeline.top, tools.below?.top ?? Infinity)) + padding,
  };
}
