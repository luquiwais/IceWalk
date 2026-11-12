"use client";

import { Toolbar } from "@base-ui/react/toolbar";

import { SurfaceScroll } from "./material";
import { cn } from "./utils";

/*
 * visionOS ornament / toolbar (Figma: Toolbars): a glass capsule, padding 12, gap 8. Items are
 * plain buttons: <ToggleButton appearance="toolbar" />, <IconButton variant="plain" />.
 * Keyboard: Tab enters the toolbar, arrow keys move between items. Overflow scrolls with faded edges.
 */
function Ornament({ className, children, ...props }: Toolbar.Root.Props) {
  const vertical = props.orientation === "vertical";
  return (
    <Toolbar.Root
      data-slot="ornament"
      className={cn("lb flex max-w-full items-center p-3 text-label data-[orientation=vertical]:flex-col", className)}
      {...props}
    >
      <SurfaceScroll direction={vertical ? "vertical" : "horizontal"} className="flex [scrollbar-width:none]">
        <div data-orientation={props.orientation} className="flex w-max shrink-0 items-center gap-2 data-[orientation=vertical]:flex-col">
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
  return <Toolbar.Group className={cn("flex items-center gap-2 data-[orientation=vertical]:flex-col", className)} {...props} />;
}

export { Ornament, OrnamentGroup, OrnamentItem };
