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
  id?: string;
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
 * iPadOS 26/27 sidebar: a floating glass panel. The chosen row sits on a thumb that glides between
 * rows (Fluid Kit Indicator).
 */
function Sidebar({ label, title, titleId, action, children, className, ...props }: SidebarProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      data-slot="sidebar"
      className={cn(
        "lb ui-panel relative flex min-h-0 w-80 shrink-0 flex-col overflow-clip",
        className,
      )}
    >
      <SurfaceScroll className="relative isolate flex-1">
      <Highlight variant="tabs" items="[data-slot='sidebar-item']:not(:disabled)" rest="[aria-current='page']" />
      <div className="flex min-h-20 shrink-0 items-center gap-2 px-5 pt-3 pb-2">
        <h2
          id={titleId}
          className="min-w-0 flex-1 truncate font-display text-title-1 text-label"
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
    <li className="pt-3">
      <Collapsible.Root defaultOpen={defaultOpen} className="flex flex-col gap-1">
        <Collapsible.Trigger className="group flex min-h-11 w-full items-center px-5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label">
          <span className="min-w-0 flex-1 truncate text-footnote font-semibold text-label-secondary">
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
        className="relative flex min-h-11 w-full items-center gap-2 rounded-sidebar-item py-2 pr-3 pl-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label disabled:text-label-disabled"
      >
        {icon ? (
          <span className={cn("flex w-7 shrink-0 items-center justify-center [&_svg]:size-5", current ? "text-accent" : "text-label-secondary", disabled && "text-label-disabled")}>{icon}</span>
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
