import React from "react";
import { AbsoluteFill } from "remotion";
import { HabitatConsole } from "./HabitatConsole";
import { ConsoleMap } from "./ui/screens";

export const ProofConsole: React.FC = () => (
  <AbsoluteFill><HabitatConsole left={<ConsoleMap state="after" />} /></AbsoluteFill>
);
