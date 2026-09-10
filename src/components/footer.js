import { splitReveal, playReveal } from "../lib/text-reveal.js";
import { onScrollProgress } from "../lib/scroll.js";
import { initContourBackdrop } from "../lib/contours.js";

export function initFooter(root) {
  initContourBackdrop(root.querySelector("#footer-contour-canvas"), "--footer-contour");

  const logo = root.querySelector(".footer-logo");
  window.setTimeout(() => logo?.classList.add("is-in"), 120);

  const masthead = root.querySelector(".footer-masthead");
  const lines = Array.from(masthead?.querySelectorAll("[data-reveal-line]") ?? []);
  lines.forEach((line, i) => {
    const reveal = splitReveal(line, { unit: "word", stagger: 0 });
    window.setTimeout(() => playReveal(reveal), i * 130);
  });
  const mastheadDot = masthead?.querySelector(".reveal-dot");
  window.setTimeout(() => mastheadDot?.classList.add("is-in"), lines.length * 130 + 110);

  const navLinks = Array.from(root.querySelectorAll(".footer-nav-link"));
  navLinks.forEach((link, i) => {
    const line = splitReveal(link, { unit: "letter", stagger: 22 });
    window.setTimeout(() => playReveal(line), 260 + i * 80);
  });

  const footRow = root.querySelector(".footer-foot-row");
  window.setTimeout(() => footRow?.classList.add("is-in"), 640);

  const figure = root.querySelector(".footer-figure");
  if (figure) {
    onScrollProgress(root, (p) => {
      figure.style.transform = `translateY(${(1 - p) * 60}px)`;
    });
  }
}
