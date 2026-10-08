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
  bar.innerHTML = '<span id="adm-msg">Cliquez sur un texte pour le modifier, sur une image pour la remplacer.</span>' +
    '<button id="adm-prix">Tarifs et durées</button><button id="adm-social">Réseaux</button><button id="adm-form">Formulaire</button><button id="adm-avis">Avis</button><button id="adm-hist">Historique</button><button id="adm-save">Enregistrer</button><button id="adm-cancel">Annuler les modifications</button>' +
    '<a href="index.html">Voir le site</a><button id="adm-out">Déconnexion</button>';
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
})();
