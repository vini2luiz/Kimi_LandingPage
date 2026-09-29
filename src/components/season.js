import { splitReveal, playReveal, attachTrailingDot } from "../lib/text-reveal.js";
import { initChequeredDissolve } from "../lib/chequered-dissolve.js";
import { onScrollProgress } from "../lib/scroll.js";
import { CIRCUIT_VIEW, CIRCUIT_PATH, CIRCUIT_MARKERS } from "../data/circuit.js";

const LAP_MS = 6000;
const COOL_MS = 800;
const LINE_WIDTH = 5.9;
const GLOW_WIDTH = 15;
const HEAD_UNITS = 210;
const MARKER_POP_UNITS = 90;

const CUMULATIVE = CIRCUIT_PATH.reduce((acc, point, i) => {
  if (i === 0) return [0];
  const prev = CIRCUIT_PATH[i - 1];
  acc.push(acc[i - 1] + Math.hypot(point[0] - prev[0], point[1] - prev[1]));
  return acc;
}, []);
const TOTAL = CUMULATIVE[CUMULATIVE.length - 1];

// The lap's own bounds inside the 1440x800 artboard, padded for the marker glow.
const TRACK = (() => {
  const pad = 30;
  const xs = CIRCUIT_PATH.map((p) => p[0]);
  const ys = CIRCUIT_PATH.map((p) => p[1]);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  return { width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
})();

// Cover-fits the artboard, unless that would crop the lap itself (portrait screens):
// then the track is contained and centred so every corner marker stays on screen.
function fitCircuit(w, h) {
  const cover = Math.max(w / CIRCUIT_VIEW.width, h / CIRCUIT_VIEW.height);
  if (TRACK.width * cover <= w * 0.94) {
    return { scale: cover, ox: (w - CIRCUIT_VIEW.width * cover) / 2, oy: (h - CIRCUIT_VIEW.height * cover) / 2 };
  }
  const scale = Math.min((w * 0.9) / TRACK.width, (h * 0.5) / TRACK.height);
  return { scale, ox: w / 2 - TRACK.cx * scale, oy: h / 2 - TRACK.cy * scale };
}

function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }

function distanceAtTime(time) {
  return Math.min(1, Math.max(0, easeInOutSine(time))) * TOTAL;
}

function trailUpTo(distance) {
  const out = [];
  for (let i = 0; i < CIRCUIT_PATH.length; i += 1) {
    if (CUMULATIVE[i] <= distance) { out.push(CIRCUIT_PATH[i]); continue; }
    const a = CIRCUIT_PATH[i - 1];
    const b = CIRCUIT_PATH[i];
    const ratio = (distance - CUMULATIVE[i - 1]) / (CUMULATIVE[i] - CUMULATIVE[i - 1]);
    out.push([a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]);
    break;
  }
  return out;
}

function rgba([r, g, b], alpha) { return `rgb(${r} ${g} ${b} / ${alpha})`; }
function mix(a, b, t) { return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)); }

function readPalette() {
  const parse = (v) => {
    const el = document.createElement("span");
    el.style.cssText = `position:absolute;visibility:hidden;color:${v}`;
    document.body.appendChild(el);
    const [r, g, b] = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
    el.remove();
    return [r, g, b];
  };
  const accent = parse("var(--accent)");
  const white = parse("var(--foreground-on-dark)");
  return { accent, white, bright: mix(accent, white, 0.55) };
}

