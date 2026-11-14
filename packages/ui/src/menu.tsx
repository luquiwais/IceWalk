"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "./button";
import { MorphOrigin, useMorphPopup } from "./morph-popup";
import { Highlight } from "./selection";
import { Text } from "./text";
import { cn } from "./utils";

/** Fluid Kit's menu example: glass, 248 wide, radius 32, padding 8. */
const POPUP = "lb relative flex w-[min(15.5rem,calc(100vw-2rem))] flex-col rounded-[2rem] p-2 text-label outline-none select-none";

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
  /** Starts a new section with this header (Figma: Section Header, 47pt). */
  section?: string;
};

/** Where a popup opens from its button. */
type PopupPlacement = {
  /** Side of the button it opens on. Default: bottom. */
  side?: "top" | "bottom" | "left" | "right";
  /** Alignment along that side. Default: start. */
  align?: "start" | "center" | "end";
  /** Gap from the button, pt. Default: 8. */
  sideOffset?: number;
  /** Open over the button instead of beside it (the button stays underneath). */
  cover?: boolean;
};

/** Base UI positioner props for a placement. */
function placement({ side = "bottom", align = "start", sideOffset = 8, cover = false }: PopupPlacement) {
  return {
    side,
    align,
    sideOffset: cover
      ? ({ anchor }: { anchor: { width: number; height: number } }) => -(side === "top" || side === "bottom" ? anchor.height : anchor.width)
      : sideOffset,
  };
}

/** Icon-only action in the accessory bar above a context menu's rows. */
type MenuAccessory = {
  id: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
};

/** A row: a 44pt capsule; the highlight moving between rows is one Highlight. */
const ITEM = "flex min-h-11 w-full items-center gap-3 rounded-full pr-[1.125rem] text-body outline-none data-disabled:opacity-40";

function ActionContent({ item, selectable }: { item: MenuAction; selectable: boolean }) {
  return (
    <>
      {selectable ? (
        <span data-slot="menu-check" className="flex w-[1.4375rem] shrink-0 items-center">
          {item.checked ? <Check aria-hidden strokeWidth={2.5} className="size-[1.0625rem]" /> : null}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 py-2">
        <span className="block truncate">{item.label}</span>
        {item.subtitle ? (
          <Text as="span" variant="footnote" tone="secondary" className="block truncate">
            {item.subtitle}
          </Text>
        ) : null}
      </span>
      {item.icon ? (
        <span aria-hidden className="flex w-[1.625rem] shrink-0 items-center justify-center [&_svg]:size-[1.125rem]">
          {item.icon}
        </span>
      ) : null}
      {item.items ? (
        <ChevronRight aria-hidden strokeWidth={2.25} className="size-[1.1875rem] shrink-0 text-label-tertiary" />
      ) : null}
    </>
  );
}

/** The kit's Section Header: a hairline, then a 13pt bold secondary label. */
function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div role="presentation" data-slot="menu-section" className="shrink-0 px-3 pt-1">
      <hr className="my-1 border-separator" />
      <Text variant="footnote" weight="semibold" tone="secondary" className="px-1 py-1.5">
        {children}
      </Text>
    </div>
  );
}

function MenuActions({ items }: { items: MenuAction[] }) {
  const selectable = items.some((item) => item.checked !== undefined);
  return items.map((item) => (
    <Fragment key={item.id}>
      {item.section ? <SectionHeader>{item.section}</SectionHeader> : null}
      {item.items ? (
        <Menu.SubmenuRoot>
          <Menu.SubmenuTrigger data-slot="menu-item" className={cn(ITEM, selectable ? "pl-3" : "pl-4")}>
            <ActionContent item={item} selectable={selectable} />
          </Menu.SubmenuTrigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} className="z-50">
              <Menu.Popup className={cn(POPUP, "ui-pop")}>
                <Highlight items="[role^=menuitem]:not([data-disabled])" />
                <MenuActions items={item.items} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.SubmenuRoot>
      ) : (
        <Menu.Item
          data-slot="menu-item"
          disabled={item.disabled}
          onClick={item.onSelect}
          className={cn(ITEM, selectable ? "pl-3" : "pl-4", item.destructive && "text-warning")}
        >
          <ActionContent item={item} selectable={selectable} />
        </Menu.Item>
      )}
    </Fragment>
  ));
}

/** Figma "Context Menu - Accessory Items": 64pt bar of 44pt circular symbol buttons. */
function AccessoryBar({ accessories }: { accessories: MenuAccessory[] }) {
  return (
    <div data-slot="menu-accessories" className="flex h-16 shrink-0 items-start justify-between border-b border-separator px-4 pt-1 pb-4">
      {accessories.map((accessory) => (
        <Menu.Item
          key={accessory.id}
          data-slot="menu-item"
          aria-label={accessory.label}
          disabled={accessory.disabled}
          onClick={accessory.onSelect}
          className="flex size-11 items-center justify-center rounded-full outline-none data-disabled:opacity-40 [&_svg]:size-5"
        >
          <span aria-hidden>{accessory.icon}</span>
        </Menu.Item>
      ))}
    </div>
  );
}

/**
 * A pull-down menu: its glass grows out of the button (Fluid Kit Morph) and the button stays.
 * Where it opens is set with `side`, `align`, `sideOffset` and `cover`.
 */
function DropdownMenu({
  label,
  items,
  header,
  accessories,
  disabled = false,
  size = "regular",
  className,
  ...position
}: PopupPlacement & {
  label: string;
  items: MenuAction[];
  header?: string;
  accessories?: MenuAccessory[];
  disabled?: boolean;
  size?: "small" | "regular";
  className?: string;
}) {
  const popup = useMorphPopup();
  return (
    <Menu.Root {...popup.root}>
      <Menu.Trigger
        disabled={disabled}
        render={
          <Button
            variant="plain"
            size={size}
            className={cn("gap-[0.3125rem]", size === "regular" && "px-[1.125rem] text-title-2 font-bold", className)}
          />
        }
      >
        <MorphOrigin ref={popup.trigger} />
        {label}
        <ChevronDown
          aria-hidden
          strokeWidth={size === "regular" ? 2.75 : 2.5}
          className={size === "regular" ? "size-[1.625rem]" : "size-[1.375rem]"}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner {...placement(position)} className="z-50">
          <Menu.Popup ref={popup.popup} className={POPUP}>
            <Highlight items="[role^=menuitem]:not([data-disabled])" />
            {accessories?.length ? <AccessoryBar accessories={accessories} /> : null}
            {header ? (
              <Text variant="footnote" tone="secondary" className="mx-5 flex h-[3.125rem] items-center justify-center border-b border-separator">
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

export { DropdownMenu, placement };
export type { MenuAccessory, MenuAction, PopupPlacement };
