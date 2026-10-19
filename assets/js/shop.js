/* shop.js — panier, pièces inédites et paiement (Stripe Checkout via Supabase Edge Functions).
   À charger APRÈS content.js et script.js. Désactivé en mode admin (?admin). */
(function () {
  'use strict';
  const C = window.IzaalyContent;
  const header = document.getElementById('header');
  if (!C || !header || new URLSearchParams(location.search).has('admin')) return;

  const FN = C.url + '/functions/v1/checkout';
  const CART_KEY = 'izaaly:cart';
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, p, ...k) => { const e = Object.assign(document.createElement(t), p || {}); e.append(...k); return e; };
  const eur = c => { const v = c / 100; return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + '\u00a0€'; };
  const safeImg = u => (/^(https:\/\/|\.\/|\/)/.test(String(u || '')) ? String(u) : '');
  const setBg = (e, u) => { if (safeImg(u)) e.style.backgroundImage = 'url("' + safeImg(u).replace(/"/g, '%22') + '")'; };

  let products = [];
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) {}
  const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
  const inCart = id => cart.some(x => x.id === id);

  /* ---------- Bouton panier dans le header ---------- */
  const btn = el('button', { type: 'button', className: 'cart-btn' });
  btn.setAttribute('aria-label', 'Ouvrir le panier');
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg><span class="cart-count" hidden>0</span>';
  header.appendChild(btn);
  header.classList.add('has-cart');

  /* ---------- Tiroir du panier ---------- */
  const over = el('div', { className: 'shop-over', hidden: true });
  const drawer = el('aside', { className: 'shop-drawer', hidden: true });
  drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-labelledby', 'shop-title');
  drawer.innerHTML = '<div class="shop-top"><h2 id="shop-title">Votre panier</h2><button type="button" class="shop-x">Fermer</button></div>' +
    '<ul class="shop-list"></ul><p class="shop-empty">Votre panier est vide.</p>' +
    '<div class="shop-foot"><div class="shop-total"><span>Sous-total</span><strong></strong></div>' +
    '<p class="shop-note">Pièces uniques, créées en un seul exemplaire. La livraison est calculée sur la page de paiement sécurisée.</p>' +
    '<p class="shop-err" role="alert"></p><button type="button" class="shop-pay">Passer au paiement</button></div>';
  const toast = el('div', { className: 'shop-toast', hidden: true });
  toast.setAttribute('role', 'status');
  document.body.append(over, drawer, toast);

  let tt;
  function say(msg, bad) {
    toast.textContent = msg; toast.classList.toggle('bad', !!bad); toast.hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function renderCart() {
    const list = $('.shop-list', drawer); list.textContent = '';
    let total = 0;
    cart.forEach(it => {
      total += it.prix_cents;
      const img = el('span', { className: 'shop-img' }); setBg(img, it.image);
      list.append(el('li', { className: 'shop-item' }, img,
        el('div', {}, el('p', { className: 'shop-name', textContent: it.nom }), el('p', { className: 'shop-price', textContent: eur(it.prix_cents) })),
        el('button', { type: 'button', className: 'shop-rm', textContent: 'Retirer', onclick: () => remove(it.id) })));
    });
    $('.shop-total strong', drawer).textContent = eur(total);
    $('.shop-empty', drawer).hidden = cart.length > 0;
    $('.shop-foot', drawer).hidden = cart.length === 0;
    const n = $('.cart-count', btn);
    n.textContent = cart.length; n.hidden = cart.length === 0;
    btn.setAttribute('aria-label', cart.length ? 'Ouvrir le panier (' + cart.length + ' article' + (cart.length > 1 ? 's' : '') + ')' : 'Ouvrir le panier');
  }

  function openCart() {
    renderCart(); $('.shop-err', drawer).textContent = '';
    over.hidden = false; drawer.hidden = false;
    document.body.classList.add('shop-lock');
    requestAnimationFrame(() => { over.classList.add('open'); drawer.classList.add('open'); });
    $('.shop-x', drawer).focus();
  }
  function closeCart() {
    over.classList.remove('open'); drawer.classList.remove('open');
    document.body.classList.remove('shop-lock');
    setTimeout(() => { over.hidden = true; drawer.hidden = true; }, 320);
    btn.focus();
  }
  btn.onclick = openCart;
  over.onclick = closeCart;
  $('.shop-x', drawer).onclick = closeCart;
  drawer.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...drawer.querySelectorAll('button:not([hidden])')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeCart(); });

  function add(p) {
    if (inCart(p.id)) return;
    cart.push({ id: p.id, nom: p.nom, prix_cents: p.prix_cents, image: p.image });
    save(); renderCart(); renderProducts(); say('Ajouté au panier');
  }
  function remove(id) { cart = cart.filter(x => x.id !== id); save(); renderCart(); renderProducts(); }

  /* ---------- Appels serveur ---------- */
  async function post(body) {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.key }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'Le paiement est momentanément indisponible. Réessayez dans un instant.');
    return j;
  }
  async function pay(button, body, onError) {
    const label = button.textContent;
    button.disabled = true; button.textContent = 'Redirection\u2026';
    try {
      const j = await post(body);
      if (!j.url) throw new Error('Paiement indisponible.');
      location.href = j.url;
    } catch (e) {
      button.disabled = false; button.textContent = label; onError(e.message);
    }
  }

  $('.shop-pay', drawer).onclick = function () {
    if (!cart.length) return;
    pay(this, { type: 'cart', ids: cart.map(x => x.id) }, async m => {
      $('.shop-err', drawer).textContent = m; await loadProducts();
    });
  };

  // Boutons des box : data-box="1|2|3" (la durée choisie est lue dans le sélecteur de durée)
  document.querySelectorAll('[data-box]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const f = +a.dataset.box, on = $('.duration button[aria-pressed="true"]');
    const mois = f === 1 ? 0 : parseInt(on && on.textContent, 10) || 3;
    pay(a, { type: 'box', formule: f, mois }, m => say(m, true));
  }));

  /* ---------- Pièces inédites ---------- */
  function renderProducts() {
    const rail = document.getElementById('rail'); if (!rail) return;
    if (!products.length) {   // aucune pièce publiée : on neutralise les anciens boutons
      rail.querySelectorAll('.btn.small').forEach(a => {
        a.textContent = 'Bientôt disponible'; a.setAttribute('aria-disabled', 'true');
        a.onclick = e => e.preventDefault();
      });
      return;
    }
    const x = rail.scrollLeft;
    rail.textContent = '';
    products.forEach(p => {
      const ph = el('div', { className: 'ph ph-prod' }); setBg(ph, p.image);
      const b = el('button', { type: 'button', className: 'btn small' });
      if (!p.en_stock) { b.textContent = 'Vendu'; b.disabled = true; }
      else if (inCart(p.id)) { b.textContent = 'Dans le panier'; b.onclick = openCart; }
      else if (!p.disponible) { b.textContent = 'Réservé'; b.disabled = true; }
      else { b.textContent = 'Ajouter au panier'; b.onclick = () => add(p); }
      ph.append(b);
      rail.append(el('article', { className: 'model' + (p.en_stock ? '' : ' is-sold') }, ph,
        el('h3', { textContent: p.nom }),
        p.description ? el('p', { className: 'model-desc', textContent: p.description }) : '',
        el('p', { className: 'model-price', textContent: eur(p.prix_cents) })));
    });
    rail.scrollLeft = x;
  }

  async function loadProducts() {
    try {
      const r = await fetch(C.url + '/rest/v1/products_public?select=*&order=position.asc,nom.asc', { headers: { apikey: C.key } });
      if (!r.ok) throw new Error();
      products = await r.json();
    } catch (e) { products = []; }
    if (products.length) {   // retire du panier ce qui est vendu, met à jour les prix
      const before = cart.length;
      cart = cart.filter(it => { const p = products.find(q => q.id === it.id); return p && p.en_stock; })
        .map(it => { const p = products.find(q => q.id === it.id); return { id: p.id, nom: p.nom, prix_cents: p.prix_cents, image: p.image }; });
      if (cart.length < before) { say('Une pièce de votre panier a été vendue entre-temps.', true); save(); }
    }
    renderCart(); renderProducts();
  }

  /* ---------- Retour de Stripe ---------- */
  function thanks() {
    const m = el('div', { className: 'shop-thanks' }, el('div', { className: 'shop-thanks-box' },
      el('h2', { textContent: 'Merci pour votre commande' }),
      el('p', { textContent: 'Votre paiement est confirmé. Un e-mail de confirmation vous est envoyé, et nous préparons votre commande avec soin.' }),
      el('button', { type: 'button', className: 'shop-pay', textContent: 'Fermer', onclick: () => m.remove() })));
    document.body.append(m); m.querySelector('button').focus();
  }
  const q = new URLSearchParams(location.search);
  if (q.get('paiement') === 'ok') { cart = []; save(); thanks(); history.replaceState(null, '', location.pathname + location.hash); }
  if (q.get('paiement') === 'annule') {
    if (q.get('ref')) post({ type: 'release', ref: q.get('ref') }).catch(() => {});
    say('Paiement annulé. Votre panier est conservé.');
    history.replaceState(null, '', location.pathname + '#inedits');
  }

  renderCart();
  loadProducts();
})();
