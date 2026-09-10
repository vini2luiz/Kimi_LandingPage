// Reference-counted rAF ticker — subscribers register (callback, getFramerate);
// a subscriber is called only once time-since-last exceeds its own budget.
const subscribers = new Set();
let rafId = null;

function tick(now) {
  for (const sub of Array.from(subscribers)) {
    const budget = sub.getFramerate ? sub.getFramerate() : 0;
    if (now - sub.lastCall > budget) {
      sub.lastCall = now;
      sub.callback(now);
    }
  }
  rafId = requestAnimationFrame(tick);
}

export function subscribe(callback, getFramerate = () => 0) {
  const sub = { callback, getFramerate, lastCall: 0 };
  subscribers.add(sub);
  if (subscribers.size === 1 && rafId === null) {
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    subscribers.delete(sub);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

export const CAP_60 = 1000 / 60 - 2;
