"use client";

import { Button, IconButton } from "@icewalk/ui/button";
import { TextField } from "@icewalk/ui/fields";
import { Material, SurfaceScroll } from "@icewalk/ui/material";
import { Switch } from "@icewalk/ui/selection-controls";
import { MotionPresence } from "@icewalk/ui/motion";
import { Sidebar, SidebarItem, SidebarSection } from "@icewalk/ui/sidebar";
import { Text } from "@icewalk/ui/text";
import { NavigationBar, Window } from "@icewalk/ui/window";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ExternalLink,
  Grid2X2,
  Layers,
  ListChecks,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@icewalk/ui/utils";
import { FAMILIES, figmaLink } from "./playbook-data";
import { FamilySpecimens, OverviewSpecimens } from "./playbook-specimens";

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function selection() {
  const id = window.location.hash.slice(1);
  return id === "coverage" || FAMILIES.some((f) => f.id === id)
    ? id
    : "overview";
}
function subscribeCompact(callback: () => void) {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function Playbook() {
  const selected = useSyncExternalStore(subscribe, selection, () => "overview");
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia?.("(max-width: 760px)").matches ?? false,
    () => false,
  );
  const [query, setQuery] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [scene, setScene] = useState("night");
  const [mobileNav, setMobileNav] = useState(false);
  const [feedback, setFeedback] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const navOpenButton = useRef<HTMLButtonElement>(null);
  const navCloseButton = useRef<HTMLButtonElement>(null);
  function openNavigation() {
    setMobileNav(true);
    requestAnimationFrame(() => navCloseButton.current?.focus());
  }
  function closeNavigation() {
    setMobileNav(false);
    requestAnimationFrame(() => navOpenButton.current?.focus());
  }
  const family = FAMILIES.find((f) => f.id === selected);
  const matches = FAMILIES.filter((f) =>
    `${f.name} ${f.components} ${f.states}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function go(id: string) {
    window.location.hash = id;
    setMobileNav(false);
    setFeedback("");
    content.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }
  const name =
    selected === "overview"
      ? "The library"
      : selected === "coverage"
        ? "Component index"
        : (family?.name ?? "The library");
  return (
    <main
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileNav) {
          event.preventDefault();
          closeNavigation();
        }
      }}
      className="playbook relative flex h-dvh min-h-[32rem] flex-col items-center overflow-hidden px-8 pt-5 pb-3 text-label"
      style={{
        backgroundImage: `url(${scene === "day" ? "/reference/room-day.png" : "/reference/visionos-room.jpg"})`,
      }}
    >
      <a
        href="#playbook-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-black"
      >
        Skip to components
      </a>
      <div className="playbook-topline relative mb-5 flex w-full max-w-[100rem] shrink-0 items-center justify-between px-3">
        <Link
          href="/design"
          className="flex items-center gap-3 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-label"
          aria-label="visionOS playbook home"
          onClick={(event) => {
            event.preventDefault();
            go("overview");
          }}
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-white/30 bg-white/10">
            <Layers aria-hidden className="size-[1.1875rem]" />
          </span>
          <span className="text-body font-semibold tracking-[-0.02em]">
            visionOS{" "}
            <span className="ml-1 font-normal text-white/60">/ Playbook</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-footnote text-white/65 sm:flex">
            <span className="size-[0.3125rem] rounded-full bg-green-400" />
            30 families to explore
          </span>
          <a
            href={figmaLink("420:4149")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full px-3 py-2 text-footnote text-white/70 outline-none hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            Figma kit
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </div>
      </div>
      <Window
        data-nav-open={mobileNav ? "" : undefined}
        className="playbook-window h-full min-h-0 w-full max-w-[100rem] flex-1"
      >
        <Sidebar
          inert={compact && !mobileNav}
          aria-hidden={compact && !mobileNav}
          label="Component library"
          title="Playbook"
          titleId="library-nav-title"
          className={cn("playbook-sidebar w-72", mobileNav && "is-open")}
          action={
            <IconButton
              ref={navCloseButton}
              label="Close navigation"
              size="small"
              variant="plain"
              className="playbook-nav-close hidden"
              onClick={closeNavigation}
            >
              <X aria-hidden />
            </IconButton>
          }
        >
          <li className="px-5 pb-4">
            <TextField
              label="Find components"
              placeholder="Find components"
              value={query}
              onValueChange={setQuery}
              className="w-full"
            />
          </li>
          <SidebarItem
            icon={<Grid2X2 />}
            current={selected === "overview"}
            onSelect={() => go("overview")}
          >
            Overview
          </SidebarItem>
          <SidebarItem
            icon={<ListChecks />}
            current={selected === "coverage"}
            counter={30}
            onSelect={() => go("coverage")}
          >
            Component index
          </SidebarItem>
          {(["Foundations", "Controls", "Navigation", "System"] as const).map(
            (group) => {
              const items = matches.filter((f) => f.group === group);
              return items.length ? (
                <SidebarSection key={group} heading={group}>
                  {items.map(({ id, name, icon: Icon }) => (
                    <SidebarItem
                      key={id}
                      icon={<Icon aria-hidden strokeWidth={1.8} />}
                      current={selected === id}
                      onSelect={() => go(id)}
                    >
                      {name}
                    </SidebarItem>
                  ))}
                </SidebarSection>
              ) : null;
            },
          )}
          {!matches.length ? (
            <li className="px-7 py-5">
              <Text tone="secondary" variant="subheadline">
                No components found.
              </Text>
              <Button variant="plain" size="small" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </li>
          ) : null}
          <li className="px-7 pt-6 pb-3">
            <Text variant="caption-1" tone="tertiary">
              visionOS 26 · Community kit
              <br />
              Lucide symbols · Dark appearance
            </Text>
          </li>
        </Sidebar>
        <div
          inert={compact && mobileNav}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <div ref={heading} tabIndex={-1} className="outline-none">
            <NavigationBar
              title={name}
              titleAlign="leading"
              level={1}
              className="playbook-heading h-22 px-9"
              leading={
                <IconButton
                  ref={navOpenButton}
                  label="Open navigation"
                  aria-expanded={mobileNav}
                  aria-controls="library-nav-title"
                  variant="plain"
                  className="playbook-nav-open hidden"
                  onClick={openNavigation}
                >
                  <Menu aria-hidden />
                </IconButton>
              }
              trailing={
                <div className="flex items-center gap-4">
                  <Switch
                    label="Disabled"
                    checked={disabled}
                    onCheckedChange={setDisabled}
                    className="playbook-disabled text-footnote"
                  />
                  <IconButton
                    label={
                      scene === "night"
                        ? "Use day environment"
                        : "Use night environment"
                    }
                    variant="plain"
                    onClick={() =>
                      setScene(scene === "night" ? "day" : "night")
                    }
                  >
                    {scene === "night" ? (
                      <Moon aria-hidden />
                    ) : (
                      <Sun aria-hidden />
                    )}
                  </IconButton>
                </div>
              }
            />
          </div>
          <SurfaceScroll
            key={selected}
            id="playbook-content"
            ref={content}
            className="playbook-content vision-motion-enter relative flex-1 px-9 pb-10"
            tabIndex={-1}
          >
            {selected === "overview" ? (
              <>
                <section className="pt-6 pb-9">
                  <Text
                    variant="caption-1"
                    className="mb-4 font-semibold tracking-[0.13em] text-white/55 uppercase"
                  >
                    A spatial component library
                  </Text>
                  <Text
                    as="h2"
                    variant="xl-title-1"
                    className="max-w-[38rem] tracking-[-0.035em]"
                  >
                    A new dimension.
                    <br />
                    <span className="text-white/55">Every little detail.</span>
                  </Text>
                  <Text
                    tone="secondary"
                    className="mt-5 max-w-[34rem] text-[1.125rem] leading-7"
                  >
                    Explore the materials, controls and patterns that make a
                    space feel familiar.
                  </Text>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => go("materials")} disabled={disabled}>
                      Explore components
                      <ArrowDownRight aria-hidden />
                    </Button>
                    <Button
                      variant="plain"
                      onClick={() => go("coverage")}
                      disabled={disabled}
                    >
                      View component index
                      <ChevronRight aria-hidden />
                    </Button>
                  </div>
                </section>
                <OverviewSpecimens disabled={disabled} notify={setFeedback} />
                <div className="mt-10 mb-5 flex items-end justify-between gap-4">
                  <div>
                    <Text as="h2" variant="title-1">
                      A place for everything.
                    </Text>
                    <Text tone="secondary" className="mt-1">
                      30 families, from the foundation to the finishing touch.
                    </Text>
                  </div>
                  <Button
                    variant="plain"
                    size="small"
                    onClick={() => go("coverage")}
                  >
                    View all
                    <ArrowUpRight aria-hidden />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {(
                    ["Foundations", "Controls", "Navigation", "System"] as const
                  ).map((group) => {
                    const families = FAMILIES.filter((f) => f.group === group);
                    const Icon = families[0].icon;
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => go(families[0].id)}
                        className="group text-left outline-none focus-visible:rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <Material
                          kind="platter"
                          className="flex h-44 flex-col justify-between rounded-[1.5rem] p-5"
                        >
                          <Icon
                            aria-hidden
                            className="relative size-6 text-white/70"
                          />
                          <div className="relative flex items-end justify-between gap-2">
                            <div>
                              <Text variant="headline">{group}</Text>
                              <Text variant="footnote" tone="secondary">
                                {families.length} families
                              </Text>
                            </div>
                            <ArrowUpRight
                              aria-hidden
                              className="size-4 text-white/45 group-hover:text-white"
                            />
                          </div>
                        </Material>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
                  <Text variant="footnote" tone="secondary">
                    Built with the same components you see here.
                  </Text>
                  <Link
                    href="/design/reference"
                    className="flex items-center gap-2 text-footnote text-white/65 hover:text-white"
                  >
                    Open the Figma reference scene
                    <ExternalLink aria-hidden className="size-3.5" />
                  </Link>
                </div>
              </>
            ) : selected === "coverage" ? (
              <>
                <div className="pt-5 pb-8">
                  <Text as="h2" variant="title-1">
                    All 30 source families.
                  </Text>
                  <Text tone="secondary" className="mt-2 max-w-[43rem]">
                    Every family has a live example or an original platform
                    resource. The states below describe what is demonstrated;
                    they are not a claim of pixel parity for every Figma
                    variant.
                  </Text>
                </div>
                <div className="space-y-3">
                  {FAMILIES.map(
                    (
                      { id, name, icon: Icon, group, components, states, node },
                      index,
                    ) => (
                      <Material
                        key={id}
                        kind="regular"
                        className="flex flex-wrap items-center gap-4 rounded-[1.5rem] p-5"
                      >
                        <span className="relative w-6 text-caption-1 text-white/35 tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Icon
                          aria-hidden
                          className="relative size-5 text-white/65"
                        />
                        <button
                          type="button"
                          onClick={() => go(id)}
                          className="relative min-w-0 flex-1 text-left outline-none focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <Text variant="headline">
                            {name}
                            <span className="ml-3 text-caption-1 font-normal text-white/40">
                              {group}
                            </span>
                          </Text>
                          <Text
                            variant="footnote"
                            tone="secondary"
                            className="mt-1"
                          >
                            {components}
                          </Text>
                          <Text
                            variant="caption-1"
                            tone="tertiary"
                            className="mt-1"
                          >
                            {states}
                          </Text>
                        </button>
                        <a
                          href={figmaLink(node)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Figma source: ${name}`}
                          className="relative rounded-full p-3 text-white/50 outline-none hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <ArrowUpRight aria-hidden className="size-4" />
                        </a>
                        <span className="relative flex items-center gap-1 text-caption-1 text-white/50">
                          <Check aria-hidden className="size-3" />
                          {id === "gestures" || id === "backgrounds"
                            ? "Resource"
                            : "Live example"}
                        </span>
                      </Material>
                    ),
                  )}
                </div>
              </>
            ) : family ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 pt-4 pb-8">
                  <div>
                    <Text
                      variant="caption-1"
                      tone="secondary"
                      className="mb-2 tracking-wider uppercase"
                    >
                      {family.group}
                    </Text>
                    <Text as="h2" variant="title-1">
                      {family.name}
                    </Text>
                    <Text tone="secondary" className="mt-2 max-w-[41rem]">
                      {family.states}
                    </Text>
                  </div>
                  <a
                    href={figmaLink(family.node)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-footnote text-white/65 outline-none hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    Source
                    <ArrowUpRight aria-hidden className="size-3.5" />
                  </a>
                </div>
                <FamilySpecimens
                  key={family.id}
                  family={family.id}
                  disabled={disabled}
                  notify={setFeedback}
                  scene={scene}
                  onSceneChange={setScene}
                />
                <div className="mt-10 border-t border-white/10 pt-5">
                  <Text variant="caption-1" tone="tertiary">
                    {family.components} · Use pointer or keyboard to inspect
                    hover, focus and active states.
                  </Text>
                </div>
              </>
            ) : null}
          </SurfaceScroll>
        </div>
      </Window>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute right-10 bottom-14 z-30 max-w-[calc(100vw-3rem)]"
      >
        <MotionPresence present={Boolean(feedback)}>
          <Material
            kind="glass"
            className="pointer-events-auto flex items-center gap-5 rounded-full py-3 pr-2 pl-5"
          >
            <Text variant="callout">{feedback}</Text>
            <IconButton
              label="Dismiss feedback"
              size="small"
              variant="plain"
              showTooltip={false}
              onClick={() => setFeedback("")}
            >
              <X aria-hidden />
            </IconButton>
          </Material>
        </MotionPresence>
      </div>
    </main>
  );
}
