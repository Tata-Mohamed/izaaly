/**
 * best-sellers-carousel.js
 * Transforme la grille "Les préférés" en carrousel swipeable sur mobile,
 * avec des points de navigation synchronisés au scroll, et une petite
 * animation d'invitation au swipe au premier chargement.
 */
function initBestSellersCarousel() {
  const grid = document.getElementById("best-sellers-grid");
  const dotsWrap = document.querySelector("[data-carousel-dots]");
  if (!grid || !dotsWrap) return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (!isMobile) return;

  const cards = [...grid.querySelectorAll(".product-card")];
  if (!cards.length) return;

  dotsWrap.innerHTML = cards.map((_, i) => `<span data-dot="${i}"${i === 0 ? ' class="is-active"' : ""}></span>`).join("");
  const dots = [...dotsWrap.querySelectorAll("span")];

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      cards[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const idx = cards.indexOf(entry.target);
          dots.forEach((d) => d.classList.remove("is-active"));
          dots[idx]?.classList.add("is-active");
        }
      });
    },
    { root: grid, threshold: [0.6] }
  );
  cards.forEach((c) => observer.observe(c));

  // Invitation subtile au swipe : léger va-et-vient au premier chargement
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    setTimeout(() => {
      grid.scrollTo({ left: 24, behavior: "smooth" });
      setTimeout(() => grid.scrollTo({ left: 0, behavior: "smooth" }), 450);
    }, 900);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Attendre le rendu des cartes (fait juste après par le script inline de index.html)
  setTimeout(initBestSellersCarousel, 50);
});