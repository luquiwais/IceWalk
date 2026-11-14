"use client";

import { ListRow, ListSection } from "@icewalk/ui/list";
import { Collapse } from "@icewalk/ui/motion";
import { useId, useState, type ReactNode } from "react";

/** A real disclosure using the kit's inset list row, typography, material and chevron. */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="mission-disclosure">
      <ListSection>
        <ListRow
          expanded={open}
          controls={open ? id : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          {title}
        </ListRow>
      </ListSection>
      <Collapse open={open} id={id}>
        <div className="mission-disclosure-content">{children}</div>
      </Collapse>
    </div>
  );
}
