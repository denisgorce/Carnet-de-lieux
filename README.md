# Carnet de lieux

Application mobile (APK Android + site web) : placez vos lieux visités sur une carte (titre, date,
descriptif, photos), stockés en ligne et partageables en lecture seule via un lien.

## 1. Projet Supabase (gratuit)
1. Créez un projet sur supabase.com.
2. SQL Editor → collez `supabase.sql` → Run. (Installation déjà faite avec la version précédente ? Lancez plutôt `supabase-update.sql`.)
3. Project Settings → API : copiez l'URL et la clé « anon / publishable » dans `config.js`.
4. Authentication → Email Templates : dans « Confirm signup » ET « Magic Link », ajoutez une ligne
   `<p>Votre code de connexion : {{ .Token }}</p>`. L'application demande ce code.
5. Authentication → URL Configuration : « Site URL » = votre adresse GitHub Pages.

## 2. Dépôt GitHub
1. Déposez tous les fichiers (dossiers `.github`, `assets` inclus) à la racine d'un dépôt.
2. Dans `config.js`, renseignez aussi `shareBase` (adresse GitHub Pages, ex. https://utilisateur.github.io/depot/).
3. Settings → Pages → « Deploy from a branch », `main`, `/ (root)` : c'est la page que vos amis ouvrent via le lien.

## 3. Récupérer l'APK
1. Onglet Actions → « Compiler l'APK » (se lance à chaque push, ou « Run workflow »).
2. Quand c'est vert, ouvrez l'exécution → Artifacts → `carnet-de-lieux-apk` (zip contenant `app-debug.apk`).
3. Dézippez, copiez l'APK sur le téléphone, ouvrez-le et autorisez l'installation depuis cette source.

## Fonctionnalités
- Carte avec regroupement des repères, et liste (tri par date, nom ou distance, miniatures des photos).
- Explorer : recherche d'un territoire (commune, département, région, pays) pour ne voir que les lieux situés dedans ;
  recherche dans un rayon réglable de 1 à 1000 km autour de votre position, du centre de la carte ou d'un point touché.
- Recherche texte, filtres par catégorie et favoris, appliqués ensemble à la carte et à la liste.
- Fiche d'un lieu : photos plein écran, itinéraire, partage, favori, modification.
- Export GeoJSON, mode sombre automatique, partage en lecture seule.

## Utilisation
- Connexion : e-mail, puis code reçu par courrier.
- « Mes lieux » → « Envoyer le lien » : vos amis ouvrent le carnet en lecture seule dans leur navigateur, sans compte.
- « Nouveau lien » invalide l'ancien lien de partage.