function drawTrail(ctx, points, scale, palette, heat) {
  if (points.length < 2) return;
  const width = Math.max(2, LINE_WIDTH * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const stroke = (from = 0) => {
    ctx.beginPath();
    ctx.moveTo(points[from][0] * scale, points[from][1] * scale);
    for (let i = from + 1; i < points.length; i += 1) ctx.lineTo(points[i][0] * scale, points[i][1] * scale);
    ctx.stroke();
  };

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(palette.accent, 0.05);
  ctx.lineWidth = GLOW_WIDTH * scale;
  stroke();
  ctx.strokeStyle = rgba(palette.accent, 0.1);
  ctx.lineWidth = GLOW_WIDTH * 0.45 * scale;
  stroke();
  ctx.restore();

  const head = Math.max(2, Math.round(HEAD_UNITS / 3));
  const from = Math.max(0, points.length - head);
  const tip = points[points.length - 1];
  const hot = ctx.createLinearGradient(points[from][0] * scale, points[from][1] * scale, tip[0] * scale, tip[1] * scale);
  hot.addColorStop(0, rgba(palette.accent, 0));
  hot.addColorStop(0.45, rgba(palette.accent, 0.9));
  hot.addColorStop(1, rgba(mix(palette.accent, palette.bright, heat), 1));
  ctx.strokeStyle = hot;
  ctx.lineWidth = width;
  stroke(from);

  const coreFrom = Math.max(0, points.length - Math.round(head * 0.42));
  if (points.length - coreFrom > 1) {
    const core = ctx.createLinearGradient(points[coreFrom][0] * scale, points[coreFrom][1] * scale, tip[0] * scale, tip[1] * scale);
    core.addColorStop(0, rgba(palette.bright, 0));
    core.addColorStop(1, rgba(palette.white, 0.95 * heat));
    ctx.strokeStyle = core;
    ctx.lineWidth = Math.max(width * 0.25, width * 0.38);
    stroke(coreFrom);
  }
}

export function initSeason(root) {
  initHeadingReveal(root);
  initPlateReveal(root);
  initChequeredSeam(root);
  initCircuit(root);
}

function initHeadingReveal(root) {
  const heading = root.querySelector(".season-heading-h2");
  const lines = Array.from(heading.querySelectorAll("[data-reveal-line]"));
  lines.forEach((line, i) => {
    const reveal = splitReveal(line, { unit: "word", stagger: 0 });
    window.setTimeout(() => playReveal(reveal), i * 130);
  });
  attachTrailingDot(heading);
  const dot = heading.querySelector(".reveal-dot");
  window.setTimeout(() => dot?.classList.add("is-in"), lines.length * 130 + 110);

  const rule = root.querySelector(".season-rule");
  window.setTimeout(() => rule.classList.add("is-in"), 260);

  const intro = root.querySelector(".season-intro");
  const introLine = splitReveal(intro, { unit: "word", stagger: 34 });
  window.setTimeout(() => playReveal(introLine), 350);
}

function initPlateReveal(root) {
  const plate = root.querySelector(".standings-plate-svg");
  window.setTimeout(() => plate.classList.add("is-in"), 260);
  const letters = Array.from(plate.querySelectorAll("[data-reveal-letters]"));
  letters.forEach((el) => {
    const line = splitReveal(el, { unit: "letter", stagger: 22 });
    window.setTimeout(() => playReveal(line), 430);
  });
}

function initChequeredSeam(root) {
  const canvas = root.querySelector(".chequered-dissolve-canvas");
  if (!canvas) return;
  const dissolve = initChequeredDissolve(canvas, { carry: "light" });
  onScrollProgress(root, (p) => dissolve.setProgress(1 - p));
}

function initCircuit(root) {
  const canvas = root.querySelector("#trace-canvas");
  const ctx = canvas.getContext("2d");
  const stage = root.querySelector(".season-stage");
  let palette = null;
  let lap = 0;
  let heat = 1;
  let lapStart = null;
  let coolStart = null;
  let armed = false;
  let done = false;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stage.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  };

  const render = () => {
    if (!palette) palette = readPalette();
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;
    const { scale, ox, oy } = fitCircuit(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, ox, oy);

    const distance = distanceAtTime(lap);
    const points = trailUpTo(distance);
    if (points.length > 1) drawTrail(ctx, points, scale, palette, heat);

    for (const marker of CIRCUIT_MARKERS) {
      if (distance < marker.d) continue;
      const age = Math.min(1, (distance - marker.d) / MARKER_POP_UNITS);
      const radius = (12 + (1 - age) * 14) * scale;
      const mx = marker.x * scale;
      const my = marker.y * scale;
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, radius);
      glow.addColorStop(0, rgba(palette.bright, 0.5 + 0.45 * (1 - age)));
      glow.addColorStop(0.45, rgba(palette.accent, 0.32));
      glow.addColorStop(1, rgba(palette.accent, 0));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const frame = (now) => {
    if (done) return;
    requestAnimationFrame(frame);
    if (!armed) return;
    if (lapStart === null) lapStart = now;
    const lapElapsed = now - lapStart;
    if (lapElapsed <= LAP_MS) {
      lap = lapElapsed / LAP_MS;
    } else {
      lap = 1;
      if (coolStart === null) coolStart = now;
      const coolElapsed = now - coolStart;
      heat = coolElapsed >= COOL_MS ? 0 : 1 - coolElapsed / COOL_MS;
      if (coolElapsed >= COOL_MS) done = true;
    }
    render();
  };

  window.addEventListener("resize", () => { resize(); render(); });
  resize();
  render();

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !armed) {
      armed = true;
      requestAnimationFrame(frame);
      observer.disconnect();
    }
  }, { threshold: 0.35 });
  observer.observe(stage);
}
