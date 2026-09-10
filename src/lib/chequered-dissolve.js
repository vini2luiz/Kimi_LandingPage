// The chequered-flag seam between two blocks: solid rows breaking into a chequerboard
// that burns off as the reader scrolls the seam past the top of the viewport.
const SOLID_UNTIL = 0.16;
const LIFT = 2;
const ACCENT_SHARE = 0.06;

function noise(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function initChequeredDissolve(canvas, { carry = "light" } = {}) {
  const ctx = canvas.getContext("2d");
  const cell = 24;
  let progress = 0;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  };

  const render = () => {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const c = cell * ratio;
    const columns = Math.ceil(w / c);
    const rows = Math.ceil(h / c);
    const lift = progress * LIFT;
    const surface = getComputedStyle(document.documentElement).getPropertyValue(
      carry === "light" ? "--background" : "--surface-black"
    ).trim();
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = surface;
    for (let y = 0; y < rows; y += 1) {
      const depth = y / Math.max(1, rows - 1) + lift;
      if (depth > 1) break;
      const solid = depth <= SOLID_UNTIL;
      const fade = Math.min(1, Math.max(0, 1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL)));
      if (!solid && fade <= 0) break;
      for (let x = 0; x < columns; x += 1) {
        if (!solid) {
          if ((x + y) % 2 !== 0) continue;
          if (noise(x, y) > fade) continue;
        }
        ctx.fillStyle = !solid && noise(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
        ctx.fillRect(x * c, y * c, c, c);
      }
    }
  };

  const onResize = () => { resize(); render(); };
  window.addEventListener("resize", onResize);
  resize();

  return {
    setProgress(p) { progress = p; render(); },
    destroy() { window.removeEventListener("resize", onResize); },
  };
}
