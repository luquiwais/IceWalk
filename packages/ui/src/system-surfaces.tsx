"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Button, IconButton } from "./button";
import { MaterialLayers, SurfaceScroll } from "./material";
import { Text } from "./text";
import { cn } from "./utils";

type SystemAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[3px]" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            className={cn(
              "vision-surface vision-popup-glass relative flex max-h-[calc(100dvh-2rem)] w-[27.25rem] max-w-full flex-col overflow-clip rounded-[2.875rem] text-label outline-none",
              className,
            )}
          >
            <MaterialLayers kind="glass" />
            <div className="relative flex shrink-0 items-center justify-between gap-4 px-6 pt-5 pb-4">
              <Dialog.Title className="text-title-3">{title}</Dialog.Title>
              <Dialog.Close
                render={<IconButton label="Close" showTooltip={false} />}
              >
                <X aria-hidden />
              </Dialog.Close>
            </div>
            {description ? (
              <Dialog.Description className="sr-only">
                {description}
              </Dialog.Description>
            ) : null}
            <SurfaceScroll className="relative px-6 pb-6">
              {children}
            </SurfaceScroll>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
  return (
    <Dialog.Root>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[3px]" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            role="alertdialog"
            className="vision-surface vision-popup-glass relative flex max-h-[calc(100dvh-2rem)] w-80 max-w-full flex-col overflow-clip rounded-[2rem] p-5 text-center text-label outline-none"
          >
            <MaterialLayers kind="glass" />
            <SurfaceScroll className="relative flex flex-col items-center gap-2">
              {icon ? (
                <span
                  aria-hidden
                  className="flex size-13 shrink-0 items-center justify-center rounded-full [&_svg]:size-7"
                >
                  {icon}
                </span>
              ) : null}
              <div className="w-full px-4 py-2">
                <Dialog.Title className="text-title-3">{title}</Dialog.Title>
                <Dialog.Description
                  render={
                    <Text
                      variant="subheadline"
                      tone="secondary"
                      className="mt-0.5"
                    />
                  }
                >
                  {description}
                </Dialog.Description>
              </div>
              {children}
              <span aria-hidden className="mb-1 h-px w-full bg-white/15" />
              {actions.map((action, i) => (
                <Dialog.Close
                  key={action.label}
                  render={
                    <Button
                      variant="plain"
                      shape="rounded"
                      disabled={action.disabled}
                      onClick={action.onClick}
                      className={cn(
                        "w-full rounded-2xl",
                        i > 0 && "font-normal",
                        action.destructive && "text-red-400",
                      )}
                    />
                  }
                >
                  {action.label}
                </Dialog.Close>
              ))}
            </SurfaceScroll>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Notification material, distinct from window glass: saturation + 34px blur. */
function NotificationMaterial() {
  return (
    <>
      <span aria-hidden className="vision-layer vision-notification-blur" />
      <span aria-hidden className="vision-layer vision-glass-stroke" />
    </>
  );
}

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
  return (
    <article
      aria-label={`${app} notification`}
      className={cn(
        "vision-surface relative flex w-[27.25rem] max-w-full flex-col gap-4 rounded-[2.875rem] px-6 py-5 text-label",
        className,
      )}
    >
      <NotificationMaterial />
      <header className="relative flex items-center gap-4">
        {icon ? (
          <span
            aria-hidden
            className="flex size-13 shrink-0 items-center justify-center rounded-full [&_svg]:size-7"
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <Text variant="headline">{app}</Text>
          <Text variant="footnote" tone="secondary">
            {time}
          </Text>
        </span>
        {onDismiss ? (
          <IconButton
            label="Dismiss notification"
            showTooltip={false}
            onClick={onDismiss}
          >
            <X aria-hidden />
          </IconButton>
        ) : null}
      </header>
      <div className="relative">
        <Text variant="headline">{title}</Text>
        <Text variant="subheadline">{message}</Text>
      </div>
      {preview ? (
        <div className="relative overflow-clip rounded-2xl">{preview}</div>
      ) : null}
      {actions.map((action) => (
        <Button
          key={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className="w-full"
        >
          {action.label}
        </Button>
      ))}
    </article>
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
  return (
    <div
      role="status"
      className="vision-surface relative flex max-w-full flex-wrap items-center gap-3 rounded-[3rem] p-4 text-label [--glass-stroke-width:0.75px]"
    >
      <NotificationMaterial />
      <IconButton
        label="Dismiss notice"
        size="small"
        variant="plain"
        showTooltip={false}
        onClick={onDismiss}
      >
        <X aria-hidden />
      </IconButton>
      {icon ? (
        <span
          aria-hidden
          className="flex size-11 items-center justify-center [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <div className="relative min-w-0 flex-1">
        <Text variant="headline" className="leading-6">
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="subheadline"
            tone="secondary"
            className="-mt-1 leading-6"
          >
            {subtitle}
          </Text>
        ) : null}
      </div>
      {action ? (
        <Button disabled={action.disabled} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
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
  actions: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "vision-surface relative flex w-[27.25rem] max-w-full flex-wrap items-center gap-4 rounded-[2.875rem] p-5 text-label",
        className,
      )}
    >
      <NotificationMaterial />
      {icon ? (
        <span
          aria-hidden
          className="flex size-13 items-center justify-center rounded-full [&_svg]:size-7"
        >
          {icon}
        </span>
      ) : null}
      <div className="relative min-w-0 flex-1">
        <Text variant="headline">{title}</Text>
        <Text variant="callout" tone="secondary">
          {subtitle}
        </Text>
      </div>
      {actions.map((action) => (
        <Button
          key={action.label}
          aria-label={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          size="large"
          className="w-21"
        >
          {action.icon}
        </Button>
      ))}
    </div>
  );
}

export {
  Alert,
  Notification,
  NotificationMaterial,
  SharePlayActivity,
  SystemDialog,
  TemporaryNotice,
};
export type { SystemAction };
