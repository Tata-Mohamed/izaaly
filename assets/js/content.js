/* content.js — charge le contenu éditable d'Izaaly depuis Supabase.
   À inclure AVANT script.js. Le HTML sert de contenu par défaut :
   si Supabase ne répond pas, le site s'affiche normalement. */
(function () {
  const SUPABASE_URL = 'https://srrpizqcwjdcgugsavpg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_I9TJahkI44v-deF3tONu1Q_JibgFcSg'; // clé publique
  const CACHE_KEY = 'izaaly:content:v1';
  const TIMEOUT = 2500; // ms avant d'abandonner et de garder le contenu par défaut

  // Texte avec retours à la ligne (\n -> <br>), sans innerHTML
  function setText(el, value) {
    el.textContent = '';
    String(value).split('\n').forEach((line, i) => {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  }

  // Applique un objet { clé: valeur } aux éléments marqués
  function apply(map) {
    document.querySelectorAll('[data-edit]').forEach(el => {
      const v = map[el.dataset.edit];
      if (typeof v === 'string') setText(el, v);
    });
    document.querySelectorAll('[data-img]').forEach(el => {
      const v = map[el.dataset.img];
      if (typeof v === 'string' && v) el.src = v;
    });
    // Textes non éditables en place (libellés du formulaire, pseudo) : modifiés via l'admin
    document.querySelectorAll('[data-text]').forEach(el => {
      const v = map[el.dataset.text];
      if (typeof v === 'string') setText(el, v);
    });
    // Liste d'options d'un <select> (une option par ligne)
    document.querySelectorAll('[data-options]').forEach(sel => {
      const v = map[sel.dataset.options];
      if (typeof v !== 'string') return;
      const lines = v.split('\n').map(s => s.trim()).filter(Boolean);
      if (!lines.length) return;
      sel.querySelectorAll('option:not([disabled])').forEach(o => o.remove());
      lines.forEach(t => { const o = document.createElement('option'); o.textContent = t; sel.appendChild(o); });
    });
    // Réseaux sociaux : lien valide (http/https) = affiché ; vide = masqué
    document.querySelectorAll('[data-social]').forEach(a => {
      const v = map['social.' + a.dataset.social];
      if (typeof v !== 'string') return;
      const ok = /^https?:\/\//i.test(v.trim());
      if (ok) a.href = v.trim();
      a.style.display = ok ? '' : 'none';
      const s = a.nextElementSibling;
      if (s && s.classList.contains('sep')) s.style.display = ok ? '' : 'none';
    });
    // Images de fond (hero, etc.) : data-bg="clé" + data-overlay="0.25" (optionnel)
    document.querySelectorAll('[data-bg]').forEach(el => {
      const v = map[el.dataset.bg];
      if (typeof v !== 'string' || !v) return;
      const o = el.dataset.overlay;
      const layer = o ? `linear-gradient(rgba(0,0,0,${o}),rgba(0,0,0,${o})), ` : '';
      el.style.backgroundImage = layer + `url("${v}")`;
    });
  }

  // 1. Affichage immédiat avec la dernière version connue (évite le clignotement)
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) {}
  apply(cached);

  window.IzaalyContent = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    apply,
    setText,
    data: cached
  };

  // 2. Mise à jour depuis Supabase. script.js attend cette promesse avant
  //    d'animer les textes (ex. l'écriture manuscrite de l'histoire).
  window.contentReady = (async function () {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
      const res = await fetch(SUPABASE_URL + '/rest/v1/content?select=key,value', {
        headers: { apikey: SUPABASE_KEY },
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const map = {};
      (await res.json()).forEach(r => { map[r.key] = r.value; });
      apply(map);
      window.IzaalyContent.data = map;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch (e) {}
    } catch (err) {
      console.warn('Contenu Supabase indisponible, contenu par défaut conservé.', err);
    }
  })();
})();