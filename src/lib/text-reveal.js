// Splits text into word or letter spans for a staggered reveal, keeping an
// accessible plain-text copy and hiding the animated spans from AT.
export function splitReveal(element, { unit = "word", stagger = 0, delay = 0 } = {}) {
  const text = element.textContent.trim();
  const hidden = document.createElement("span");
  hidden.className = "visually-hidden";
  hidden.textContent = text;

  const line = document.createElement("span");
  line.className = unit === "letter" ? "reveal-line is-letters" : "reveal-line";
  line.setAttribute("aria-hidden", "true");

  // Word units are spaced by the line's column-gap, so whitespace never becomes a unit of its own.
  const parts = unit === "letter" ? Array.from(text) : text.split(/\s+/).filter((s) => s !== "");
  parts.forEach((part, i) => {
    const span = document.createElement("span");
    span.className = unit === "letter" ? "reveal-unit is-letter" : "reveal-unit";
    span.textContent = part === " " ? "\u00A0" : part;
    span.style.transitionDelay = `${delay + i * stagger}ms`;
    line.appendChild(span);
  });

  element.replaceChildren(hidden, line);
  return line;
}

// A heading's trailing dot sits outside its last split line; pull it in so it
// hugs the final word instead of dropping onto a line of its own.
export function attachTrailingDot(heading) {
  const dot = heading.querySelector(":scope > .reveal-dot");
  const lines = heading.querySelectorAll(".reveal-line");
  if (dot && lines.length) lines[lines.length - 1].appendChild(dot);
}

export function playReveal(line) {
  for (const unit of line.querySelectorAll(".reveal-unit")) unit.classList.add("is-in");
}

// Wires an IntersectionObserver that plays the reveal once the container enters view.
export function revealOnEnter(container, line, { rootMargin = "0% 0% -25% 0%" } = {}) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      playReveal(line);
      observer.unobserve(container);
    }
  }, { rootMargin, threshold: 0.1 });
  observer.observe(container);
}
