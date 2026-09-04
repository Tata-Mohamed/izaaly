/**
 * product.js
 * Peuple produit.html à partir du paramètre ?id= de l'URL, en lisant les
 * données dans PRODUCTS (products.js). Gère aussi la galerie, le sélecteur
 * de quantité, l'accordéon d'informations et les produits liés.
 */

function getProductIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function renderProductDetail() {
  const id = getProductIdFromUrl();
  const product = id ? getProductById(id) : null;
  const root = document.querySelector("[data-product-root]");
  if (!root) return;

  if (!product) {
    root.innerHTML = `
      <div class="container" style="padding-block: var(--space-xxl); text-align:center;">
        <h1 style="font-size: var(--fs-h2);">Cette création n'existe plus.</h1>
        <p style="color: var(--text-muted); margin-top: 1rem;">Elle a peut-être été retirée du catalogue.</p>
        <a href="bagues.html" class="btn btn--dark" style="margin-top: 2rem;">Voir les collections</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} — IZAALY`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", product.description.slice(0, 150));

  root.innerHTML = `
    <div class="container product-detail">
      <div class="product-gallery" data-reveal>
        <div class="product-gallery__main">
          <img src="${product.images[0]}" alt="${product.name}" data-main-image style="view-transition-name: product-image-${product.id};">
        </div>
        <div class="product-gallery__thumbs">
          ${product.images
            .map(
              (img, i) => `
            <button class="product-gallery__thumb ${i === 0 ? "is-active" : ""}" data-thumb="${img}" aria-label="Voir l'image ${i + 1}">
              <img src="${img}" alt="">
            </button>`
            )
            .join("")}
        </div>
      </div>

      <div class="product-info" data-reveal data-reveal-delay="1">
        <p class="product-info__category">${categoryLabel(product.category)}</p>
        <h1 class="product-info__name">${product.name}</h1>
        <p class="product-info__price">${formatPrice(product.price, product.currency)}</p>
        <p class="product-info__desc">${product.description}</p>

        <div class="product-info__attrs">
          <div><span>Matière</span><span>${product.material}</span></div>
          <div><span>Couleur</span><span>${product.color}</span></div>
          <div><span>Disponibilité</span><span>${product.available ? "En stock" : "Épuisé"}</span></div>
        </div>

        <div class="product-info__actions">
          <div class="qty-stepper">
            <button type="button" data-detail-qty-decrease aria-label="Diminuer la quantité">−</button>
            <span data-detail-qty>1</span>
            <button type="button" data-detail-qty-increase aria-label="Augmenter la quantité">+</button>
          </div>
          <button class="btn btn--dark" data-detail-add="${product.id}" ${!product.available ? "disabled" : ""}>
            ${product.available ? "Ajouter au panier" : "Indisponible"}
          </button>
        </div>
        <p class="product-info__note">Expédié sous 2 à 4 jours ouvrés · Retours gratuits sous 30 jours.</p>

        <div class="product-accordion">
          <div class="accordion-item">
            <button class="accordion-item__trigger" data-accordion-trigger>
              Détails de la création
              <span class="accordion-item__icon" aria-hidden="true">+</span>
            </button>
            <div class="accordion-item__panel">
              <p>Chaque pièce IZAALY est pensée à la main, en petite série, avec une attention particulière portée aux finitions. De légères variations peuvent exister d'une pièce à l'autre : c'est la signature du fait main.</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-item__trigger" data-accordion-trigger>
              Livraison &amp; retours
              <span class="accordion-item__icon" aria-hidden="true">+</span>
            </button>
            <div class="accordion-item__panel">
              <p>Livraison en France en 2 à 4 jours ouvrés, en Europe en 4 à 8 jours ouvrés. Retours et échanges gratuits sous 30 jours à compter de la réception.</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-item__trigger" data-accordion-trigger>
              Entretien
              <span class="accordion-item__icon" aria-hidden="true">+</span>
            </button>
            <div class="accordion-item__panel">
              <p>Évitez le contact prolongé avec l'eau et les parfums. Rangez votre bijou dans sa pochette pour préserver son éclat dans le temps.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container related-products">
      <div class="products-head" data-reveal>
        <h2>Vous aimerez aussi</h2>
      </div>
      <div class="products-grid" data-related-grid data-reveal data-reveal-delay="1"></div>
    </div>
  `;

  initGallery();
  initQuantityStepper(product);
  initAccordion();
  renderRelated(product);
  initScrollReveal();
}

function initGallery() {
  const main = document.querySelector("[data-main-image]");
  document.querySelectorAll("[data-thumb]").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      main.src = thumb.dataset.thumb;
      document.querySelectorAll("[data-thumb]").forEach((t) => t.classList.remove("is-active"));
      thumb.classList.add("is-active");
    });
  });
}

function initQuantityStepper(product) {
  const qtyEl = document.querySelector("[data-detail-qty]");
  const addBtn = document.querySelector("[data-detail-add]");
  let quantity = 1;

  document.querySelector("[data-detail-qty-increase]")?.addEventListener("click", () => {
    quantity += 1;
    qtyEl.textContent = quantity;
  });

  document.querySelector("[data-detail-qty-decrease]")?.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    qtyEl.textContent = quantity;
  });

  addBtn?.addEventListener("click", () => {
    if (!product.available) return;
    addToCart(product.id, quantity);
  });
}

function initAccordion() {
  document.querySelectorAll("[data-accordion-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const item = trigger.closest(".accordion-item");
      const panel = item.querySelector(".accordion-item__panel");
      const isOpen = item.classList.contains("is-open");

      document.querySelectorAll(".accordion-item").forEach((i) => {
        i.classList.remove("is-open");
        i.querySelector(".accordion-item__panel").style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add("is-open");
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    });
  });
}

function renderRelated(product) {
  const grid = document.querySelector("[data-related-grid]");
  if (!grid) return;
  const related = getProductsByCategory(product.category)
    .filter((p) => p.id !== product.id)
    .slice(0, 4);
  grid.innerHTML = related.map(renderProductCard).join("");
}

document.addEventListener("DOMContentLoaded", renderProductDetail);
