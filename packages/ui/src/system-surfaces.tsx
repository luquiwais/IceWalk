"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import { Button, IconButton } from "./button";
import { SurfaceScroll } from "./material";
import { useMorphPopup } from "./morph-popup";
import { Presence } from "./motion";
import { Text } from "./text";
import { cn } from "./utils";

type SystemAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

const BACKDROP = "ui-pop fixed inset-0 z-40 bg-black/25";
const VIEWPORT = "fixed inset-0 z-50 flex items-center justify-center p-4";

/** A sheet that grows out of the button that opened it (Fluid Kit Morph) and goes back into it. */
function SystemDialog({
  trigger,
  title,
  description,
  children,
  className,
  open,
  onOpenChange,
}: {
  trigger: ReactElement;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const popup = useMorphPopup({ open, onOpenChange });
  return (
    <Dialog.Root {...popup.root}>
      <Dialog.Trigger ref={popup.trigger} render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Viewport className={VIEWPORT}>
          <Dialog.Popup
            ref={popup.popup}
            className={cn("lb ui-panel flex max-h-[calc(100dvh-2rem)] w-[27.25rem] max-w-full flex-col text-label outline-none", className)}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 pb-4">
              <Dialog.Title className="text-title-3">{title}</Dialog.Title>
              <Dialog.Close render={<IconButton label="Close" showTooltip={false} />}>
                <X aria-hidden />
              </Dialog.Close>
            </div>
            {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : null}
            <SurfaceScroll className="px-6 pb-6">{children}</SurfaceScroll>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** An alert that grows out of its button: title, message and a column of actions. */
function Alert({
  trigger,
  title,
  description,
  icon,
  actions,
  children,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  icon?: ReactNode;
  actions: SystemAction[];
  children?: ReactNode;
}) {
  const popup = useMorphPopup();
  return (
    <Dialog.Root {...popup.root}>
      <Dialog.Trigger ref={popup.trigger} render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Viewport className={VIEWPORT}>
          <Dialog.Popup
            ref={popup.popup}
            role="alertdialog"
            className="lb ui-panel flex max-h-[calc(100dvh-2rem)] w-[18.75rem] max-w-full flex-col p-4 text-center text-label outline-none"
          >
            {/* -m/p 1.5: room for the focus outline of full-width actions, which the scroller would clip. */}
            <SurfaceScroll className="-m-1.5 flex flex-col items-center gap-2 p-1.5">
              {icon ? (
                <span aria-hidden className="flex size-13 shrink-0 items-center justify-center rounded-full [&_svg]:size-7">
                  {icon}
                </span>
              ) : null}
              <div className="w-full px-4 py-2">
                <Dialog.Title className="text-headline">{title}</Dialog.Title>
                <Dialog.Description render={<Text variant="footnote" tone="secondary" className="mt-1" />}>
                  {description}
                </Dialog.Description>
              </div>
              {children}
              {/* iOS 26 alert: capsule actions on gray fills, side by side when there are two */}
              <div className={cn("mt-2 grid w-full gap-2", actions.length === 2 && "grid-cols-2")}>
                {actions.map((action, i) => (
                  <Dialog.Close
                    key={action.label}
                    render={
                      <Button
                        size="large"
                        disabled={action.disabled}
                        onClick={action.onClick}
                        className={cn("w-full", i === 0 && "font-semibold", action.destructive && "text-warning")}
                      />
                    }
                  >
                    {action.label}
                  </Dialog.Close>
                ))}
              </div>
            </SurfaceScroll>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Notification glass: thinner and a little more saturated than a window. */
const NOTIFICATION = "lb";

function Notification({
  title,
  message,
  app,
  icon,
  time = "now",
  preview,
  actions = [],
  onDismiss,
  className,
}: {
  title: string;
  message: string;
  app: string;
  icon?: ReactNode;
  time?: string;
  preview?: ReactNode;
  actions?: SystemAction[];
  onDismiss?: () => void;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <Presence present={!dismissed}>
      <article
        aria-label={`${app} notification`}
        className={cn(NOTIFICATION, "flex w-[27.25rem] max-w-full flex-col gap-4 rounded-[2.875rem] px-6 py-5 text-label", className)}
      >
        <header className="flex items-center gap-4">
          {icon ? (
            <span aria-hidden className="flex size-13 shrink-0 items-center justify-center rounded-full [&_svg]:size-7">
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <Text variant="headline">{app}</Text>
            <Text variant="footnote" tone="secondary">{time}</Text>
          </span>
          {onDismiss ? (
            <IconButton label="Dismiss notification" showTooltip={false} onClick={() => { setDismissed(true); onDismiss(); }}>
              <X aria-hidden />
            </IconButton>
          ) : null}
        </header>
        <div>
          <Text variant="headline">{title}</Text>
          <Text variant="subheadline">{message}</Text>
        </div>
        {preview ? <div className="overflow-clip rounded-2xl">{preview}</div> : null}
        {actions.map((action) => (
          <Button key={action.label} disabled={action.disabled} onClick={action.onClick} className="w-full">
            {action.label}
          </Button>
        ))}
      </article>
    </Presence>
  );
}

function TemporaryNotice({
  title,
  subtitle,
  icon,
  action,
  onDismiss,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: SystemAction;
  onDismiss: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <Presence present={!dismissed}>
      <div role="status" className={cn(NOTIFICATION, "flex max-w-full flex-wrap items-center gap-3 rounded-[3rem] p-4 text-label")}>
        <IconButton label="Dismiss notice" size="small" variant="plain" showTooltip={false} onClick={() => { setDismissed(true); onDismiss(); }}>
          <X aria-hidden />
        </IconButton>
        {icon ? <span aria-hidden className="flex size-11 items-center justify-center [&_svg]:size-6">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <Text variant="headline" className="leading-6">{title}</Text>
          {subtitle ? <Text variant="subheadline" tone="secondary" className="-mt-1 leading-6">{subtitle}</Text> : null}
        </div>
        {action ? <Button disabled={action.disabled} onClick={action.onClick}>{action.label}</Button> : null}
      </div>
    </Presence>
  );
}

function SharePlayActivity({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  actions: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }[];
  className?: string;
}) {
  return (
    <div className={cn(NOTIFICATION, "flex w-[27.25rem] max-w-full flex-wrap items-center gap-4 rounded-[2.875rem] p-5 text-label", className)}>
      {icon ? <span aria-hidden className="flex size-13 items-center justify-center rounded-full [&_svg]:size-7">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <Text variant="headline">{title}</Text>
        <Text variant="callout" tone="secondary">{subtitle}</Text>
      </div>
      {actions.map((action) => (
        <Button key={action.label} aria-label={action.label} disabled={action.disabled} onClick={action.onClick} size="large" className="w-21">
          {action.icon}
        </Button>
      ))}
    </div>
  );
}

export { Alert, Notification, SharePlayActivity, SystemDialog, TemporaryNotice };
export type { SystemAction };
