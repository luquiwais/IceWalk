"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "./button";
import { MaterialLayers } from "./material";
import { cn } from "./utils";
import { Text } from "./text";
import { Vibrancy } from "./vibrancy";

/** Figma Context Menu: 280 wide, radius 28, 12 pt padding, 8 pt between rows. */
const POPUP =
  "vision-surface vision-popup-glass relative flex w-70 flex-col gap-2 rounded-[1.75rem] p-3 text-label outline-none [--glass-stroke-width:1.4px] [--glass-stroke-angle:150.286deg] [--glass-stroke-start:0%] [--glass-stroke-fade:40.569%] [--glass-stroke-rise:57.437%] [--glass-stroke-end:100%]";

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

/** Icon-only action in the accessory bar above a context menu's rows. */
type MenuAccessory = {
  id: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
};

/*
 * Menu Item (Figma 487:11315 and siblings): 256x56, radius 16, 12 pt side
 * padding (20 leading without a checkmark column). Idle has no platter; hover,
 * highlight and pinch paints live in theme.css under [data-slot="menu-item"].
 */
const ITEM =
  "vision-control vision-surface relative flex min-h-14 w-full items-center rounded-2xl pr-3 text-body outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label";

function ActionContent({ item, selectable }: { item: MenuAction; selectable: boolean }) {
  return (
    <>
      {selectable ? (
        <span data-slot="menu-check" className="menu-item-main flex w-[1.4375rem] shrink-0 items-center">
          {item.checked ? (
            <Check aria-hidden strokeWidth={2.5} className="size-[1.0625rem]" />
          ) : null}
        </span>
      ) : null}
      <span className="menu-item-main min-w-0 flex-1 py-[0.6875rem]">
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
          className="menu-item-main flex w-[1.625rem] shrink-0 items-center justify-center [&_svg]:size-[1.125rem]"
        >
          {item.icon}
        </span>
      ) : null}
      {item.items ? (
        <span aria-hidden className="flex w-3 shrink-0 items-center justify-center">
          <Vibrancy tone="tertiary"><ChevronRight strokeWidth={2.25} className="size-[1.1875rem]" /></Vibrancy>
        </span>
      ) : null}
    </>
  );
}

/** The kit's Section Header: a hairline, then a 13 pt bold secondary label. */
function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div role="presentation" data-slot="menu-section" className="flex h-[2.9375rem] shrink-0 px-2 pt-2">
      <Text variant="footnote" weight="bold" tone="secondary" className="w-full border-t border-separator px-3 pt-[1.25rem]">
        {children}
      </Text>
    </div>
  );
}

function ItemSurface() {
  return <MaterialLayers kind="platter" />;
}

function MenuActions({ items }: { items: MenuAction[] }) {
  const selectable = items.some((item) => item.checked !== undefined);
  return items.map((item) => (
    <Fragment key={item.id}>
      {item.section ? <SectionHeader>{item.section}</SectionHeader> : null}
      {item.items ? (
        <Menu.SubmenuRoot>
          <Menu.SubmenuTrigger
            data-slot="menu-item"
            data-platter="false"
            className={cn(ITEM, selectable ? "pl-3" : "pl-5")}
          >
            <ItemSurface />
            <ActionContent item={item} selectable={selectable} />
          </Menu.SubmenuTrigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} className="z-50">
              <Menu.Popup className={POPUP}>
                <MaterialLayers kind="glass" />
                <MenuActions items={item.items} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.SubmenuRoot>
      ) : (
        <Menu.Item
          data-slot="menu-item"
          data-platter="false"
          disabled={item.disabled}
          onClick={item.onSelect}
          className={cn(ITEM, selectable ? "pl-3" : "pl-5", item.destructive && "text-red-400")}
        >
          <ItemSurface />
          <ActionContent item={item} selectable={selectable} />
        </Menu.Item>
      )}
    </Fragment>
  ));
}

/** Figma "Context Menu - Accessory Items": 64pt bar of 44pt circular symbol buttons. */
function AccessoryBar({ accessories }: { accessories: MenuAccessory[] }) {
  return (
    <div
      data-slot="menu-accessories"
      className="flex h-16 shrink-0 items-start justify-between border-b border-separator px-4 pt-1 pb-4"
    >
      {accessories.map((accessory) => (
        <Menu.Item
          key={accessory.id}
          data-slot="menu-item"
          data-platter="false"
          aria-label={accessory.label}
          disabled={accessory.disabled}
          onClick={accessory.onSelect}
          className="vision-control vision-surface relative flex size-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-label [&_svg]:size-5"
        >
          <ItemSurface />
          <span aria-hidden className="menu-item-main">{accessory.icon}</span>
        </Menu.Item>
      ))}
    </div>
  );
}

/** Figma dropdown + context menu: 280pt, 28pt corners, 56pt rows. */
function DropdownMenu({
  label,
  items,
  header,
  accessories,
  disabled = false,
  size = "regular",
  className,
}: {
  label: string;
  items: MenuAction[];
  header?: string;
  accessories?: MenuAccessory[];
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
        <ChevronDown
          aria-hidden
          strokeWidth={size === "regular" ? 2.75 : 2.5}
          className={size === "regular" ? "size-[1.625rem]" : "size-[1.375rem]"}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start" className="z-50">
          <Menu.Popup className={cn(POPUP, "max-w-[calc(100vw-2rem)] shadow-2xl")}>
            <MaterialLayers kind="glass" />
            {accessories?.length ? <AccessoryBar accessories={accessories} /> : null}
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
export type { MenuAccessory, MenuAction };
