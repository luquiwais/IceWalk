import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge only knows Tailwind's default scales. Register the visionOS
 * text styles and colors from app/globals.css, or `text-caption-1` would be
 * dropped as a conflict of `text-label`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
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
      ],
      color: [
        "label",
        "label-secondary",
        "label-tertiary",
        "label-disabled",
        "selected",
        "on-selected",
        "separator",
        "advisory",
        "caution",
        "warning",
      ],
      radius: ["window", "row", "segment"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
