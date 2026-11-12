/**
 * SwiftUI Spring model: WWDC23 “Animate with springs”, 19:26.
 * https://developer.apple.com/videos/play/wwdc2023/10158/
 * Presets checked against public SwiftUI Spring.{smooth,snappy,bouncy} on macOS.
 * This reproduces the public spring model, not Apple's private glass shader.
 */
function springParameters(duration: number, bounce: number) {
  if (!(duration > 0) || !Number.isFinite(duration) || !Number.isFinite(bounce) || bounce <= -1 || bounce >= 1)
    throw new RangeError("A settling spring needs positive duration and -1 < bounce < 1");
  const frequency = 2 * Math.PI / duration;
  const ratio = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  return { mass: 1, stiffness: frequency ** 2, damping: 2 * frequency * ratio };
}

/** Unit step response with zero initial velocity, including critical damping. */
function springPosition(time: number, duration: number, bounce: number) {
  const { stiffness, damping } = springParameters(duration, bounce);
  if (time <= 0) return 0;
  const w = Math.sqrt(stiffness);
  const z = damping / (2 * w);
  if (Math.abs(z - 1) < 1e-8) return 1 - (1 + w * time) * Math.exp(-w * time);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * time) * (Math.cos(wd * time) + z * w / wd * Math.sin(wd * time));
  }
  const root = Math.sqrt(z * z - 1);
  const a = -w * (z - root), b = -w * (z + root);
  return 1 + (b * Math.exp(a * time) - a * Math.exp(b * time)) / (a - b);
}

/** Sample the physical response over its playback time, without time compression. */
function springEasing(duration: number, bounce: number, playback = duration * 2) {
  return `linear(${Array.from({ length: 121 }, (_, i) => {
    if (i === 0) return "0";
    if (i === 120) return "1";
    return Number(springPosition(i / 120 * playback, duration, bounce).toFixed(5));
  }).join(", ")})`;
}

const SPRINGS = {
  // Public Spring.settlingDuration read from SwiftUI alongside the presets.
  // `duration` below is playback; `perceptualDuration` is Apple's input.
  smooth: { duration: 800, perceptualDuration: 500, bounce: 0, easing: springEasing(.5, 0, .8) },
  snappy: { duration: 876.8271225053476, perceptualDuration: 500, bounce: .15, easing: springEasing(.5, .15, .8768271225053476) },
  bouncy: { duration: 1044.713090512012, perceptualDuration: 500, bounce: .3, easing: springEasing(.5, .3, 1.044713090512012) },
};

/** Eitan's speed calibration: preserve spring shape with a shorter web pace.
 * These playback durations intentionally differ from native SwiftUI presets.
 */
const WEB_MOTION = { selection: 280, surface: 360, exit: 140, contentEnter: 160, contentExit: 120 };

export { springParameters, springPosition, springEasing, SPRINGS, WEB_MOTION };
