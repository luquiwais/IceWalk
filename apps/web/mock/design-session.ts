/** Illustrative yield comparison only. Every use must display "Illustrative".
 * No execution, safety, consumable or alert values belong in this fixture.
 */
export const designSession = {
  toolYield: [
    { id: "gpr", label: "Radar", reachM: 10, stationsPerFind: 1, evidence: "Indirect" },
    { id: "core_drill", label: "Core drill", reachM: 1, stationsPerFind: 17, evidence: "Direct" },
    { id: "neutron_spectrometer", label: "Neutron", reachM: 0.6, stationsPerFind: 165, evidence: "Indirect" },
  ],
} as const;
