/* shop.js — panier (pièces inédites + box), page de commande et paiement Stripe.
   À charger APRÈS content.js et script.js, sur index.html ET commande.html.
   Le paiement reste inactif tant que la clé « shop.paiement » de la table content ne vaut pas "on".
   Désactivé en mode admin (?admin). */
(function () {
  'use strict';
  const C = window.IzaalyContent;
  if (!C || new URLSearchParams(location.search).has('admin')) return;

  const onOrder = !!document.getElementById('commande');
  const header = document.getElementById('header');
  const FN = C.url + '/functions/v1/checkout';
  const ORDER_URL = './commande.html';
  const CART_KEY = 'izaaly:cart';
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, p, ...k) => { const e = Object.assign(document.createElement(t), p || {}); e.append(...k); return e; };
  const num = (v, d) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : d; };
  const money = n => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));
  const eur = c => money(c / 100) + '\u00a0€';
  const safeImg = u => (/^(https:\/\/|\.\/|\/)/.test(String(u || '')) ? String(u) : '');
  const setBg = (e, u) => { if (safeImg(u)) e.style.backgroundImage = 'url("' + safeImg(u).replace(/"/g, '%22') + '")'; };
  const D = () => C.data || {};
  const payOn = () => D()['shop.paiement'] === 'on';

  let products = [];
  let cart = [];
  try { cart = (JSON.parse(localStorage.getItem(CART_KEY)) || []).map(x => (x.t ? x : Object.assign({ t: 'piece' }, x))); } catch (e) {}
  const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
  const inCart = id => cart.some(x => x.t === 'piece' && x.id === id);
  let done = false;   // paiement confirmé : on n'affiche plus le récapitulatif

  /* ---------- Box : même calcul que le site et que le serveur ---------- */
  const BOX_NOMS = ['La Découverte', 'L\u2019Essentiel', 'L\u2019Exception'];
  function boxInfo(f, mois) {
    const base = num(D()['box' + f + '.prix'], [19.99, 29.99, 39.99][f - 1]);
    const nm = D()['box' + f + '.nom'];
    const nom = typeof nm === 'string' && nm ? nm : BOX_NOMS[f - 1];
    if (f === 1) return { nom, cents: Math.round(base * 100), detail: 'Box unique, sans abonnement' };
    const list = Array.isArray(D()['box.durees']) && D()['box.durees'].length ? D()['box.durees']
      : [{ mois: 3, remise: 0 }, { mois: 6, remise: num(D()['box.remise6'], 5) }, { mois: 12, remise: num(D()['box.remise12'], 10) }];
    const d = list.find(x => Math.round(num(x.mois, 0)) === mois);
    if (!d || mois < 1 || mois > 36) return null;
    const remise = Math.min(90, num(d.remise, 0));
    const monthly = Math.round(base * (1 - remise / 100) * 100) / 100;
    return { nom, cents: Math.round(monthly * mois * 100),
      detail: mois + ' mois \u00b7 ' + money(monthly) + '\u00a0€ par mois' + (remise ? ' (\u2212' + money(remise) + '\u00a0%)' : '') + ' \u00b7 réglée en une fois' };
  }

  // Une ligne d'affichage par article du panier (null si la box n'existe plus)
  function lineModel(it) {
    if (it.t === 'box') {
      const b = boxInfo(it.f, it.mois);
      return b && { t: 'box', nom: 'Box ' + b.nom, detail: b.detail, cents: b.cents, key: 'box' };
    }
    return { t: 'piece', nom: it.nom, detail: '', cents: it.prix_cents, image: it.image, key: it.id };
  }
  const lines = () => cart.map(lineModel).filter(Boolean);
  const totalCents = () => lines().reduce((s, m) => s + m.cents, 0);

  function lineEl(m) {
    const img = el('span', { className: 'shop-img' + (m.t === 'box' ? ' is-box' : ''), textContent: m.t === 'box' ? 'BOX' : '' });
    if (m.t === 'piece') setBg(img, m.image);
    return el('li', { className: 'shop-item' }, img,
      el('div', {}, el('p', { className: 'shop-name', textContent: m.nom }),
        m.detail ? el('p', { className: 'shop-detail', textContent: m.detail }) : '',
        el('p', { className: 'shop-price', textContent: eur(m.cents) })),
      el('button', { type: 'button', className: 'shop-rm', textContent: 'Retirer', onclick: () => remove(m) }));
  }

  function add(p) {
    if (inCart(p.id)) return;
    cart.push({ t: 'piece', id: p.id, nom: p.nom, prix_cents: p.prix_cents, image: p.image });
    save(); refresh(); say('Ajouté au panier');
  }
  function addBox(f, mois) {
    cart = cart.filter(x => x.t !== 'box');   // une seule box par commande : la nouvelle remplace l'ancienne
    cart.push({ t: 'box', f, mois });
    save(); refresh();
  }
  function remove(m) {
    cart = cart.filter(x => !(m.t === 'box' ? x.t === 'box' : x.t === 'piece' && x.id === m.key));
    save(); refresh();
  }

  /* ---------- Message ---------- */
  const toast = el('div', { className: 'shop-toast', hidden: true });
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  let tt;
  function say(msg, bad) {
    toast.textContent = msg; toast.classList.toggle('bad', !!bad); toast.hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { toast.hidden = true; }, 3500);
  }

  /* ---------- Bouton panier + tiroir (pages du site) ---------- */
  let btn, over, drawer;
  function openCart() {
    renderDrawer(); $('.shop-err', drawer).textContent = '';
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
  if (header && !onOrder) {
    btn = el('button', { type: 'button', className: 'cart-btn' });
    btn.setAttribute('aria-label', 'Ouvrir le panier');
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg><span class="cart-count" hidden>0</span>';
    header.appendChild(btn);
    header.classList.add('has-cart');

    over = el('div', { className: 'shop-over', hidden: true });
    drawer = el('aside', { className: 'shop-drawer', hidden: true });
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-labelledby', 'shop-title');
    drawer.innerHTML = '<div class="shop-top"><h2 id="shop-title">Votre panier</h2><button type="button" class="shop-x">Fermer</button></div>' +
      '<ul class="shop-list"></ul><p class="shop-empty">Votre panier est vide.</p>' +
      '<div class="shop-foot"><div class="shop-total"><span>Sous-total</span><strong></strong></div>' +
      '<p class="shop-note"></p><p class="shop-methods">Carte bancaire \u00b7 PayPal \u00b7 Apple Pay \u00b7 Google Pay</p>' +
      '<p class="shop-err" role="alert"></p><button type="button" class="shop-pay">Commander</button></div>';
    document.body.append(over, drawer);
    btn.onclick = openCart;
    over.onclick = closeCart;
    $('.shop-x', drawer).onclick = closeCart;
    $('.shop-pay', drawer).onclick = () => { location.href = ORDER_URL; };
    drawer.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = [...drawer.querySelectorAll('button:not([hidden])')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeCart(); });
  }

  function renderDrawer() {
    if (!drawer) return;
    const list = $('.shop-list', drawer); list.textContent = '';
    const ls = lines();
    ls.forEach(m => list.append(lineEl(m)));
    $('.shop-total strong', drawer).textContent = eur(ls.reduce((s, m) => s + m.cents, 0));
    $('.shop-empty', drawer).hidden = ls.length > 0;
    $('.shop-foot', drawer).hidden = ls.length === 0;
    const hasPiece = ls.some(m => m.t === 'piece'), hasBox = ls.some(m => m.t === 'box');
    $('.shop-note', drawer).textContent = (hasPiece ? 'Pièces uniques, créées en un seul exemplaire. ' : '') +
      (hasBox ? 'Une box vous est envoyée chaque mois. ' : '') + 'La livraison est calculée à l\u2019étape suivante.';
    const n = $('.cart-count', btn);
    n.textContent = ls.length; n.hidden = ls.length === 0;
    btn.setAttribute('aria-label', ls.length ? 'Ouvrir le panier (' + ls.length + ' article' + (ls.length > 1 ? 's' : '') + ')' : 'Ouvrir le panier');
  }

  /* ---------- Appels serveur ---------- */
  async function post(body) {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.key }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'Le paiement est momentanément indisponible. Réessayez dans un instant.');
    return j;
  }

  /* ---------- Boutons des box : « S'abonner » (data-box) + « Ajouter au panier » ---------- */
  function boxChoice(a) {
    const f = +a.dataset.box, on = $('.duration button[aria-pressed="true"]');
    return { f, mois: f === 1 ? 0 : parseInt(on && on.textContent, 10) || 3 };
  }
  document.querySelectorAll('[data-box]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const c = boxChoice(a);
      if (!boxInfo(c.f, c.mois)) { say('Cette durée n\u2019est pas disponible.', true); return; }
      addBox(c.f, c.mois);
      location.href = ORDER_URL;
    });
    const more = el('button', { type: 'button', className: 'box-add', textContent: 'Ajouter au panier' });
    more.onclick = () => {
      const c = boxChoice(a);
      if (!boxInfo(c.f, c.mois)) { say('Cette durée n\u2019est pas disponible.', true); return; }
      addBox(c.f, c.mois); say('Box ajoutée au panier'); if (drawer) openCart();
    };
    a.insertAdjacentElement('afterend', more);
  });

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
      else if (inCart(p.id)) { b.textContent = 'Dans le panier'; b.onclick = () => drawer && openCart(); }
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
      cart = cart.filter(it => it.t === 'box' || (products.find(q => q.id === it.id) || {}).en_stock)
        .map(it => { if (it.t === 'box') return it; const p = products.find(q => q.id === it.id); return { t: 'piece', id: p.id, nom: p.nom, prix_cents: p.prix_cents, image: p.image }; });
      if (cart.length < before) { say('Une pièce de votre panier a été vendue entre-temps.', true); save(); }
    }
    refresh();
  }

  /* ---------- Page de commande (récapitulatif et paiement) ---------- */
  let method = 'card';
  function shipLabel(hasPiece) {
    const l = D()[hasPiece ? 'shop.livraison' : 'shop.livraison_box'];
    if (!Array.isArray(l) || !l.length) return hasPiece ? 'Calculée sur la page de paiement' : 'Incluse';
    const min = Math.min(...l.map(o => num(o.montant, 0)));
    return min === 0 ? 'Offerte' : 'À partir de ' + eur(min);
  }
  function renderOrder() {
    if (!onOrder || done) return;
    const ls = lines(), empty = ls.length === 0;
    $('#rc-empty').hidden = !empty; $('#rc-main').hidden = empty;
    if (empty) return;
    const ul = $('#rc-lines'); ul.textContent = '';
    ls.forEach(m => ul.append(lineEl(m)));
    const total = ls.reduce((s, m) => s + m.cents, 0), hasPiece = ls.some(m => m.t === 'piece'), hasBox = ls.some(m => m.t === 'box');
    $('#rc-sub').textContent = eur(total);
    $('#rc-ship').textContent = shipLabel(hasPiece);
    $('#rc-total').textContent = eur(total);
    $('#rc-boxnote').hidden = !hasBox;
    $('#rc-piecenote').hidden = !hasPiece;
    const on = payOn();
    document.querySelectorAll('.pm').forEach(b => {
      b.disabled = !on; b.classList.toggle('is-off', !on);
      b.setAttribute('aria-pressed', String(on && b.dataset.method === method));
    });
    $('#rc-off').hidden = on;
    $('#rc-pay').textContent = 'Payer ' + eur(total);
    $('#rc-pay').disabled = !(on && $('#rc-cgv').checked);
  }
  if (onOrder) {
    document.querySelectorAll('.pm').forEach(b => b.addEventListener('click', () => { method = b.dataset.method; renderOrder(); }));
    $('#rc-cgv').addEventListener('change', renderOrder);
    $('#rc-pay').addEventListener('click', async function () {
      if (!payOn() || !$('#rc-cgv').checked) return;
      const b = cart.find(x => x.t === 'box');
      const label = this.textContent;
      this.disabled = true; this.textContent = 'Redirection\u2026'; $('#rc-msg').textContent = '';
      try {
        const j = await post({ type: 'cart', ids: cart.filter(x => x.t === 'piece').map(x => x.id), box: b ? { formule: b.f, mois: b.mois } : null, method });
        if (!j.url) throw new Error('Paiement indisponible.');
        location.href = j.url;
      } catch (e) {
        this.textContent = label; $('#rc-msg').textContent = e.message; await loadProducts();
      }
    });
  }

  function refresh() { renderDrawer(); renderProducts(); renderOrder(); }

  /* ---------- Retour de Stripe ---------- */
  const q = new URLSearchParams(location.search);
  if (q.get('paiement') === 'ok') {
    cart = []; save(); done = true;
    if (onOrder) { $('#rc-main').hidden = true; $('#rc-empty').hidden = true; $('#rc-thanks').hidden = false; }
    else {
      const m = el('div', { className: 'shop-thanks' }, el('div', { className: 'shop-thanks-box' },
        el('h2', { textContent: 'Merci pour votre commande' }),
        el('p', { textContent: 'Votre paiement est confirmé. Un e-mail de confirmation vous est envoyé, et nous préparons votre commande avec soin.' }),
        el('button', { type: 'button', className: 'shop-pay', textContent: 'Fermer', onclick: () => m.remove() })));
      document.body.append(m); m.querySelector('button').focus();
    }
    history.replaceState(null, '', location.pathname + (onOrder ? '' : location.hash));
  }
  if (q.get('paiement') === 'annule') {
    if (q.get('ref')) post({ type: 'release', ref: q.get('ref') }).catch(() => {});
    say('Paiement annulé. Votre commande est conservée.');
    history.replaceState(null, '', location.pathname);
  }

  refresh();
  loadProducts();
})();
