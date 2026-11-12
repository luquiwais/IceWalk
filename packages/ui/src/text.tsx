import type * as React from "react";

import { cn } from "./utils";

/*
 * Text styles from the visionOS 26 kit (Figma: Text Styles), as components, so a style is picked
 * by name like in Figma. Sizes are points (rem) and scale with the viewport (theme.css).
 * Server components: plain semantic HTML.
 *
 *   style         size/line   weight
 *   xl-title-1    48/56       bold
 *   xl-title-2    38/46       bold
 *   large-title   29/38       bold
 *   title-1       24/32       bold
 *   title-2       22/28       bold
 *   title-3       19/24       bold
 *   headline      17/22       bold
 *   body          17/22       medium (510)
 *   callout       15/20       semibold (590)
 *   subheadline   15/20       regular
 *   footnote      13/18       medium
 *   caption-1/2   12/16       medium
 */

type TextVariant =
  | "xl-title-1"
  | "xl-title-2"
  | "large-title"
  | "title-1"
  | "title-2"
  | "title-3"
  | "headline"
  | "body"
  | "callout"
  | "subheadline"
  | "footnote"
  | "caption-1"
  | "caption-2";

/** Label colors (Figma: Labels/*). `inherit` keeps the parent's color. */
type TextTone = "primary" | "secondary" | "tertiary" | "disabled" | "inherit";

type TextWeight = "regular" | "medium" | "semibold" | "bold";

const VARIANT: Record<TextVariant, string> = {
  "xl-title-1": "font-display text-xl-title-1",
  "xl-title-2": "font-display text-xl-title-2",
  "large-title": "font-display text-large-title",
  "title-1": "font-display text-title-1",
  "title-2": "font-display text-title-2",
  "title-3": "text-title-3",
  headline: "text-headline",
  body: "text-body",
  callout: "text-callout",
  subheadline: "text-subheadline",
  footnote: "text-footnote",
  "caption-1": "text-caption-1",
  "caption-2": "text-caption-2",
};

const TONE: Record<TextTone, string> = {
  primary: "text-label",
  secondary: "text-label-secondary",
  tertiary: "text-label-tertiary",
  disabled: "text-label-disabled",
  inherit: "",
};

const WEIGHT: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

type TextElement = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "dt" | "dd" | "label" | "strong";

type TextProps = Omit<React.HTMLAttributes<HTMLElement>, "color"> & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides the style's weight, e.g. Body semibold for button labels. */
  weight?: TextWeight;
  /** Element to render. Pick headings for document structure. Default: p. */
  as?: TextElement;
  id?: string;
};

function Text({ variant = "body", tone = "primary", weight, as: Element = "p", className, ...props }: TextProps) {
  return (
    <Element
      data-text-style={variant}
      className={cn(VARIANT[variant], TONE[tone], weight && WEIGHT[weight], className)}
      {...props}
    />
  );
}

type StyleProps = Omit<TextProps, "variant">;

function styled(variant: TextVariant, displayName: string) {
  function Styled(props: StyleProps) {
    return <Text variant={variant} {...props} />;
  }
  Styled.displayName = displayName;
  return Styled;
}

const XLTitle1 = styled("xl-title-1", "XLTitle1");
const XLTitle2 = styled("xl-title-2", "XLTitle2");
const LargeTitle = styled("large-title", "LargeTitle");
const Title1 = styled("title-1", "Title1");
const Title2 = styled("title-2", "Title2");
const Title3 = styled("title-3", "Title3");
const Headline = styled("headline", "Headline");
const Body = styled("body", "Body");
const Callout = styled("callout", "Callout");
const Subheadline = styled("subheadline", "Subheadline");
const Footnote = styled("footnote", "Footnote");
const Caption1 = styled("caption-1", "Caption1");
const Caption2 = styled("caption-2", "Caption2");

export {
  Body,
  Callout,
  Caption1,
  Caption2,
  Footnote,
  Headline,
  LargeTitle,
  Subheadline,
  Text,
  Title1,
  Title2,
  Title3,
  XLTitle1,
  XLTitle2,
};
export type { TextProps, TextTone, TextVariant, TextWeight };
