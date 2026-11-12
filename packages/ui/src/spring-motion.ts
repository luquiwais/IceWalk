import { spring, type KeyframeGenerator } from "motion";

type SpringState = { position: number; velocity: number };
type SpringOptions = { from: number; to: number; velocity: number; duration: number; bounce: number };
type SpringTrack = SpringOptions & { generator: KeyframeGenerator<number> };

/** Motion owns the physical solver; this wrapper maps the web response speed
 * to physical parameters and finds its actual subpixel settling time.
 * No duration spring: those discard incoming velocity in Motion14.12. */
function createSpringTrack(options: SpringOptions): SpringTrack {
  const frequency = 9.2 / (options.duration / 1000);
  const ratio = options.bounce >= 0 ? 1 - options.bounce : 1 / (1 + options.bounce);
  const generator = spring({ keyframes: [options.from, options.to], velocity: options.velocity,
    mass: 1, stiffness: frequency ** 2, damping: 2 * frequency * ratio,
    restDelta: .001, restSpeed: .01,
  });
  let duration = 0;
  while (!generator.next(duration).done && duration < 20000) duration += 1000 / 120;
  if (duration >= 20000) throw new RangeError("A spatial spring must settle within20seconds");
  return { ...options, duration, generator };
}

function springState(track: SpringTrack, elapsed: number): SpringState {
  if (elapsed <= 0) return { position: track.from, velocity: track.velocity };
  // Motion's next() result is mutable: copy value before any other sample.
  const sample = track.generator.next(elapsed), position = sample.value, done = sample.done;
  return { position, velocity: done ? 0 : (track.generator.velocity?.(elapsed) ?? 0) };
}

/** Sample once per target; WAAPI plays on the compositor without JS callbacks. */
function springFrames(tracks: SpringTrack[], paint: (values: number[], velocities: number[]) => Keyframe): Keyframe[] {
  const duration = Math.max(0, ...tracks.map(track => track.duration));
  const count = Math.max(2, Math.ceil(duration / 1000 * 120));
  return Array.from({ length: count + 1 }, (_, index) => {
    const offset = index / count;
    const state = tracks.map(track => springState(track, offset * duration));
    return { ...paint(state.map(s => s.position), state.map(s => s.velocity)), offset };
  });
}

export { createSpringTrack, springFrames, springState };
export type { SpringState, SpringTrack };
