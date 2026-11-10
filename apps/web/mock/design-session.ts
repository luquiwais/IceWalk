import { demoReplan, type Plan } from "@/lib/plan";

/** UI-only fixtures requested by Eitan. These are illustrative, not planner output.
 * Keep execution, tool yield, map samples and communications out of API contracts.
 */
export const designSession = {
  elapsedMin: 65,
  oneWayDelayMin: 12,
  oxygenRemainingMin: 355,
  batteryPercent: 82,
  headingDeg: 40,
  distanceToStationM: 180,
  localRadiusM: 150,
  localAmbiguityBefore: 0.94,
  localAmbiguityAfter: 0.61,
  toolYield: [
    {
      id: "gpr",
      label: "Radar",
      reachM: 10,
      stationsPerFind: 1,
      evidence: "Indirect",
      role: "Survey along the traverse",
    },
    {
      id: "core_drill",
      label: "Core drill",
      reachM: 1,
      stationsPerFind: 17,
      evidence: "Direct",
      role: "Confirm ice within reach",
    },
    {
      id: "neutron_spectrometer",
      label: "Neutron",
      reachM: 0.6,
      stationsPerFind: 165,
      evidence: "Indirect",
      role: "Measure near-surface hydrogen",
    },
  ],
} as const;

export type DesignLayer =
  "potential" | "uncertainty" | "traversability" | "targets" | "imagery";
export const designLayers: { id: DesignLayer; label: string }[] = [
  { id: "potential", label: "Ice potential" },
  { id: "uncertainty", label: "Uncertainty" },
  { id: "traversability", label: "Traversability" },
  { id: "targets", label: "Targets" },
  { id: "imagery", label: "Surface" },
];

/** A visible caution for the design scenario, not a new safety threshold. */
export const designReplan: Plan = {
  ...demoReplan,
  alerts: [
    {
      level: "caution",
      message:
        "Replan leaves 2.2 min minimum walkback. Review before approval.",
      source: "design fixture",
    },
    ...(demoReplan.alerts ?? []),
  ],
};
