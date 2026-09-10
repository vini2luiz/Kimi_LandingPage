// Device tier for the hero scene — decided at construction, re-read on
// container width changes or a flip of the pointer class.
const CAP_60 = 1000 / 60 - 2;

function isEnergySaver() {
  const nav = navigator;
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 2;
}

export function getSceneTier() {
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const width = window.innerWidth;
  const name = width < 768 || (coarse && width < 1024) ? "mobile" : coarse || width < 1280 ? "tablet" : "desktop";
  const mobile = name === "mobile";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saver = isEnergySaver();

  return {
    name,
    mobile,
    coarsePointer: coarse,
    reducedMotion,
    maxDpr: mobile ? 1 : name === "tablet" ? 1.25 : 1.5,
    frameInterval: name === "desktop" ? 0 : CAP_60,
    pointerEnabled: !coarse && !reducedMotion,
    antialias: name === "desktop",
    freeze: reducedMotion || (mobile && saver),
  };
}
