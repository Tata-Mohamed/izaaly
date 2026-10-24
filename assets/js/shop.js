/* shop.js — panier (pièces inédites + box), page de commande, livraison, compte ou invité, paiement Stripe.
   À charger APRÈS content.js (et compte.js sur commande.html), sur index.html ET commande.html.
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
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const el = (t, p, ...k) => { const e = Object.assign(document.createElement(t), p || {}); e.append(...k); return e; };
  const num = (v, d) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : d; };
  const money = n => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));
  const eur = c => money(c / 100) + '\u00a0€';
  const safeImg = u => (/^(https:\/\/|\.\/|\/)/.test(String(u || '')) ? String(u) : '');
  const setBg = (e, u) => { if (safeImg(u)) e.style.backgroundImage = 'url("' + safeImg(u).replace(/"/g, '%22') + '")'; };
  const D = () => C.data || {};
  const payOn = () => D()['shop.paiement'] === 'on';
  const IC = window.IzaalyClient;

  let products = [];
  let cart = [];
  try { cart = (JSON.parse(localStorage.getItem(CART_KEY)) || []).map(x => (x.t ? x : Object.assign({ t: 'piece' }, x))); } catch (e) {}
  const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
  const inCart = id => cart.some(x => x.t === 'piece' && x.id === id);
  let done = false;   // paiement confirmé : on n'affiche plus le récapitulatif

  /* ---------- Box : même calcul que le site et que le serveur ---------- */
  const BOX_NOMS = ['La Découverte', 'L\u2019Essentiel', 'L\u2019Exception'];
  const BOX_IMG = ['./assets/img/box-decouverte.jpg', './assets/img/box-essentielle.jpg', './assets/img/fond1.jpg'];
  function boxInfo(f, mois) {
    const base = num(D()['box' + f + '.prix'], [19.99, 29.99, 39.99][f - 1]);
    const nm = D()['box' + f + '.nom'], im = D()['box' + f + '.image'];
    const nom = typeof nm === 'string' && nm ? nm : BOX_NOMS[f - 1];
    const image = typeof im === 'string' && im ? im : BOX_IMG[f - 1];
    if (f === 1) return { nom, image, cents: Math.round(base * 100), monthlyCents: 0, remise: 0 };
    const list = Array.isArray(D()['box.durees']) && D()['box.durees'].length ? D()['box.durees']
      : [{ mois: 3, remise: 0 }, { mois: 6, remise: num(D()['box.remise6'], 5) }, { mois: 12, remise: num(D()['box.remise12'], 10) }];
    const d = list.find(x => Math.round(num(x.mois, 0)) === mois);
    if (!d || mois < 1 || mois > 36) return null;
    const remise = Math.min(90, num(d.remise, 0));
    const monthly = Math.round(base * (1 - remise / 100) * 100) / 100;
    return { nom, image, remise, monthlyCents: Math.round(monthly * 100), cents: Math.round(monthly * mois * 100) };
  }
  const canMonthly = it => !!it && it.t === 'box' && it.f !== 1 && it.mois > 1;
  const isMonthly = it => canMonthly(it) && it.pay === 'mensuel';

  // Une ligne d'affichage par article du panier (null si la box n'existe plus)
  function lineModel(it) {
    if (it.t === 'box') {
      const b = boxInfo(it.f, it.mois); if (!b) return null;
      const rem = b.remise ? ' (\u2212' + money(b.remise) + '\u00a0%)' : '';
      const mens = isMonthly(it);
      return { t: 'box', nom: 'Box ' + b.nom, image: b.image, key: 'box', mensuel: mens, cents: mens ? b.monthlyCents : b.cents,
        detail: it.f === 1 ? 'Box unique, sans abonnement'
          : mens ? it.mois + ' mensualités de ' + eur(b.monthlyCents) + rem + ' \u00b7 débit automatique chaque mois'
          : it.mois + ' mois' + rem + ' \u00b7 réglée en une fois' };
    }
    return { t: 'piece', nom: it.nom, detail: '', cents: it.prix_cents, image: it.image, key: it.id };
  }
  const lines = () => cart.map(lineModel).filter(Boolean);

  function lineEl(m) {
    const img = el('span', { className: 'shop-img' }); setBg(img, m.image);
    if (m.t === 'box' && !safeImg(m.image)) { img.classList.add('is-box'); img.textContent = 'BOX'; }
    return el('li', { className: 'shop-item' }, img,
      el('div', {}, el('p', { className: 'shop-name', textContent: m.nom }),
        m.detail ? el('p', { className: 'shop-detail', textContent: m.detail }) : '',
        el('p', { className: 'shop-price', textContent: eur(m.cents) + (m.mensuel ? ' / mois' : '') })),
      el('button', { type: 'button', className: 'shop-rm', textContent: 'Retirer', onclick: () => remove(m) }));
  }

  function add(p) {
    if (inCart(p.id)) return;
    cart.push({ t: 'piece', id: p.id, nom: p.nom, prix_cents: p.prix_cents, image: p.image });
    save(); refresh(); say('Ajouté au panier');
  }
  function addBox(f, mois) {
    cart = cart.filter(x => x.t !== 'box');   // une seule box par commande : la nouvelle remplace l'ancienne
    cart.push({ t: 'box', f, mois, pay: 'comptant' });
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
      const f = $$('button:not([hidden])', drawer).filter(x => x.offsetParent !== null);
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
      (hasBox ? 'Une box vous est envoyée chaque mois. ' : '') + 'Livraison et mode de règlement à l\u2019étape suivante.';
    const n = $('.cart-count', btn);
    n.textContent = ls.length; n.hidden = ls.length === 0;
    btn.setAttribute('aria-label', ls.length ? 'Ouvrir le panier (' + ls.length + ' article' + (ls.length > 1 ? 's' : '') + ')' : 'Ouvrir le panier');
  }

  /* ---------- Appels serveur ---------- */
  async function post(body, tokenStr) {
    const h = { 'Content-Type': 'application/json', apikey: C.key };
    if (tokenStr) h.Authorization = 'Bearer ' + tokenStr;   // compte client : le serveur en déduit l'e-mail vérifié
    const r = await fetch(FN, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'Le paiement est momentanément indisponible. Réessayez dans un instant.');
    return j;
  }

  /* ---------- Boutons des box : « S'abonner » (data-box) + « Ajouter au panier » ---------- */
  function boxChoice(a) {
    const f = +a.dataset.box, on = $('.duration button[aria-pressed="true"]');
    return { f, mois: f === 1 ? 0 : parseInt(on && on.textContent, 10) || 3 };
  }
  $$('[data-box]').forEach(a => {
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
      $$('.btn.small', rail).forEach(a => {
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

  /* ---------- Page de commande ---------- */
  let method = 'card', ship = 'domicile';
  const relaisOn = () => { const r = D()['shop.relais']; return !!(r && r.actif === true); };
  const shipOpt = (hasPiece, id) => { const l = D()[hasPiece ? 'shop.livraison' : 'shop.livraison_box']; return (Array.isArray(l) && l.find(o => o && o.id === id)) || null; };
  const optFee = o => Math.max(0, Math.round(num(o.montant, 0)));
  const feeTxt = o => (optFee(o) === 0 ? 'Offerte' : eur(optFee(o))) + (o.delai ? ' \u00b7 ' + o.delai : '');
  const relais = () => ({ nom: $('#rl-nom').value.trim(), adresse: $('#rl-adr').value.trim(), cp: $('#rl-cp').value.trim(), ville: $('#rl-ville').value.trim() });

  function renderAcct() {
    const sec = $('#rc-acct'); if (!sec) return;
    sec.hidden = !IC || D()['shop.comptes'] !== 'on';   // comptes clients : s'active avec la clé shop.comptes = "on"
    if (sec.hidden) return;
    const s = IC.session();
    $('#rc-acct-in').hidden = !s; $('#rc-acct-choice').hidden = !!s;
    if (s) $('#rc-acct-email').textContent = s.email;
    $('#rc-acct-form').hidden = !!s || !$('#rc-who-compte').checked;
  }

  function renderOrder() {
    if (!onOrder || done) return;
    const ls = lines(), empty = ls.length === 0;
    $('#rc-empty').hidden = !empty; $('#rc-main').hidden = empty;
    if (empty) return;
    const box = cart.find(x => x.t === 'box'), bi = box && boxInfo(box.f, box.mois);
    const mens = isMonthly(box), hasPiece = ls.some(m => m.t === 'piece'), hasBox = !!box;
    if (mens && method === 'paypal') method = 'card';   // PayPal : paiement en une fois uniquement
    if (ship === 'relais' && !relaisOn()) ship = 'domicile';

    const ul = $('#rc-lines'); ul.textContent = '';
    ls.forEach(m => ul.append(lineEl(m)));

    // Comment régler la box : en une fois ou en mensualités
    $('#rc-boxpay').hidden = !canMonthly(box);
    if (canMonthly(box) && bi) {
      $('#rc-bp-once-amt').textContent = eur(bi.cents);
      $('#rc-bp-month-amt').textContent = box.mois + ' \u00d7 ' + eur(bi.monthlyCents);
      $('#rc-bp-once').checked = !mens; $('#rc-bp-month').checked = mens;
    }

    // Livraison
    const dom = shipOpt(hasPiece, 'domicile'), rel = shipOpt(hasPiece, 'relais');
    $('#rc-sh-dom-fee').textContent = dom ? feeTxt(dom) : (hasPiece ? 'Tarif à confirmer' : 'Incluse');
    $('#rc-sh-rel-fee').textContent = !relaisOn() ? 'Bientôt disponible' : rel ? feeTxt(rel) : (hasPiece ? 'Tarif à confirmer' : 'Incluse');
    $('#rc-sh-rel').disabled = !relaisOn();
    $('#rc-sh-dom').checked = ship === 'domicile'; $('#rc-sh-rel').checked = ship === 'relais';
    $('#rc-relais').hidden = ship !== 'relais';

    // Totaux : ce qui est débité aujourd'hui, puis les mensualités éventuelles
    const sub = ls.reduce((s, m) => s + m.cents, 0);
    const opt = shipOpt(hasPiece, ship), fee = opt ? optFee(opt) : (hasPiece ? null : 0);
    const today = sub + (fee || 0);
    $('#rc-sub').textContent = eur(sub);
    $('#rc-ship').textContent = fee === null ? 'À confirmer' : fee === 0 ? (opt ? 'Offerte' : 'Incluse') : eur(fee);
    $('#rc-total-label').textContent = mens ? 'À payer aujourd\u2019hui' : 'Total';
    $('#rc-total').textContent = eur(today);
    $('#rc-later').hidden = !mens;
    if (mens && bi) $('#rc-later').textContent = 'Puis ' + (box.mois - 1) + ' prélèvement' + (box.mois > 2 ? 's' : '') + ' de ' + eur(bi.monthlyCents) + ', un par mois.';

    $('#rc-boxnote').hidden = !hasBox;
    if (hasBox) $('#rc-boxnote').textContent = mens
      ? 'Vous réglez votre box en ' + box.mois + ' mensualités, prélevées automatiquement par carte bancaire chaque mois. L\u2019abonnement s\u2019arrête de lui-même après la dernière mensualité.'
      : 'Votre box est réglée en une fois. Une box vous est envoyée chaque mois, sans prélèvement automatique.';
    $('#rc-piecenote').hidden = !hasPiece;

    // Paiement
    const on = payOn();
    $$('.pm').forEach(b => {
      const off = !on || (mens && b.dataset.method === 'paypal');
      b.disabled = off; b.classList.toggle('is-off', off);
      b.setAttribute('aria-pressed', String(!off && b.dataset.method === method));
    });
    $('#rc-off').hidden = on;
    $('#rc-pay').textContent = 'Payer ' + eur(today);
    $('#rc-pay').disabled = !(on && $('#rc-cgv').checked);
    renderAcct();
  }

  if (onOrder) {
    $$('.pm').forEach(b => b.addEventListener('click', () => { method = b.dataset.method; renderOrder(); }));
    $$('input[name="rc-bp"]').forEach(r => r.addEventListener('change', () => {
      const b = cart.find(x => x.t === 'box'); if (b) { b.pay = r.value; save(); renderOrder(); }
    }));
    $$('input[name="rc-ship"]').forEach(r => r.addEventListener('change', () => { ship = r.value; renderOrder(); }));
    $$('input[name="rc-who"]').forEach(r => r.addEventListener('change', renderAcct));
    $('#rc-cgv').addEventListener('change', renderOrder);

    if (IC) {
      IC.onChange(renderAcct);
      const msg = (m, ok) => { const e = $('#rc-acct-msg'); e.textContent = m; e.className = 'cp-msg' + (ok ? ' ok' : ''); };
      const creds = () => ({ e: $('#rc-a-email').value.trim(), p: $('#rc-a-pw').value });
      $('#rc-a-login').addEventListener('click', async () => {
        const c = creds(); msg('');
        try { await IC.signIn(c.e, c.p); } catch (x) { msg(x.message); }
      });
      $('#rc-a-signup').addEventListener('click', async () => {
        const c = creds(); msg('');
        if (c.p.length < 8) { msg('Mot de passe : 8 caractères minimum.'); return; }
        try {
          const r = await IC.signUp(c.e, c.p);
          if (r === 'confirmer') msg('Un e-mail de confirmation vient de vous être envoyé. Confirmez votre adresse, puis revenez ici : votre panier est conservé. Vous pouvez aussi continuer en invité.', true);
        } catch (x) { msg(x.message); }
      });
      $('#rc-a-out').addEventListener('click', () => IC.signOut());
    }

    $('#rc-pay').addEventListener('click', async function () {
      if (!payOn() || !$('#rc-cgv').checked) return;
      const msg = m => { $('#rc-msg').textContent = m; };
      if (ship === 'relais') { const r = relais(); if (!r.nom || !r.cp || !r.ville) { msg('Indiquez le point relais choisi (nom, code postal et ville).'); return; } }
      const b = cart.find(x => x.t === 'box'), label = this.textContent;
      this.disabled = true; this.textContent = 'Redirection\u2026'; msg('');
      try {
        const tk = IC && IC.session() ? await IC.token() : null;   // invité : aucun jeton
        const j = await post({
          type: 'cart', ids: cart.filter(x => x.t === 'piece').map(x => x.id),
          box: b ? { formule: b.f, mois: b.mois, pay: isMonthly(b) ? 'mensuel' : 'comptant' } : null,
          method, livraison: { mode: ship, relais: ship === 'relais' ? relais() : null }
        }, tk);
        if (!j.url) throw new Error('Paiement indisponible.');
        location.href = j.url;
      } catch (e) {
        this.textContent = label; msg(e.message); await loadProducts();
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
