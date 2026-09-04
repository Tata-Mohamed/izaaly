/**
 * navigation.js
 * Header sticky + blur, menu mobile fullscreen, curseur personnalisé desktop,
 * et voile de transition entre les pages.
 */

function initHeaderScroll() {
  const header = document.querySelector(".header");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".mobile-menu");
  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.remove("is-open");
    toggle.classList.remove("is-active");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.classList.toggle("is-active", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  menu.querySelectorAll(".mobile-menu__link").forEach((link) => {
    link.addEventListener("click", close);
  });
}

function initCustomCursor() {
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (isTouch) return;

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  let raf = null;
  document.addEventListener("mousemove", (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      cursor.classList.add("is-visible");
      raf = null;
    });
  });

  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));

  document.querySelectorAll("[data-cursor-text]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursor.textContent = el.dataset.cursorText;
      cursor.classList.add("is-text");
    });
    el.addEventListener("mouseleave", () => {
      cursor.textContent = "";
      cursor.classList.remove("is-text");
    });
  });
}

/**
 * Transition de page : un voile recouvre l'écran avant de naviguer vers une
 * page interne, puis se retire une fois la nouvelle page chargée.
 */
function initPageTransitions() {
  const veil = document.createElement("div");
  veil.className = "page-veil";
  document.body.appendChild(veil);

  // Retrait du voile à l'arrivée sur une nouvelle page.
  requestAnimationFrame(() => {
    veil.classList.add("is-leaving");
    setTimeout(() => veil.remove(), 700);
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      link.target === "_blank" ||
      link.hasAttribute("data-no-transition")
    ) {
      return;
    }

    link.addEventListener("click", (e) => {
      e.preventDefault();
      const nextVeil = document.createElement("div");
      nextVeil.className = "page-veil is-active";
      document.body.appendChild(nextVeil);
      requestAnimationFrame(() => nextVeil.classList.add("is-active"));
      setTimeout(() => {
        window.location.href = href;
      }, 550);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileMenu();
  initCustomCursor();
  initPageTransitions();
});
