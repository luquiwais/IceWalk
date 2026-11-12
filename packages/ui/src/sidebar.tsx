"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { SurfaceScroll } from "./material";
import { Highlight } from "./selection";
import { Body } from "./text";
import { cn } from "./utils";

type SidebarProps = {
  /** Accessible name of the navigation landmark. */
  label: string;
  /** Large title at the top (Figma: Sidebar > Header). */
  title: React.ReactNode;
  titleId?: string;
  /** Trailing control in the header (Figma: Header and Button), e.g. <Button>Edit</Button>. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  inert?: boolean;
  "aria-hidden"?: boolean;
};

/*
 * visionOS sidebar (Figma: Sidebars): 320pt wide, Regular material with a
 * 0.5pt hairline on its trailing edge (rgb 84 84 88 / 65%).
 * Header (Figma: Header): 92pt, 28/20 side margins, Large Title in white.
 * Items: 56pt with 4pt between them.
 */
function Sidebar({ label, title, titleId, action, children, className, ...props }: SidebarProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      data-slot="sidebar"
      className={cn(
        "lb relative flex min-h-0 w-80 shrink-0 flex-col overflow-clip rounded-none shadow-[0.5px_0_0_0_rgb(84_84_88/0.65)]",
        className,
      )}
    >
      <SurfaceScroll className="relative isolate flex-1">
      <Highlight items="[data-slot='sidebar-item']:not(:disabled)" rest="[aria-current='page']" />
      <div className="flex h-23 shrink-0 items-center pr-5 pl-7">
        <h2
          id={titleId}
          className="min-w-0 flex-1 truncate font-display text-large-title leading-normal text-white"
        >
          {title}
        </h2>
        {action}
      </div>
      <ul className="flex flex-col gap-1 pb-3">{children}</ul>
      </SurfaceScroll>
    </nav>
  );
}

type SidebarSectionProps = {
  heading: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional symbol from the same icon family as the sidebar items. */
  disclosureIcon?: React.ReactNode;
};

/*
 * Section Header (Figma: Section Header, Open=True/False): 66pt with 12pt on
 * top, 24pt side margins; heading 20/25 semibold white, tracking -0.4; a 32pt
 * chevron (17pt symbol) that points down when open and right when closed.
 */
function SidebarSection({ heading, children, defaultOpen = true, disclosureIcon }: SidebarSectionProps) {
  return (
    <li className="-mt-1">
      <Collapsible.Root defaultOpen={defaultOpen} className="flex flex-col gap-1">
        <Collapsible.Trigger className="group flex h-[4.125rem] w-full items-center px-6 pt-3 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label">
          <span className="min-w-0 flex-1 truncate text-[1.25rem] leading-[1.5625rem] font-semibold tracking-[-0.025rem] text-white">
            {heading}
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center text-label transition-transform duration-200 ease-(--ease-spring) group-not-data-panel-open:-rotate-90">
            {disclosureIcon ?? <ChevronDown
              aria-hidden
              strokeWidth={2.25}
              className="size-5"
            />}
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel render={<ul />} className="ui-collapse flex flex-col gap-1">
          {children}
        </Collapsible.Panel>
      </Collapsible.Root>
    </li>
  );
}

type SidebarItemProps = {
  children: React.ReactNode;
  /** Leading symbol, tinted blue (Figma: Colors/Blue #0091FF). */
  icon?: React.ReactNode;
  /** Trailing count (Labels/Secondary). */
  counter?: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

/*
 * Sidebar Item (Figma: Sidebar Item, Accessory=Symbol): a 56pt row with 12pt
 * outer margin and a rounded-11 frame (padding 8/19, gap 8). Symbol box 32pt
 * wide (28pt symbol, 17pt font); label 17/19 regular, tracking -0.4.
 * States: Idle (no fill), Hover (platter + glow from the bottom),
 * Selected (white 7% normal + #5E5E5E 18% color-dodge).
 */
function SidebarItem({ children, icon, counter, current = false, disabled = false, onSelect }: SidebarItemProps) {
  return (
    <li className="px-3">
      <ButtonPrimitive
        data-slot="sidebar-item"
        onClick={onSelect}
        disabled={disabled}
        aria-current={current ? "page" : undefined}
        className="relative flex h-14 w-full items-center gap-2 rounded-sidebar-item pr-[1.1875rem] pl-2 text-left outline-none disabled:text-label-disabled"
      >
        {icon ? (
          <span className="flex h-14 w-8 shrink-0 items-center justify-center text-accent in-disabled:text-label-disabled [&_svg]:size-6">{icon}</span>
        ) : null}
        <Body as="span" weight="regular" className="min-w-0 flex-1 truncate leading-[1.1875rem] tracking-[-0.025rem] text-inherit">
          {children}
        </Body>
        {counter !== undefined ? (
          <Body as="span" tone="secondary" weight="regular" className="leading-[1.1875rem] tracking-[-0.025rem] tabular-nums">
            {counter}
          </Body>
        ) : null}
      </ButtonPrimitive>
    </li>
  );
}

export { Sidebar, SidebarItem, SidebarSection };
export type { SidebarItemProps, SidebarProps, SidebarSectionProps };
