/**
 * cart.js
 * Panier front-end minimal basé sur localStorage.
 * Structure stockée : [{ id, quantity }]
 * Le détail produit (nom, prix, image) est relu depuis PRODUCTS (products.js)
 * à chaque affichage, pour rester toujours synchronisé avec le catalogue.
 */

const CART_STORAGE_KEY = "izaaly_cart";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ id: productId, quantity });
  }
  saveCart(cart);
  renderCartPanel();
  openCart();
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  renderCartPanel();
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.quantity = Math.max(1, quantity);
  saveCart(cart);
  renderCartPanel();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => {
    const product = typeof getProductById === "function" ? getProductById(item.id) : null;
    return product ? sum + product.price * item.quantity : sum;
  }, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartCount() {
  const badge = document.querySelector("[data-cart-count]");
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "flex" : "none";
}

/* --------------------------- Rendu du panneau --------------------------- */

function renderCartPanel() {
  const itemsWrap = document.querySelector("[data-cart-items]");
  const totalEl = document.querySelector("[data-cart-total]");
  const emptyEl = document.querySelector("[data-cart-empty]");
  if (!itemsWrap) return;

  const cart = getCart();

  if (!cart.length) {
    itemsWrap.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    if (totalEl) totalEl.textContent = formatPrice(0);
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  itemsWrap.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return "";
      return `
        <div class="cart-item" data-cart-item="${product.id}">
          <img src="${product.images[0]}" alt="${product.name}">
          <div>
            <p class="cart-item__name">${product.name}</p>
            <p class="cart-item__meta">${formatPrice(product.price)}</p>
            <div class="cart-item__qty">
              <button type="button" data-qty-decrease="${product.id}" aria-label="Diminuer la quantité">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-qty-increase="${product.id}" aria-label="Augmenter la quantité">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-remove="${product.id}">Retirer</button>
        </div>
      `;
    })
    .join("");

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
}

function openCart() {
  document.querySelector(".cart-overlay")?.classList.add("is-open");
  document.querySelector(".cart-panel")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.querySelector(".cart-overlay")?.classList.remove("is-open");
  document.querySelector(".cart-panel")?.classList.remove("is-open");
  document.body.style.overflow = "";
}

function initCart() {
  updateCartCount();
  renderCartPanel();

  document.querySelector("[data-cart-open]")?.addEventListener("click", (e) => {
    e.preventDefault();
    renderCartPanel();
    openCart();
  });

  document.querySelector("[data-cart-close]")?.addEventListener("click", closeCart);
  document.querySelector(".cart-overlay")?.addEventListener("click", closeCart);

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      e.preventDefault();
      addToCart(addBtn.dataset.addToCart, 1);
      return;
    }
    const inc = e.target.closest("[data-qty-increase]");
    if (inc) {
      const id = inc.dataset.qtyIncrease;
      const item = getCart().find((i) => i.id === id);
      updateCartQuantity(id, (item?.quantity || 1) + 1);
      return;
    }
    const dec = e.target.closest("[data-qty-decrease]");
    if (dec) {
      const id = dec.dataset.qtyDecrease;
      const item = getCart().find((i) => i.id === id);
      if (item && item.quantity <= 1) {
        removeFromCart(id);
      } else {
        updateCartQuantity(id, (item?.quantity || 1) - 1);
      }
      return;
    }
    const remove = e.target.closest("[data-remove]");
    if (remove) {
      removeFromCart(remove.dataset.remove);
    }
  });
}

document.addEventListener("DOMContentLoaded", initCart);
