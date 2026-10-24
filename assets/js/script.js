// Header qui rétrécit au scroll
const header = document.getElementById('header');
const parallax = document.querySelectorAll('[data-parallax]');
function onScroll() {
  header.classList.toggle('small', window.scrollY > 40);
  parallax.forEach(el => {
    const r = el.parentElement.getBoundingClientRect();
    el.style.transform = `translateY(${r.top * -0.08}px)`;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Apparition des titres
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Défilement horizontal au glisser (souris)
document.querySelectorAll('.steps, .rail').forEach(el => {
  let down = false, startX = 0, left = 0;
  el.addEventListener('mousedown', e => { down = true; startX = e.pageX; left = el.scrollLeft; el.style.scrollSnapType = 'none'; });
  window.addEventListener('mouseup', () => { down = false; el.style.scrollSnapType = ''; });
  el.addEventListener('mousemove', e => { if (down) el.scrollLeft = left - (e.pageX - startX); });
});

// Avis clientes : carrousel infini, auto + manuel
(window.contentReady || Promise.resolve()).then(function () {
  const track = document.getElementById('voicesTrack');
  if (!track) return;
  // Avis : si la liste existe en base (clé avis.liste), elle remplace les cartes par défaut
  const L = window.IzaalyContent && window.IzaalyContent.data['avis.liste'];
  if (Array.isArray(L) && L.length) {
    track.textContent = '';
    L.forEach(a => {
      const art = document.createElement('article'); art.className = 'vcard';
      const ph = document.createElement('div'); ph.className = 'vphoto';
      if (a.image) {
        const im = document.createElement('img');
        im.src = a.image; im.alt = 'Photo de ' + (a.nom || 'une cliente'); im.loading = 'lazy';
        im.onerror = () => im.remove(); ph.appendChild(im);
      }
      const q = document.createElement('blockquote'); q.textContent = a.texte || '';
      const nt = parseFloat(a.note);
      if (isFinite(nt) && nt >= 1 && nt <= 5) { const nn = document.createElement('p'); nn.className = 'vnote'; nn.textContent = nt + '/5'; art.append(nn); }
      const n = document.createElement('p'); n.className = 'vname'; n.textContent = a.nom || '';
      const sp = document.createElement('span'); sp.textContent = a.projet || ''; n.appendChild(sp);
      art.prepend(ph); art.append(q, n); track.appendChild(art);
    });
  } else {
    // Aucun avis publié : on masque la section plutôt que d'afficher des avis fictifs
    const sec = document.getElementById('avis');
    if (sec) sec.style.display = 'none';
    return;
  }

  const bar = document.getElementById('voicesBar');
  const originals = [...track.children];

  // Duplique les cartes pour une boucle sans fin
  originals.forEach(c => {
    const k = c.cloneNode(true);
    k.setAttribute('aria-hidden', 'true');
    k.querySelectorAll('img').forEach(i => (i.alt = ''));
    track.appendChild(k);
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 0.04; // px par ms (≈ 40 px/s) : plus grand = plus rapide
  let loop = 0, pos = 0, paused = reduce, last = 0, timer;

  const measure = () => { loop = track.children[originals.length].offsetLeft - track.children[0].offsetLeft; };
  const step = () => track.children[1].offsetLeft - track.children[0].offsetLeft;
  const progress = () => { if (loop) bar.style.transform = 'scaleX(' + Math.max(.02, (track.scrollLeft % loop) / loop) + ')'; };
  const hold = ms => {
    paused = true; clearTimeout(timer);
    if (!reduce) timer = setTimeout(() => (paused = false), ms);
  };

  function tick(t) {
    const dt = Math.min(t - last, 50); last = t;
    if (!paused && loop) {
      pos += dt * SPEED;
      if (pos >= loop) pos -= loop;
      track.scrollLeft = pos;
      progress();
    }
    requestAnimationFrame(tick);
  }

  track.addEventListener('scroll', () => {
    if (!paused) return;
    if (loop && track.scrollLeft >= loop) track.scrollLeft -= loop;
    pos = track.scrollLeft;
    progress();
  }, { passive: true });

  // Pause au survol / au toucher
  track.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); });
  track.addEventListener('mouseleave', () => { if (!reduce) paused = false; });
  track.addEventListener('touchstart', () => { paused = true; clearTimeout(timer); }, { passive: true });
  track.addEventListener('touchend', () => hold(2500), { passive: true });

  // Glisser à la souris
  let drag = false, sx = 0, sl = 0;
  track.addEventListener('mousedown', e => { drag = true; sx = e.pageX; sl = track.scrollLeft; track.classList.add('drag'); });
  addEventListener('mouseup', () => { drag = false; track.classList.remove('drag'); });
  track.addEventListener('mousemove', e => { if (drag) { e.preventDefault(); track.scrollLeft = sl - (e.pageX - sx); } });

  // Boutons
  document.getElementById('vNext').addEventListener('click', () => {
    hold(3500); track.scrollBy({ left: step(), behavior: 'smooth' });
  });
  document.getElementById('vPrev').addEventListener('click', () => {
    hold(3500);
    if (track.scrollLeft < step()) track.scrollLeft += loop;
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });

  measure(); progress();
  addEventListener('resize', measure);
  requestAnimationFrame(tick);
});


// Bandeau à messages rotatifs (toutes les 4 secondes)
const msgs = [...document.querySelectorAll('.topbar .msg')];
let m = 0;
setInterval(() => {
  const current = msgs[m];
  m = (m + 1) % msgs.length;
  current.classList.remove('active');
  current.classList.add('leaving');
  msgs[m].classList.remove('leaving');
  msgs[m].classList.add('active');
  setTimeout(() => current.classList.remove('leaving'), 600);
}, 4000);

// Box : prix, durées et remises modifiables depuis l'admin
(window.contentReady || Promise.resolve()).then(function () {
  const wrap = document.querySelector('.duration');
  const cards = [...document.querySelectorAll('.box-card')];
  if (!wrap || !cards.length) return;
  const fmt = n => n.toFixed(2).replace('.', ',');
  const num = (v, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
  const D = () => (window.IzaalyContent && window.IzaalyContent.data) || {};
  const DEF = { 'box1.prix': 19.99, 'box2.prix': 29.99, 'box3.prix': 39.99 };
  let months = 0;

  function durations() {
    const d = D()['box.durees'];
    if (Array.isArray(d) && d.length) {
      return d.map(x => ({ mois: Math.min(36, Math.max(1, Math.round(num(x.mois, 3)))), remise: Math.min(90, Math.max(0, num(x.remise, 0))) })).slice(0, 4);
    }
    return [{ mois: 3, remise: 0 }, { mois: 6, remise: num(D()['box.remise6'], 5) }, { mois: 12, remise: num(D()['box.remise12'], 10) }];
  }
  function render() {
    const list = durations();
    if (!list.some(o => o.mois === months)) months = list[0].mois;
    wrap.textContent = '';
    list.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-pressed', o.mois === months);
      b.append(o.mois + ' mois');
      if (o.remise > 0) {
        const p = document.createElement('span'); p.className = 'promo';
        p.textContent = '-' + Math.round(o.remise * 10) / 10 + '%'; b.append(' ', p);
      }
      b.addEventListener('click', () => { months = o.mois; render(); });
      wrap.appendChild(b);
    });
    const disc = list.find(o => o.mois === months).remise / 100;
    const tpl = typeof D()['box.facture'] === 'string' && D()['box.facture'] ? D()['box.facture'] : 'Facturé {total} € pour {mois} mois';
    cards.forEach((c, i) => {
      const base = num(D()['box' + (i + 1) + '.prix'], DEF['box' + (i + 1) + '.prix']);
      if (i === 0) { const p = c.querySelector('[data-price1]'); if (p) p.textContent = fmt(base); return; }
      const monthly = Math.round(base * (1 - disc) * 100) / 100;
      c.querySelector('[data-price]').textContent = fmt(monthly);
      c.querySelector('[data-billed]').textContent = tpl
        .replace('{total}', fmt(Math.round(monthly * months * 100) / 100)).replace('{mois}', months);
    });
  }
  window.IzaalyBox = { render };
  render();
});

// Histoire : écriture manuscrite lettre par lettre
// On attend que le contenu Supabase soit chargé (content.js), sinon l'animation
// découperait en lettres l'ancien texte. Si content.js est absent ou échoue,
// on démarre quand même avec le texte HTML par défaut.
(window.contentReady || Promise.resolve()).then(function () {
  const sheet = document.querySelector('.sheet');
  if (!sheet) return;
  const STEP = 16;   // ms entre deux lettres (plus petit = écriture plus rapide)
  const PAUSE = 350; // pause entre deux phrases (ms)
  let i = 0;

  sheet.querySelectorAll('[data-write]').forEach(el => {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach((word, wi, words) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach(c => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        s.style.transitionDelay = (i++ * STEP) + 'ms';
        w.appendChild(s);
      });
      el.appendChild(w);
      if (wi < words.length - 1) { el.appendChild(document.createTextNode(' ')); i++; }
    });
    i += Math.round(PAUSE / STEP);
  });

  sheet.style.setProperty('--end', (i * STEP) + 'ms');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sheet.classList.add('writing');
    return;
  }
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { sheet.classList.add('writing'); obs.disconnect(); }
  }, { threshold: 0.35 });
  obs.observe(sheet);
});

