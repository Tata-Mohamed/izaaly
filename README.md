# IZAALY — Site vitrine premium

Site e-commerce vitrine pour la marque de bijoux artisanaux IZAALY.
HTML5 / CSS3 / JavaScript vanilla — aucun framework, aucune dépendance de build.

---

## 1. Lancer le site

Aucune installation n'est nécessaire. Comme le site utilise `fetch`-like
comportements légers (localStorage, modules JS classiques), il fonctionne
même ouvert directement en double-cliquant sur `index.html`.

Pour un rendu 100% fidèle (notamment le chargement des polices Google Fonts
et un comportement identique à de la production), il est recommandé de le
servir via un petit serveur local :

```bash
# Python
python3 -m http.server 8000

# ou Node
npx serve .
```

Puis ouvrir `http://localhost:8000`.

---

## 2. Structure du projet

```
index.html                 → Page d'accueil
bagues.html                → Catalogue Bagues
colliers.html               → Catalogue Colliers
boucles-oreilles.html      → Catalogue Boucles d'oreilles
produit.html                → Fiche produit (peuplée via ?id=...)

css/
  style.css                → Design tokens, layout, composants
  animations.css           → Reveals au scroll, loader, hero
  responsive.css           → Breakpoints (1920 → 360px)

js/
  products.js              → Données produits + rendu des cartes
  cart.js                  → Panier (localStorage) + mini-panier
  navigation.js             → Header sticky, menu mobile, curseur, transitions de page
  animations.js             → IntersectionObserver (reveals) + intro du hero
  catalog.js                → Filtres / tri des pages catalogue
  product.js                → Logique de la fiche produit
  main.js                    → Loader de marque, formulaires (contact + newsletter)

assets/
  images/
    products/               → Visuels produits (2 par produit : principal + hover)
    collections/             → Visuels des 3 tuiles de collection (home)
    about/                    → Photo de Layla / atelier
    instagram/                → Grille Instagram (6 images)
    logo/                      → Wordmark IZAALY
    video/hero-poster.svg    → Image de secours si la vidéo hero ne charge pas
  video/                       → Emplacement prévu pour hero.mp4 (voir §5)
```

**Important :** toutes les images actuellement présentes sont des
**placeholders** (illustrations discrètes en ligne fine, sur fond ivoire/beige).
Chaque fichier contient un commentaire `<!-- PLACEHOLDER IMAGE -->` et un petit
texte "IZAALY — placeholder" en filigrane pour qu'on ne les confonde jamais
avec de vraies photos produit. Elles sont à remplacer par la vraie
photographie de la marque avant mise en ligne (voir §4).

---

## 3. Modifier les produits

Tout le catalogue est centralisé dans **`js/products.js`**, dans le tableau
`PRODUCTS`. Chaque produit suit cette structure :

```js
{
  id: "bague-croise",              // identifiant unique, utilisé dans l'URL produit.html?id=...
  name: "Bague CROISÉ",
  category: "bagues",              // "bagues" | "colliers" | "boucles-oreilles"
  price: 13.99,
  currency: "EUR",
  images: [
    "assets/images/products/bague-croise-1.svg",
    "assets/images/products/bague-croise-2.svg"
  ],
  description: "...",
  material: "Acier inoxydable doré à l'or fin",
  color: "Doré",
  available: true,
  isNew: false,
  isBestSeller: true               // affiché dans "Les préférés" sur la home
}
```

### Ajouter un nouveau produit
1. Ajoute un nouvel objet dans le tableau `PRODUCTS`.
2. Dépose ses images dans `assets/images/products/`.
3. C'est tout — il apparaîtra automatiquement dans sa page catalogue et sera
   trouvable via `produit.html?id=ton-id`. Aucune modification HTML requise.

### Retirer un produit
Supprime simplement son objet du tableau, ou passe `available: false` pour
le garder visible mais marqué "Épuisé".

---

## 4. Remplacer les images

Chaque produit a deux images (`images[0]` = image principale de la carte,
`images[1]` = image affichée au survol). Remplace les chemins dans
`js/products.js` pour pointer vers tes vrais fichiers (idéalement `.webp`,
au format 4:5).

- **Collections (home)** : `assets/images/collections/bagues.svg`,
  `colliers.svg`, `boucles-oreilles.svg` — remplace les fichiers ou change
  les chemins dans les balises `<img>` de `index.html` (section "Nos collections").
