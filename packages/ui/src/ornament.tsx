"use client";

import { Toolbar } from "@base-ui/react/toolbar";
import { useLayoutEffect, useRef } from "react";

import { MaterialLayers, SurfaceScroll } from "./material";
import { cn } from "./utils";

/*
 * visionOS ornament / toolbar (Figma: Toolbars): a glass capsule with a 1.4px
 * edge, padding 12 and gap 8. Items are plain buttons: text items use
 * <ToggleButton appearance="toolbar" />, symbol items <IconButton variant="plain" />.
 * Keyboard: Tab enters the toolbar, arrow keys move between items.
 */
function Ornament({ className, children, ...props }: Toolbar.Root.Props) {
  const content = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = content.current;
    const root = host.current;
    if (!node || !root) return;
    const measure = () => {
      const style = getComputedStyle(root);
      root.style.setProperty(
        "--ornament-width",
        `${node.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)}px`,
      );
      root.style.setProperty(
        "--ornament-height",
        `${node.getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)}px`,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Toolbar.Root
      ref={host}
      data-slot="ornament"
      className={cn(
        "vision-surface vision-auto-toolbar relative flex items-center overflow-clip rounded-full p-3 text-label [--glass-stroke-width:1.4px]",
        "data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <MaterialLayers kind="glass" />
      <SurfaceScroll
        direction={props.orientation === "vertical" ? "vertical" : "horizontal"}
        className="flex flex-1 [scrollbar-width:none]"
      >
        <div
          ref={content}
          data-orientation={props.orientation}
          className="flex w-max shrink-0 items-center gap-2 data-[orientation=vertical]:flex-col"
        >
          {children}
        </div>
      </SurfaceScroll>
    </Toolbar.Root>
  );
}

/** A toolbar item. Pass the control to render, e.g. render={<ToggleButton />}. */
function OrnamentItem(props: Toolbar.Button.Props) {
  return <Toolbar.Button data-slot="ornament-item" {...props} />;
}

function OrnamentGroup({ className, ...props }: Toolbar.Group.Props) {
  return (
    <Toolbar.Group
      className={cn(
        "flex items-center gap-2 data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

export { Ornament, OrnamentGroup, OrnamentItem };
