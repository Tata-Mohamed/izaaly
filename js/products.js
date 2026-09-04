/**
 * products.js
 * ---------------------------------------------------------------------------
 * Source unique de vérité pour le catalogue IZAALY.
 * Pour ajouter un produit : ajoute un objet ici, respecte la structure.
 * Pour changer une image : remplace le chemin dans "images" (voir README).
 * ---------------------------------------------------------------------------
 */

const PRODUCTS = [
  {
    id: "bague-croise",
    name: "Bague CROISÉ",
    category: "bagues",
    price: 13.99,
    currency: "EUR",
    images: [
      "assets/images/products/bague-croise-1.svg",
      "assets/images/products/bague-croise-2.svg"
    ],
    description:
      "Un anneau fin traversé d'une ligne croisée, pensé comme un rappel discret : celui d'un lien que l'on garde près de soi. Se porte seule ou superposée.",
    material: "Acier inoxydable doré à l'or fin",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: true
  },
  {
    id: "jonc-leopard",
    name: "Jonc LÉOPARD",
    category: "bagues",
    price: 23.99,
    currency: "EUR",
    images: [
      "assets/images/products/jonc-leopard-1.svg",
      "assets/images/products/jonc-leopard-2.svg"
    ],
    description:
      "Un jonc au motif léopard gravé avec finesse, pour une touche de caractère sans jamais perdre en délicatesse.",
    material: "Acier inoxydable doré",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: true
  },
  {
    id: "bague-luna",
    name: "Bague LUNA",
    category: "bagues",
    price: 15.99,
    currency: "EUR",
    images: [
      "assets/images/products/bague-luna-1.svg",
      "assets/images/products/bague-luna-2.svg"
    ],
    description:
      "Inspirée des phases de la lune, cette bague minimaliste se porte au quotidien comme un rappel discret du temps qui passe.",
    material: "Acier inoxydable argenté",
    color: "Argenté",
    available: true,
    isNew: true,
    isBestSeller: false
  },
  {
    id: "bague-tressee",
    name: "Bague TRESSÉE",
    category: "bagues",
    price: 18.99,
    currency: "EUR",
    images: [
      "assets/images/products/bague-tressee-1.svg",
      "assets/images/products/bague-tressee-2.svg"
    ],
    description:
      "Trois fils entrelacés en un seul anneau — une image simple du lien qui unit sans jamais s'effacer.",
    material: "Acier inoxydable doré",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: false
  },
  {
    id: "collier-solea",
    name: "Collier aigue-marine SOLÉA",
    category: "colliers",
    price: 27.99,
    currency: "EUR",
    images: [
      "assets/images/products/collier-solea-1.svg",
      "assets/images/products/collier-solea-2.svg"
    ],
    description:
      "Une pierre d'aigue-marine suspendue à une chaîne fine, comme une goutte d'eau claire posée au creux du cou.",
    material: "Acier inoxydable doré, pierre naturelle",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: true
  },
  {
    id: "collier-etoile",
    name: "Collier ÉTOILE",
    category: "colliers",
    price: 22.99,
    currency: "EUR",
    images: [
      "assets/images/products/collier-etoile-1.svg",
      "assets/images/products/collier-etoile-2.svg"
    ],
    description:
      "Un petit pendentif étoile, pour celles qui gardent une lumière avec elles, même dans les journées les plus grises.",
    material: "Acier inoxydable doré",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: false
  },
  {
    id: "collier-initiale",
    name: "Collier INITIALE",
    category: "colliers",
    price: 24.99,
    currency: "EUR",
    images: [
      "assets/images/products/collier-initiale-1.svg",
      "assets/images/products/collier-initiale-2.svg"
    ],
    description:
      "Une initiale gravée à la main, pour porter un prénom, une personne, une histoire — la vôtre.",
    material: "Acier inoxydable argenté",
    color: "Argenté",
    available: true,
    isNew: true,
    isBestSeller: false
  },
  {
    id: "collier-perle-fine",
    name: "Collier PERLE FINE",
    category: "colliers",
    price: 26.99,
    currency: "EUR",
    images: [
      "assets/images/products/collier-perle-fine-1.svg",
      "assets/images/products/collier-perle-fine-2.svg"
    ],
    description:
      "Une perle unique sur une chaîne épurée, pour un rendu intemporel qui se marie à toutes les tenues.",
    material: "Acier inoxydable doré, perle de culture",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: false
  },
  {
    id: "boucles-selya",
    name: "Boucles d'oreilles SÉLYA",
    category: "boucles-oreilles",
    price: 17.99,
    currency: "EUR",
    images: [
      "assets/images/products/boucles-selya-1.svg",
      "assets/images/products/boucles-selya-2.svg"
    ],
    description:
      "Des boucles fines et arrondies, pensées pour accompagner le visage avec légèreté, du matin jusqu'au soir.",
    material: "Acier inoxydable",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: true
  },
  {
    id: "boucles-goutte",
    name: "Boucles GOUTTE",
    category: "boucles-oreilles",
    price: 19.99,
    currency: "EUR",
    images: [
      "assets/images/products/boucles-goutte-1.svg",
      "assets/images/products/boucles-goutte-2.svg"
    ],
    description:
      "Une forme en goutte, simple et féminine, qui capte la lumière au moindre mouvement.",
    material: "Acier inoxydable doré",
    color: "Doré",
    available: true,
    isNew: false,
    isBestSeller: false
  },
  {
    id: "boucles-creole",
    name: "Boucles CRÉOLE",
    category: "boucles-oreilles",
    price: 21.99,
    currency: "EUR",
    images: [
      "assets/images/products/boucles-creole-1.svg",
      "assets/images/products/boucles-creole-2.svg"
    ],
    description:
      "La créole dans sa version la plus pure : un anneau fin, intemporel, pensé pour durer bien au-delà des tendances.",
    material: "Acier inoxydable argenté",
    color: "Argenté",
    available: true,
    isNew: false,
    isBestSeller: false
  },
  {
    id: "boucles-nacre",
    name: "Boucles NACRE",
    category: "boucles-oreilles",
    price: 16.99,
    currency: "EUR",
    images: [
      "assets/images/products/boucles-nacre-1.svg",
      "assets/images/products/boucles-nacre-2.svg"
    ],
    description:
      "Un éclat de nacre serti avec délicatesse, pour une touche nacrée qui change de couleur selon la lumière.",
    material: "Acier inoxydable doré, nacre naturelle",
    color: "Doré",
    available: false,
    isNew: false,
    isBestSeller: false
  }
];

