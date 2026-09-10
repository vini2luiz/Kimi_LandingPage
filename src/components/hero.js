import { subscribe } from "../lib/ticker.js";
import { splitReveal, playReveal, revealOnEnter } from "../lib/text-reveal.js";
import { revealOnView } from "../lib/scroll.js";
import { initContourBackdrop } from "../lib/contours.js";
import { ASSET_BASE_URL } from "../data/assets.js";

export function initHero(root) {
  initMasthead(root);
  initMobileSheet(root);
  initEntranceReveals(root);
  initContourBackdrop(root.querySelector("#hero-contour-canvas"), "--surface-soft");
  initScene(root);
}

function initMasthead(root) {
  const masthead = root.querySelector(".hero-masthead");
  window.setTimeout(() => masthead.classList.add("is-in"), 0);
}

function initMobileSheet(root) {
  const sheet = document.getElementById("mobile-menu-sheet");
  const openBtn = root.querySelector("#hero-burger-btn");
  const closeBtn = document.getElementById("mobile-menu-close");
  if (!sheet || !openBtn || !closeBtn) return;

  const open = () => {
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    closeBtn.focus();
  };
  const close = () => {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    openBtn.focus();
  };
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    const focusable = Array.from(sheet.querySelectorAll("a[href], button")).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  const mq = window.matchMedia("(min-width: 1280px)");
  mq.addEventListener("change", (e) => { if (e.matches) close(); });
}

function initEntranceReveals(root) {
  const driverId = root.querySelector(".hero-driver-id");
  const nameEl = root.querySelector("#hero-name-h1");
  const nameLine = splitReveal(nameEl, { unit: "word", stagger: 110 });
  const metaItems = Array.from(root.querySelectorAll(".hero-meta-item"));
  const panelsCol = root.querySelector("[data-hero-panels]");
  const actionsRow = root.querySelector(".hero-actions-row");
  const statValues = Array.from(root.querySelectorAll(".stat-value"));
  statValues.forEach((el) => splitReveal(el, { unit: "letter", stagger: 26 }));

  window.setTimeout(() => {
    driverId.classList.add("is-in");
    playReveal(nameLine);
  }, 180);
  metaItems.forEach((item, i) => {
    window.setTimeout(() => item.classList.add("is-in"), 180 + 260 + i * 130);
  });
  window.setTimeout(() => {
    panelsCol.classList.add("is-in");
    for (const line of panelsCol.querySelectorAll(".reveal-line")) playReveal(line);
  }, 900);
  window.setTimeout(() => actionsRow.classList.add("is-in"), 1500);
}

function initScene(root) {
  const canvas = root.querySelector("#hero-canvas");
  const veil = document.getElementById("loading-veil");
  const veilFill = veil?.querySelector(".veil-helmet-fill");
  const meterFill = veil?.querySelector(".veil-meter-fill");
  const errorBanner = document.getElementById("asset-error-banner");

  // The meter creeps toward 0.7 while loading, then a stiffer step finishes it on ready.
  requestAnimationFrame(() => {
    meterFill.style.transition = "transform 4s cubic-bezier(0.1,0.7,0.2,1)";
    veilFill.style.transition = "transform 4s cubic-bezier(0.1,0.7,0.2,1)";
    meterFill.style.transform = "scaleX(0.7)";
    veilFill.style.transform = "scaleY(0.7)";
  });

  // three.js + loaders live in their own chunk, fetched only here — off the critical path for the rest of the page.
  import("../scene/HeroScene.js")
    .then(({ HeroScene }) => bootScene(HeroScene, { root, canvas, veil, veilFill, meterFill, errorBanner }))
    .catch((error) => {
      if (errorBanner) {
        errorBanner.textContent = `Falha ao carregar o motor 3D: ${error?.message ?? error}`;
        errorBanner.hidden = false;
      }
      veil?.classList.add("is-hidden");
    });
}

function bootScene(HeroScene, { root, canvas, veil, veilFill, meterFill, errorBanner }) {
  const scene = new HeroScene(canvas, {
    assetsBase: ASSET_BASE_URL,
    onReady: () => {
      meterFill.style.transition = "transform 260ms cubic-bezier(0.2,0,0,1)";
      veilFill.style.transition = "transform 260ms cubic-bezier(0.2,0,0,1)";
      meterFill.style.transform = "scaleX(1)";
      veilFill.style.transform = "scaleY(1)";
      veil.classList.add("is-ready");
      window.setTimeout(() => {
        veil.classList.add("is-clearing");
        window.setTimeout(() => {
          veil.classList.add("is-hidden");
          scene.beginRise();
        }, 240);
      }, 430);
    },
    onError: (message) => {
      if (!errorBanner) return;
      errorBanner.textContent = `Falha ao carregar asset: ${message}`;
      errorBanner.hidden = false;
      veil.classList.add("is-hidden");
    },
  });

  const resize = () => {
    const rect = root.getBoundingClientRect();
    scene.resize(rect.width, rect.height);
  };
  window.addEventListener("resize", resize);
  resize();

  const onPointerMove = (e) => {
    scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  let boundPointer = false;
  const applyTier = () => {
    const shouldBind = scene.tier.pointerEnabled;
    if (shouldBind && !boundPointer) {
      window.addEventListener("pointermove", onPointerMove);
      boundPointer = true;
    } else if (!shouldBind && boundPointer) {
      window.removeEventListener("pointermove", onPointerMove);
      boundPointer = false;
    }
  };
  applyTier();

  let widthBucket = window.innerWidth;
  window.addEventListener("resize", () => {
    if (Math.abs(window.innerWidth - widthBucket) > 40) {
      widthBucket = window.innerWidth;
      scene.retune();
      applyTier();
    }
  });

  subscribe(
    (time) => {
      const inViewRange = window.scrollY <= window.innerHeight * 1.15;
      if (document.visibilityState === "visible" && inViewRange) scene.update(time);
    },
    () => scene.tier.frameInterval
  );
}
