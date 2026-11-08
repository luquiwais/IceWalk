"use client";

import { Toolbar } from "@base-ui/react/toolbar";

import { MaterialLayers } from "./material";
import { cn } from "./utils";

/*
 * visionOS ornament / toolbar (Figma: Toolbars): a glass capsule with a 1.4px
 * edge, padding 12 and gap 8. Items are plain buttons: text items use
 * <ToggleButton appearance="toolbar" />, symbol items <IconButton variant="plain" />.
 * Keyboard: Tab enters the toolbar, arrow keys move between items.
 */
function Ornament({ className, children, ...props }: Toolbar.Root.Props) {
  return (
    <Toolbar.Root
      data-slot="ornament"
      className={cn(
        "vision-surface relative flex items-center gap-2 rounded-full p-3 text-label [--glass-stroke-width:1.4px]",
        "data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <MaterialLayers kind="glass" />
      {children}
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
      className={cn("flex items-center gap-2 data-[orientation=vertical]:flex-col", className)}
      {...props}
    />
  );
}

export { Ornament, OrnamentGroup, OrnamentItem };