/** Retourne tous les produits d'une catégorie donnée. */
function getProductsByCategory(category) {
  return PRODUCTS.filter((p) => p.category === category);
}

/** Retourne un produit par son id. */
function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/** Retourne les best-sellers marqués comme tels. */
function getBestSellers() {
  return PRODUCTS.filter((p) => p.isBestSeller);
}

/** Formatte un prix en devise EUR (ex: 13.99 -> "13,99 €"). */
function formatPrice(price, currency = "EUR") {
  const symbols = { EUR: "€" };
  const formatted = price.toFixed(2).replace(".", ",");
  return `${formatted} ${symbols[currency] || currency}`;
}

/**
 * Construit le HTML d'une carte produit (utilisée en home et en catalogues).
 * Le lien pointe vers produit.html?id=... pour permettre la transition premium.
 */
function renderProductCard(product) {
  const secondImage = product.images[1] || product.images[0];
  const badge = product.isNew
    ? '<span class="product-card__badge">Nouveauté</span>'
    : !product.available
    ? '<span class="product-card__badge product-card__badge--muted">Épuisé</span>'
    : "";

  return `
    <article class="product-card" data-id="${product.id}" data-category="${product.category}" data-price="${product.price}">
      <a href="produit.html?id=${product.id}" class="product-card__link" aria-label="Voir ${product.name}">
        <div class="product-card__media">
          <img src="${product.images[0]}" alt="${product.name}" class="product-card__img product-card__img--main" loading="lazy" width="800" height="1000" style="view-transition-name: product-image-${product.id};">
          <img src="${secondImage}" alt="" class="product-card__img product-card__img--hover" loading="lazy" width="800" height="1000" aria-hidden="true">
          ${badge}
        </div>
        <div class="product-card__info">
          <p class="product-card__category">${categoryLabel(product.category)}</p>
          <h3 class="product-card__name">${product.name}</h3>
          <p class="product-card__price">${formatPrice(product.price, product.currency)}</p>
        </div>
      </a>
      <button class="product-card__add" data-add-to-cart="${product.id}" ${!product.available ? "disabled" : ""}>
        ${product.available ? "Ajouter au panier" : "Indisponible"}
      </button>
    </article>
  `;
}

function categoryLabel(category) {
  const labels = {
    bagues: "Bague",
    colliers: "Collier",
    "boucles-oreilles": "Boucles d'oreilles",
    bracelets: "Bracelet"
  };
  return labels[category] || category;
}
