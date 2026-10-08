/* surmesure.js — assistant « Créer un bijou à partir d'un objet ».
   Ouvert par tout élément portant data-open="surmesure" (ou l'adresse #surmesure).
   Les textes et listes d'options se modifient dans la section CONTENU ci-dessous. */
(function () {
  'use strict';

  /* ===== CONTENU (à adapter avec la cliente) ===== */
  const FORM_URL = 'https://formspree.io/f/mwlvlbzv';
  const LEGAL_URL = './confidentialite.html';
  const OBJETS = ['Foulard, écharpe ou tissu', 'Bijou ancien', 'Vêtement', 'Lettre ou écrit', 'Objet du quotidien', 'Autre chose'];
  const BIJOUX = ['Bague', 'Collier ou pendentif', 'Bracelet', 'Boucles d\u2019oreilles', 'Je ne sais pas encore'];
  const MATIERES = ['Or', 'Argent', 'Doré', 'Peu importe'];
  const UNIVERS = ['Discret et minimal', 'Délicat et précieux', 'Audacieux et affirmé', 'Je vous laisse proposer'];
  const BUDGETS = ['Moins de 150 €', '150 \u2013 300 €', '300 \u2013 500 €', 'Plus de 500 €', 'Je ne sais pas, conseillez-moi'];

  /* ===== Outils ===== */
  const KEY = 'izaaly:surmesure';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const radios = (n, o, chips) => '<div class="' + (chips ? 'sm-chips' : 'sm-grid') + '" role="radiogroup">' +
    o.map(v => '<label class="sm-card"><input type="radio" name="' + n + '" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>').join('') + '</div>';
  const checks = (n, o) => '<div class="sm-chips">' +
    o.map(v => '<label class="sm-card"><input type="checkbox" name="' + n + '" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>').join('') + '</div>';
  const fld = (n, l, t, x) => '<label class="sm-f"><span>' + l + '</span><input type="' + (t || 'text') + '" name="' + n + '" ' + (x || '') + '></label>';
  const area = (n, l, r, p) => '<label class="sm-f"><span>' + l + '</span><textarea name="' + n + '" rows="' + (r || 3) + '" placeholder="' + esc(p || '') + '"></textarea></label>';
  const lab = t => '<p class="sm-label">' + t + '</p>';

  /* ===== Étapes (la 0 est l'introduction) ===== */
  const STEPS = [
    { id: 'intro' },
    { t: 'Quel objet souhaitez-vous transformer ?', h: 'Celui qui compte pour vous. Nous lui donnons une seconde vie.',
      b: () => radios('objet', OBJETS) + area('objetDetail', 'Décrivez-le en quelques mots (facultatif)', 2),
      ok: d => d.objet ? '' : 'Choisissez une option pour continuer.' },
    { t: 'Racontez-nous son histoire', h: 'À qui appartenait-il ? Que représente-t-il ? Prenez le temps : quelques lignes suffisent, vous pourrez nous en dire plus ensuite.',
      b: () => area('histoire', 'Votre histoire (facultatif)', 6, 'Par exemple : ce foulard était celui de ma grand-mère, elle le portait chaque dimanche\u2026'),
      ok: () => '' },
    { t: 'Quel bijou imaginez-vous ?', h: 'Si vous hésitez, nous vous conseillerons.',
      b: () => radios('bijou', BIJOUX),
      ok: d => d.bijou ? '' : 'Choisissez une option pour continuer.' },
    { t: 'Quel univers vous parle ?', h: 'Quelques goûts pour guider le dessin.',
      b: () => lab('Matière') + radios('matiere', MATIERES, true) + lab('Style (deux choix maximum)') + checks('univers', UNIVERS) +
        area('sensibilites', 'Allergies, goûts, choses à éviter (facultatif)', 3),
      ok: d => d.matiere ? '' : 'Choisissez une matière pour continuer.' },
    { t: 'Budget et calendrier', h: 'Une fourchette suffit : elle nous aide à vous proposer le bon projet.',
      b: () => radios('budget', BUDGETS) + fld('date', 'Une date à respecter ? (anniversaire, cérémonie\u2026 facultatif)', 'date'),
      ok: d => d.budget ? '' : 'Choisissez une option pour continuer.' },
    { t: 'Comment vous répondre ?', h: 'Nous revenons vers vous avec une proposition. Vous pourrez alors nous envoyer des photos de l\u2019objet.',
      b: () => fld('prenom', 'Prénom', 'text', 'autocomplete="given-name"') + fld('email', 'E-mail', 'email', 'autocomplete="email"') +
        fld('tel', 'Téléphone (facultatif)', 'tel', 'autocomplete="tel"') +
        '<label class="sm-check"><input type="checkbox" name="consent"><span>J\u2019accepte que ces informations servent à répondre à ma demande. <a href="' + LEGAL_URL + '" target="_blank" rel="noopener">Politique de confidentialité</a></span></label>',
      ok: d => !d.prenom ? 'Indiquez votre prénom.' : !/^\S+@\S+\.\S+$/.test(d.email || '') ? 'Indiquez une adresse e-mail valide.' : !d.consent ? 'Cochez la case pour envoyer votre demande.' : '' }
  ];
  const N = STEPS.length - 1;

  /* ===== État ===== */
  let S = { i: 0, d: {} };
  try { S = JSON.parse(sessionStorage.getItem(KEY)) || S; } catch (e) {}
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  let root, stage, lastFocus;

  function read() {
    stage.querySelectorAll('input,textarea').forEach(el => {
      const n = el.name; if (!n) return;
      if (el.type === 'radio') { if (el.checked) S.d[n] = el.value; }
      else if (el.type === 'checkbox') {
        S.d[n] = n === 'consent' ? el.checked : [...stage.querySelectorAll('input[name="' + n + '"]:checked')].map(x => x.value);
      } else S.d[n] = el.value.trim();
    });
    save();
  }
  function fill() {
    stage.querySelectorAll('input,textarea').forEach(el => {
      const v = S.d[el.name]; if (v == null) return;
      if (el.type === 'radio') el.checked = el.value === v;
      else if (el.type === 'checkbox') el.checked = Array.isArray(v) ? v.indexOf(el.value) > -1 : !!v;
      else el.value = v;
    });
  }

  /* ===== Affichage ===== */
  function render(back) {
    const s = STEPS[S.i];
    let h;
    if (S.i === 0) {
      h = '<svg class="sm-ring" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="190" pathLength="1"/><circle cx="200" cy="200" r="150" pathLength="1"/><circle class="d" cx="200" cy="200" r="170"/></svg>' +
        '<h2 id="sm-title" tabindex="-1">Un objet, une histoire, un bijou</h2>' +
        '<p class="sm-hint">Transformez un objet qui compte pour vous en un bijou unique, à garder près de vous.</p>' +
        '<ol class="sm-steps"><li>Vous nous racontez l\u2019objet et son histoire</li><li>Nous dessinons ensemble un croquis</li><li>Votre bijou est créé avec soin</li></ol>' +
        '<p class="sm-hint">Environ 3 minutes. Nous revenons vers vous avec une proposition.</p>';
    } else {
      h = '<p class="sm-count">Étape ' + S.i + ' sur ' + N + '</p><h2 id="sm-title" tabindex="-1">' + s.t + '</h2><p class="sm-hint">' + s.h + '</p>' + s.b() + '<p class="sm-err" role="alert"></p>';
    }
    stage.className = 'sm-stage' + (back ? ' back' : '');
    stage.innerHTML = h;
    void stage.offsetWidth;
    fill();
    root.querySelector('.sm-bar i').style.width = (S.i / N * 100) + '%';
    root.querySelector('.sm-prev').hidden = S.i === 0;
    root.querySelector('.sm-next').textContent = S.i === 0 ? 'Commencer' : S.i === N ? 'Envoyer ma demande' : 'Continuer';
    root.querySelector('.sm-main').scrollTop = 0;
    stage.querySelector('#sm-title').focus({ preventScroll: true });
  }
  const err = m => { const e = stage.querySelector('.sm-err'); if (e) e.textContent = m; };

  function next() {
    if (S.i > 0) { read(); const m = STEPS[S.i].ok(S.d); if (m) { err(m); return; } }
    if (S.i === N) { send(); return; }
    S.i++; save(); render();
  }
  function prev() { if (S.i > 0) { read(); S.i--; save(); render(true); } }

  async function send() {
    if (root.querySelector('.sm-hp').value) return; // anti-spam
    const d = S.d, b = root.querySelector('.sm-next');
    b.disabled = true; b.textContent = 'Envoi en cours\u2026'; err('');
    try {
      const r = await fetch(FORM_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Demande sur mesure \u2013 ' + d.prenom, projet: 'Sur mesure (à partir d\u2019un objet)',
          prenom: d.prenom, email: d.email, telephone: d.tel || '', objet: d.objet, objet_precisions: d.objetDetail || '',
          histoire: d.histoire || '', bijou: d.bijou, matiere: d.matiere, style: (d.univers || []).join(', '),
          sensibilites: d.sensibilites || '', budget: d.budget, date_souhaitee: d.date || ''
        })
      });
      if (!r.ok) throw new Error();
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      S = { i: 0, d: {} };
      stage.className = 'sm-stage';
      stage.innerHTML = '<h2 id="sm-title" tabindex="-1"></h2><p class="sm-hint">Votre demande est bien arrivée. Nous revenons vers vous très vite, par e-mail. Vous pourrez alors nous envoyer des photos de l\u2019objet.</p>';
      stage.querySelector('h2').textContent = 'Merci ' + d.prenom + '.';
      root.querySelector('.sm-prev').hidden = true;
      b.textContent = 'Fermer'; b.disabled = false; b.onclick = close;
      root.querySelector('.sm-bar i').style.width = '100%';
      stage.querySelector('h2').focus({ preventScroll: true });
    } catch (e) {
      b.disabled = false; b.textContent = 'Envoyer ma demande';
      err('L\u2019envoi a échoué. Vos réponses sont conservées : réessayez dans un instant.');
    }
  }

  /* ===== Ouverture / fermeture ===== */
  function open(trigger) {
    if (root) return;
    lastFocus = trigger || document.activeElement;
    root = document.createElement('div');
    root.className = 'sm-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'sm-title');
    root.innerHTML = '<div class="sm-head"><span class="sm-logo">IZAALY</span><button type="button" class="sm-x">Fermer</button></div>' +
      '<div class="sm-bar"><i></i></div><div class="sm-main"><div class="sm-stage"></div></div>' +
      '<div class="sm-foot"><button type="button" class="sm-btn ghost sm-prev">Retour</button><button type="button" class="sm-btn sm-next">Continuer</button></div>' +
      '<input class="sm-hp" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">';
    document.body.appendChild(root);
    document.body.classList.add('sm-lock');
    stage = root.querySelector('.sm-stage');
    root.querySelector('.sm-x').onclick = close;
    root.querySelector('.sm-prev').onclick = prev;
    root.querySelector('.sm-next').onclick = next;
    root.addEventListener('change', e => {
      if (e.target.name === 'univers' && stage.querySelectorAll('input[name="univers"]:checked').length > 2) {
        e.target.checked = false; err('Deux choix maximum.');
      } else err('');
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && /^(text|email|tel|date)$/.test(e.target.type)) { e.preventDefault(); next(); }
      if (e.key === 'Tab') { // garde le focus dans la fenêtre
        const f = [...root.querySelectorAll('button:not([hidden]):not(:disabled),input:not(.sm-hp),textarea,a')].filter(x => x.offsetParent !== null || x === document.activeElement);
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    render();
  }
  function close() {
    if (!root) return;
    if (stage.querySelector('input,textarea') && S.i > 0) read();
    root.remove(); root = null;
    document.body.classList.remove('sm-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  const isAdmin = new URLSearchParams(location.search).has('admin');
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-open="surmesure"]');
    if (!t || isAdmin) return;
    e.preventDefault(); open(t);
  });
  if (location.hash === '#surmesure' && !isAdmin) open();
  window.IzaalySurMesure = { open };
})();
