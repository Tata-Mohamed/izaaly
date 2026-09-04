/**
 * collection-video.js
 * Charge et joue la vidéo d'une tuile de collection uniquement quand elle
 * devient visible à l'écran, puis la joue au survol / la met en pause à la
 * sortie. Reste silencieux et léger sur mobile (pas de hover).
 */
function initCollectionVideos() {
  const tiles = document.querySelectorAll(".collection-tile");
  if (!tiles.length) return;

  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Précharge les métadonnées seulement quand la tuile approche du viewport.
  const loadObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const video = entry.target.querySelector(".collection-tile__video");
        if (video && video.preload === "none") {
          video.preload = "metadata";
        }
        loadObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "200px" }
  );
  tiles.forEach((tile) => loadObserver.observe(tile));

  if (isTouch || reduceMotion) return; // pas de hover sur tactile, pas d'auto-lecture si reduced-motion

  tiles.forEach((tile) => {
    const video = tile.querySelector(".collection-tile__video");
    if (!video) return;

    tile.addEventListener("mouseenter", () => {
      video.currentTime = 0;
      video.play().then(() => tile.classList.add("is-video-playing")).catch(() => {});
    });

    tile.addEventListener("mouseleave", () => {
      tile.classList.remove("is-video-playing");
      video.pause();
    });
  });
}

document.addEventListener("DOMContentLoaded", initCollectionVideos);