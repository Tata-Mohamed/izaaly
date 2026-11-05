/* admin.js — mode édition d'Izaaly. Chargé par index.html uniquement avec ?admin
   et uniquement si une session existe (sinon redirection vers admin.html). */
(function () {
  const C = window.IzaalyContent;
  if (!C) return;
  const SK = 'izaaly:session';
  let S = null;
  try { S = JSON.parse(localStorage.getItem(SK)); } catch (e) {}
  if (!S || !S.refresh_token) { location.href = 'admin/admin.html'; return; }

  const pending = {};        // { clé: valeur } à enregistrer
  const textKeys = new Set(); // clés de texte modifiées
  let busy = false;

  /* ---------- API ---------- */
  async function token() {
    if (S.expires_at * 1000 - Date.now() > 60000) return S.access_token;
    const r = await fetch(C.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: C.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: S.refresh_token })
    });
    if (!r.ok) { localStorage.removeItem(SK); location.href = 'admin/admin.html'; throw new Error('session expirée'); }
    const j = await r.json();
    S = { access_token: j.access_token, refresh_token: j.refresh_token,
          expires_at: j.expires_at || Math.floor(Date.now() / 1000) + j.expires_in };
    localStorage.setItem(SK, JSON.stringify(S));
    return S.access_token;
  }
  async function call(path, opts) {
    opts = opts || {};
    return fetch(C.url + path, Object.assign({}, opts, {
      headers: Object.assign({ apikey: C.key, Authorization: 'Bearer ' + await token() }, opts.headers)
    }));
  }

  /* ---------- Images ---------- */
  function resize(file, max) {
    return new Promise((ok, ko) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(b => b ? ok(b) : ko(new Error('conversion impossible')), 'image/webp', 0.85);
      };
      img.onerror = () => ko(new Error('image illisible'));
      img.src = u;
    });
  }
  function pickImage(key) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      if (!inp.files[0]) return;
      say('Envoi de l\u2019image\u2026');
      try {
        const blob = await resize(inp.files[0], 1600);
        const ext = blob.type === 'image/webp' ? 'webp' : 'png';
        const path = key.replace(/\W/g, '-') + '-' + Date.now() + '.' + ext;
        const r = await call('/storage/v1/object/images/' + path, {
          method: 'POST', headers: { 'Content-Type': blob.type }, body: blob
        });
        if (!r.ok) throw new Error('envoi refusé (' + r.status + ')');
        const url = C.url + '/storage/v1/object/public/images/' + path;
        C.apply({ [key]: url });
        pending[key] = url;
        say('Image prête. Pensez à enregistrer.');
      } catch (e) { say('Erreur image : ' + e.message, true); }
    };
    inp.click();
  }

  /* ---------- Lecture d'un texte (BR -> \n, espaces normalisés) ---------- */
  function read(el) {
    let s = '';
    el.childNodes.forEach(n => { s += n.nodeName === 'BR' ? '\u0000' : n.textContent; });
    return s.replace(/\s+/g, ' ').trim().replace(/ ?\u0000 ?/g, '\n');
  }

  /* ---------- Barre d'outils ---------- */
  const bar = document.createElement('div');
  bar.id = 'adm-bar';
  bar.innerHTML = '<span id="adm-msg">Cliquez sur un texte pour le modifier, sur une image pour la remplacer, puis sur « Enregistrer ».</span>' +
    '<button id="adm-pieces">Mes pièces</button><button id="adm-orders">Mes commandes</button><button id="adm-reglages">Réglages</button><button id="adm-save">Enregistrer</button><button id="adm-cancel">Annuler</button>' +
    '<a href="index.html">Voir le site</a><button id="adm-out">Déconnexion</button>' +
    '<span id="adm-old" hidden><button id="adm-ship"></button><button id="adm-prix"></button><button id="adm-social"></button><button id="adm-form"></button><button id="adm-avis"></button><button id="adm-hist"></button></span>';
  const msg = () => document.getElementById('adm-msg');
  function say(t, bad) { msg().textContent = t; msg().style.color = bad ? '#ff8a8a' : ''; }

  const css = document.createElement('style');
  css.textContent =
    'body{padding-bottom:84px}' +
    '[data-edit]{cursor:text;outline:1px dashed transparent;outline-offset:4px;transition:outline-color .2s}' +
    '[data-edit]:hover,[data-edit]:focus{outline-color:#b8893b}' +
    '[data-img]{cursor:pointer;outline:2px dashed rgba(184,137,59,.0)}[data-img]:hover{outline:2px dashed #b8893b}' +
    '.adm-bgbtn{position:absolute;top:12px;left:12px;z-index:30;padding:.6rem 1rem;border:0;background:#fff;color:#000;font:500 .8rem Jost,sans-serif;cursor:pointer}' +
    '.ph-g1,.ph-g2,.ph-g3,.ph-g4{position:relative}' +
    '.topbar{height:auto}.topbar .msg{position:static;opacity:1;transform:none!important;padding:.4rem 1rem}' +
    '.cat-media{display:grid;grid-template-columns:1fr 1fr}.cat-media img{position:static!important;opacity:1!important;transform:none!important;height:100%}' +
    '.reveal{opacity:1!important;transform:none!important}' +
    '#adm-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;flex-wrap:wrap;gap:.8rem;align-items:center;padding:.9rem 1.2rem;background:#000;color:#fff;font:400 .95rem Jost,sans-serif;border-top:1px solid #444}' +
    '#adm-msg{flex:1 1 260px}#adm-bar button,#adm-bar a{font:500 .8rem Jost,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:.7rem 1rem;border:1px solid #fff;background:none;color:#fff;cursor:pointer;text-decoration:none}' +
    '#adm-save{background:#fff!important;color:#000!important}';
  document.head.appendChild(css);
  document.body.appendChild(bar);

  /* ---------- Activation de l'édition ---------- */
  document.querySelectorAll('[data-write]').forEach(el => {
    el.textContent = el.getAttribute('aria-label') || el.textContent; // annule l'écriture lettre par lettre
    el.removeAttribute('aria-label');
  });
  const sheet = document.querySelector('.sheet');
  if (sheet) sheet.classList.add('writing');

  document.querySelectorAll('[data-edit]').forEach(el => {
    el.contentEditable = 'true';
    el.spellcheck = true;
    el.addEventListener('input', () => { textKeys.add(el.dataset.edit); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    });
  });

  document.querySelectorAll('[data-bg]').forEach(el => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'adm-bgbtn'; b.textContent = 'Changer la photo';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); pickImage(el.dataset.bg); });
    el.appendChild(b);
  });

  // Clics : pas de navigation, images cliquables (y compris sous les dégradés des cartes)
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#adm-bar')) return;
    if (t.closest('a')) e.preventDefault();
    if (t.closest('[data-edit]') || t.closest('.adm-bgbtn')) return;
    const img = t.closest('[data-img]') || (t.closest('.offer-card') || document.createElement('i')).querySelector('[data-img]');
    if (img) { e.preventDefault(); pickImage(img.dataset.img); }
  }, true);

  /* ---------- Boutons ---------- */
  document.getElementById('adm-save').onclick = async () => {
    if (busy) return;
    textKeys.forEach(k => {
      const el = document.querySelector('[data-edit="' + k + '"]');
      if (el) pending[k] = read(el);
    });
    const rows = Object.keys(pending).map(key => ({ key, value: pending[key] }));
    if (!rows.length) { say('Aucune modification à enregistrer.'); return; }
    busy = true; say('Enregistrement\u2026');
    try {
      const r = await call('/rest/v1/content?on_conflict=key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
      });
      if (!r.ok) throw new Error('refusé (' + r.status + ')');
      Object.assign(C.data, pending);
      try { localStorage.setItem('izaaly:content:v1', JSON.stringify(C.data)); } catch (e) {}
      Object.keys(pending).forEach(k => delete pending[k]);
      textKeys.clear();
      say('Modifications enregistrées. Votre site est à jour.');
    } catch (e) { say('Erreur d\u2019enregistrement : ' + e.message, true); }
    busy = false;
  };
  document.getElementById('adm-cancel').onclick = () => {
    if (confirm('Annuler toutes les modifications non enregistrées ?')) { window.onbeforeunload = null; location.reload(); }
  };
  document.getElementById('adm-out').onclick = () => {
    localStorage.removeItem(SK); location.href = 'index.html';
  };
  window.onbeforeunload = () => (textKeys.size || Object.keys(pending).length) ? 'Modifications non enregistrées' : undefined;

  /* ---------- Tarifs des box, avis clientes, historique ---------- */
  const css2 = document.createElement('style');
  css2.textContent =
    '#adm-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.7);display:grid;place-items:center;padding:1rem}' +
    '#adm-modal .box{background:#fff;color:#000;width:min(680px,100%);max-height:88vh;overflow:auto;padding:1.6rem;font:400 1rem Jost,sans-serif}' +
    '#adm-modal h3{font-size:1.15rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem}' +
    '#adm-modal label{display:grid;gap:.3rem;margin:.7rem 0;font-size:.85rem;color:#444}' +
    '#adm-modal input,#adm-modal textarea{font:inherit;padding:.6rem;border:1px solid #000;border-radius:0;width:100%}' +
    '#adm-modal .row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem}' +
    '#adm-modal button{font:500 .8rem Jost,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:.7rem 1rem;border:1px solid #000;background:#fff;color:#000;cursor:pointer}' +
    '#adm-modal button.pri{background:#000;color:#fff}' +
    '#adm-modal .item{border-top:1px solid #ccc;padding:.8rem 0}#adm-modal small{color:#666}' +
    '#adm-modal img{width:64px;height:64px;object-fit:cover;display:block;margin:.4rem 0}';
  document.head.appendChild(css2);

  const el = (t, p, ...kids) => { const e = Object.assign(document.createElement(t), p || {}); e.append(...kids); return e; };
  const dirty = () => textKeys.size || Object.keys(pending).length;
  function modal(title, ...content) {
    const m = el('div', { id: 'adm-modal' }, el('div', { className: 'box' }, el('h3', { textContent: title }), ...content));
    m.addEventListener('mousedown', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m); return m;
  }
  async function put(rows) {
    const r = await call('/rest/v1/content?on_conflict=key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });
    if (!r.ok) throw new Error('refusé (' + r.status + ')');
    rows.forEach(x => { C.data[x.key] = x.value; });
    try { localStorage.setItem('izaaly:content:v1', JSON.stringify(C.data)); } catch (e) {}
  }
  async function upload(file, name) {
    const blob = await resize(file, 1600);
    const path = name + '-' + Date.now() + (blob.type === 'image/webp' ? '.webp' : '.png');
    const r = await call('/storage/v1/object/images/' + path, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
    if (!r.ok) throw new Error('envoi refusé (' + r.status + ')');
    return C.url + '/storage/v1/object/public/images/' + path;
  }
  const field = (label, value) => { const i = el('input', { value: value == null ? '' : value }); return [i, el('label', {}, label, i)]; };
  const needSave = () => { if (dirty()) { say('Enregistrez d\u2019abord vos modifications en cours.', true); return true; } };

  // Tarifs, durées et remises des box
  document.getElementById('adm-prix').onclick = () => {
    if (needSave()) return;
    const D = C.data;
    const f = [['box1.prix', 'La Découverte (€, box unique)', 19.99], ['box2.prix', 'L\u2019Essentiel (€ / mois)', 29.99],
      ['box3.prix', 'L\u2019Exception (€ / mois)', 39.99]].map(([k, l, d]) => [k, ...field(l, D[k] != null ? D[k] : d)]);
    const fac = field('Texte de facturation ({total} et {mois} sont remplacés automatiquement)', D['box.facture'] || 'Facturé {total} € pour {mois} mois');
    const cur = Array.isArray(D['box.durees']) && D['box.durees'].length ? D['box.durees']
      : [{ mois: 3, remise: 0 }, { mois: 6, remise: D['box.remise6'] != null ? D['box.remise6'] : 5 }, { mois: 12, remise: D['box.remise12'] != null ? D['box.remise12'] : 10 }];
    const dur = [0, 1, 2, 3].map(n => [field('Durée ' + (n + 1) + ' (en mois, laisser vide pour ne pas l\u2019utiliser)', (cur[n] || {}).mois),
                                       field('Remise de la durée ' + (n + 1) + ' (%)', (cur[n] || {}).remise)]);
    const err = el('p', { style: 'color:#b00020;min-height:1.2em' });
    const m = modal('Tarifs et durées des box', ...f.map(x => x[2]), fac[1], ...dur.flatMap(d => [d[0][1], d[1][1]]), err, el('div', { className: 'row' },
      el('button', { className: 'pri', textContent: 'Enregistrer', onclick: async () => {
        const rows = f.map(([k, i]) => ({ key: k, value: i.value.replace(',', '.').trim() }));
        if (rows.some(r => !isFinite(parseFloat(r.value)) || parseFloat(r.value) < 0)) { err.textContent = 'Saisissez des prix valides.'; return; }
        const list = [];
        for (const [mo, re] of dur) {
          if (!mo[0].value.trim()) continue;
          const mois = parseInt(mo[0].value, 10), remise = parseFloat(re[0].value.replace(',', '.') || '0');
          if (!(mois >= 1 && mois <= 36) || !(remise >= 0 && remise <= 90)) { err.textContent = 'Durée : 1 à 36 mois. Remise : 0 à 90 %.'; return; }
          list.push({ mois, remise });
        }
        if (!list.length) { err.textContent = 'Gardez au moins une durée.'; return; }
        rows.push({ key: 'box.durees', value: list }, { key: 'box.facture', value: fac[0].value.trim() || 'Facturé {total} € pour {mois} mois' });
        try { await put(rows); window.IzaalyBox && window.IzaalyBox.render(); m.remove(); say('Tarifs et durées enregistrés.'); }
        catch (e) { err.textContent = 'Erreur : ' + e.message; }
      } }),
      el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
  };

  // Fenêtre de réglages générique (réseaux, formulaire)
  function settings(title, note, defs, validate) {
    if (needSave()) return;
    const D = C.data;
    const f = defs.map(([k, l, d, t]) => {
      const x = el(t === 'area' ? 'textarea' : 'input', { value: D[k] != null ? D[k] : d });
      if (t === 'area') x.rows = 5;
      return [k, x, el('label', {}, l, x)];
    });
    const err = el('p', { style: 'color:#b00020;min-height:1.2em' });
    const m = modal(title, el('small', { textContent: note }), ...f.map(x => x[2]), err, el('div', { className: 'row' },
      el('button', { className: 'pri', textContent: 'Enregistrer', onclick: async () => {
        const rows = f.map(([k, x]) => ({ key: k, value: x.value.trim() }));
        const bad = validate && validate(rows);
        if (bad) { err.textContent = bad; return; }
        try { await put(rows); C.apply(C.data); m.remove(); say('Enregistré.'); }
        catch (e) { err.textContent = 'Erreur : ' + e.message; }
      } }),
      el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
  }

  document.getElementById('adm-social').onclick = () => settings('Réseaux sociaux',
    'Collez l\u2019adresse complète (https://…). Laissez vide pour masquer un réseau sur tout le site.',
    [['social.instagram', 'Instagram', 'https://instagram.com/izaaly'], ['social.tiktok', 'TikTok', 'https://tiktok.com/@izaaly'],
     ['social.pinterest', 'Pinterest', 'https://pinterest.com/izaaly'], ['social.handle', 'Pseudo affiché (bandeau défilant)', '@izaaly']],
    rows => rows.some(r => r.key !== 'social.handle' && r.value && !/^https?:\/\/\S+$/i.test(r.value)) ? 'Chaque lien doit commencer par https://' : '');

  document.getElementById('adm-form').onclick = () => settings('Formulaire de contact',
    'Libellés et messages du formulaire. Une option par ligne dans la liste des types de projet.',
    [['form.nom', 'Champ nom', 'Nom'], ['form.email', 'Champ e-mail', 'E-mail'], ['form.type', 'Liste de types', 'Type de projet'],
     ['form.types', 'Options de la liste (une par ligne)', 'Création sur mesure\nCréation personnalisée\nBox mensuelle\nAutre demande', 'area'],
     ['form.msg', 'Champ message', 'Votre projet'], ['form.bouton', 'Bouton d\u2019envoi', 'Envoyer ma demande'],
     ['form.envoi', 'Bouton pendant l\u2019envoi', 'Envoi en cours'],
     ['form.ok', 'Message de succès', 'Merci, votre demande est bien envoyée. Nous revenons vers vous très vite.'],
     ['form.err', 'Message d\u2019erreur', 'L\u2019envoi a échoué. Réessayez ou écrivez-nous directement par e-mail.']],
    rows => rows.some(r => !r.value) ? 'Aucun champ ne doit rester vide.' : '');

  // Avis clientes
  document.getElementById('adm-avis').onclick = () => {
    if (needSave()) return;
    const src = C.data['avis.liste'];
    const list = Array.isArray(src) ? src.map(a => Object.assign({}, a))
      : [...document.querySelectorAll('#voicesTrack .vcard:not([aria-hidden])')].map(c => ({
          nom: c.querySelector('.vname').firstChild.textContent, projet: c.querySelector('.vname span').textContent,
          texte: c.querySelector('blockquote').textContent, image: (c.querySelector('img') || {}).src || '' }));
    const err = el('p', { style: 'color:#b00020;min-height:1.2em' });
    const box = el('div');
    const draw = () => {
      box.textContent = '';
      list.forEach((a, i) => {
        const bind = (label, key, tag) => { const x = el(tag || 'input', { value: a[key] || '', oninput: () => { a[key] = x.value; } }); return el('label', {}, label, x); };
        box.appendChild(el('div', { className: 'item' },
          a.image ? el('img', { src: a.image, alt: '' }) : el('small', { textContent: 'Pas de photo' }),
          bind('Prénom', 'nom'), bind('Projet (ex. Bague gravée)', 'projet'), bind('Avis', 'texte', 'textarea'), bind('Note sur 5 (facultatif)', 'note'),
          el('div', { className: 'row' },
            el('button', { textContent: 'Photo', onclick: () => {
              const f = el('input', { type: 'file', accept: 'image/*', onchange: async () => {
                if (!f.files[0]) return;
                try { err.textContent = 'Envoi…'; a.image = await upload(f.files[0], 'avis-' + i); err.textContent = ''; draw(); }
                catch (e) { err.textContent = 'Erreur : ' + e.message; }
              } }); f.click(); } }),
            el('button', { textContent: 'Monter', onclick: () => { if (i) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); } } }),
            el('button', { textContent: 'Supprimer', onclick: () => { if (confirm('Supprimer cet avis ?')) { list.splice(i, 1); draw(); } } }))));
      });
    };
    draw();
    const m = modal('Avis clientes', el('small', { textContent: 'Un nombre pair d\u2019avis donne le meilleur rendu du carrousel. Utilisez uniquement de vrais avis, avec l\u2019accord des clientes pour leurs photos.' }),
      box, err, el('div', { className: 'row' },
        el('button', { textContent: 'Ajouter un avis', onclick: () => { list.push({ nom: '', projet: '', texte: '', image: '', note: '' }); draw(); } }),
        el('button', { className: 'pri', textContent: 'Enregistrer', onclick: async () => {
          try { await put([{ key: 'avis.liste', value: list.filter(a => (a.texte || '').trim()).map(a => { const n = parseFloat(String(a.note || '').replace(',', '.')); return Object.assign({}, a, { note: n >= 1 && n <= 5 ? n : '' }); }) }]); location.reload(); }
          catch (e) { err.textContent = 'Erreur : ' + e.message; }
        } }),
        el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
  };

  // Historique et restauration
  document.getElementById('adm-hist').onclick = async () => {
    if (needSave()) return;
    const out = el('div', { textContent: 'Chargement\u2026' });
    const m = modal('Historique des modifications', out, el('div', { className: 'row' }, el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
    try {
      const r = await call('/rest/v1/content_history?select=*&limit=300');
      if (!r.ok) throw new Error('lecture refusée (' + r.status + '). Ajoutez la règle SQL indiquée dans le README.');
      const rows = await r.json();
      const dk = o => Object.keys(o).find(k => /(_at|date|time)/i.test(k));
      const vk = o => ['old_value', 'previous_value', 'value'].find(k => k in o);
      rows.sort((a, b) => String(b[dk(b)] || '').localeCompare(String(a[dk(a)] || '')));
      out.textContent = rows.length ? '' : 'Aucune modification enregistrée pour le moment.';
      rows.slice(0, 60).forEach(h => {
        const val = h[vk(h)];
        const isImg = typeof val === 'string' && /^https?:.*\.(webp|png|jpe?g)/i.test(val);
        const label = typeof val === 'string' ? val : JSON.stringify(val);
        out.appendChild(el('div', { className: 'item' },
          el('strong', { textContent: h.key }),
          el('small', { textContent: dk(h) ? ' \u00b7 ' + new Date(h[dk(h)]).toLocaleString('fr-FR') : '' }),
          isImg ? el('img', { src: val, alt: '' }) : el('p', { textContent: label.length > 160 ? label.slice(0, 160) + '\u2026' : label }),
          el('button', { textContent: 'Restaurer cette version', onclick: async () => {
            if (!confirm('Remettre cette version sur le site ?')) return;
            try { await put([{ key: h.key, value: val }]); location.reload(); } catch (e) { alert('Erreur : ' + e.message); }
          } })));
      });
    } catch (e) { out.textContent = 'Erreur : ' + e.message; }
  };
  /* ---------- Menu « Réglages » : regroupe les écrans existants ---------- */
  const css3 = document.createElement('style');
  css3.textContent =
    '#adm-modal .adm-menu button{display:block;width:100%;text-align:left;margin:.5rem 0;padding:1rem}' +
    '#adm-modal .piece{border:1px solid #ccc;padding:1rem;margin:.8rem 0;display:grid;gap:.2rem}' +
    '#adm-modal .piece.hid{background:#f4f4f4}' +
    '#adm-modal .piece .top{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}' +
    '#adm-modal .piece img{width:96px;height:96px;object-fit:cover;margin:0}' +
    '#adm-modal .piece .noimg{width:96px;height:96px;display:grid;place-items:center;background:#eee;font-size:.75rem;color:#666;text-align:center}' +
    '#adm-modal .piece .grid2{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}' +
    '#adm-modal .chk{display:flex!important;align-items:center;gap:.6rem;grid-template-columns:none}' +
    '#adm-modal .chk input{width:auto}' +
    '#adm-modal .tag{font-size:.75rem;background:#b8893b;color:#fff;padding:.2rem .5rem;display:inline-block}' +
    '#adm-modal button:disabled{opacity:.4;cursor:default}';
  document.head.appendChild(css3);

  document.getElementById('adm-reglages').onclick = () => {
    if (needSave()) return;
    const items = [['adm-ship', 'Livraison et paiement en ligne'], ['adm-prix', 'Prix et durées des box'], ['adm-social', 'Réseaux sociaux'], ['adm-form', 'Formulaire de contact'],
                   ['adm-avis', 'Avis des clientes'], ['adm-hist', 'Historique (revenir à une ancienne version)']];
    const m = modal('Réglages', el('small', { textContent: 'Que voulez-vous modifier ?' }),
      el('div', { className: 'adm-menu' }, ...items.map(([id, label]) =>
        el('button', { textContent: label, onclick: () => { m.remove(); document.getElementById(id).click(); } }))),
      el('div', { className: 'row' }, el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
  };

  /* ---------- Mes pièces : ajouter, modifier, masquer, supprimer les pièces uniques ---------- */
  document.getElementById('adm-pieces').onclick = async () => {
    if (needSave()) return;
    const FIELDS = 'id,nom,description,prix_cents,image,stock,actif,position,reserve_jusqua';
    const list = [], removed = [];
    const err = el('p', { style: 'color:#b00020;min-height:1.2em' });
    const box = el('div', { textContent: 'Chargement\u2026' });
    const fmt = c => (c / 100).toFixed(2).replace('.', ',');
    const m = modal('Mes pièces',
      el('small', { textContent: 'Chaque pièce est unique. « Visible » la montre sur le site ; décochez-la pour la masquer sans la supprimer. Quand une pièce est vendue, son stock passe à 0.' }),
      box, err, el('div', { className: 'row', id: 'adm-pieces-actions' }));
    const actions = m.querySelector('#adm-pieces-actions');
    const failText = async r => { let t = ''; try { t = (await r.text()).slice(0, 160); } catch (e) {} return 'refusé (' + r.status + ')' + (t ? ' : ' + t : ''); };

    try {
      const r = await call('/rest/v1/products?select=' + FIELDS + '&order=position.asc,nom.asc');
      if (!r.ok) throw new Error(await failText(r));
      (await r.json()).forEach(p => {
        const cur = { nom: p.nom || '', description: p.description || '', prix: fmt(p.prix_cents || 0), image: p.image || '', stock: String(p.stock == null ? 0 : p.stock), actif: !!p.actif };
        list.push(Object.assign({ id: p.id, isNew: false, reserved: !!(p.reserve_jusqua && new Date(p.reserve_jusqua) > new Date()), orig: Object.assign({}, cur, { position: p.position }) }, cur, { position: p.position }));
      });
    } catch (e) { box.textContent = ''; err.textContent = 'Impossible de charger les pièces : ' + e.message; }

    const draw = () => {
      box.textContent = '';
      if (!list.length && !err.textContent) box.appendChild(el('p', { textContent: 'Aucune pièce pour le moment. Cliquez sur « Ajouter une pièce ».' }));
      list.forEach((p, i) => {
        const bind = (label, key, tag, extra) => {
          const x = el(tag || 'input', Object.assign({ value: p[key] }, extra || {}));
          x.addEventListener('input', () => { p[key] = x.value; });
          return el('label', {}, label, x);
        };
        const chk = el('input', { type: 'checkbox', checked: p.actif, disabled: p.reserved, onchange: ev => { p.actif = ev.target.checked; card.classList.toggle('hid', !p.actif); } });
        const stock = bind('Stock (1 = pièce unique, 0 = vendue)', 'stock', 'input', { inputMode: 'numeric', disabled: p.reserved });
        const card = el('div', { className: 'piece' + (p.actif ? '' : ' hid') },
          el('div', { className: 'top' },
            p.image ? el('img', { src: p.image, alt: '' }) : el('div', { className: 'noimg', textContent: 'Pas de photo' }),
            el('button', { type: 'button', textContent: p.image ? 'Changer la photo' : 'Ajouter une photo', onclick: () => {
              const f = el('input', { type: 'file', accept: 'image/*', onchange: async () => {
                if (!f.files[0]) return;
                try { err.textContent = 'Envoi de la photo\u2026'; p.image = await upload(f.files[0], 'piece-' + p.id.slice(0, 8)); err.textContent = ''; draw(); }
                catch (e) { err.textContent = 'Erreur photo : ' + e.message; }
              } }); f.click(); } }),
            p.reserved ? el('span', { className: 'tag', textContent: 'Paiement en cours' }) : ''),
          bind('Nom de la pièce', 'nom'),
          bind('Description (facultatif)', 'description', 'textarea', { rows: 2 }),
          el('div', { className: 'grid2' }, bind('Prix (€)', 'prix', 'input', { inputMode: 'decimal' }), stock),
          el('label', { className: 'chk' }, chk, 'Visible sur le site'),
          el('div', { className: 'row' },
            el('button', { type: 'button', textContent: 'Monter', disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); } }),
            el('button', { type: 'button', textContent: 'Descendre', disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw(); } }),
            el('button', { type: 'button', textContent: 'Supprimer', disabled: p.reserved, onclick: () => {
              if (!confirm('Supprimer définitivement « ' + (p.nom || 'cette pièce') + ' » ? (Pour seulement la cacher, décochez « Visible ».)')) return;
              if (!p.isNew) removed.push(p.id);
              list.splice(i, 1); draw(); } })));
        box.appendChild(card);
      });
    };
    draw();

    actions.append(
      el('button', { textContent: 'Ajouter une pièce', onclick: () => {
        list.push({ id: crypto.randomUUID(), isNew: true, reserved: false, orig: {}, nom: '', description: '', prix: '', image: '', stock: '1', actif: false, position: list.length + 1 });
        err.textContent = ''; draw(); box.lastElementChild && box.lastElementChild.scrollIntoView({ block: 'center' }); } }),
      el('button', { className: 'pri', textContent: 'Enregistrer les pièces', onclick: async function () {
        const btn = this;
        // 1) Vérifications
        const cleaned = [];
        for (const [i, p] of list.entries()) {
          const nom = p.nom.trim(), prix = parseFloat(String(p.prix).replace(',', '.')), stock = parseInt(p.stock, 10);
          const label = 'Pièce n° ' + (i + 1) + (nom ? ' (' + nom + ')' : '');
          if (!nom) { err.textContent = label + ' : indiquez un nom.'; return; }
          if (!isFinite(prix) || prix < 0.5) { err.textContent = label + ' : le prix doit être d\u2019au moins 0,50 €.'; return; }
          if (!Number.isInteger(stock) || stock < 0 || stock > 99) { err.textContent = label + ' : le stock doit être un nombre entier (0 à 99).'; return; }
          if (p.actif && !p.image) { err.textContent = label + ' : ajoutez une photo avant de la rendre visible.'; return; }
          cleaned.push({ p, cur: { nom, description: p.description.trim(), prix_cents: Math.round(prix * 100), image: p.image || '', stock, actif: !!p.actif, position: i + 1 } });
        }
        // 2) Enregistrement : seulement ce qui a changé (une vente en cours n'est jamais écrasée)
        btn.disabled = true; err.textContent = 'Enregistrement\u2026';
        const json = { 'Content-Type': 'application/json', Prefer: 'return=minimal' };
        try {
          while (removed.length) {
            const r = await call('/rest/v1/products?id=eq.' + removed[0], { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
            if (!r.ok) throw new Error(await failText(r));
            removed.shift();   // déjà supprimée : ne sera pas renvoyée en cas de nouvel essai
          }
          const snap = (p, cur) => { p.orig = { nom: cur.nom, description: cur.description, prix: fmt(cur.prix_cents), image: cur.image, stock: String(cur.stock), actif: cur.actif, position: cur.position }; };
          for (const { p, cur } of cleaned) {
            if (p.isNew) {
              const r = await call('/rest/v1/products', { method: 'POST', headers: json, body: JSON.stringify([Object.assign({ id: p.id }, cur)]) });
              if (!r.ok) throw new Error(await failText(r));
              p.isNew = false; snap(p, cur);   // créée : un nouvel essai ne la recrée pas
              continue;
            }
            const o = { nom: p.orig.nom, description: p.orig.description, prix_cents: Math.round(parseFloat(String(p.orig.prix).replace(',', '.')) * 100), image: p.orig.image, stock: parseInt(p.orig.stock, 10), actif: p.orig.actif, position: p.orig.position };
            const diff = {};
            Object.keys(cur).forEach(k => { if (cur[k] !== o[k]) diff[k] = cur[k]; });
            if (p.reserved) { delete diff.stock; delete diff.actif; }
            if (!Object.keys(diff).length) continue;
            const r = await call('/rest/v1/products?id=eq.' + p.id, { method: 'PATCH', headers: json, body: JSON.stringify(diff) });
            if (!r.ok) throw new Error(await failText(r));
            snap(p, Object.assign({}, cur, p.reserved ? { stock: parseInt(p.orig.stock, 10), actif: p.orig.actif } : {}));
          }
          say('Pièces enregistrées. Votre site est à jour.');
          location.reload();
        } catch (e) { err.textContent = 'Erreur : ' + e.message + ' Rouvrez « Mes pièces » pour voir l\u2019état réel avant de réessayer.'; btn.disabled = false; }
      } }),
      el('button', { textContent: 'Fermer', onclick: () => m.remove() }));
  };
  /* ---------- Mes commandes : lecture seule, pour préparer les colis ---------- */
  document.getElementById('adm-orders').onclick = async () => {
    if (needSave()) return;
    const err = el('p', { style: 'color:#b00020;min-height:1.2em' });
    const box = el('div', { textContent: 'Chargement\u2026' });
    const search = el('input', { type: 'search', placeholder: 'Rechercher (nom, e-mail, ville, pièce\u2026)' });
    const filt = { v: 'toutes' };
    const chips = el('div', { className: 'row' });
    const m = modal('Mes commandes', search, chips, box, err, el('div', { className: 'row' }, el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
    const euro = c => (c / 100).toFixed(2).replace('.', ',') + ' \u20ac';
    const clean = v => (v == null ? '' : String(v)).trim();
    let orders = [];

    const info = o => {
      const L = o.livraison || {}, A = (L.adresse && L.adresse.address) || null, F = L.facturation || null;
      const nom = clean(L.nom) || clean(L.adresse && L.adresse.name);
      const relais = L.mode === 'relais' ? clean(L.relais).split('|').map(x => x.trim()).filter(Boolean) : null;
      const adr = A || F;
      const lignesAdr = relais ? relais : (adr ? [clean(adr.line1), clean(adr.line2), (clean(adr.postal_code) + ' ' + clean(adr.city)).trim(), clean(adr.country)].filter(Boolean) : []);
      return { nom, tel: clean(L.telephone), relais: !!relais, lignesAdr };
    };
    const kind = o => (o.type === 'box' ? 'Box' : o.type === 'mixte' ? 'Pièces + box' : 'Pièces');
    const haystack = o => { const i = info(o); return [o.email, i.nom, i.tel, i.lignesAdr.join(' '), (o.lignes || []).map(l => l.nom).join(' '), kind(o)].join(' ').toLowerCase(); };

    const copy = async text => {
      try { await navigator.clipboard.writeText(text); err.textContent = 'Copié. Vous pouvez le coller où vous voulez.'; err.style.color = '#1a7f37'; }
      catch (e) { window.prompt('Copiez ce texte (Ctrl+C) :', text); }
    };

    const draw = () => {
      box.textContent = '';
      const q = search.value.trim().toLowerCase();
      const rows = orders.filter(o => {
        const L = o.livraison || {};
        if (filt.v === 'domicile' && !(L.mode === 'domicile' && o.type !== 'box')) return false;
        if (filt.v === 'relais' && L.mode !== 'relais') return false;
        if (filt.v === 'box' && o.type === 'panier') return false;
        return !q || haystack(o).includes(q);
      });
      if (!rows.length) { box.appendChild(el('p', { textContent: orders.length ? 'Aucune commande ne correspond.' : 'Aucune commande pour le moment.' })); return; }
      rows.forEach(o => {
        const i = info(o);
        const parcel = [i.nom, ...i.lignesAdr, i.tel ? 'Tél. ' + i.tel : ''].filter(Boolean).join('\n');
        box.appendChild(el('div', { className: 'item' },
          el('strong', { textContent: new Date(o.created_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }),
          el('span', { className: 'tag', style: 'margin-left:.6rem', textContent: kind(o) }),
          o.statut && o.statut !== 'paye' ? el('span', { className: 'tag', style: 'margin-left:.4rem;background:#b00020', textContent: o.statut }) : '',
          el('p', { style: 'margin:.4rem 0', textContent: euro(o.montant_cents || 0) + (o.email ? ' \u00b7 ' + o.email : '') }),
          el('ul', { style: 'margin:.3rem 0 .6rem 1.1rem' }, ...(o.lignes || []).map(l => el('li', { textContent: (l.quantite > 1 ? l.quantite + ' \u00d7 ' : '') + clean(l.nom) + ' \u2013 ' + euro(l.total_cents || 0) }))),
          el('div', { style: 'white-space:pre-line;background:#f6f3ee;padding:.7rem' },
            el('small', { textContent: i.relais ? 'Point relais' : 'Livraison à domicile' }), '\n',
            parcel || 'Adresse non renseignée'),
          el('div', { className: 'row' }, el('button', { textContent: 'Copier l\u2019adresse', disabled: !parcel, onclick: () => copy(parcel) }))));
      });
    };
    [['toutes', 'Toutes'], ['domicile', 'À domicile'], ['relais', 'Point relais'], ['box', 'Box']].forEach(([v, label]) => {
      const b = el('button', { textContent: label, onclick: () => { filt.v = v; [...chips.children].forEach(c => c.classList.toggle('pri', c === b)); draw(); } });
      if (v === 'toutes') b.classList.add('pri');
      chips.appendChild(b);
    });
    search.addEventListener('input', draw);

    try {
      const r = await call('/rest/v1/orders?select=id,created_at,type,email,montant_cents,statut,livraison,lignes&order=created_at.desc&limit=200');
      if (!r.ok) { let t = ''; try { t = (await r.text()).slice(0, 160); } catch (e) {} throw new Error('refusé (' + r.status + ')' + (t ? ' : ' + t : '')); }
      orders = await r.json(); draw();
      if (orders.length >= 200) err.textContent = 'Les 200 commandes les plus récentes sont affichées.';
    } catch (e) { box.textContent = ''; err.textContent = 'Impossible de charger les commandes : ' + e.message; }
  };
  /* ---------- Livraison et paiement en ligne ---------- */
  document.getElementById('adm-ship').onclick = () => {
    if (needSave()) return;
    const D = C.data;
    const arr = k => (Array.isArray(D[k]) ? D[k] : []);
    const opt = (k, id, label, delai, cents) => { const o = arr(k).find(x => x && x.id === id) || {}; return { label: o.label || label, delai: o.delai != null ? o.delai : delai, cents: o.montant != null ? o.montant : cents }; };
    const O = {
      dom: opt('shop.livraison', 'domicile', 'Livraison à domicile', '2 à 4 jours ouvrés', 590),
      rel: opt('shop.livraison', 'relais', 'Livraison en point relais', '3 à 5 jours ouvrés', 390),
      bdom: opt('shop.livraison_box', 'domicile', 'Livraison de la box', 'Expédition mensuelle', 0),
      brel: opt('shop.livraison_box', 'relais', 'Livraison de la box en point relais', 'Expédition mensuelle', 0)
    };
    const eur = c => (c / 100).toFixed(2).replace('.', ',');
    const f = {
      domP: field('Prix de la livraison à domicile (€, 0 = offerte)', eur(O.dom.cents)), domD: field('Délai affiché', O.dom.delai),
      relP: field('Prix de la livraison en point relais (€, 0 = offerte)', eur(O.rel.cents)), relD: field('Délai affiché', O.rel.delai),
      bdomP: field('Livraison d\u2019une box à domicile (€, 0 = offerte)', eur(O.bdom.cents)), bdomD: field('Délai affiché', O.bdom.delai),
      brelP: field('Livraison d\u2019une box en point relais (€, 0 = offerte)', eur(O.brel.cents)), brelD: field('Délai affiché', O.brel.delai)
    };
    const relaisOn = el('input', { type: 'checkbox', checked: !!(D['shop.relais'] && D['shop.relais'].actif === true) });
    const payOn = el('input', { type: 'checkbox', checked: D['shop.paiement'] === 'on' });
    const err = el('p', { style: 'color:#b00020;min-height:1.2em' });
    const cents = (input, label) => {
      const v = parseFloat(String(input.value).replace(',', '.').trim());
      if (!isFinite(v) || v < 0 || v > 100) throw new Error(label + ' : saisissez un prix entre 0 et 100 €.');
      return Math.round(v * 100);
    };
    const m = modal('Livraison et paiement en ligne',
      el('small', { textContent: 'Les frais s\u2019ajoutent au paiement. Mettez 0 pour offrir la livraison.' }),
      el('h4', { textContent: 'Pièces', style: 'margin-top:1rem' }), f.domP[1], f.domD[1], f.relP[1], f.relD[1],
      el('label', { className: 'chk' }, relaisOn, 'Proposer la livraison en point relais'),
      el('h4', { textContent: 'Box', style: 'margin-top:1rem' }), f.bdomP[1], f.bdomD[1], f.brelP[1], f.brelD[1],
      el('h4', { textContent: 'Paiement en ligne', style: 'margin-top:1rem' }),
      el('label', { className: 'chk' }, payOn, 'Paiement en ligne ouvert (décochez pour fermer la boutique)'),
      err, el('div', { className: 'row' },
        el('button', { className: 'pri', textContent: 'Enregistrer', onclick: async () => {
          try {
            const dom = cents(f.domP[0], 'Livraison à domicile'), rel = cents(f.relP[0], 'Point relais');
            const bdom = cents(f.bdomP[0], 'Box à domicile'), brel = cents(f.brelP[0], 'Box en point relais');
            if (payOn.checked && D['shop.paiement'] !== 'on' &&
                !confirm('Ouvrir le paiement en ligne ? Les visiteurs pourront alors commander et payer.')) return;
            const clean = x => String(x).replace(/\s+/g, ' ').trim().slice(0, 80);
            await put([
              { key: 'shop.livraison', value: [{ id: 'domicile', label: O.dom.label, delai: clean(f.domD[0].value), montant: dom }, { id: 'relais', label: O.rel.label, delai: clean(f.relD[0].value), montant: rel }] },
              { key: 'shop.livraison_box', value: [{ id: 'domicile', label: O.bdom.label, delai: clean(f.bdomD[0].value), montant: bdom }, { id: 'relais', label: O.brel.label, delai: clean(f.brelD[0].value), montant: brel }] },
              { key: 'shop.relais', value: { actif: relaisOn.checked } },
              { key: 'shop.paiement', value: payOn.checked ? 'on' : 'off' }
            ]);
            m.remove(); say('Livraison et paiement enregistrés.');
          } catch (e) { err.textContent = e.message.startsWith('refusé') ? 'Erreur : ' + e.message : e.message; }
        } }),
        el('button', { textContent: 'Fermer', onclick: () => m.remove() })));
  };
})();
