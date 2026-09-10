// Damped spring solver — react-spring's algorithm, stepped at 1ms substeps
// (capped to a 64ms frame), mass 1, resting when both value and velocity settle.
import { subscribe } from "./ticker.js";

export const SPRINGS = {
  REVEAL: { tension: 90, friction: 26 },
  ROW: { tension: 170, friction: 24 },
  SHEET: { tension: 190, friction: 26 },
  TYPE: { tension: 210, friction: 24 },
  YEAR: { tension: 190, friction: 24 },
  COPY: { tension: 110, friction: 26 },
  NAME: { tension: 190, friction: 24 },
  CLEAR: { tension: 140, friction: 26 },
  YEAR_SETTLE: { tension: 32, friction: 26 },
};

export function createSpring({ tension, friction, mass = 1 }, precision = 0.01) {
  let value = 0;
  let velocity = 0;
  let target = 0;
  let unsubscribe = null;
  const listeners = new Set();

  const step = (dtMs) => {
    let remaining = Math.min(dtMs, 64);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1) / 1000;
      const springForce = -tension * (value - target);
      const dampingForce = -friction * velocity;
      const acceleration = (springForce + dampingForce) / mass;
      velocity += acceleration * dt;
      value += velocity * dt;
      remaining -= 1;
    }
    const atRest = Math.abs(velocity) < precision && Math.abs(target - value) < precision;
    if (atRest) {
      value = target;
      velocity = 0;
    }
    for (const listener of listeners) listener(value);
    return atRest;
  };

  const ensureRunning = () => {
    if (unsubscribe) return;
    let last = performance.now();
    unsubscribe = subscribe((now) => {
      const dt = now - last;
      last = now;
      if (step(dt)) {
        unsubscribe?.();
        unsubscribe = null;
      }
    }, () => 0);
  };

  return {
    set(next, immediate = false) {
      target = next;
      if (immediate) {
        value = next;
        velocity = 0;
        for (const listener of listeners) listener(value);
      } else {
        ensureRunning();
      }
    },
    get value() { return value; },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
