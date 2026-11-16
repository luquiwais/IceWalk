import React from "react";
import { Composition, Still } from "remotion";
import { GLOBAL_FRAMES, Global } from "./Global";
import { AstronautProof } from "./v2/AstronautProof";
import { Local } from "./Local";
import { GLOBAL_FILM_FRAMES, GlobalFilm } from "./v2/GlobalFilm";
import { LOCAL_FILM_FRAMES, LocalFilm } from "./v2/LocalFilm";
import { ConsoleScene, DrillScene, SurfaceScene, WalkRigProof } from "./scenes";
import { ProofConsole } from "./ProofConsole";
import { ArHud, Campaign, ConsoleMap, DepthColumn, EvaWindow, ReviewCard, Tools, Wrist } from "./ui/screens";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="GlobalFilm" component={GlobalFilm} durationInFrames={GLOBAL_FILM_FRAMES} fps={24} width={1920} height={1080} />
      <Composition id="AstronautProof" component={AstronautProof} durationInFrames={96} fps={24} width={1920} height={1080} />
      <Composition id="LocalFilm" component={LocalFilm} durationInFrames={LOCAL_FILM_FRAMES} fps={24} width={1920} height={1080} />
      <Composition id="Global" component={Global} durationInFrames={GLOBAL_FRAMES} fps={24} width={1920} height={1080} />
      <Composition id="WalkRigProof" component={WalkRigProof} durationInFrames={72} fps={24} width={1920} height={1080} />
      <Composition id="Local" component={Local} durationInFrames={4320} fps={24} width={1920} height={1080} />
      <Composition id="ConsoleScene" component={ConsoleScene} durationInFrames={120} fps={24} width={1920} height={1080} />
      <Composition id="DrillScene" component={DrillScene} durationInFrames={120} fps={24} width={1920} height={1080} />
      <Composition id="SurfaceScene" component={SurfaceScene} durationInFrames={120} fps={24} width={1920} height={1080} />
      <Still id="ConsoleMapBefore" component={() => <ConsoleMap state="before" />} width={1920} height={1080} />
      <Still id="ConsoleMapAfter" component={() => <ConsoleMap state="after" />} width={1920} height={1080} />
      <Still id="ConsoleUncBefore" component={() => <ConsoleMap state="before" layer="uncertainty" />} width={1920} height={1080} />
      <Still id="ConsoleUncAfter" component={() => <ConsoleMap state="after" layer="uncertainty" />} width={1920} height={1080} />
      <Still id="Review" component={() => <ReviewCard />} width={1920} height={1080} />
      <Still id="ReviewConfirmed" component={() => <ReviewCard confirmed />} width={1920} height={1080} />
      <Still id="WristResult" component={() => <Wrist mode="result" />} width={1000} height={640} />
      <Still id="WristClockArrival" component={() => <Wrist mode="clock-arrival" />} width={1000} height={640} />
      <Still id="WristClockEnd" component={() => <Wrist mode="clock-end" />} width={1000} height={640} />
      <Still id="ArHud" component={() => <ArHud />} width={1920} height={1080} />
      <Still id="DepthColumn" component={() => <DepthColumn />} width={1920} height={1080} />
      <Still id="Campaign" component={() => <Campaign />} width={1920} height={1080} />
      <Still id="EvaWindow" component={() => <EvaWindow />} width={1920} height={1080} />
      <Still id="Tools" component={() => <Tools />} width={1920} height={1080} />
      <Still id="ProofConsole" component={ProofConsole} width={1920} height={1080} />
    </>
  );
};
