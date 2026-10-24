/* compte.js — comptes clients (Supabase Auth). À charger APRÈS content.js.
   Expose window.IzaalyClient (utilisé par shop.js) et pilote la page compte.html.
   La session client est stockée à part de celle de l'admin (clé izaaly:client). */
(function () {
  'use strict';
  const C = window.IzaalyContent;
  if (!C) return;
  const KEY = 'izaaly:client';
  const H = { apikey: C.key, 'Content-Type': 'application/json' };
  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  const listeners = [];
  const store = s => {
    S = s;
    try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {}
    listeners.forEach(f => f(S));
  };
  const fromTokens = (j, email) => ({
    access_token: j.access_token, refresh_token: j.refresh_token,
    expires_at: j.expires_at || Math.floor(Date.now() / 1000) + j.expires_in,
    email: (j.user && j.user.email) || email || (S && S.email) || ''
  });

  function frMsg(j) {
    const m = String(j.msg || j.error_description || j.message || '');
    if (/invalid login/i.test(m)) return 'E-mail ou mot de passe incorrect.';
    if (/not confirmed/i.test(m)) return 'Confirmez d\u2019abord votre adresse e-mail grâce au lien reçu par e-mail.';
    if (/already registered/i.test(m)) return 'Un compte existe déjà avec cette adresse.';
    if (/at least|weak|short/i.test(m)) return 'Mot de passe trop court ou trop simple (8 caractères minimum).';
    if (/rate limit|too many|after/i.test(m)) return 'Trop de tentatives. Patientez quelques instants.';
    if (/signups? (not allowed|disabled)/i.test(m)) return 'La création de compte est momentanément indisponible.';
    return 'Une erreur est survenue. Réessayez.';
  }
  async function auth(path, body, method, bearer) {
    const r = await fetch(C.url + '/auth/v1/' + path, {
      method: method || 'POST', headers: bearer ? Object.assign({}, H, { Authorization: 'Bearer ' + bearer }) : H,
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(frMsg(j));
    return j;
  }
  const back = () => encodeURIComponent(location.origin + location.pathname);

  const IC = window.IzaalyClient = {
    recovery: false,
    session: () => S,
    onChange: f => listeners.push(f),
    async token() {
      if (!S) return null;
      if (S.expires_at * 1000 - Date.now() > 60000) return S.access_token;
      try {
        const j = await auth('token?grant_type=refresh_token', { refresh_token: S.refresh_token });
        store(fromTokens(j));
        return S.access_token;
      } catch (e) { store(null); return null; }
    },
    async signIn(email, password) { store(fromTokens(await auth('token?grant_type=password', { email, password }), email)); },
    async signUp(email, password) {
      const j = await auth('signup?redirect_to=' + back(), { email, password });
      if (j.access_token) { store(fromTokens(j, email)); return 'connecte'; }
      return 'confirmer';   // un e-mail de confirmation vient d'être envoyé
    },
    async recover(email) { await auth('recover?redirect_to=' + back(), { email }); },
    async setPassword(password) { await auth('user', { password }, 'PUT', await IC.token()); },
    signOut() { store(null); }
  };

  // Retour d'un lien reçu par e-mail (confirmation, mot de passe oublié) : la session est dans l'adresse
  IC.ready = (async function () {
    if (!/access_token=/.test(location.hash)) return;
    const p = new URLSearchParams(location.hash.slice(1));
    try {
      const u = await fetch(C.url + '/auth/v1/user', { headers: { apikey: C.key, Authorization: 'Bearer ' + p.get('access_token') } }).then(r => r.json());
      store(fromTokens({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600, user: u }));
      IC.recovery = p.get('type') === 'recovery';
    } catch (e) {}
    history.replaceState(null, '', location.pathname + location.search);
  })();

  /* ---------- Page compte.html ---------- */
  if (!document.getElementById('compte')) return;
  const $ = s => document.querySelector(s);
  const say = (id, m, ok) => { const e = $(id); e.textContent = m; e.className = 'cp-msg' + (ok ? ' ok' : ''); };
  const eur = c => { const v = c / 100; return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + '\u00a0€'; };
  const TYPES = { panier: 'Pièces inédites', box: 'Box', mixte: 'Pièces et box' };

  async function orders() {
    const list = $('#cp-orders'); list.textContent = 'Chargement\u2026';
    try {
      const r = await fetch(C.url + '/rest/v1/orders?select=created_at,type,montant_cents,lignes&order=created_at.desc&limit=50',
        { headers: { apikey: C.key, Authorization: 'Bearer ' + await IC.token() } });
      if (!r.ok) throw new Error();
      const rows = await r.json();
      list.textContent = rows.length ? '' : 'Aucune commande pour le moment.';
      rows.forEach(o => {
        const li = document.createElement('li'); li.className = 'cp-order';
        const h = document.createElement('p'); h.className = 'cp-h';
        h.textContent = new Date(o.created_at).toLocaleDateString('fr-FR') + ' \u00b7 ' + (TYPES[o.type] || 'Commande') + ' \u00b7 ' + eur(o.montant_cents);
        const d = document.createElement('p'); d.className = 'cp-d';
        d.textContent = (o.lignes || []).map(l => l.nom).filter(Boolean).join(', ');
        li.append(h, d); list.append(li);
      });
    } catch (e) { list.textContent = 'Impossible de charger vos commandes pour le moment.'; }
  }
  function view() {
    const s = IC.session();
    $('#cp-auth').hidden = !!s; $('#cp-me').hidden = !s; $('#cp-reset').hidden = !(s && IC.recovery);
    if (s) { $('#cp-email').textContent = s.email; if (!IC.recovery) orders(); }
  }
  IC.onChange(view);
  IC.ready.then(view);

  $('#cp-login').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; say('#cp-lmsg', '');
    try { await IC.signIn(f.email.value.trim(), f.pw.value); } catch (x) { say('#cp-lmsg', x.message); }
  });
  $('#cp-signup').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; say('#cp-smsg', '');
    if (f.pw.value.length < 8) { say('#cp-smsg', 'Mot de passe : 8 caractères minimum.'); return; }
    try {
      const r = await IC.signUp(f.email.value.trim(), f.pw.value);
      if (r === 'confirmer') say('#cp-smsg', 'Presque terminé : un e-mail de confirmation vient de vous être envoyé. Cliquez sur le lien qu\u2019il contient.', true);
    } catch (x) { say('#cp-smsg', x.message); }
  });
  $('#cp-forgot').addEventListener('click', async () => {
    const m = $('#cp-login').email.value.trim();
    if (!m) { say('#cp-lmsg', 'Indiquez d\u2019abord votre e-mail ci-dessus.'); return; }
    try { await IC.recover(m); say('#cp-lmsg', 'Si un compte existe, un e-mail de réinitialisation vous a été envoyé.', true); } catch (x) { say('#cp-lmsg', x.message); }
  });
  $('#cp-reset').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    if (f.pw.value.length < 8) { say('#cp-rmsg', 'Mot de passe : 8 caractères minimum.'); return; }
    try { await IC.setPassword(f.pw.value); IC.recovery = false; say('#cp-rmsg', 'Mot de passe mis à jour.', true); view(); } catch (x) { say('#cp-rmsg', x.message); }
  });
  $('#cp-out').addEventListener('click', () => IC.signOut());
})();
