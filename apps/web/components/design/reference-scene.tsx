import { Button, IconButton } from "@icewalk/ui/button";
import { Sidebar, SidebarItem, SidebarSection } from "@icewalk/ui/sidebar";
import { TabBar } from "@icewalk/ui/tab-bar";
import { NavigationBar, Window, WindowControls } from "@icewalk/ui/window";
import { ChevronDown, ChevronLeft, SquareDashed } from "lucide-react";

/** Lucide symbols, optically sized to the kit's SF Symbol slots. */
function ReferenceSymbol({ name, width, height }: { name: string; width: number; height: number }) {
  const Icon = name === "back" ? ChevronLeft : name === "section-chevron" ? ChevronDown : SquareDashed;
  return <Icon aria-hidden strokeWidth={2} className="shrink-0" style={{ width: `${width / 16}rem`, height: `${height / 16}rem` }} viewBox={Icon === SquareDashed ? "2 2 20 20" : "5 5 14 14"} />;
}

const icon = <ReferenceSymbol name="sidebar-square" width={20} height={20} />;
const tabIcon = <ReferenceSymbol name="tab-square" width={18} height={18} />;

const TABS = [1, 2, 3, 4, 5].map((n) => ({ value: `tab-${n}`, label: `Tab ${n}`, icon: tabIcon }));

function Group() {
  return (
    <SidebarSection heading="Section Heading" disclosureIcon={<ReferenceSymbol name="section-chevron" width={12} height={7} />}>
      <SidebarItem icon={icon} counter={42}>
        Title
      </SidebarItem>
      {[1, 2, 3, 4, 5].map((n) => (
        <SidebarItem key={n} icon={icon}>
          Title
        </SidebarItem>
      ))}
    </SidebarSection>
  );
}

/**
 * 1:1 replica of the kit's "Sidebar and Tab Bar" example (Figma node
 * 420:4149), in its 1920x1080pt frame, to compare pixel by pixel with Figma.
 * View it with a 1920x1080 viewport (1pt = 1px).
 */
export function ReferenceScene() {
  return (
    <main className="relative h-[67.5rem] w-[120rem] shrink-0 overflow-hidden bg-[url(/reference/visionos-room.jpg)] bg-cover bg-center">
      <h1 className="sr-only">Reference: Sidebar and Tab Bar</h1>
      <div className="absolute top-[11.25rem] left-[14rem] flex h-[45rem] items-center gap-7">
        <TabBar label="Tabs" tabs={TABS} defaultValue="tab-1" />
        <Window aria-labelledby="ref-title" className="h-full w-[80rem]">
          <Sidebar label="Sidebar" title="Title" titleId="ref-title" action={<Button>Edit</Button>}>
            <SidebarItem icon={icon} counter={42}>
              Title
            </SidebarItem>
            <SidebarItem icon={icon} current>
              Title
            </SidebarItem>
            <SidebarItem icon={icon}>Title</SidebarItem>
            <Group />
            <Group />
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col">
            <NavigationBar
              title="Title"
              leading={
                <IconButton label="Back">
                  <ReferenceSymbol name="back" width={10} height={17} />
                </IconButton>
              }
              trailing={<IconButton label="Action">{tabIcon}</IconButton>}
            />
          </div>
        </Window>
      </div>
      <WindowControls className="absolute top-[56.25rem] left-[20rem] w-[80rem]" />
    </main>
  );
}
