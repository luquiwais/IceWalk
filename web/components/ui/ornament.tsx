"use client";

import { Toolbar } from "@base-ui/react/toolbar";

import { cn } from "@/lib/utils";

/**
 * visionOS ornament: a glass capsule that floats next to a window and holds
 * frequent controls. Buttons inside can be borderless (HIG > Ornaments).
 * Keyboard: Tab enters the toolbar, arrow keys move between items.
 */
function Ornament({ className, ...props }: Toolbar.Root.Props) {
  return (
    <Toolbar.Root
      data-slot="ornament"
      className={cn(
        "material-glass glass-rim flex items-center gap-1 rounded-full p-1.5 text-label",
        "data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

/** A toolbar item. Pass the control to render, e.g. render={<ToggleButton />}. */
function OrnamentItem(props: Toolbar.Button.Props) {
  return <Toolbar.Button data-slot="ornament-item" {...props} />;
}

function OrnamentGroup({ className, ...props }: Toolbar.Group.Props) {
  return (
    <Toolbar.Group
      className={cn("flex items-center gap-1 data-[orientation=vertical]:flex-col", className)}
      {...props}
    />
  );
}

function OrnamentSeparator({ className, ...props }: Toolbar.Separator.Props) {
  return (
    <Toolbar.Separator
      className={cn(
        "mx-1 h-6 w-px bg-separator data-[orientation=horizontal]:mx-0 data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-6",
        className,
      )}
      {...props}
    />
  );
}

export { Ornament, OrnamentGroup, OrnamentItem, OrnamentSeparator };
