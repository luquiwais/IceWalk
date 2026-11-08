import { Button, IconButton } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Ornament, OrnamentItem } from "@icewalk/ui/ornament";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Sidebar, SidebarItem } from "@icewalk/ui/sidebar";
import { TabBar } from "@icewalk/ui/tab-bar";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Text, type TextVariant } from "@icewalk/ui/text";
import { ToggleButton } from "@icewalk/ui/toggle-button";
import { NavigationBar, Window } from "@icewalk/ui/window";
import { Plus, Share } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "IceWalk design system" };

// Text styles from the visionOS 26 kit: name, size/line height and weight.
const STYLES: [TextVariant, string, string][] = [
  ["xl-title-1", "XL Title 1", "48/56 bold"],
  ["xl-title-2", "XL Title 2", "38/46 bold"],
  ["large-title", "Large Title", "29/38 bold"],
  ["title-1", "Title 1", "24/32 bold"],
  ["title-2", "Title 2", "22/28 bold"],
  ["title-3", "Title 3", "19/24 bold"],
  ["headline", "Headline", "17/22 bold"],
  ["body", "Body", "17/22 medium"],
  ["callout", "Callout", "15/20 semibold"],
  ["subheadline", "Subheadline", "15/20 regular"],
  ["footnote", "Footnote", "13/18 medium"],
  ["caption-1", "Caption 1", "12/16 medium"],
  ["caption-2", "Caption 2", "12/16 medium"],
];

/**
 * Design system specimen: every text style and component, over the kit's
 * reference background (local only), to compare 1:1 with Figma.
 */
export default function DesignPage() {
  return (
    <main className="min-h-dvh bg-[url(/reference/visionos-room.jpg)] bg-cover bg-fixed bg-center p-12">
      <Window aria-labelledby="ds-title" className="mx-auto w-[80rem] flex-col">
        <NavigationBar id="ds-title" level={1} title="Design system" />
        <div className="grid grid-cols-2 gap-12 px-10 pb-12">
          <ListSection header="Text styles" headerId="text-styles">
            {STYLES.map(([variant, name, spec]) => (
              <ListRow
                key={variant}
                trailing={
                  <Text variant="footnote" tone="secondary" as="span" className="tabular-nums">
                    {spec}
                  </Text>
                }
              >
                <Text variant={variant} as="span" className="truncate">
                  {name}
                </Text>
              </ListRow>
            ))}
          </ListSection>

          <div className="flex flex-col gap-10">
            <section className="flex flex-col gap-4">
              <Text variant="title-3" as="h2" className="px-5">
                Buttons
              </Text>
              <div className="flex flex-wrap items-center gap-4 px-5">
                <Button size="small">Small</Button>
                <Button>Regular</Button>
                <Button size="large">Large</Button>
                <Button variant="plain">Plain</Button>
                <Button disabled>Disabled</Button>
                <ToggleButton defaultPressed>Selected</ToggleButton>
              </div>
              <div className="flex flex-wrap items-center gap-4 px-5">
                <Button shape="rounded" size="small">Rounded</Button>
                <Button shape="rounded">Rounded</Button>
                <Button shape="rounded" size="large">Rounded</Button>
                <IconButton label="Add" size="mini"><Plus /></IconButton>
                <IconButton label="Add" size="small"><Plus /></IconButton>
                <IconButton label="Share"><Share /></IconButton>
                <IconButton label="Add" size="large"><Plus /></IconButton>
                <IconButton label="Add" size="extra-large"><Plus /></IconButton>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <Text variant="title-3" as="h2" className="px-5">
                Segmented control
              </Text>
              <SegmentedControl
                className="px-5"
                label="Segments"
                defaultValue="b"
                options={[
                  { value: "a", label: "Label" },
                  { value: "b", label: "Label" },
                  { value: "c", label: "Label" },
                ]}
              />
            </section>

            <section className="flex flex-col gap-4">
              <Text variant="title-3" as="h2" className="px-5">
                Toolbar
              </Text>
              <Ornament aria-label="Toolbar" className="self-start">
                {["Label", "Label", "Label", "Label"].map((label, index) => (
                  <OrnamentItem
                    key={index}
                    render={<ToggleButton appearance="toolbar" defaultPressed={index === 1} />}
                  >
                    {label}
                  </OrnamentItem>
                ))}
              </Ornament>
            </section>

            <section className="flex flex-col items-start gap-3 px-5">
              <Text variant="title-3" as="h2">Disabled states</Text>
              <div className="flex flex-wrap items-center gap-4">
                <Button disabled>Disabled button</Button>
                <Button disabled variant="plain">Disabled plain</Button>
                <IconButton disabled label="Disabled share"><Share /></IconButton>
                <ToggleButton disabled defaultPressed>Disabled selected</ToggleButton>
                <ToggleButton disabled appearance="toolbar" defaultPressed>Disabled toolbar</ToggleButton>
              </div>
              <SegmentedControl label="Disabled segments" disabled defaultValue="b" options={[
                { value: "a", label: "First" },
                { value: "b", label: "Selected" },
                { value: "c", label: "Third" },
              ]} />
              <SegmentedControl label="Partly disabled segments" defaultValue="a" options={[
                { value: "a", label: "Enabled" },
                { value: "b", label: "Disabled", disabled: true },
              ]} />
              <div className="flex items-start gap-7">
                <TabBar label="Disabled view example" defaultValue="enabled" tabs={[
                  { value: "enabled", label: "Enabled view", icon: <Plus /> },
                  { value: "disabled", label: "Disabled view", icon: <Share />, disabled: true },
                ]} />
                <Sidebar label="Disabled sidebar example" title="Sidebar">
                  <SidebarItem icon={<Plus />} current>Enabled item</SidebarItem>
                  <SidebarItem icon={<Share />} disabled counter={42}>Disabled item</SidebarItem>
                </Sidebar>
              </div>
            </section>

            <section className="flex flex-col items-start gap-3 px-5">
              <Text variant="title-3" as="h2">
                Alerts
              </Text>
              <StatusBadge level="advisory">Dust opacity rising</StatusBadge>
              <StatusBadge level="caution">Walkback margin under 30 min</StatusBadge>
              <StatusBadge level="warning">Solar particle event</StatusBadge>
            </section>
          </div>
        </div>
      </Window>
    </main>
  );
}
