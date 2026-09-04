/**
 * box-pricing.js
 * Gère le sélecteur de durée (3 / 6 / 12 mois) pour les box par abonnement
 * (Essentiel, Exception). La Découverte n'est pas affectée (prix fixe).
 */
function initBoxPricing() {
  const toggle = document.querySelector("[data-duration-toggle]");
  if (!toggle) return;

  const options = toggle.querySelectorAll(".duration-toggle__option");

  function setDuration(duration) {
    toggle.dataset.durationActive = duration;
    options.forEach((opt) => opt.classList.toggle("is-active", opt.dataset.duration === duration));

    document.querySelectorAll(".box-card[data-box]").forEach((card) => {
      const valueEl = card.querySelector(".box-card__price-value");
      const totalEl = card.querySelector(".box-card__total");
      if (!valueEl) return;

      valueEl.classList.add("is-swapping");
      setTimeout(() => {
        valueEl.textContent = valueEl.dataset[`price${duration}`];
        if (totalEl) totalEl.textContent = totalEl.dataset[`total${duration}`];
        valueEl.classList.remove("is-swapping");
      }, 180);
    });
  }

  options.forEach((opt) => opt.addEventListener("click", () => setDuration(opt.dataset.duration)));

  document.querySelectorAll("[data-box-cta-dynamic]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const boxName = btn.dataset.boxCtaDynamic === "essentiel" ? "L'Essentiel" : "L'Exception";
      const duration = toggle.dataset.durationActive;
      prefillContact(`Abonnement ${boxName} — ${duration} mois`);
    });
  });

  document.querySelectorAll("[data-box-cta]").forEach((btn) => {
    btn.addEventListener("click", () => prefillContact(btn.dataset.boxCta));
  });
}

function prefillContact(subjectText) {
  const subject = document.getElementById("sujet");
  if (subject) subject.value = subjectText;
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", initBoxPricing);