// Lightweight in-view reveal: adds `is-in` once an element enters the viewport (optionally once).
export function revealOnView(elements, { rootMargin = "0% 0% -20% 0%", once = true, className = "is-in", stagger = 0 } = {}) {
  const list = Array.isArray(elements) ? elements : [elements];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const index = list.indexOf(entry.target);
      const delay = stagger ? index * stagger : 0;
      window.setTimeout(() => entry.target.classList.add(className), delay);
      if (once) observer.unobserve(entry.target);
    }
  }, { rootMargin, threshold: 0.1 });
  for (const el of list) if (el) observer.observe(el);
  return observer;
}

// Scroll progress of an element's crossing, 0 at "enters bottom" to 1 at "leaves top".
export function scrollProgress(element) {
  const rect = element.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const total = rect.height + vh;
  const traveled = vh - rect.top;
  return Math.min(1, Math.max(0, traveled / total));
}

// Runs `callback(progress)` on scroll + resize, coalesced into one rAF, while the element is
// in view (plus a short trailing margin) — the "loop in view" rule every scroll-driven effect uses.
export function onScrollProgress(element, callback) {
  let inView = false;
  let ticking = false;
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) run();
  }, { rootMargin: "20% 0px 20% 0px" });
  io.observe(element);

  const run = () => {
    ticking = false;
    if (!inView) return;
    callback(scrollProgress(element));
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(run);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  run();
  return () => {
    io.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
