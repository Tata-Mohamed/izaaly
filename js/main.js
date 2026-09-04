/**
 * main.js
 * Point d'entrée : loader de marque, puis délégation aux autres modules.
 * navigation.js, animations.js, cart.js et products.js s'initialisent eux-mêmes
 * sur DOMContentLoaded — ce fichier gère le loader (qui doit précéder le reste
 * visuellement) et les formulaires (contact + newsletter).
 */

function initLoader() {
  const loader = document.querySelector(".loader");
  if (!loader) {
    window.__izaalyPlayHeroIntro?.();
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minDuration = reduceMotion ? 0 : 1200;
  const start = performance.now();

  loader.classList.add("is-animating");

  const finish = () => {
    const elapsed = performance.now() - start;
    const wait = Math.max(0, minDuration - elapsed);
    setTimeout(() => {
      loader.classList.add("loader--done");
      window.__izaalyPlayHeroIntro?.();
      setTimeout(() => loader.remove(), reduceMotion ? 0 : 900);
    }, wait);
  };

  if (document.readyState === "complete") {
    finish();
  } else {
    window.addEventListener("load", finish, { once: true });
    // Filet de sécurité : ne jamais bloquer le site plus de 3s si "load" tarde.
    setTimeout(finish, 3000);
  }
}

/**
 * Formulaire de contact — simulation front-end uniquement pour le moment.
 * Pour brancher un vrai endpoint : remplacer le bloc marqué ci-dessous par un
 * fetch() vers votre API (voir README > "Brancher le formulaire").
 */
function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const submitBtn = form.querySelector("[data-contact-submit]");
  const successMsg = form.querySelector("[data-contact-success]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;

    // ---- Début du bloc à remplacer par un vrai appel API ----
    await new Promise((resolve) => setTimeout(resolve, 1100));
    // ---- Fin du bloc à remplacer ----

    submitBtn.classList.remove("is-loading");
    submitBtn.disabled = false;
    form.reset();
    successMsg?.classList.add("is-visible");
    setTimeout(() => successMsg?.classList.remove("is-visible"), 5000);
  });
}

function initNewsletterForm() {
  const form = document.querySelector("[data-newsletter-form]");
  if (!form) return;

  const msg = form.querySelector("[data-newsletter-msg]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const button = form.querySelector("button");
    button.disabled = true;
    await new Promise((resolve) => setTimeout(resolve, 700));
    button.disabled = false;
    form.reset();
    if (msg) msg.textContent = "Merci — votre univers IZAALY vous attend dans votre boîte mail.";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLoader();
  initContactForm();
  initNewsletterForm();
});
