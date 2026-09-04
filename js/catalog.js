/**
 * catalog.js
 * Filtre et trie les produits d'une catégorie sur les pages bagues.html,
 * colliers.html et boucles-oreilles.html. Le rendu s'appuie sur
 * renderProductCard() (products.js) pour rester cohérent avec la home.
 */

function initCatalogPage(category) {
  const grid = document.querySelector("[data-catalog-grid]");
  const countEl = document.querySelector("[data-catalog-count]");
  const emptyEl = document.querySelector("[data-catalog-empty]");
  const sortSelect = document.querySelector("[data-sort]");
  const availabilitySelect = document.querySelector("[data-filter-availability]");
  const priceSelect = document.querySelector("[data-filter-price]");

  if (!grid) return;

  const allProducts = getProductsByCategory(category);

  function applyFilters() {
    let list = [...allProducts];

    const availability = availabilitySelect?.value || "all";
    if (availability === "available") list = list.filter((p) => p.available);
    if (availability === "unavailable") list = list.filter((p) => !p.available);

    const priceRange = priceSelect?.value || "all";
    if (priceRange === "under-20") list = list.filter((p) => p.price < 20);
    if (priceRange === "20-25") list = list.filter((p) => p.price >= 20 && p.price <= 25);
    if (priceRange === "over-25") list = list.filter((p) => p.price > 25);

    const sort = sortSelect?.value || "featured";
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "featured") list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));

    grid.innerHTML = list.map(renderProductCard).join("");
    if (countEl) {
      countEl.textContent = `${list.length} création${list.length > 1 ? "s" : ""}`;
    }
    if (emptyEl) {
      emptyEl.classList.toggle("is-visible", list.length === 0);
    }
  }

  [sortSelect, availabilitySelect, priceSelect].forEach((select) => {
    select?.addEventListener("change", applyFilters);
  });

  applyFilters();
}
