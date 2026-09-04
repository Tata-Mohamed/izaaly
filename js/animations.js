/**
 * animations.js
 * Reveal au scroll (IntersectionObserver) + orchestration du hero.
 * Un seul geste fort au chargement (le hero), le reste répond au scroll
 * une seule fois par élément — pas d'animation permanente ni de parallax lourd.
 */

function initScrollReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/**
 * Découpe le titre du hero en mots enveloppés dans des <span> pour permettre
 * une révélation ligne par ligne (translateY masqué par overflow:hidden).
 */
function prepareHeroTitle() {
  const title = document.querySelector(".hero__title");
  if (!title || title.dataset.split === "true") return;

  const lines = title.textContent
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  title.innerHTML = lines
    .map((line, i) => `<span style="transition-delay:${i * 120}ms">${line}</span>`)
    .join("<br>");
  title.dataset.split = "true";
}

function playHeroIntro() {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => hero.classList.add("is-ready"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  prepareHeroTitle();
  initScrollReveal();
});

// Exposé pour être déclenché juste après la disparition du loader (main.js).
window.__izaalyPlayHeroIntro = playHeroIntro;

function initHowItWorksLine() {
  const steps = document.querySelector(".how-it-works__steps");
  if (!steps) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    steps.classList.add("is-line-active");
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          steps.classList.add("is-line-active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(steps);
}

document.addEventListener("DOMContentLoaded", initHowItWorksLine);

