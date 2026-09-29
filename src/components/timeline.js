import { splitReveal, playReveal, attachTrailingDot } from "../lib/text-reveal.js";
import { onScrollProgress } from "../lib/scroll.js";
import { initChequeredDissolve } from "../lib/chequered-dissolve.js";
import { TIMELINE_ENTRIES } from "../data/timeline.js";
import { PLATE_CLIP, PLATE_OUTLINE, PLATE_VIEW } from "../data/plate-shape.js";

const CLIP_ID = "timeline-plate-clip";

function buildRow(entry) {
  const row = document.createElement("div");
  row.className = `timeline-row${entry.frame === "side" ? " is-side" : ""}`;

  const plate = document.createElement("div");
  const align = entry.frame === "side" ? entry.align : "center";
  plate.className = `timeline-plate align-${align}`;
  plate.style.clipPath = `url(#${CLIP_ID})`;

  const outline = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  outline.setAttribute("class", "timeline-plate-outline");
  outline.setAttribute("viewBox", `0 0 ${PLATE_VIEW.width} ${PLATE_VIEW.height}`);
  outline.setAttribute("preserveAspectRatio", "none");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", PLATE_OUTLINE);
  outline.appendChild(path);
  plate.appendChild(outline);

  const img = document.createElement("img");
  img.className = "timeline-plate-photo";
  img.src = entry.image;
  img.alt = entry.alt;
  img.loading = "lazy";
  plate.appendChild(img);
  row.appendChild(plate);

  const year = document.createElement("div");
  year.className = "timeline-year";
  year.textContent = String(entry.year);
  row.appendChild(year);

  if (entry.frame === "centre") {
    const copy = document.createElement("p");
    copy.className = "timeline-copy";
    copy.innerHTML = `<b>${entry.title}</b> ${entry.copy}`;
    row.appendChild(copy);
  }

  return { row, year, isCentre: entry.frame === "centre" };
}

function initTitleReveal(root) {
  const heading = root.querySelector(".timeline-title-h2");
  const lines = Array.from(heading.querySelectorAll("[data-reveal-line]"));
  lines.forEach((line, i) => {
    const reveal = splitReveal(line, { unit: "word", stagger: 0 });
    window.setTimeout(() => playReveal(reveal), i * 130);
  });
  attachTrailingDot(heading);
  const dot = heading.querySelector(".reveal-dot");
  window.setTimeout(() => dot?.classList.add("is-in"), lines.length * 130 + 110);
}

export function initTimeline(root) {
  initTitleReveal(root);
  const wrapper = root.querySelector(".timeline-wrapper");
  const defsHost = root.querySelector("#timeline-clip-defs");
  defsHost.innerHTML = `<clipPath id="${CLIP_ID}" clipPathUnits="objectBoundingBox"><path d="${PLATE_CLIP}"/></clipPath>`;

  const rows = TIMELINE_ENTRIES.map(buildRow);
  for (const { row } of rows) wrapper.appendChild(row);

  for (const { row, year, isCentre } of rows) {
    const yearLine = splitReveal(year, { unit: "letter", stagger: 26 });
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      playReveal(yearLine);
      if (isCentre) window.setTimeout(() => year.classList.add("is-settled"), 2200);
      observer.unobserve(row);
    }, { rootMargin: "0% 0% -25% 0%", threshold: 0.1 });
    observer.observe(row);

    const copy = row.querySelector(".timeline-copy");
    if (copy) {
      const copyObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        window.setTimeout(() => copy.classList.add("is-in"), 220);
        copyObserver.unobserve(row);
      }, { rootMargin: "0% 0% -25% 0%", threshold: 0.1 });
      copyObserver.observe(row);
    }
  }

  for (const { row } of rows) {
    row.addEventListener("pointerenter", (e) => {
      // Touch fires enter on every scroll gesture that starts on a plate — dimming is a mouse affordance.
      if (e.pointerType !== "mouse") return;
      root.classList.add("is-dim-others");
      for (const { row: r } of rows) r.style.opacity = r === row ? "1" : "";
    });
    row.addEventListener("pointerleave", () => root.classList.remove("is-dim-others"));
  }

  initRail(root);
  initChequeredSeam(root);
}

function initRail(root) {
  const thread = root.querySelector("#timeline-thread");
  const rotator = root.querySelector("#timeline-rotator");
  if (!thread || !rotator) return;
  onScrollProgress(root, (p) => {
    thread.style.height = `${p * 100}%`;
    rotator.style.top = `${p * 100}%`;
    rotator.style.transform = `translate(-50%, -50%) rotate(${p * 1800}deg)`;
  });
}

function initChequeredSeam(root) {
  const canvas = root.querySelector(".chequered-dissolve-canvas");
  if (!canvas) return;
  const dissolve = initChequeredDissolve(canvas, { carry: "light" });
  onScrollProgress(root, (p) => dissolve.setProgress(1 - p));
}
