/**
 * builder.js
 * Configurateur pas-à-pas : type de bijou → forme → métal → détails → aperçu.
 * Remplace l'ancien configurateur 3D (custom-jewel.js, supprimé).
 */
function initJewelBuilder() {
  const overlay = document.querySelector(".builder-overlay");
  const modal = document.querySelector("[data-builder-modal]");
  const openBtn = document.querySelector("[data-open-builder]");
  if (!overlay || !modal || !openBtn) return;

  const steps = [...modal.querySelectorAll(".builder-step")];
  const progressFill = modal.querySelector("[data-builder-progress]");
  const progressLabels = [...modal.querySelectorAll("[data-progress-step]")];
  const backBtn = modal.querySelector("[data-builder-back]");
  const nextBtn = modal.querySelector("[data-builder-next]");

  const state = { type: null, shape: null, metal: null, details: [] };
  let current = 1;
  const total = steps.length;

  const metalLabels = { gold: "Or jaune", rose: "Or rose", silver: "Argent" };
  const metalColors = { gold: "#D4AF5A", rose: "#E3ADA0", silver: "#D7D7D9" };
  const shapeLabels = { classique: "Classique", torsade: "Torsadé", large: "Large", fin: "Fin" };
  const detailLabels = { pierre: "Pierre sertie", gravure: "Gravure personnalisée", mate: "Finition mate", aucun: "Aucun ajout" };
  const shapeStrokeWidth = { classique: 14, torsade: 12, large: 20, fin: 6 };

  function open() {
    overlay.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      modal.classList.add("is-open");
    });
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("is-open");
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      overlay.hidden = true;
      modal.hidden = true;
      resetBuilder();
    }, 350);
  }

  function resetBuilder() {
    current = 1;
    state.type = state.shape = state.metal = null;
    state.details = [];
    modal.querySelectorAll(".builder-option, .builder-swatch-option, .builder-chip").forEach((el) =>
      el.classList.remove("is-selected")
    );
    goToStep(1, "none");
  }

  function updateProgress() {
    progressFill.style.width = `${(current / total) * 100}%`;
    progressLabels.forEach((li) => {
      const stepNum = parseInt(li.dataset.progressStep, 10);
      li.classList.toggle("is-active", stepNum === current);
      li.classList.toggle("is-done", stepNum < current);
    });
  }

  function canProceed() {
    if (current === 1) return !!state.type;
    if (current === 2) return !!state.shape;
    if (current === 3) return !!state.metal;
    if (current === 4) return state.details.length > 0;
    return true;
  }

  function goToStep(stepNum, direction) {
    steps.forEach((step) => {
      const n = parseInt(step.dataset.step, 10);
      step.classList.remove("is-active", "is-leaving-back");
      if (n === stepNum) step.classList.add("is-active");
      if (direction === "back" && n === current) step.classList.add("is-leaving-back");
    });
    current = stepNum;
    updateProgress();
    backBtn.hidden = current === 1;
    nextBtn.textContent = current === total ? "" : "Continuer";
    nextBtn.hidden = current === total;
    nextBtn.disabled = !canProceed();
    if (current === total) renderSummary();
  }

  function renderSummary() {
    const summaryEl = modal.querySelector("[data-builder-summary]");
    const band = modal.querySelector("[data-preview-band]");
    const stone = modal.querySelector("[data-preview-stone]");

    summaryEl.innerHTML = `
      <li><span>Bijou</span><span>Bague</span></li>
      <li><span>Forme</span><span>${shapeLabels[state.shape] || "—"}</span></li>
      <li><span>Métal</span><span>${metalLabels[state.metal] || "—"}</span></li>
      <li><span>Détails</span><span>${state.details.map((d) => detailLabels[d]).join(", ") || "—"}</span></li>
    `;

    if (band) {
      band.setAttribute("stroke", metalColors[state.metal] || "#D4AF5A");
      band.setAttribute("stroke-width", shapeStrokeWidth[state.shape] || 14);
    }
    if (stone) {
      stone.setAttribute("opacity", state.details.includes("pierre") ? "1" : "0");
    }
  }

  /* --------------------------- Sélections --------------------------- */
  modal.querySelectorAll("[data-builder-group]").forEach((group) => {
    const groupName = group.dataset.builderGroup;
    const isMulti = group.dataset.multi === "true";
    const selector = group.classList.contains("builder-chips")
      ? ".builder-chip"
      : group.classList.contains("builder-options--swatches")
      ? ".builder-swatch-option"
      : ".builder-option";

    group.querySelectorAll(selector).forEach((option) => {
      option.addEventListener("click", () => {
        if (option.hasAttribute("data-coming-soon")) return;
        const value = option.dataset.value;

        if (isMulti) {
          if (value === "aucun") {
            state.details = ["aucun"];
            group.querySelectorAll(selector).forEach((o) => o.classList.remove("is-selected"));
            option.classList.add("is-selected");
          } else {
            state.details = state.details.filter((d) => d !== "aucun");
            const idx = state.details.indexOf(value);
            if (idx > -1) {
              state.details.splice(idx, 1);
              option.classList.remove("is-selected");
            } else {
              state.details.push(value);
              option.classList.add("is-selected");
            }
            group.querySelector('[data-value="aucun"]')?.classList.remove("is-selected");
          }
        } else {
          state[groupName] = value;
          group.querySelectorAll(selector).forEach((o) => o.classList.remove("is-selected"));
          option.classList.add("is-selected");
        }

        nextBtn.disabled = !canProceed();
      });
    });
  });

  /* ------------------------------ Navigation ------------------------------ */
  openBtn.addEventListener("click", open);
  document.querySelectorAll("[data-builder-close]").forEach((el) => el.addEventListener("click", close));

  nextBtn.addEventListener("click", () => {
    if (!canProceed() || current >= total) return;
    goToStep(current + 1, "forward");
  });

  backBtn.addEventListener("click", () => {
    if (current <= 1) return;
    goToStep(current - 1, "back");
  });

  modal.querySelector("[data-builder-request]")?.addEventListener("click", () => {
    close();
    const subject = document.getElementById("sujet");
    const message = document.getElementById("message");
    if (subject) subject.value = "Création personnalisée — bague configurée en ligne";
    if (message) {
      message.value = `Bijou : Bague\nForme : ${shapeLabels[state.shape] || "—"}\nMétal : ${metalLabels[state.metal] || "—"}\nDétails : ${state.details.map((d) => detailLabels[d]).join(", ") || "—"}`;
    }
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  });
}

/**
 * Bouton "À partir d'un objet existant" (section Sur mesure) —
 * préremplit simplement le formulaire de contact, sans configurateur.
 */
function initCustomObjectCta() {
  document.querySelector("[data-custom-object]")?.addEventListener("click", () => {
    const subject = document.getElementById("sujet");
    if (subject) subject.value = "Sur mesure — bijou à partir d'un objet existant";
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initJewelBuilder();
  initCustomObjectCta();
});