"use client";

import { useRef, useState } from "react";
import { BackButton, Button } from "@icewalk/ui/button";
import { Body, Footnote, Title2 } from "@icewalk/ui/text";
import { Window, WindowContent, WindowMotion } from "@icewalk/ui/window";
import { TabBar } from "@icewalk/ui/tab-bar";
import { Slider } from "@icewalk/ui/slider";
import { DropdownMenu } from "@icewalk/ui/menu";
import { PickerPopover } from "@icewalk/ui/pickers";
import { Alert, SystemDialog } from "@icewalk/ui/system-surfaces";
import { Compass, FlaskConical, Footprints } from "lucide-react";

/** Reusable window lifecycle and keyed navigation, including rapid retargeting. */
export function WindowTransitions() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="flex min-h-100 flex-col items-start gap-5">
    <div className="flex w-full flex-wrap items-start gap-8" data-testid="spatial-motion-controls">
      <TabBar label="Spatial views" defaultValue="planning" tabs={[
        { value: "planning", label: "Planning", icon: <Compass aria-hidden /> },
        { value: "ev", label: "EV", icon: <Footprints aria-hidden /> },
        { value: "science", label: "Science", icon: <FlaskConical aria-hidden /> },
      ]} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
        <BackButton label="Back to brief" onClick={() => setDetail(false)} />
        <Slider label="Surface range" defaultValue={45} />
        <div className="flex flex-wrap gap-3">
          <DropdownMenu label="Spatial menu" items={[{ id: "brief", label: "Traverse brief" }, { id: "station", label: "Station details" }]} />
          <PickerPopover trigger={<Button>Spatial picker</Button>} label="Spatial picker">
            <Window className="w-72 flex-col gap-4 p-5"><Body>Keep the material and its content coordinated.</Body><Slider label="Picker range" className="w-full" /></Window>
          </PickerPopover>
        </div>
      </div>
    </div>
    <Button ref={trigger} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      {open ? "Close specimen window" : "Open specimen window"}
    </Button>
    <WindowMotion open={open} restoreFocus={trigger} className="max-w-full">
      <Window aria-label="Window transitions specimen" className={detail ? "w-100 max-w-full p-6" : "w-80 max-w-full p-6"}>
        <WindowContent contentKey={detail ? "detail" : "brief"} direction={detail ? "forward" : "back"}>
          <div className="flex flex-col gap-4">
            <Title2>{detail ? "Station 01" : "Traverse brief"}</Title2>
            <Body tone="secondary">{detail ? "Radar survey across the crater apron. Confirm the subsurface return before selecting a drill location." : "Six stations. One safe traverse."}</Body>
            {detail ? <Footnote tone="secondary">The content keeps its natural size while the glass changes shape. Close or navigate again during a transition to test interruption.</Footnote> : null}
            <div className="flex flex-wrap gap-2">
              {detail ? <BackButton label="Back to brief" onClick={() => setDetail(false)} /> : <Button onClick={() => setDetail(true)}>Station details</Button>}
              <SystemDialog trigger={<Button>Open spatial sheet</Button>} title="Measurement review">
                <Body>The presenting window recedes while this sheet holds the interaction plane.</Body>
                <Alert trigger={<Button>Open spatial alert</Button>} title="Keep measurement?" description="The sheet remains behind this alert." actions={[{ label: "Keep measurement" }, { label: "Cancel" }]} />
              </SystemDialog>
              <Button variant="plain" onClick={() => setOpen(false)}>Close window</Button>
            </div>
          </div>
        </WindowContent>
      </Window>
    </WindowMotion>
  </div>;
}
