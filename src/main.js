import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/hero.css";
import "./styles/season.css";
import "./styles/timeline.css";
import "./styles/paddock.css";
import "./styles/footer.css";

import { initLenis } from "./lib/lenis.js";
import { initStickyStack } from "./lib/sticky-stack.js";
import { initHero } from "./components/hero.js";
import { initSeason } from "./components/season.js";
import { initTimeline } from "./components/timeline.js";
import { initPaddock } from "./components/paddock.js";
import { initFooter } from "./components/footer.js";

history.scrollRestoration = "manual";
window.scrollTo(0, 0);

function updateRootFont() {
  if (window.innerWidth > 1920) {
    document.documentElement.style.fontSize = `${(16 * window.innerWidth) / 1920}px`;
  } else {
    document.documentElement.style.fontSize = "";
  }
}
window.addEventListener("resize", updateRootFont);
updateRootFont();

initLenis();

initStickyStack([
  {
    inner: document.getElementById("inner-hero"),
    shade: document.getElementById("shade-hero"),
    next: document.getElementById("layer-season"),
  },
  {
    inner: document.getElementById("inner-season"),
    shade: document.getElementById("shade-season"),
    next: document.getElementById("layer-timeline"),
  },
]);

initHero(document.querySelector("[data-hero]"));
initSeason(document.querySelector("[data-season]"));
initTimeline(document.querySelector("[data-timeline]"));
initPaddock(document.querySelector("[data-paddock]"));
initFooter(document.querySelector("[data-footer]"));
