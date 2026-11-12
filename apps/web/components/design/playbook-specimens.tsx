"use client";

import { AppIcon } from "@icewalk/ui/app-icon";
import { Button, IconButton } from "@icewalk/ui/button";
import { TextField } from "@icewalk/ui/fields";
import {
  ActivityIndicator,
  PageControl,
  ProgressBar,
} from "@icewalk/ui/indicators";
import { Keyboard } from "@icewalk/ui/keyboard";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Material, type MaterialKind } from "@icewalk/ui/material";
import { DropdownMenu, type MenuAction } from "@icewalk/ui/menu";
import { Ornament, OrnamentItem } from "@icewalk/ui/ornament";
import {
  Calendar,
  ColorPicker,
  DatePicker,
  TimePicker,
} from "@icewalk/ui/pickers";
import { SearchToken } from "@icewalk/ui/search-token";
import { Checkbox, Switch } from "@icewalk/ui/selection-controls";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { ShareSheet } from "@icewalk/ui/share-sheet";
import { Sidebar, SidebarItem, SidebarSection } from "@icewalk/ui/sidebar";
import { Slider } from "@icewalk/ui/slider";
import {
  Alert,
  Notification,
  SharePlayActivity,
  SystemDialog,
  TemporaryNotice,
} from "@icewalk/ui/system-surfaces";
import { TabBar } from "@icewalk/ui/tab-bar";
import { Text, type TextVariant } from "@icewalk/ui/text";
import { ToggleButton } from "@icewalk/ui/toggle-button";
import { Tooltip } from "@icewalk/ui/tooltip";
import { NavigationBar, Window, WindowControls } from "@icewalk/ui/window";
import {
  Airplay,
  ChevronLeft,
  Copy,
  Download,
  Ellipsis,
  Folder,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  Layers,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Printer,
  Scissors,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Video,
  Volume1,
  Volume2,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import Image from "next/image";

export function Specimen({
  title,
  detail,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`playbook-specimen relative min-w-0 ${className}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4">
        <Text as="h3" variant="subheadline" weight="semibold">
          {title}
        </Text>
        {detail ? (
          <Text variant="caption-1" tone="secondary" className="text-right">
            {detail}
          </Text>
        ) : null}
      </div>
      <div className="playbook-stage relative flex w-full min-w-0 flex-wrap items-center gap-3 rounded-2xl bg-grouped-secondary p-4 [&>*]:max-w-full">
        {children}
      </div>
    </section>
  );
}

const TYPE_STYLES: TextVariant[] = [
  "xl-title-1",
  "xl-title-2",
  "large-title",
  "title-1",
  "title-2",
  "title-3",
  "headline",
  "body",
  "callout",
  "subheadline",
  "footnote",
  "caption-1",
  "caption-2",
];
const PALETTE = [
  ["Red", "var(--color-system-red)"],
  ["Orange", "var(--color-system-orange)"],
  ["Yellow", "var(--color-system-yellow)"],
  ["Green", "var(--color-system-green)"],
  ["Mint", "var(--color-system-mint)"],
  ["Teal", "var(--color-system-teal)"],
  ["Cyan", "var(--color-system-cyan)"],
  ["Blue", "var(--color-system-blue)"],
  ["Indigo", "var(--color-system-indigo)"],
  ["Purple", "var(--color-system-purple)"],
  ["Pink", "var(--color-system-pink)"],
  ["Brown", "var(--color-system-brown)"],
  ["Gray", "var(--color-system-gray)"],
];

export function FamilySpecimens({
  family,
  disabled,
  notify,
}: {
  family: string;
  disabled: boolean;
  notify: (text: string) => void;
}) {
  const [value, setValue] = useState(50);
  const [selected, setSelected] = useState("first");
  const [date, setDate] = useState("2026-11-08");
  const [time, setTime] = useState("09:41");
  const [color, setColor] = useState("#ff4015");
  const [page, setPage] = useState(1);
  const [text, setText] = useState("Hello");
  const [tokens, setTokens] = useState(["Design", "Favorites", "This week"]);
  const [notice, setNotice] = useState(true);
  const [notification, setNotification] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState("library");
  const options = [
    { value: "first", label: "First" },
    { value: "second", label: "Second" },
    { value: "third", label: "Third" },
  ];
  const actions: MenuAction[] = [
    {
      id: "open",
      label: "Open",
      subtitle: "Open in a new window",
      icon: <Folder />,
      onSelect: () => notify("Opened example"),
    },
    {
      id: "favorite",
      label: "Favorite",
      checked: selected === "first",
      icon: <Heart />,
      onSelect: () => {
        setSelected(selected === "first" ? "second" : "first");
        notify("Favorite changed");
      },
    },
    {
      id: "sort",
      label: "Sort by",
      section: "Organize",
      items: ["Name", "Date", "Size"].map((name) => ({
        id: name,
        label: name,
        onSelect: () => notify(`Sorted by ${name}`),
      })),
    },
    { id: "copy", label: "Copy", icon: <Copy />, disabled: true },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 />,
      destructive: true,
      onSelect: () => notify("Delete action selected in example"),
    },
  ];
  const tabs = [
    { value: "library", label: "Library", icon: <Grid2X2 /> },
    { value: "favorites", label: "Favorites", icon: <Heart /> },
    { value: "shared", label: "Shared", icon: <Users /> },
  ];
  const click = (name: string) => () => notify(`${name} selected`);
  const title = (
    name: string,
    detail: string,
    children: ReactNode,
    className?: string,
  ) => (
    <Specimen title={name} detail={detail} className={className}>
      {children}
    </Specimen>
  );

  switch (family) {
    case "colors":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {title(
            "System colors",
            "Adapts to appearance",
            <div className="grid w-full grid-cols-3 gap-4 sm:grid-cols-4 @3xl:grid-cols-7">
              {PALETTE.map(([name, fill]) => (
                <div key={name}>
                  <span
                    className="mb-2 block h-12 rounded-xl"
                    style={{ background: fill }}
                  />
                  <Text variant="callout">{name}</Text>
                  <Text variant="caption-1" tone="secondary">
                    {`system${name}`}
                  </Text>
                </div>
              ))}
            </div>,
            "@3xl:col-span-2",
          )}
          {title(
            "Semantic labels",
            "Primary content and supporting information",
            <div className="space-y-4">
              {(["primary", "secondary", "tertiary", "disabled"] as const).map(
                (tone) => (
                  <Text key={tone} variant="title-2" tone={tone}>
                    {tone[0].toUpperCase() + tone.slice(1)} label
                  </Text>
                ),
              )}
            </div>,
          )}
          {title(
            "Selection & emphasis",
            "State has meaning",
            <>
              <ToggleButton pressed disabled={disabled}>
                Selected
              </ToggleButton>
              <Button disabled>Disabled</Button>
              <AppIcon label="Accent" color="#0091ff">
                <Sparkles />
              </AppIcon>
            </>,
          )}
        </div>
      );
    case "materials":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {(["glass", "regular", "recessed", "platter"] as MaterialKind[]).map(
            (kind) => (
              <Specimen
                key={kind}
                title={
                  kind === "glass"
                    ? "Floating navigation"
                    : kind[0].toUpperCase() + kind.slice(1)
                }
                detail={
                  kind === "glass"
                    ? "Liquid Glass for controls"
                    : "Standard surface in the content layer"
                }
              >
                {kind === "glass" ? (
                  <div className="flex min-h-40 w-full flex-col justify-between gap-4 rounded-2xl bg-surface p-4">
                    <Text variant="title-2">Station library</Text>
                    <Ornament aria-label="Station actions">
                      <IconButton
                        label="Add station"
                        variant="plain"
                        disabled={disabled}
                        onClick={click("Add station")}
                      >
                        <Plus aria-hidden />
                      </IconButton>
                      <IconButton
                        label="Share stations"
                        variant="plain"
                        disabled={disabled}
                        onClick={click("Share stations")}
                      >
                        <Share2 aria-hidden />
                      </IconButton>
                    </Ornament>
                  </div>
                ) : (
                  <Material
                    kind={kind}
                    className="flex min-h-40 w-full flex-col justify-between gap-4 rounded-2xl p-4"
                  >
                    <Text variant="title-2">Content comes first.</Text>
                    <Text tone="secondary">
                      Labels and fills follow the current appearance.
                    </Text>
                    <Button
                      disabled={disabled}
                      onClick={click(kind)}
                      className="self-start"
                    >
                      Explore
                    </Button>
                  </Material>
                )}
              </Specimen>
            ),
          )}
          {title(
            "Scroll a surface",
            "Material stays in place",
            <Material
              kind="regular"
              scrollable="vertical"
              className="h-48 w-full rounded-[2rem]"
            >
              <div className="space-y-3 p-4">
                {Array.from({ length: 12 }, (_, i) => (
                  <Text key={i}>Stationary material · Row {i + 1}</Text>
                ))}
              </div>
            </Material>,
            "@3xl:col-span-2",
          )}
        </div>
      );
    case "typography":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {TYPE_STYLES.map((style) => (
            <Specimen key={style} title={style.replaceAll("-", " ")}>
              <Text variant={style}>A new point of view.</Text>
            </Specimen>
          ))}
        </div>
      );
    case "app-icons":
      return (
        <div className="space-y-6">
          {title(
            "Layered app icons",
            "44 / 52 / 88 / 128 pt",
            <>
              {(["small", "medium", "large", "extra-large"] as const).map(
                (size) => (
                  <AppIcon
                    key={size}
                    size={size}
                    label={`Library ${size}`}
                    badge={8}
                  >
                    <Layers />
                  </AppIcon>
                ),
              )}
            </>,
          )}
          {title(
            "Home view",
            "Lucide artwork",
            <div className="flex w-full flex-wrap justify-center gap-6 py-4">
              {[
                { label: "Music", Icon: Music2, color: "#e94069" },
                { label: "Library", Icon: Folder, color: "#0a84ff" },
                { label: "Photos", Icon: ImageIcon, color: "#c063dc" },
                { label: "Messages", Icon: MessageCircle, color: "#32a852" },
              ].map(({ label, Icon, color }) => (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={click(label)}
                  className="flex flex-col items-center gap-2 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-label disabled:opacity-40"
                >
                  <AppIcon label={label} size="medium" color={color}>
                    <Icon />
                  </AppIcon>
                  <Text as="span">{label}</Text>
                </button>
              ))}
            </div>,
          )}
        </div>
      );
    case "buttons":
      return (
        <div className="space-y-6">
          {title(
            "Text buttons",
            "34 / 44 / 50 pt",
            <>
              {(["small", "regular", "large"] as const).map((size) => (
                <Button
                  key={size}
                  size={size}
                  disabled={disabled}
                  onClick={click(size)}
                >
                  Continue
                </Button>
              ))}
            </>,
          )}
          {title(
            "Text with symbol",
            "34 / 44 / 50 pt · symbols 16 / 20 / 24 pt",
            <>
              {(["small", "regular", "large"] as const).map((size) => (
                <Button
                  key={size}
                  size={size}
                  disabled={disabled}
                  onClick={click(`${size} with symbol`)}
                >
                  <Plus aria-hidden />
                  Add
                </Button>
              ))}
            </>,
          )}
          {title(
            "Symbol buttons",
            "28 / 34 / 44 / 50 / 56 pt",
            <>
              {(
                ["mini", "small", "regular", "large", "extra-large"] as const
              ).map((size) => (
                <IconButton
                  key={size}
                  label={`Add · ${size}`}
                  size={size}
                  disabled={disabled}
                  onClick={click(size)}
                >
                  <Plus aria-hidden />
                </IconButton>
              ))}
            </>,
          )}
          {title(
            "Shape & material",
            "Capsule · rounded · plain · glass",
            <>
              <Button disabled={disabled} onClick={click("Capsule")}>
                Capsule
              </Button>
              <Button
                disabled={disabled}
                shape="rounded"
                onClick={click("Rounded")}
              >
                Rounded
              </Button>
              <Button
                disabled={disabled}
                variant="plain"
                onClick={click("Plain")}
              >
                Plain
              </Button>
              <Button
                disabled={disabled}
                variant="glass"
                onClick={click("Glass")}
              >
                Glass
              </Button>
            </>,
          )}
          {title(
            "States",
            "Toggle selection is interactive",
            <>
              <ToggleButton disabled={disabled}>Select</ToggleButton>
              <ToggleButton defaultPressed disabled={disabled}>
                Selected
              </ToggleButton>
              <Button disabled>Disabled</Button>
              <ToggleButton pressed disabled>
                Selected, disabled
              </ToggleButton>
            </>,
          )}
        </div>
      );
    case "fields":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {title(
            "Text field",
            "Capsule · 305 × 44 pt",
            <TextField label="Name" placeholder="Name" disabled={disabled} />,
          )}
          {title(
            "Rounded rectangle",
            "12 pt radius",
            <TextField
              label="Project"
              shape="rounded"
              defaultValue="Traverse library"
              disabled={disabled}
            />,
          )}
          {title(
            "Search field",
            "Clear action",
            <TextField
              kind="search"
              label="Find a component"
              placeholder="Search"
              defaultValue="Materials"
              disabled={disabled}
            />,
          )}
          {title(
            "Secure field",
            "Password input",
            <TextField
              kind="secure"
              label="Password"
              defaultValue="traverse"
              disabled={disabled}
            />,
          )}
          {title(
            "Disabled",
            "Regular material",
            <TextField
              label="Unavailable"
              defaultValue="Unavailable"
              disabled
            />,
          )}
          {title(
            "Visible label",
            "Form context",
            <TextField
              label="Display name"
              showLabel
              placeholder="Your name"
              disabled={disabled}
            />,
          )}
        </div>
      );
    case "selection":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {title(
            "Switches",
            "64 × 30 pt",
            <div className="flex flex-col gap-4">
              <Switch label="Radar audio" disabled={disabled} defaultChecked />
              <Switch label="Show captions" disabled={disabled} />
              <Switch label="Unavailable" disabled />
              <Switch label="On, disabled" defaultChecked disabled />
            </div>,
          )}
          {title(
            "Checkboxes",
            "28 pt · 44 pt label target",
            <div className="flex flex-col gap-4">
              <Checkbox
                label="Include attachments"
                disabled={disabled}
                defaultChecked
              />
              <Checkbox label="Remember selection" disabled={disabled} />
              <Checkbox
                label="Mixed selection"
                indeterminate
                disabled={disabled}
              />
              <Checkbox label="Unavailable" disabled />
            </div>,
          )}
        </div>
      );
    case "sliders":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {title(
            "Default",
            "6 pt track · 34 × 22 pt thumb",
            <div className="flex w-full flex-col gap-6 py-2">
              {(["mini", "small", "regular", "large"] as const).map((size) => (
                <Slider
                  key={size}
                  label={`Volume ${size}`}
                  size={size}
                  value={value}
                  onValueChange={setValue}
                  disabled={disabled}
                  className="w-full"
                />
              ))}
            </div>,
          )}
          {title(
            "Variants",
            `${value}%`,
            <div className="flex w-full flex-col gap-6 py-2">
              <Slider
                label="Segmented volume"
                variant="segmented"
                value={value}
                step={25}
                disabled={disabled}
                onValueChange={setValue}
                className="w-full"
              />
              <Slider
                label="Min and max volume"
                value={value}
                disabled={disabled}
                onValueChange={setValue}
                leading={<Volume1 />}
                trailing={<Volume2 />}
                className="w-full"
              />
              <Slider
                label="Hue"
                variant="color"
                size="large"
                value={value}
                disabled={disabled}
                onValueChange={setValue}
                className="w-full"
              />
              <Slider
                label="Unavailable volume"
                value={value}
                disabled
                className="w-full"
              />
            </div>,
          )}
        </div>
      );
    case "segments":
      return (
        <div className="space-y-6">
          {title(
            "Three segments",
            "44 pt track · 36 pt segments",
            <SegmentedControl
              label="View mode"
              options={options}
              value={selected}
              onValueChange={setSelected}
              disabled={disabled}
              className="w-full"
            />,
          )}
          {title(
            "With symbols",
            "Symbol 16 · gap 3 · 15 pt Semibold",
            <SegmentedControl
              label="Layout"
              options={[
                { value: "grid", label: "Grid", icon: <Grid2X2 /> },
                { value: "favorites", label: "Favorites", icon: <Heart /> },
                { value: "shared", label: "Shared", icon: <Users /> },
              ]}
              defaultValue="grid"
              disabled={disabled}
              className="w-full"
            />,
          )}
          {title(
            "Individual disabled",
            "Keyboard arrows select available options",
            <SegmentedControl
              label="Availability"
              options={[
                ...options.slice(0, 2),
                { value: "third", label: "Unavailable", disabled: true },
              ]}
              defaultValue="first"
              disabled={disabled}
              className="w-full"
            />,
          )}
          {title(
            "Entire group disabled",
            "No selected platter",
            <SegmentedControl
              label="Disabled view"
              options={options}
              defaultValue="first"
              disabled
              className="w-full"
            />,
          )}
        </div>
      );
    case "pickers":
      return (
        <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {title(
            "Calendar",
            "340 pt · keyboard arrows / Page Up / Page Down",
            <Calendar
              label="Choose a date"
              value={date}
              onValueChange={setDate}
              disabled={disabled}
            />,
          )}
          <div className="space-y-6">
            {title(
              "Collapsed",
              "Popover pickers",
              <>
                <DatePicker
                  label="Event date"
                  value={date}
                  onValueChange={setDate}
                  disabled={disabled}
                />
                <TimePicker
                  label="Event time"
                  value={time}
                  onValueChange={setTime}
                  disabled={disabled}
                />
              </>,
            )}
            {title(
              "Time wheels",
              "254 × 236 pt",
              <TimePicker
                label="Time wheels"
                value={time}
                onValueChange={setTime}
                disabled={disabled}
                expanded
              />,
            )}
            {title(
              "Disabled",
              "No popover activation",
              <>
                <DatePicker
                  label="Disabled date"
                  value={date}
                  onValueChange={setDate}
                  disabled
                />
                <TimePicker
                  label="Disabled time"
                  value={time}
                  onValueChange={setTime}
                  disabled
                />
              </>,
            )}
          </div>
        </div>
      );
    case "color-pickers":
      return (
        <div className="flex flex-wrap items-start gap-6">
          <ColorPicker
            value={color}
            onValueChange={setColor}
            disabled={disabled}
          />
          <Specimen title="Selected color" detail="Live preview">
            <div className="flex flex-col items-center gap-5">
              <AppIcon label="Selected color" color={color} size="extra-large">
                <PipetteIcon />
              </AppIcon>
              <Text variant="title-2" className="font-mono uppercase">
                {color}
              </Text>
              <Text tone="secondary" className="max-w-56">
                Switch between grid, spectrum and RGB sliders.
              </Text>
            </div>
          </Specimen>
        </div>
      );
    case "progress":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {title(
            "Determinate",
            "288 × 4 pt",
            <div className="flex w-full flex-col gap-6">
              {[0, 25, 50, 75, 100].map((v) => (
                <div key={v} className="flex items-center gap-4">
                  <ProgressBar
                    label={`Progress ${v}%`}
                    value={v}
                    className="flex-1"
                  />
                  <Text
                    variant="footnote"
                    className="w-10 text-right tabular-nums"
                  >
                    {v}%
                  </Text>
                </div>
              ))}
            </div>,
          )}
          {title(
            "Activity",
            "14 / 28 / 42 pt",
            <>
              <ActivityIndicator size="small" />
              <ActivityIndicator />
              <ActivityIndicator size="large" />
            </>,
          )}
          {title(
            "Live progress",
            `${value}%`,
            <div className="flex w-full flex-col gap-6">
              <ProgressBar
                label="Live progress"
                value={value}
                className="w-full"
              />
              <Slider
                label="Adjust progress"
                value={value}
                onValueChange={setValue}
                disabled={disabled}
                className="w-full"
              />
            </div>,
            "@3xl:col-span-2",
          )}
        </div>
      );
    case "tokens":
      return (
        <div className="space-y-6">
          {title(
            "Search tokens",
            "32 pt · filter actions",
            <>
              {["Design", "Favorites", "This week"]
                .filter((token) => tokens.includes(token))
                .map((token) => (
                  <span key={token} className="inline-flex">
                    <SearchToken
                      selected={token === "Favorites"}
                      disabled={disabled}
                      category={token === "Design" ? "Type" : undefined}
                      onClick={click(token)}
                      onRemove={() =>
                        setTokens(tokens.filter((t) => t !== token))
                      }
                    >
                      {token}
                    </SearchToken>
                  </span>
                ))}
              <Button
                size="small"
                variant="plain"
                disabled={disabled}
                onClick={() => setTokens(["Design", "Favorites", "This week"])}
              >
                Reset
              </Button>
            </>,
          )}
          {title(
            "Disabled token",
            "Interaction disabled",
            <SearchToken disabled category="Type" onRemove={click("Disabled")}>
              Design
            </SearchToken>,
          )}
        </div>
      );
    case "pages":
      return (
        <div className="space-y-6">
          {title(
            "Page indicator",
            "Select a page",
            <div className="w-full">
              <Material
                kind="regular"
                className="flex h-56 items-center justify-center rounded-[2rem]"
              >
                <Text key={page} className="ui-swap" variant="xl-title-2">
                  A new perspective. {page + 1}
                </Text>
              </Material>
              <PageControl
                label="Preview pages"
                count={5}
                value={page}
                onValueChange={setPage}
                disabled={disabled}
              />
            </div>,
          )}
          {title(
            "Counts & disabled",
            "3 / 7 pages",
            <>
              <PageControl
                count={3}
                value={page % 3}
                onValueChange={setPage}
                disabled={disabled}
              />
              <PageControl
                count={7}
                value={page}
                onValueChange={setPage}
                disabled
              />
            </>,
          )}
        </div>
      );
    case "lists":
      return (
        <div className="grid gap-6 @3xl:grid-cols-2">
          {title(
            "Inset grouped",
            "44 pt minimum rows · 16 pt inset",
            <ListSection
              header="Library"
              headerId="library-list"
              footer="Your collection, available in every space."
              className="w-full"
            >
              <ListRow
                disabled={disabled}
                onClick={click("Albums")}
                trailing={
                  <Text as="span" tone="secondary">
                    42
                  </Text>
                }
              >
                <Folder aria-hidden className="size-5 text-accent" />
                Albums
              </ListRow>
              <ListRow disabled={disabled} onClick={click("Favorites")}>
                <Heart aria-hidden className="size-5 text-accent" />
                Favorites
              </ListRow>
              <ListRow
                trailing={
                  <Switch
                    label="Sync"
                    showLabel={false}
                    disabled={disabled}
                    defaultChecked
                  />
                }
              >
                Sync library
              </ListRow>
            </ListSection>,
          )}
          {title(
            "Accessories",
            "Form rows",
            <ListSection className="w-full">
              <ListRow
                trailing={
                  <Checkbox
                    label="Include originals"
                    showLabel={false}
                    disabled={disabled}
                  />
                }
              >
                Include originals
              </ListRow>
              <ListRow
                trailing={
                  <Text as="span" tone="secondary">
                    12.4 GB
                  </Text>
                }
              >
                Storage
              </ListRow>
              <ListRow
                trailing={
                  <Button
                    size="small"
                    disabled={disabled}
                    onClick={click("Manage")}
                  >
                    Manage
                  </Button>
                }
              >
                Downloads
              </ListRow>
            </ListSection>,
          )}
        </div>
      );
    case "menus":
    case "dropdowns":
      return (
        <div className="space-y-6">
          {title(
            "Context menu",
            "248 pt · nested actions",
            <DropdownMenu
              label="Library"
              header="Library actions"
              accessories={[
                {
                  id: "cut",
                  label: "Cut",
                  icon: <Scissors />,
                  onSelect: () => notify("Cut selected"),
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <Copy />,
                  onSelect: () => notify("Copy selected"),
                },
                {
                  id: "share",
                  label: "Share",
                  icon: <Share2 />,
                  onSelect: () => notify("Share selected"),
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 />,
                  onSelect: () => notify("Delete selected"),
                },
              ]}
              items={actions}
              disabled={disabled}
            />,
          )}
          {title(
            "Dropdown sizes",
            "Small / regular",
            <>
              <DropdownMenu
                label="Small"
                size="small"
                items={actions}
                disabled={disabled}
              />
              <DropdownMenu
                label="Regular"
                items={actions}
                disabled={disabled}
              />
              <DropdownMenu label="Disabled" items={actions} disabled />
            </>,
          )}
          {title(
            "Available actions",
            "Open the menu to inspect states",
            <div className="flex flex-wrap gap-3">
              {[
                "Subtitle",
                "Checkmark",
                "Symbol",
                "Submenu",
                "Disabled",
                "Destructive",
              ].map((label) => (
                <Text
                  key={label}
                  variant="footnote"
                  tone="secondary"
                  className="rounded-full border border-separator px-3 py-2"
                >
                  {label}
                </Text>
              ))}
            </div>,
          )}
        </div>
      );
    case "navigation":
      return (
        <div className="space-y-6">
          {["center", "leading"].map((align) => (
            <Specimen
              key={align}
              title={`${align === "center" ? "Centered" : "Leading"} title`}
              detail={
                align === "center"
                  ? "44 pt bar · inline title"
                  : "44 pt bar · large title below"
              }
            >
              <Window className="min-h-32 w-full flex-col pb-4">
                <NavigationBar
                  title="Library"
                  titleAlign={align as "center" | "leading"}
                  level={3}
                  leading={
                    <IconButton
                      label={`Back ${align}`}
                      disabled={disabled}
                      onClick={click("Back")}
                    >
                      <ChevronLeft aria-hidden />
                    </IconButton>
                  }
                  trailing={
                    <IconButton
                      label={`More ${align}`}
                      disabled={disabled}
                      onClick={click("More")}
                    >
                      <Ellipsis aria-hidden />
                    </IconButton>
                  }
                />
                <Text tone="secondary" className="px-6">
                  Navigation stays with its content.
                </Text>
              </Window>
            </Specimen>
          ))}
        </div>
      );
    case "sidebars":
      return (
        <Specimen title="Sidebar" detail="256 pt sidebar · scrolling content">
          <Window className="h-96 w-full">
            <Sidebar
              label="Sidebar example"
              className="w-64"
              title="Library"
              action={
                <Button disabled={disabled} onClick={click("Edit")}>
                  Edit
                </Button>
              }
            >
              <SidebarItem
                current={selected === "first"}
                disabled={disabled}
                icon={<Folder />}
                counter={42}
                onSelect={() => setSelected("first")}
              >
                All items
              </SidebarItem>
              <SidebarItem
                current={selected === "second"}
                disabled={disabled}
                icon={<Heart />}
                onSelect={() => setSelected("second")}
              >
                Favorites
              </SidebarItem>
              <SidebarItem icon={<UserRound />} disabled>
                Unavailable
              </SidebarItem>
              <SidebarSection heading="Collections">
                {Array.from({ length: 14 }, (_, i) => (
                  <SidebarItem
                    key={i}
                    disabled={disabled}
                    icon={<ImageIcon />}
                    onSelect={click(`Collection ${i + 1}`)}
                  >
                    Collection {i + 1}
                  </SidebarItem>
                ))}
              </SidebarSection>
            </Sidebar>
            <div className="hidden flex-1 flex-col justify-center gap-3 p-4 sm:flex">
              <Text variant="title-1">Room to explore.</Text>
              <Text tone="secondary">
                Scroll the sidebar. Its material stays attached to the window.
              </Text>
            </div>
          </Window>
        </Specimen>
      );
    case "tabs":
      return (
        <div className="space-y-6">
          <Specimen title="iPhone" detail="Persistent navigation at the bottom">
            <div className="flex min-h-64 w-full max-w-80 flex-col rounded-3xl bg-surface p-3">
              <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-4">
                <Text variant="title-2" className="capitalize">
                  {tab}
                </Text>
                <Text tone="secondary">
                  {tab === "shared"
                    ? "No shared stations yet. Stations you share appear here."
                    : "Select a tab to browse this section."}
                </Text>
              </div>
              <TabBar
                label="iPhone sections"
                tabs={tabs}
                value={tab}
                onValueChange={setTab}
                className="self-center"
              />
            </div>
          </Specimen>
          <Specimen
            title="iPad"
            detail="Navigation near the top · symbols beside labels"
          >
            <div className="flex min-h-56 w-full flex-col items-center gap-4 rounded-3xl bg-surface p-3 sm:p-5">
              <div className="max-w-full overflow-x-auto">
                <TabBar
                  label="iPad sections"
                  tabs={tabs}
                  value={tab}
                  onValueChange={setTab}
                  layout="regular"
                />
              </div>
              <div className="w-full px-4 py-6">
                <Text variant="title-2" className="mb-2 capitalize">
                  {tab}
                </Text>
                <Text tone="secondary">
                  Navigation stays available even when a section is empty.
                </Text>
              </div>
            </div>
          </Specimen>
        </div>
      );
    case "toolbars":
      return (
        <div className="space-y-6">
          {title(
            "Floating toolbar",
            "Glass · 12 pt padding · 8 pt gap",
            <Ornament aria-label="Editing toolbar">
              <OrnamentItem
                render={
                  <ToggleButton
                    appearance="toolbar"
                    disabled={disabled}
                    defaultPressed
                  />
                }
              >
                Browse
              </OrnamentItem>
              <OrnamentItem
                render={
                  <ToggleButton appearance="toolbar" disabled={disabled} />
                }
              >
                Arrange
              </OrnamentItem>
              <OrnamentItem
                render={
                  <IconButton
                    label="Add item"
                    variant="plain"
                    disabled={disabled}
                    onClick={click("Add")}
                  />
                }
              >
                <Plus aria-hidden />
              </OrnamentItem>
              <OrnamentItem
                render={
                  <IconButton
                    label="Share item"
                    variant="plain"
                    disabled={disabled}
                    onClick={click("Share")}
                  />
                }
              >
                <Share2 aria-hidden />
              </OrnamentItem>
            </Ornament>,
          )}
          {title(
            "Additional tools",
            "Scroll inside the material",
            <>
              <Ornament orientation="vertical" aria-label="Vertical tools">
                <OrnamentItem
                  render={
                    <IconButton
                      label="Layers"
                      variant="plain"
                      disabled={disabled}
                      onClick={click("Layers")}
                    />
                  }
                >
                  <Layers aria-hidden />
                </OrnamentItem>
                <OrnamentItem
                  render={
                    <IconButton
                      label="Adjustments"
                      variant="plain"
                      disabled={disabled}
                      onClick={click("Adjustments")}
                    />
                  }
                >
                  <SlidersHorizontal aria-hidden />
                </OrnamentItem>
              </Ornament>
              <Ornament aria-label="Overflow tools" className="max-w-72">
                {Array.from({ length: 10 }, (_, i) => (
                  <OrnamentItem
                    key={i}
                    render={
                      <Button
                        disabled={disabled}
                        variant="plain"
                        onClick={click(`Tool ${i + 1}`)}
                      />
                    }
                  >
                    Tool {i + 1}
                  </OrnamentItem>
                ))}
              </Ornament>
            </>,
          )}
        </div>
      );
    case "tooltips":
      return (
        <Specimen title="Tooltips" detail="600 ms dwell · keyboard focus">
          <div className="flex w-full flex-wrap items-center justify-center gap-6 py-10">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <Tooltip key={side} label={`Tooltip on ${side}`} side={side}>
                <Button
                  aria-label={`Tooltip on ${side}`}
                  disabled={disabled}
                  onClick={click(side)}
                >
                  {side[0].toUpperCase() + side.slice(1)}
                </Button>
              </Tooltip>
            ))}
          </div>
        </Specimen>
      );
    case "windows":
      return (
        <Specimen title="Glass panel" detail="34 pt corner · navigation bar">
          <div className="w-full">
            <Window className="min-h-48 w-full flex-col">
              <NavigationBar
                title="A place for your ideas"
                level={3}
                trailing={
                  <IconButton
                    label="Window action"
                    disabled={disabled}
                    onClick={click("Window action")}
                  >
                    <MoreHorizontal aria-hidden />
                  </IconButton>
                }
              />
              <div className="flex flex-1 flex-wrap items-center justify-center gap-4 p-4">
                <AppIcon label="Library" size="medium">
                  <Layers />
                </AppIcon>
                <Text variant="headline">A contextual panel.</Text>
              </div>
            </Window>
            <WindowControls />
          </div>
        </Specimen>
      );
    case "alerts":
      return (
        <div className="space-y-6">
          {title(
            "Alerts",
            "Modal · Escape · focus return",
            <>
              <Alert
                trigger={<Button disabled={disabled}>Show alert</Button>}
                title="Save your changes?"
                description="Keep your changes before leaving this space."
                icon={
                  <AppIcon label="Library">
                    <Layers />
                  </AppIcon>
                }
                actions={[
                  { label: "Save", onClick: click("Save") },
                  { label: "Cancel" },
                ]}
              />
              <Alert
                trigger={<Button disabled={disabled}>Text entry</Button>}
                title="New collection"
                description="Give this collection a name."
                actions={[
                  { label: "Create", onClick: click("Create") },
                  { label: "Cancel" },
                ]}
              >
                <TextField
                  label="Collection name"
                  placeholder="Name"
                  shape="rounded"
                  className="w-full"
                />
              </Alert>
              <Alert
                trigger={<Button disabled={disabled}>Destructive</Button>}
                title="Delete collection?"
                description="This example demonstrates a destructive action."
                icon={<Trash2 className="text-red-400" />}
                actions={[
                  {
                    label: "Delete",
                    destructive: true,
                    onClick: click("Delete"),
                  },
                  { label: "Cancel" },
                ]}
              />
            </>,
          )}
          {title(
            "General dialog",
            "Scrollable surface",
            <SystemDialog
              trigger={<Button disabled={disabled}>Open dialog</Button>}
              title="A little more space"
              description="Scrollable dialog example"
            >
              <Text tone="secondary">
                The material remains fixed while the content scrolls.
              </Text>
              <div className="mt-5 space-y-6">
                {Array.from({ length: 15 }, (_, i) => (
                  <Text key={i}>Content section {i + 1}</Text>
                ))}
              </div>
            </SystemDialog>,
          )}
        </div>
      );
    case "notifications":
      return (
        <div className="space-y-6">
          {title(
            "Notification",
            "436 pt · system material",
            <>
              {notification ? (
                <Notification
                  app="Messages"
                  title="A new perspective"
                  message="Your shared space is ready to explore."
                  icon={
                    <AppIcon label="Messages" color="#32a852">
                      <MessageCircle />
                    </AppIcon>
                  }
                  onDismiss={() => setNotification(false)}
                  actions={[
                    {
                      label: "Open space",
                      onClick: click("Open space"),
                      disabled,
                    },
                  ]}
                />
              ) : (
                <Button
                  disabled={disabled}
                  onClick={() => setNotification(true)}
                >
                  Restore notification
                </Button>
              )}
            </>,
          )}
          {title(
            "Expanded preview",
            "Image & actions",
            <Notification
              app="Photos"
              title="Shared moments"
              message="A room with a view."
              icon={
                <AppIcon label="Photos" color="#b05cc7">
                  <ImageIcon />
                </AppIcon>
              }
              preview={
                <Image
                  unoptimized
                  width={2992}
                  height={1684}
                  src="/reference/room-day.png"
                  alt="Bright Paris room"
                  className="aspect-[1.5] w-full object-cover"
                />
              }
              actions={[
                { label: "View album", onClick: click("View album"), disabled },
              ]}
            />,
          )}
          {title(
            "Temporary notice",
            "Dismissible",
            <>
              {notice ? (
                <TemporaryNotice
                  title="Connected"
                  subtitle="Your space is up to date"
                  icon={<Airplay className="text-yellow-300" />}
                  onDismiss={() => setNotice(false)}
                  action={{ label: "View", onClick: click("View"), disabled }}
                />
              ) : (
                <Button disabled={disabled} onClick={() => setNotice(true)}>
                  Restore notice
                </Button>
              )}
            </>,
          )}
        </div>
      );
    case "sharing":
      return (
        <Specimen
          title="Share sheet"
          detail="Contacts · collaboration · destinations"
        >
          <ShareSheet
            trigger={
              <Button disabled={disabled}>
                <Share2 aria-hidden />
                Share a collection
              </Button>
            }
            title="Station collection"
            subtitle="8 items"
            contacts={[
              { id: "alex", name: "Alex", icon: <UserRound /> },
              { id: "sam", name: "Sam", icon: <UserRound /> },
              { id: "jordan", name: "Jordan", icon: <UserRound /> },
              { id: "taylor", name: "Taylor", icon: <UserRound /> },
              { id: "morgan", name: "Morgan", icon: <UserRound /> },
            ]}
            destinations={[
              { id: "copy", name: "Copy link", icon: <Copy /> },
              { id: "mail", name: "Mail", icon: <Mail /> },
              { id: "print", name: "Print", icon: <Printer /> },
              { id: "download", name: "Save to files", icon: <Download /> },
            ]}
            onShare={(destination) => notify(`Share example: ${destination}`)}
          />
          <Text tone="secondary">
            Actions demonstrate local selection. No messages are sent.
          </Text>
        </Specimen>
      );
    case "shareplay":
      return (
        <div className="space-y-6">
          {title(
            "System activity",
            "436 pt · 52 pt app icon",
            <SharePlayActivity
              title="Listen together"
              subtitle={playing ? "Playing with Alex" : "Ready when you are"}
              icon={
                <AppIcon label="Music" color="#df426a">
                  <Music2 />
                </AppIcon>
              }
              actions={[
                {
                  label: playing ? "Pause" : "Play",
                  icon: playing ? <Pause aria-hidden /> : <Play aria-hidden />,
                  disabled,
                  onClick: () => setPlaying(!playing),
                },
              ]}
            />,
          )}
          {title(
            "Session",
            "Controls & participants",
            <SharePlayActivity
              title="Shared space"
              subtitle="You and 2 others"
              icon={<Users />}
              actions={[
                {
                  label: "Video",
                  icon: <Video aria-hidden />,
                  disabled,
                  onClick: click("Video"),
                },
                {
                  label: "Leave",
                  icon: <X aria-hidden />,
                  disabled,
                  onClick: click("Leave"),
                },
              ]}
            />,
          )}
          {title(
            "Request",
            "Accept / decline",
            <Alert
              trigger={<Button disabled={disabled}>Show invitation</Button>}
              title="Join a shared space?"
              description="Alex invited you to explore a collection together."
              icon={<Users />}
              actions={[
                { label: "Join", onClick: click("Join") },
                { label: "Not now" },
              ]}
            />,
          )}
        </div>
      );
    case "keyboard":
      return (
        <div className="space-y-6">
          {title(
            "Keyboard",
            "Up to 544 pt · 44 pt key height",
            <Keyboard
              value={text}
              onValueChange={setText}
              onReturn={() => notify(`Submitted: ${text}`)}
              disabled={disabled}
            />,
          )}
          {title(
            "Text output",
            "Editable from either input",
            <TextField
              label="Keyboard output"
              showLabel
              value={text}
              onValueChange={setText}
              disabled={disabled}
              className="w-full"
            />,
          )}
        </div>
      );
    default:
      return null;
  }
}

function PipetteIcon() {
  return <SlidersHorizontal />;
}

export function OverviewSpecimens({
  disabled,
  notify,
}: {
  disabled: boolean;
  notify: (text: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(65);
  const [display, setDisplay] = useState("map");
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Material
        kind="regular"
        className="bg-grouped-secondary relative flex min-w-0 flex-col gap-4 rounded-2xl p-4"
      >
        <div className="flex items-start justify-between">
          <AppIcon label="Music" size="medium" color="#d9547a">
            <Music2 />
          </AppIcon>
          <IconButton
            label="Favorite track"
            disabled={disabled}
            variant="plain"
            onClick={() => notify("Added to favorites")}
          >
            <Heart aria-hidden />
          </IconButton>
        </div>
        <div className="space-y-1">
          <Text variant="title-3">Radar pass, station 2.</Text>
          <Text variant="subheadline" tone="secondary">
            Playback of the last sounding
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <IconButton
            label={playing ? "Pause preview" : "Play preview"}
            disabled={disabled}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          </IconButton>
          <Slider
            label="Preview volume"
            value={volume}
            onValueChange={setVolume}
            disabled={disabled}
            leading={<Volume1 />}
            className="min-w-0 flex-1"
          />
        </div>
      </Material>
      <div className="flex min-w-0 flex-col gap-4">
        <Material
          kind="regular"
          className="bg-grouped-secondary flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fill-tertiary">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Text variant="headline">Range rings</Text>
            <Text variant="subheadline" tone="secondary">
              Walkback limits on the map.
            </Text>
          </div>
          <Switch
            label="Range rings"
            showLabel={false}
            defaultChecked
            disabled={disabled}
          />
        </Material>
        <Material
          kind="recessed"
          className="bg-grouped-secondary flex flex-1 flex-col justify-center gap-3 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <Text variant="headline">Display</Text>
          </div>
          <SegmentedControl
            label="Display mode"
            value={display}
            onValueChange={setDisplay}
            disabled={disabled}
            options={[
              { value: "map", label: "Map" },
              { value: "list", label: "List" },
            ]}
          />
          <Text variant="subheadline" tone="secondary">
            {display === "map"
              ? "Show stations on the map."
              : "Show stations in a list."}
          </Text>
        </Material>
      </div>
    </div>
  );
}
