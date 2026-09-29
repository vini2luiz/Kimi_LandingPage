import { splitReveal, playReveal, attachTrailingDot } from "../lib/text-reveal.js";
import { revealOnView, onScrollProgress } from "../lib/scroll.js";
import { initContourBackdrop } from "../lib/contours.js";
import { initChequeredDissolve } from "../lib/chequered-dissolve.js";
import { CALENDAR_ROUNDS, PADDOCK_STATS } from "../data/calendar.js";

function buildCalendar(root) {
  const list = root.querySelector(".calendar-strip-list");
  list.innerHTML = "";
  for (const round of CALENDAR_ROUNDS) {
    const li = document.createElement("li");
    li.className = `calendar-round-item${round.live ? " is-live" : ""}`;
    li.innerHTML = `
      <span class="calendar-round-num">${round.round}${round.live ? " <span class=\"calendar-live-pulse\"></span>" : ""}</span>
      <span class="calendar-round-name">${round.name}</span>
      <span class="calendar-round-date">${round.date}</span>
    `;
    list.appendChild(li);
  }
  revealOnView(Array.from(list.children), { stagger: 90 });
}

function buildStats(root) {
  const rows = Array.from(root.querySelectorAll(".paddock-stats-row"));
  rows.forEach((row, i) => {
    const value = row.querySelector(".paddock-stat-value");
    if (!value) return;
    value.textContent = PADDOCK_STATS[i]?.value ?? value.textContent;
    const line = splitReveal(value, { unit: "letter", stagger: 24 });
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      window.setTimeout(() => playReveal(line), i * 90);
      observer.unobserve(row);
    }, { threshold: 0.2 });
    observer.observe(row);
  });
}

export function initPaddock(root) {
  initContourBackdrop(root.querySelector("#paddock-contour-canvas"), "--paddock-contour");

  const canvas = root.querySelector(".chequered-dissolve-canvas");
  if (canvas) {
    const dissolve = initChequeredDissolve(canvas, { carry: "dark" });
    onScrollProgress(root, (p) => dissolve.setProgress(1 - p));
  }

  const heading = root.querySelector(".paddock-intro-head");
  const lines = Array.from(heading.querySelectorAll("[data-reveal-line]"));
  lines.forEach((line, i) => {
    const reveal = splitReveal(line, { unit: "word", stagger: 0 });
    window.setTimeout(() => playReveal(reveal), i * 130);
  });
  attachTrailingDot(heading);
  const headingDot = heading.querySelector(".reveal-dot");
  window.setTimeout(() => headingDot?.classList.add("is-in"), lines.length * 130 + 110);

  const cta = root.querySelector(".paddock-cta");
  window.setTimeout(() => cta?.classList.add("is-in"), 520);

  const portrait = root.querySelector(".paddock-portrait");
  if (portrait) {
    onScrollProgress(root, (p) => {
      portrait.style.transform = `translateX(-50%) translateY(${(1 - p) * 48}px)`;
    });
  }

  buildStats(root);
  buildCalendar(root);
}
