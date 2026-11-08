"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { MaterialLayers } from "./material";
import { cn } from "./utils";
import { Text } from "./text";

type MenuAction = {
  id: string;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  checked?: boolean;
  onSelect?: () => void;
  items?: MenuAction[];
};

const ITEM =
  "vision-control vision-surface relative flex min-h-14 w-full items-center gap-2 rounded-2xl px-3 text-body outline-none data-highlighted:bg-white/10 data-disabled:text-label-disabled";

function ActionContent({ item }: { item: MenuAction }) {
  return (
    <>
      <span className="flex w-[1.4375rem] shrink-0 items-center">
        {item.checked ? (
          <Check aria-hidden className="size-[1.0625rem]" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.label}</span>
        {item.subtitle ? (
          <Text
            as="span"
            variant="footnote"
            tone="secondary"
            className="block truncate"
          >
            {item.subtitle}
          </Text>
        ) : null}
      </span>
      {item.icon ? (
        <span
          aria-hidden
          className="flex w-[1.625rem] shrink-0 items-center justify-center [&_svg]:size-5"
        >
          {item.icon}
        </span>
      ) : null}
      {item.items ? <ChevronRight aria-hidden className="size-3" /> : null}
    </>
  );
}
function MenuActions({ items }: { items: MenuAction[] }) {
  return items.map((item) =>
    item.items ? (
      <Menu.SubmenuRoot key={item.id}>
        <Menu.SubmenuTrigger className={ITEM}>
          <ActionContent item={item} />
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} className="z-50">
            <Menu.Popup className="vision-surface vision-popup-glass relative w-70 rounded-[1.75rem] p-3 text-label outline-none">
              <MaterialLayers kind="glass" />
              <MenuActions items={item.items} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    ) : (
      <Menu.Item
        key={item.id}
        disabled={item.disabled}
        onClick={item.onSelect}
        className={cn(ITEM, item.destructive && "text-red-400")}
      >
        <ActionContent item={item} />
      </Menu.Item>
    ),
  );
}

/** Figma dropdown + context menu: 280pt, 28pt corners, 56pt rows. */
function DropdownMenu({
  label,
  items,
  header,
  disabled = false,
  size = "regular",
  className,
}: {
  label: string;
  items: MenuAction[];
  header?: string;
  disabled?: boolean;
  size?: "small" | "regular";
  className?: string;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        render={
          <Button
            variant="plain"
            size={size}
            className={cn(
              "gap-[0.3125rem]",
              size === "regular" && "px-[1.125rem] text-title-2 font-bold",
              className,
            )}
          />
        }
      >
        {label}
        <ChevronDown aria-hidden className="size-[1.1875rem]" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start" className="z-50">
          <Menu.Popup className="vision-surface vision-popup-glass relative w-70 max-w-[calc(100vw-2rem)] rounded-[1.75rem] p-3 text-label shadow-2xl outline-none">
            <MaterialLayers kind="glass" />
            {header ? (
              <Text
                variant="footnote"
                tone="secondary"
                className="mx-5 flex h-[3.125rem] items-center justify-center border-b border-separator"
              >
                {header}
              </Text>
            ) : null}
            <MenuActions items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { DropdownMenu };
export type { MenuAction };
