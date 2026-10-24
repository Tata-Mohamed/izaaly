/* cartblanche.js — assistant « Carte blanche » (création personnalisée surprise).
   Ouvert par tout élément portant data-open="carteblanche" (ou l'adresse #carteblanche).
   Utilise les styles de surmesure.css. Textes et options : section CONTENU ci-dessous. */
(function () {
  'use strict';

  /* ===== CONTENU (à valider avec la cliente) ===== */
  const FORM_URL = 'https://formspree.io/f/mwlvlbzv';
  const LEGAL_URL = './confidentialite.html';
  const CGV_URL = './cgv.html';
  const POUR = ['Pour moi', 'Pour offrir'];
  const BIJOUX = ['Bague', 'Collier ou pendentif', 'Bracelet', 'Boucles d\u2019oreilles', 'Je vous laisse choisir'];
  const MATIERES = ['Or', 'Argent', 'Doré', 'Peu importe'];
  const COULEURS = ['Sobres (noir, blanc, beige)', 'Chaudes (doré, rouge, orangé)', 'Douces (pastel)', 'Naturelles (vert, terre)', 'Je ne sais pas'];
  const UNIVERS = ['Discret et minimal', 'Délicat et précieux', 'Audacieux et affirmé', 'Je vous laisse proposer'];
  const ROUGES = ['Rien de trop voyant', 'Pas de pierres', 'Pas de perles', 'Pas de symboles (cœur, étoile\u2026)', 'Pas de grand pendentif'];
  const OCCASIONS = ['Anniversaire', 'Naissance', 'Mariage', 'Remerciement', 'Juste pour le plaisir'];
  const BUDGETS = ['Moins de 150 €', '150 \u2013 300 €', '300 \u2013 500 €', 'Plus de 500 €'];

  /* ===== Outils ===== */
  const KEY = 'izaaly:carteblanche';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const opts = (type, n, o, cls) => '<div class="' + cls + '"' + (type === 'radio' ? ' role="radiogroup"' : '') + '>' +
    o.map(v => '<label class="sm-card"><input type="' + type + '" name="' + n + '" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>').join('') + '</div>';
  const radios = (n, o, chips) => opts('radio', n, o, chips ? 'sm-chips' : 'sm-grid');
  const checks = (n, o) => opts('checkbox', n, o, 'sm-chips');
  const fld = (n, l, t, x) => '<label class="sm-f"><span>' + l + '</span><input type="' + (t || 'text') + '" name="' + n + '" ' + (x || '') + '></label>';
  const area = (n, l, r, p) => '<label class="sm-f"><span>' + l + '</span><textarea name="' + n + '" rows="' + (r || 3) + '" placeholder="' + esc(p || '') + '"></textarea></label>';
  const lab = t => '<p class="sm-label">' + t + '</p>';
  const chk = (n, html) => '<label class="sm-check"><input type="checkbox" name="' + n + '"><span>' + html + '</span></label>';
  const need = 'Choisissez une option pour continuer.';

  /* ===== Étapes (la 0 est l'introduction) ===== */
  const STEPS = [
    { id: 'intro' },
    { t: 'Ce bijou, c\u2019est pour qui ?', h: 'Pour vous, ou pour quelqu\u2019un que vous aimez.',
      b: () => radios('pour', POUR) + area('destinataire', 'Un mot sur la personne (facultatif)', 3, 'Son âge, ce qu\u2019elle aime, sa façon de s\u2019habiller\u2026'),
      ok: d => d.pour ? '' : need },
    { t: 'Quel type de bijou ?', h: 'Si vous nous laissez choisir, c\u2019est une surprise de plus.',
      b: () => radios('bijou', BIJOUX), ok: d => d.bijou ? '' : need },
    { t: 'Matière et couleurs', h: 'Ce qui lui ira le mieux.',
      b: () => lab('Matière') + radios('matiere', MATIERES, true) + lab('Couleurs (plusieurs choix possibles)') + checks('couleurs', COULEURS),
      ok: d => d.matiere ? '' : 'Choisissez une matière pour continuer.' },
    { t: 'Quel style lui ressemble ?', h: 'Deux choix maximum.',
      b: () => checks('univers', UNIVERS) + area('inspiration', 'Un bijou qu\u2019elle porte tout le temps ? Une inspiration ? (facultatif)', 3),
      ok: () => '' },
    { t: 'Ce qu\u2019il faut éviter', h: 'C\u2019est l\u2019étape qui compte le plus pour réussir la surprise.',
      b: () => checks('rouges', ROUGES) + area('rougesAutre', 'Autre chose à éviter absolument (facultatif)', 3) +
        fld('allergies', 'Allergies ou sensibilités à un métal (facultatif)', 'text', 'placeholder="Par exemple : nickel"'),
      ok: () => '' },
    { t: 'Budget et calendrier', h: 'Il nous aide à créer le bijou juste.',
      b: () => radios('budget', BUDGETS) + lab('Occasion (facultatif)') + radios('occasion', OCCASIONS, true) +
        fld('date', 'Date à respecter (facultatif)', 'date') + fld('taille', 'Taille de bague ou de poignet (facultatif)', 'text', 'placeholder="Si vous ne la connaissez pas, nous vous guiderons"'),
      ok: d => d.budget ? '' : need },
    { t: 'Comment vous répondre ?', h: 'Nous gardons le secret : nous vous écrivons pour confirmer les détails.',
      b: () => fld('prenom', 'Prénom', 'text', 'autocomplete="given-name"') + fld('email', 'E-mail', 'email', 'autocomplete="email"') +
        fld('tel', 'Téléphone (facultatif)', 'tel', 'autocomplete="tel"') +
        chk('surprise', 'Je comprends que le bijou est une <strong>surprise</strong> et j\u2019ai lu les conditions (délais, échanges, retours) dans les <a href="' + CGV_URL + '" target="_blank" rel="noopener">CGV</a>.') +
        chk('consent', 'J\u2019accepte que ces informations servent à répondre à ma demande. <a href="' + LEGAL_URL + '" target="_blank" rel="noopener">Politique de confidentialité</a>'),
      ok: d => !d.prenom ? 'Indiquez votre prénom.' : !/^\S+@\S+\.\S+$/.test(d.email || '') ? 'Indiquez une adresse e-mail valide.' :
        !d.surprise ? 'Cochez la case sur la surprise et les conditions.' : !d.consent ? 'Cochez la case de confidentialité.' : '' }
  ];
  const N = STEPS.length - 1, LIMITED = { univers: 2 };

  /* ===== État ===== */
  let S = { i: 0, d: {} };
  try { S = JSON.parse(sessionStorage.getItem(KEY)) || S; } catch (e) {}
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const BOOL = { consent: 1, surprise: 1 };
  let root, stage, lastFocus;

  function read() {
    stage.querySelectorAll('input,textarea').forEach(el => {
      const n = el.name; if (!n) return;
      if (el.type === 'radio') { if (el.checked) S.d[n] = el.value; }
      else if (el.type === 'checkbox') S.d[n] = BOOL[n] ? el.checked : [...stage.querySelectorAll('input[name="' + n + '"]:checked')].map(x => x.value);
      else S.d[n] = el.value.trim();
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
  const err = m => { const e = stage.querySelector('.sm-err'); if (e) e.textContent = m; };
  function render(back) {
    const s = STEPS[S.i];
    stage.className = 'sm-stage' + (back ? ' back' : '');
    stage.innerHTML = S.i === 0
      ? '<svg class="sm-ring" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="190" pathLength="1"/><circle cx="200" cy="200" r="150" pathLength="1"/><circle class="d" cx="200" cy="200" r="170"/></svg>' +
        '<h2 id="sm-title" tabindex="-1">Faites-nous confiance</h2>' +
        '<p class="sm-hint">Vous nous confiez vos goûts, nous créons librement un bijou que vous découvrirez à la réception. Une surprise, pour vous ou pour quelqu\u2019un que vous aimez.</p>' +
        '<ol class="sm-steps"><li>Vous nous dites ce qu\u2019elle aime, et surtout ce qu\u2019elle n\u2019aime pas</li><li>Nous créons, à partir de ces indications</li><li>Vous découvrez le bijou à la réception</li></ol>' +
        '<p class="sm-hint">Environ 4 minutes. Le bijou n\u2019est pas montré avant l\u2019envoi : tout repose sur vos réponses.</p>'
      : '<p class="sm-count">Étape ' + S.i + ' sur ' + N + '</p><h2 id="sm-title" tabindex="-1">' + s.t + '</h2><p class="sm-hint">' + s.h + '</p>' + s.b() + '<p class="sm-err" role="alert"></p>';
    void stage.offsetWidth;
    fill();
    root.querySelector('.sm-bar i').style.width = (S.i / N * 100) + '%';
    root.querySelector('.sm-prev').hidden = S.i === 0;
    root.querySelector('.sm-next').textContent = S.i === 0 ? 'Commencer' : S.i === N ? 'Envoyer ma demande' : 'Continuer';
    root.querySelector('.sm-main').scrollTop = 0;
    stage.querySelector('#sm-title').focus({ preventScroll: true });
  }

  function next() {
    if (S.i > 0) { read(); const m = STEPS[S.i].ok(S.d); if (m) { err(m); return; } }
    if (S.i === N) { send(); return; }
    S.i++; save(); render();
  }
  function prev() { if (S.i > 0) { read(); S.i--; save(); render(true); } }

  async function send() {
    if (root.querySelector('.sm-hp').value) return; // anti-spam
    const d = S.d, b = root.querySelector('.sm-next'), j = a => (a || []).join(', ');
    b.disabled = true; b.textContent = 'Envoi en cours\u2026'; err('');
    try {
      const r = await fetch(FORM_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Carte blanche \u2013 ' + d.prenom, projet: 'Création personnalisée (carte blanche)',
          prenom: d.prenom, email: d.email, telephone: d.tel || '', pour: d.pour, destinataire: d.destinataire || '',
          bijou: d.bijou, matiere: d.matiere, couleurs: j(d.couleurs), style: j(d.univers), inspiration: d.inspiration || '',
          a_eviter: j(d.rouges), a_eviter_autre: d.rougesAutre || '', allergies: d.allergies || '',
          budget: d.budget, occasion: d.occasion || '', date_souhaitee: d.date || '', taille: d.taille || '',
          surprise_et_cgv_acceptees: d.surprise ? 'oui' : 'non'
        })
      });
      if (!r.ok) throw new Error();
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      S = { i: 0, d: {} };
      stage.className = 'sm-stage';
      stage.innerHTML = '<h2 id="sm-title" tabindex="-1"></h2><p class="sm-hint">Votre demande est bien arrivée, et le secret est bien gardé. Nous vous écrivons très vite par e-mail pour confirmer les détails (délai, paiement).</p>';
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
    if (root || document.querySelector('.sm-root')) return;
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
      const n = e.target.name, max = LIMITED[n];
      if (max && stage.querySelectorAll('input[name="' + n + '"]:checked').length > max) { e.target.checked = false; err('Deux choix maximum.'); }
      else err('');
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
    if (S.i > 0 && stage.querySelector('input,textarea')) read();
    root.remove(); root = null;
    document.body.classList.remove('sm-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  const isAdmin = new URLSearchParams(location.search).has('admin');
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-open="carteblanche"]');
    if (!t || isAdmin) return;
    e.preventDefault(); open(t);
  });
  if (location.hash === '#carteblanche' && !isAdmin) open();
  window.IzaalyCarteBlanche = { open };
})();
