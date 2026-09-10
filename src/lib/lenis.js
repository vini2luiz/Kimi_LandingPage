// Lenis smooth scroll, riding the shared ticker so every scroll reader sees this frame's scrollY.
import Lenis from "lenis";
import { subscribe } from "./ticker.js";

let lenis = null;

export function initLenis() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return null;
  lenis = new Lenis({ smoothWheel: true });
  subscribe((time) => lenis.raf(time), () => 0);
  return lenis;
}

export function getLenis() {
  return lenis;
}
