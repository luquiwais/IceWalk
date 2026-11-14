"use client";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Footnote, Title3 } from "@icewalk/ui/text";
import { useState } from "react";

/**
 * First-person reference for the crew: what mid-latitude northern plains look like from the
 * ground. Viking Lander 2 (Utopia Planitia, 48°N) is the closest landed analogue to S1094b
 * (35°N plains); it is NOT the site. Public domain, NASA/JPL (docs/SOURCES.md).
 */
const VIEWS = {
  panorama: {
    label: "Landing site",
    src: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00399/PIA00399.jpg",
    caption: "Viking Lander 2, Utopia Planitia: boulder-strewn plains on landing day (PIA00399).",
  },
  frost: {
    label: "Water frost",
    src: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00571/PIA00571.jpg",
    caption: "Viking Lander 2: seasonal water-ice frost on the same plains (PIA00571).",
  },
} as const;

export function SurfaceAnalog() {
  const [view, setView] = useState<keyof typeof VIEWS>("panorama");
  const v = VIEWS[view];
  return (
    <section aria-label="Surface analogue" className="mission-stack">
      <Title3 as="h3">What you will see · surface analogue</Title3>
      <SegmentedControl label="Analogue view" value={view} options={Object.entries(VIEWS).map(([value, o]) => ({ value, label: o.label }))} onValueChange={(value) => setView(value as keyof typeof VIEWS)} />
      {/* eslint-disable-next-line @next/next/no-img-element -- external NASA asset, shown as is */}
      <img className="mission-analog-image" src={v.src} alt={v.caption} loading="lazy" />
      <Footnote tone="secondary">{v.caption} Closest landed analogue (48°N); not S1094b. NASA/JPL.</Footnote>
    </section>
  );
}