// Section "Fabriqué à la demande" : déclenche le voile et les textes
(function () {
  const tile = document.querySelector('.tile-right');
  if (!tile) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { tile.classList.add('in'); obs.disconnect(); }
  }, { threshold: 0.35 });
  obs.observe(tile);
})();

// Menu mobile
(function () {
  const btn = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  if (!btn || !menu) return;
  const set = open => {
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', !open);
  };
  btn.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width:900px)').addEventListener('change', e => { if (e.matches) set(false); });
})();

// Formulaire de devis : envoi sans recharger la page
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const btn = form.querySelector('button[type="submit"]');
  const T = (k, d) => { const v = window.IzaalyContent && window.IzaalyContent.data[k]; return typeof v === 'string' && v ? v : d; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = T('form.envoi', 'Envoi en cours');
    status.className = 'form-status';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error();
      form.reset();
      status.textContent = T('form.ok', 'Merci, votre demande est bien envoyée. Nous revenons vers vous très vite.');
      status.className = 'form-status ok';
    } catch (err) {
      status.textContent = T('form.err', "L'envoi a échoué. Réessayez ou écrivez-nous directement par e-mail.");
      status.className = 'form-status err';
    }
    btn.disabled = false;
    btn.textContent = T('form.bouton', 'Envoyer ma demande');
  });
})();