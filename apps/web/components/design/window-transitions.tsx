"use client";

import { useRef, useState } from "react";
import { useMergedRefs, useMorph } from "@fluidkit/react";
import { BackButton, Button } from "@icewalk/ui/button";
import { Body, Footnote, Title2 } from "@icewalk/ui/text";
import { Window, WindowOrigin } from "@icewalk/ui/window";
import { TabBar } from "@icewalk/ui/tab-bar";
import { DropdownMenu } from "@icewalk/ui/menu";
import { DatePicker, TimePicker } from "@icewalk/ui/pickers";
import { Alert, SystemDialog } from "@icewalk/ui/system-surfaces";
import { Compass, FlaskConical, Footprints } from "lucide-react";
import { Specimen } from "./playbook-specimens";

type Surface = "button" | "brief" | "detail";

/** Fluid Kit's multi-state Morph: button → compact window → detailed window, in either direction. */
export function WindowTransitions() {
  const [surface, setSurface] = useState<Surface>("button");
  const [date, setDate] = useState("2026-11-12");
  const [time, setTime] = useState("09:41");
  const scene = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const brief = useRef<HTMLElement | null>(null);
  const detail = useRef<HTMLElement | null>(null);
  const morph = useMorph<Surface>({
    value: surface,
    container: scene,
    onStart(to) {
      if (to === "button") trigger.current?.focus({ preventScroll: true });
      else
        (to === "brief" ? brief : detail).current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true });
    },
    onRest(at) {
      if (at === "button") trigger.current?.focus({ preventScroll: true });
      else
        (at === "brief" ? brief : detail).current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true });
    },
  });
  const open = surface !== "button";
  const briefRef = useMergedRefs(brief, morph.state("brief"));
  const detailRef = useMergedRefs(detail, morph.state("detail"));

  return (
    <div className="space-y-8">
      <Specimen
        title="Window morph"
        detail="Button → brief → details · interruptible springs"
      >
        <div
          ref={scene}
          className="relative min-h-132 w-full overflow-x-clip"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.defaultPrevented && open) {
              event.preventDefault();
              setSurface("button");
            }
          }}
        >
          <Button
            ref={trigger}
            variant="glass"
            onClick={() => setSurface(open ? "button" : "brief")}
            aria-expanded={open}
            aria-controls="morph-window-brief morph-window-detail"
          >
            <WindowOrigin ref={morph.state("button")} />
            {open ? "Close specimen window" : "Open specimen window"}
          </Button>
          <div className="relative mt-6">
            <Window
              id="morph-window-brief"
              ref={briefRef}
              aria-label="Traverse brief"
              aria-hidden={surface !== "brief"}
              inert={surface !== "brief"}
              className="invisible absolute top-0 left-0 z-2 w-80 max-w-full flex-col gap-4 p-6"
            >
              <Title2 as="h4">Traverse brief</Title2>
              <Body tone="secondary">Six stations. One safe traverse.</Body>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setSurface("detail")}>
                  Station details
                </Button>
                <Button variant="plain" onClick={() => setSurface("button")}>
                  Close window
                </Button>
              </div>
            </Window>
            <Window
              id="morph-window-detail"
              ref={detailRef}
              aria-label="Station details"
              aria-hidden={surface !== "detail"}
              inert={surface !== "detail"}
              className="invisible absolute top-0 left-0 z-2 w-100 max-w-full flex-col gap-4 p-6"
            >
              <Title2 as="h4">Station 01</Title2>
              <Body tone="secondary">
                Radar survey across the crater apron. Confirm the subsurface
                return before selecting a drill location.
              </Body>
              <Footnote tone="secondary">
                The window changes width and height while its content keeps its
                natural size. Navigate or close during the morph to reverse it.
              </Footnote>
              <div className="flex flex-wrap gap-2">
                <BackButton
                  label="Back to brief"
                  onClick={() => setSurface("brief")}
                />
                <SystemDialog
                  trigger={<Button>Open sheet</Button>}
                  title="Measurement review"
                >
                  <Body>Review the measurement before updating the plan.</Body>
                  <Alert
                    trigger={<Button>Open alert</Button>}
                    title="Keep measurement?"
                    description="The sheet remains behind this alert."
                    actions={[
                      { label: "Keep measurement" },
                      { label: "Cancel" },
                    ]}
                  />
                </SystemDialog>
                <Button variant="plain" onClick={() => setSurface("button")}>
                  Close window
                </Button>
              </div>
            </Window>
          </div>
        </div>
      </Specimen>
      <Specimen
        title="Date and time"
        detail="Compact fields morph into their pickers"
      >
        <DatePicker label="Morph date" value={date} onValueChange={setDate} />
        <TimePicker label="Morph time" value={time} onValueChange={setTime} />
      </Specimen>
      <Specimen
        title="Navigation"
        detail="One highlight follows the selected section"
      >
        <TabBar
          label="Views"
          defaultValue="planning"
          tabs={[
            {
              value: "planning",
              label: "Planning",
              icon: <Compass aria-hidden />,
            },
            { value: "ev", label: "EV", icon: <Footprints aria-hidden /> },
            {
              value: "science",
              label: "Science",
              icon: <FlaskConical aria-hidden />,
            },
          ]}
        />
        <DropdownMenu
          label="Menu"
          items={[
            { id: "brief", label: "Traverse brief" },
            { id: "station", label: "Station details" },
          ]}
        />
      </Specimen>
    </div>
  );
}
