/**
 * billing-toggle.js
 * Bascule les box entre facturation mensuelle et paiement unique 6 mois.
 */
function initBillingToggle() {
  const toggle = document.querySelector("[data-billing-toggle]");
  if (!toggle) return;

  const options = toggle.querySelectorAll(".boxes__toggle-option");

  function setBilling(mode) {
    toggle.dataset.billingActive = mode;
    options.forEach((opt) => opt.classList.toggle("is-active", opt.dataset.billingOption === mode));

    document.querySelectorAll(".box-card").forEach((card) => {
      const valueEl = card.querySelector(".box-card__price-value");
      const unitEl = card.querySelector(".box-card__price-unit");
      const saveEl = card.querySelector("[data-save-upfront]");
      const ctaEl = card.querySelector(".box-card__cta");
      if (!valueEl) return;

      valueEl.classList.add("is-swapping");
      setTimeout(() => {
        valueEl.textContent = mode === "monthly" ? valueEl.dataset.priceMonthly : valueEl.dataset.priceUpfront;
        unitEl.textContent = mode === "monthly" ? unitEl.dataset.unitMonthly : unitEl.dataset.unitUpfront;
        valueEl.classList.remove("is-swapping");
      }, 180);

      if (saveEl) saveEl.hidden = mode !== "upfront";
      if (ctaEl) ctaEl.textContent = mode === "monthly" ? ctaEl.dataset.ctaMonthly : ctaEl.dataset.ctaUpfront;
    });
  }

  options.forEach((opt) => opt.addEventListener("click", () => setBilling(opt.dataset.billingOption)));
}

document.addEventListener("DOMContentLoaded", initBillingToggle);