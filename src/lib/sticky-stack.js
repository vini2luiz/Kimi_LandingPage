// Drives the recede effect on the pinned hero/season layers as the next block covers them.
const RECEDE_SCALE = 0.9;
const RECEDE_SHADE = 0.55;

export function initStickyStack(pins) {
  const phone = window.matchMedia("(max-width: 639px)");
  let ticking = false;

  const apply = () => {
    ticking = false;
    const view = window.innerHeight || 1;
    const shrink = phone.matches ? 0 : 1 - RECEDE_SCALE;
    for (const { inner, shade, next } of pins) {
      const p = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / view));
      inner.style.transform = p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : "";
      inner.style.willChange = p > 0 && shrink > 0 ? "transform" : "";
      shade.style.opacity = `${RECEDE_SHADE * p}`;
      inner.style.visibility = p >= 1 ? "hidden" : "visible";
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  apply();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
