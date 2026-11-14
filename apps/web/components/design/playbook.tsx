"use client";

import { Button, IconButton } from "@icewalk/ui/button";
import { TextField } from "@icewalk/ui/fields";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Material, SurfaceScroll } from "@icewalk/ui/material";
import { Presence } from "@icewalk/ui/motion";
import { Switch } from "@icewalk/ui/selection-controls";
import { Sidebar, SidebarItem, SidebarSection } from "@icewalk/ui/sidebar";
import { Text } from "@icewalk/ui/text";
import { NavigationBar } from "@icewalk/ui/window";
import {
  ArrowUpRight,
  ChevronRight,
  ExternalLink,
  Grid2X2,
  ListChecks,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@icewalk/ui/utils";
import { FAMILIES } from "./playbook-data";
import { FamilySpecimens, OverviewSpecimens } from "./playbook-specimens";
import { InputSpecimens } from "./playbook-input-specimens";
import { WindowTransitions } from "./window-transitions";

const PAGE_FRAME = "mx-auto w-full max-w-240 px-4 lg:px-6";

const GROUPS = ["Foundations", "Controls", "Navigation", "System"] as const;

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function selection() {
  const id = window.location.hash.slice(1);
  return id === "coverage" || FAMILIES.some((family) => family.id === id)
    ? id
    : "overview";
}
function subscribeCompact(callback: () => void) {
  const media = window.matchMedia?.("(width < 48rem)");
  media?.addEventListener("change", callback);
  return () => media?.removeEventListener("change", callback);
}

export function Playbook() {
  const selected = useSyncExternalStore(subscribe, selection, () => "overview");
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia?.("(width < 48rem)").matches ?? false,
    () => false,
  );
  const [appearance, setAppearance] = useState<"light" | "dark">("dark");
  const [query, setQuery] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [feedback, setFeedback] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const navOpenButton = useRef<HTMLButtonElement>(null);
  const navCloseButton = useRef<HTMLButtonElement>(null);

  // Theme the document so Base UI portals and Fluid Kit share the same appearance.
  // Restore the host app's theme when this preview unmounts.
  useEffect(() => {
    const root = document.documentElement;
    const previous = {
      theme: root.getAttribute("data-theme"),
      dark: root.classList.contains("dark"),
      scheme: root.style.colorScheme,
    };
    root.dataset.theme = appearance;
    root.classList.toggle("dark", appearance === "dark");
    root.style.colorScheme = appearance;
    return () => {
      if (previous.theme === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previous.theme);
      root.classList.toggle("dark", previous.dark);
      root.style.colorScheme = previous.scheme;
    };
  }, [appearance]);

  function openNavigation() {
    setMobileNav(true);
    requestAnimationFrame(() => navCloseButton.current?.focus());
  }
  function closeNavigation() {
    setMobileNav(false);
    requestAnimationFrame(() => navOpenButton.current?.focus());
  }
  const family = FAMILIES.find((item) => item.id === selected);
  const matches = FAMILIES.filter((item) =>
    `${item.name} ${item.components} ${item.states}`
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
      ? "Components"
      : selected === "coverage"
        ? "Component index"
        : (family?.name ?? "Components");

  return (
    <main
      className="playbook relative flex h-dvh min-h-0 gap-2 overflow-hidden bg-grouped text-label md:p-2 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-label [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-label"
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileNav) {
          event.preventDefault();
          closeNavigation();
        }
      }}
    >
      <a
        href="#playbook-content"
        className="sr-only focus:bg-label focus:text-surface focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-5 focus:py-3"
      >
        Skip to components
      </a>
      <Sidebar
        id="playbook-navigation"
        inert={compact && !mobileNav}
        aria-hidden={compact && !mobileNav}
        label="Component library"
        title="IceWalk UI"
        titleId="library-nav-title"
        className={cn(
          "absolute inset-y-2 start-2 z-20 w-[calc(100%-1rem)] max-w-72 rounded-3xl md:relative md:inset-auto md:z-auto md:w-64",
          !mobileNav && "hidden md:flex",
        )}
        action={
          <IconButton
            ref={navCloseButton}
            label="Close navigation"
            variant="plain"
            className="md:hidden"
            onClick={closeNavigation}
          >
            <X aria-hidden />
          </IconButton>
        }
      >
        <li className="px-5 pt-1 pb-3">
          <TextField
            label="Find components"
            placeholder="Search"
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
          counter={FAMILIES.length}
          onSelect={() => go("coverage")}
        >
          Component index
        </SidebarItem>
        {GROUPS.map((group) => {
          const items = matches.filter((item) => item.group === group);
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
        })}
        {!matches.length ? (
          <li className="px-5 py-4">
            <Text tone="secondary" variant="subheadline">
              No components found.
            </Text>
            <Button variant="plain" size="small" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </li>
        ) : null}
        <li className="px-5 pt-6 pb-3">
          <Text variant="footnote" tone="secondary">
            iOS 27 · iPadOS 27
          </Text>
        </li>
      </Sidebar>
      <div
        inert={compact && mobileNav}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div
          ref={heading}
          tabIndex={-1}
          className={cn(
            PAGE_FRAME,
            "pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 outline-none md:pt-0",
          )}
        >
          <NavigationBar
            title={name}
            titleAlign="leading"
            level={1}
            className="px-0 [&_h1]:text-title-2"
            leading={
              <IconButton
                ref={navOpenButton}
                label="Open navigation"
                aria-expanded={mobileNav}
                aria-controls="playbook-navigation"
                variant="glass"
                className="md:hidden"
                onClick={openNavigation}
              >
                <Menu aria-hidden />
              </IconButton>
            }
            trailing={
              <div className="flex items-center gap-2">
                <IconButton
                  label={
                    appearance === "dark"
                      ? "Use light appearance"
                      : "Use dark appearance"
                  }
                  variant="glass"
                  onClick={() =>
                    setAppearance(appearance === "dark" ? "light" : "dark")
                  }
                >
                  {appearance === "dark" ? (
                    <Sun aria-hidden />
                  ) : (
                    <Moon aria-hidden />
                  )}
                </IconButton>
                <div className="lb flex min-h-11 items-center rounded-full px-3">
                  <Switch
                    label="Disabled"
                    checked={disabled}
                    onCheckedChange={setDisabled}
                    className="min-h-0 text-footnote"
                  />
                </div>
              </div>
            }
          />
        </div>
        <SurfaceScroll
          key={selected}
          id="playbook-content"
          ref={content}
          className="relative flex-1 [scrollbar-color:var(--color-fill)_transparent] [scrollbar-width:thin]"
          tabIndex={-1}
        >
          <div
            className={cn(
              PAGE_FRAME,
              "@container pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            )}
          >
            {selected === "overview" ? (
              <>
                <div className="pt-1 pb-4">
                  <Text
                    variant="subheadline"
                    tone="secondary"
                    className="max-w-prose"
                  >
                    A working library of controls, navigation and presentations,
                    organized around Apple’s Human Interface Guidelines.
                  </Text>
                </div>
                <section aria-labelledby="library-sections" className="mb-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Text as="h2" id="library-sections" variant="headline">
                      Browse components
                    </Text>
                    <Button variant="plain" onClick={() => go("coverage")}>
                      View all <ChevronRight aria-hidden />
                    </Button>
                  </div>
                  <ListSection>
                    {GROUPS.map((group) => {
                      const families = FAMILIES.filter(
                        (item) => item.group === group,
                      );
                      const Icon = families[0].icon;
                      return (
                        <ListRow
                          key={group}
                          onClick={() => go(families[0].id)}
                          trailing={
                            <Text as="span" tone="secondary">
                              {families.length}
                            </Text>
                          }
                        >
                          <Icon
                            aria-hidden
                            className="size-5 shrink-0 text-label-secondary"
                          />
                          <Text as="span">{group}</Text>
                        </ListRow>
                      );
                    })}
                  </ListSection>
                </section>
                <section aria-labelledby="library-examples">
                  <Text
                    as="h2"
                    id="library-examples"
                    variant="headline"
                    className="mb-4"
                  >
                    In context
                  </Text>
                  <OverviewSpecimens disabled={disabled} notify={setFeedback} />
                </section>
                <footer className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-2">
                  <Text variant="footnote" tone="secondary">
                    System backgrounds for content. Liquid Glass for the
                    controls above it.
                  </Text>
                  <a
                    href="https://developer.apple.com/design/human-interface-guidelines"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-footnote text-label underline underline-offset-4"
                  >
                    Apple design guidelines{" "}
                    <ExternalLink aria-hidden className="size-4" />
                  </a>
                </footer>
              </>
            ) : selected === "coverage" ? (
              <>
                <div className="pt-1 pb-4">
                  <Text variant="subheadline" tone="secondary">
                    {FAMILIES.length} families. Open an example to explore its
                    behavior, or read its design guidance.
                  </Text>
                </div>
                {GROUPS.map((group) => (
                  <section key={group} className="mb-6" aria-label={group}>
                    <Text as="h2" variant="headline" className="mb-3">
                      {group}
                    </Text>
                    <div className="overflow-clip rounded-row bg-grouped-secondary divide-y divide-separator">
                      {FAMILIES.filter((item) => item.group === group).map(
                        ({ id, name, icon: Icon, states, ref }) => (
                          <div
                            key={id}
                            className="flex items-center gap-3 py-1 pr-2 pl-4"
                          >
                            <Icon
                              aria-hidden
                              className="size-5 shrink-0 text-label-secondary"
                            />
                            <button
                              type="button"
                              onClick={() => go(id)}
                              className="py-2 min-w-0 flex-1 text-left"
                            >
                              <Text variant="body">{name}</Text>
                              <Text
                                variant="footnote"
                                tone="secondary"
                                className="mt-1"
                              >
                                {states}
                              </Text>
                            </button>
                            <a
                              href={ref}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Guidelines: ${name}`}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-label-secondary"
                            >
                              <ArrowUpRight aria-hidden className="size-5" />
                            </a>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                ))}
              </>
            ) : family ? (
              <>
                <div className="pt-1 pb-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-prose">
                    <Text variant="footnote" tone="secondary" className="mb-1">
                      {family.group}
                    </Text>
                    <Text variant="subheadline" tone="secondary">
                      {family.states}
                    </Text>
                  </div>
                  <a
                    href={family.ref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-footnote text-label underline underline-offset-4"
                  >
                    {family.ref.includes("fluidkit")
                      ? "Fluid Kit"
                      : "Guidelines"}
                    <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                </div>
                <h2 className="sr-only">Examples</h2>
                {family.id === "input-controls" ? (
                  <InputSpecimens disabled={disabled} />
                ) : family.id === "window-transitions" ? (
                  <WindowTransitions />
                ) : (
                  <FamilySpecimens
                    key={family.id}
                    family={family.id}
                    disabled={disabled}
                    notify={setFeedback}
                  />
                )}
                <footer className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-2">
                  <Text variant="footnote" tone="secondary">
                    {family.components}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    Use the pointer or keyboard to try each example.
                  </Text>
                </footer>
              </>
            ) : null}
          </div>
        </SurfaceScroll>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute right-6 bottom-6 z-30 max-w-[calc(100vw-3rem)]"
      >
        <Presence present={Boolean(feedback)}>
          <Material
            kind="glass"
            className="pointer-events-auto flex items-center gap-4 rounded-full py-2 pr-2 pl-5"
          >
            <Text variant="callout">{feedback}</Text>
            <IconButton
              label="Dismiss feedback"
              variant="plain"
              showTooltip={false}
              onClick={() => setFeedback("")}
            >
              <X aria-hidden />
            </IconButton>
          </Material>
        </Presence>
      </div>
    </main>
  );
}
