"use client";

import { Check, Users } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import { Button } from "./button";
import { ListRow, ListSection } from "./list";
import { Material, SurfaceScroll } from "./material";
import { Presence } from "./motion";
import { SystemDialog } from "./system-surfaces";
import { Text } from "./text";
import { cn } from "./utils";

type ShareDestination = {
  id: string;
  name: string;
  icon: ReactNode;
  disabled?: boolean;
};
function ShareSheet({
  trigger,
  title,
  subtitle,
  contacts,
  destinations,
  onShare,
  collaboration = true,
}: {
  trigger: ReactElement;
  title: string;
  subtitle?: string;
  contacts: ShareDestination[];
  destinations: ShareDestination[];
  onShare: (destination: string) => void;
  collaboration?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <SystemDialog
      trigger={trigger}
      title="Share"
      description={`Share ${title}`}
      className="w-[23.75rem] rounded-[2.5rem]"
    >
      <div className="flex flex-col gap-4">
        <div>
          <Text variant="headline">{title}</Text>
          {subtitle ? (
            <Text variant="subheadline" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </div>
        {collaboration ? (
          <Material
            kind="regular"
            className="flex items-center gap-3 rounded-2xl p-4"
          >
            <Users aria-hidden className="relative size-6" />
            <div className="relative">
              <Text variant="body">Collaborate</Text>
              <Text variant="footnote" tone="secondary">
                Invite people to this space
              </Text>
            </div>
          </Material>
        ) : null}
        <SurfaceScroll direction="horizontal" className="-mx-2">
          <div className="flex gap-1 px-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                disabled={contact.disabled}
                aria-pressed={selected === contact.id}
                onClick={() => setSelected(contact.id)}
                className="flex w-21 shrink-0 flex-col items-center gap-1 rounded-2xl p-2 outline-none hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-label disabled:opacity-30"
              >
                <span className="relative flex size-13 items-center justify-center rounded-full bg-fill-tertiary [&_svg]:size-6">
                  {contact.icon}
                  {selected === contact.id ? (
                    <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-accent">
                      <Check aria-hidden className="size-3" />
                    </span>
                  ) : null}
                </span>
                <Text
                  as="span"
                  variant="caption-1"
                  className="max-w-full truncate"
                >
                  {contact.name}
                </Text>
              </button>
            ))}
          </div>
        </SurfaceScroll>
        <Presence present={Boolean(selected)}>
          <Button onClick={() => { if (selected) onShare(selected); }}>
            Share with {contacts.find((c) => c.id === selected)?.name}
          </Button>
        </Presence>
        <ListSection>
          <>
            {destinations.map((destination) => (
              <ListRow key={destination.id}>
                <button
                  type="button"
                  disabled={destination.disabled}
                  onClick={() => onShare(destination.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:outline-2 focus-visible:outline-label",
                    destination.disabled && "text-label-disabled",
                  )}
                >
                  <span>{destination.name}</span>
                  <span aria-hidden className="[&_svg]:size-5">
                    {destination.icon}
                  </span>
                </button>
              </ListRow>
            ))}
          </>
        </ListSection>
      </div>
    </SystemDialog>
  );
}
export { ShareSheet };
export type { ShareDestination };