- **Histoire / atelier** : `assets/images/about/layla-atelier.svg`, référencé
  dans `index.html` (section `#histoire`).
- **Instagram** : `assets/images/instagram/insta-1.svg` à `insta-6.svg`,
  référencés dans `index.html` (section Instagram). Idéalement, remplace-les
  par de vrais exports du compte
  [@izaaly.collections](https://www.instagram.com/izaaly.collections/).
- **Logo** : `assets/images/logo/izaaly-wordmark.svg` (actuellement le header
  utilise un logo texte en CSS — si tu préfères un vrai logo graphique,
  remplace `<a class="header__logo">IZAALY</a>` par une balise `<img>` pointant
  vers ce fichier, dans chaque page).

---

## 5. Brancher la vidéo hero

Dépose ta vidéo dans `assets/video/hero.mp4` (déjà référencée dans
`index.html`). Elle doit être : silencieuse, courte (8–15s en boucle),
légère (idéalement < 5 Mo pour le mobile).

Si le fichier est absent ou ne charge pas, le hero affiche automatiquement
`assets/images/video/hero-poster.svg` en arrière-plan CSS — il n'y a donc
jamais d'écran noir vide. Remplace aussi ce poster par une vraie photo une
fois disponible.

---

## 6. Modifier les couleurs

Toutes les couleurs sont définies une seule fois, en haut de
**`css/style.css`**, dans `:root` :

```css
--noir: #111111;
--blanc: #ffffff;
--ivoire: #f7f3ec;
--beige: #e8dfd2;
--champagne: #c9b48c;   /* seul accent chaud, à utiliser avec parcimonie */
```

Changer une valeur ici la répercute automatiquement partout sur le site.

---

## 7. Modifier les textes

Les textes de la home (manifeste, histoire, savoir-faire, etc.) sont
directement dans `index.html`, à l'intérieur de chaque `<section>`. Ils sont
volontairement courts et éditoriaux — en cas de réécriture, garde ce
principe : peu de texte, des phrases courtes, un ton chaleureux et sincère.

---

## 8. Brancher le vrai formulaire de contact

Le formulaire (`index.html`, section `#contact`) fonctionne actuellement en
simulation front-end dans `js/main.js`, fonction `initContactForm()`.

Pour brancher un vrai endpoint, remplace ce bloc :

```js
// ---- Début du bloc à remplacer par un vrai appel API ----
await new Promise((resolve) => setTimeout(resolve, 1100));
// ---- Fin du bloc à remplacer ----
```

par un vrai appel, par exemple :

```js
const formData = new FormData(form);
const response = await fetch("https://ton-api.com/contact", {
  method: "POST",
  body: JSON.stringify(Object.fromEntries(formData)),
  headers: { "Content-Type": "application/json" }
});
if (!response.ok) throw new Error("Échec de l'envoi");
```

Pense à entourer l'appel d'un `try/catch` et à afficher un message d'erreur
si la requête échoue (le message de succès est déjà géré et prêt à l'usage).

La newsletter (`initNewsletterForm()` dans le même fichier) suit exactement
le même principe.

---

## 9. Panier

Le panier est géré entièrement côté client via `localStorage`
(`js/cart.js`) : il persiste d'une visite à l'autre sur le même navigateur,
mais n'est pas partagé entre appareils. Pour un vrai tunnel d'achat, il
faudra brancher `getCart()` / `getCartTotal()` à un vrai système de paiement
(Stripe, Shopify Storefront API, etc.) au moment du clic sur "Commander".

---

## 10. Accessibilité & performance déjà en place

- `prefers-reduced-motion` respecté partout (loader, hero, reveals).
- Navigation clavier et focus visibles.
- Images en `loading="lazy"` hors hero.
- Animations pilotées par `transform`/`opacity` uniquement (pas de reflow).
- Un seul geste d'animation "fort" au chargement (loader → hero) ; le reste
  répond au scroll ou au survol, sans surcharge.

---

## 11. Ce qu'il reste à faire avant mise en production

- Remplacer tous les placeholders SVG par de vraies photographies.
- Déposer `assets/video/hero.mp4`.
- Rédiger les vraies pages Mentions légales / Confidentialité / CGV /
  Livraison (actuellement des liens `#` dans le footer).
- Brancher le formulaire de contact et la newsletter à un vrai service.
- Brancher le bouton "Commander" du panier à une vraie solution de paiement.
