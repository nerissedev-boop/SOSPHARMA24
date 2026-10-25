# SOS Pharma 24 : application mobile

Application Expo (React Native, TypeScript) pour trouver une pharmacie ouverte ou de garde près de soi, puis y aller ou l'appeler. Abidjan d'abord, d'autres villes et pays par configuration.

Ce dépôt est le **socle mobile** (étape 2 de la feuille de route) : navigation, design system jour et nuit fidèle à la charte, tous les écrans des maquettes 01 à 21, client d'API avec adaptateur de démonstration, cache hors connexion, gestion des erreurs, tests.

Mise à jour du 21 oct. : icônes sur tous les boutons d'action et champs de saisie avec icône (ajouts de la charte), **assurances multiples** (référentiel par pays, « Mes assurances », filtre « au moins une », écran 16b) et **espace agent terrain** (module `releves`, écrans 22 à 27, file d'envoi hors connexion).

> L'API n'est pas encore déployée. Par défaut, l'app tourne avec un **adaptateur de démonstration** qui sert des **données FICTIVES** d'Abidjan, au même format et sur les mêmes routes que l'API (`EXPO_PUBLIC_API_MOCK=1`). Aucune de ces pharmacies n'existe.

## Sommaire

1. [Installation](#installation)
2. [Variables d'environnement](#variables-denvironnement)
3. [Scripts](#scripts)
4. [Development build (EAS)](#development-build-eas)
5. [Arborescence](#arborescence)
6. [Architecture](#architecture)
7. [Brancher l'API réelle](#brancher-lapi-réelle)
8. [Carte](#carte)
9. [Police Vonca](#police-vonca)
10. [Icônes](#icônes)
11. [Tests](#tests)
12. [Correspondance écran ↔ maquette](#correspondance-écran--maquette)
13. [Décisions](#décisions)
14. [Écarts avec les maquettes](#écarts-avec-les-maquettes)
15. [À faire / non vérifié](#à-faire--non-vérifié)
16. [Licences](#licences)

## Installation

Prérequis : Node 22 (22.13 ou plus récent), npm, un compte Expo (pour EAS) et un téléphone ou un émulateur avec un **development build** (voir plus bas).

```bash
npm install
cp .env.example .env        # puis adaptez les valeurs
npm run verifier            # types, lint, tests
npx expo start              # serveur de développement (development build requis)
```

Pour ajouter une dépendance qui contient du code natif, utilisez toujours `npx expo install <paquet>` : la commande choisit la version compatible avec le SDK Expo (58).

## Variables d'environnement

Toutes les variables `EXPO_PUBLIC_*` sont intégrées au bundle : **aucun secret** ici. Elles sont lues dans `src/commun/lib/config.ts`.

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://api.example.invalid` | Base de l'API Laravel, sans `/api/v1` |
| `EXPO_PUBLIC_API_MOCK` | `1` | `1` = adaptateur de démonstration (données fictives), `0` = API réelle |
| `EXPO_PUBLIC_POSITION_SIMULEE` | `5.3600,-3.9800` | En démo seulement : position simulée (Cocody). Vide = vrai GPS |
| `EXPO_PUBLIC_SENTRY_DSN` | vide | DSN Sentry. Vide = suivi des erreurs désactivé |
| `EXPO_PUBLIC_ENVIRONNEMENT` | `development` | Environnement envoyé à Sentry |
| `EXPO_PUBLIC_MAP_STYLE_URL` | vide | Style MapLibre complet (jour) |
| `EXPO_PUBLIC_MAP_STYLE_URL_NUIT` | vide | Style MapLibre de nuit (sinon celui du jour) |
| `EXPO_PUBLIC_MAP_TILES_URL` | vide | Tuiles vectorielles OpenMapTiles (`…/{z}/{x}/{y}.pbf`) : le style de la charte est alors construit par l'app |
| `EXPO_PUBLIC_MAP_GLYPHS_URL` | vide | Glyphes pour les noms de quartiers sur la carte |
| `EXPO_PUBLIC_LIEN_PARTAGE_BASE` | vide | Base des liens de partage d'une fiche. Vide = lien Google Maps |

Pour les builds EAS, `SENTRY_ORG`, `SENTRY_PROJECT` et `SENTRY_AUTH_TOKEN` se règlent dans les variables d'environnement EAS (envoi des cartes de sources).

## Scripts

| Commande | Effet |
| --- | --- |
| `npm start` | Serveur Expo (détecte d'abord la police Vonca) |
| `npm run android` / `npm run ios` | Build natif local (`expo run:*`) |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict) |
| `npm run lint` | ESLint, règles d'architecture comprises |
| `npm test` | Jest + React Native Testing Library |
| `npm run verifier` | Les trois à la suite |
| `npm run icones:generer` | Régénère les composants Healthicons depuis `../design/healthicons-icons.json` |
| `npm run polices:detecter` | Détecte les fichiers Vonca dans `assets/fonts/` |
| `npm run api:generer` | Génère les types depuis le contrat OpenAPI de l'API (voir plus bas) |
| `npm run e2e` | Parcours Maestro du dossier `e2e/` |

## Development build (EAS)

La carte utilise `@maplibre/maplibre-react-native` (avec son plugin Expo, déclaré dans `app.json`). **Elle ne tourne pas dans Expo Go** : il faut un development build. Il en va de même pour MMKV (module Nitro).

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                  # crée le projet EAS et renseigne projectId
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client
```

Profils de `eas.json` :

| Profil | Usage | Particularités |
| --- | --- | --- |
| `development` | Développement quotidien | `developmentClient`, distribution interne, démo active |
| `preview` | Bêta fermée (testeurs) | Distribution interne, canal EAS Update `preview` |
| `production` | Stores | Démo désactivée (`EXPO_PUBLIC_API_MOCK=0`), numéro de build incrémenté |

Le `projectId` EAS est nécessaire pour obtenir le jeton Expo Push (notification du samedi) : sans lui, l'app s'enregistre auprès de l'API sans jeton de notification.

Identifiants provisoires : `com.sospharma24.app` (iOS et Android), schéma de liens `sospharma24://`. À confirmer par le client avant la première publication.

## Arborescence

```
sospharma-mobile/
├── app/                              # routes expo-router : une ligne par écran
│   ├── _layout.tsx                   # racine : polices, cache, thème, Sentry, pile + modaux
│   ├── demarrage.tsx                 # 01 Splash
│   ├── localisation.tsx              # 02 Permission
│   ├── (onglets)/                    # Accueil, Carte, Urgence, Garde, Profil
│   ├── pharmacie/[id]/               # fiche, itinéraire, partager, signaler
│   ├── zone/                         # changer de zone, communes, pays, non couverte
│   ├── filtres.tsx
│   ├── assurances.tsx                # 16b Choix des assurances (modal, ?contexte=filtres|profil|releve)
│   ├── contact.tsx
│   ├── agent/connexion.tsx           # 22 Espace agent : connexion
│   └── releve/                       # 24 position, 25 doublons, 26 photos, 27 fiche
├── src/
│   ├── modules/
│   │   ├── territoire/               # pays, villes, communes, position, zone
│   │   ├── pharmacies/               # accueil, carte, fiche, itinéraire, partage, filtres
│   │   ├── gardes/                   # tour en cours, liste de garde, démarrage
│   │   ├── urgence/                  # écran SOS
│   │   ├── signalements/             # « Signaler une erreur »
│   │   ├── support/                  # « Nous contacter »
│   │   ├── notifications/            # appareil, autorisation, jeton Expo
│   │   ├── profil/                   # favoris, préférences
│   │   └── releves/                  # espace agent : connexion, file d'envoi, relevé en 4 étapes
│   │       (chacun : api.ts, hooks/, ecrans/, composants/, types.ts, index.ts)
│   └── commun/
│       ├── ui/                       # design system (+ icones/, carte/, navigation/)
│       ├── theme/                    # jetons jour/nuit, typographie, ombres, style de carte
│       ├── api/                      # client, enveloppe, ApiResult, réactions, schéma, démo
│       ├── lib/                      # config, i18n, préférences, stockage, liens, formats, Sentry
│       └── regles/                   # règle de statut + cas partagés avec l'API
├── e2e/                              # parcours Maestro
├── scripts/                          # generer-icones.mjs, detecter-vonca.mjs
├── assets/                           # icônes d'app, splash, fonts/ (Vonca)
├── LICENSE-healthicons               # licence MIT du jeu d'icônes
├── eas.json, app.json, .env.example
```

## Architecture

### Modules et règles d'import

Le découpage suit la section « Découpage en modules » de l'architecture validée.

- `app/` ne contient que des routes d'une ligne (`export { default } from '@/modules/gardes/ecrans/ListeGardes'`), plus les fichiers `_layout.tsx`.
- **Un module n'utilise que la partie publique d'un autre** (`@/modules/<module>`, c'est-à-dire son `index.ts`), jamais ses fichiers internes.
- **`commun` n'importe aucun module.**
- Un écran en ouvre un autre par la navigation (`router.push('/pharmacie/ph_0142')`), sans importer le module voisin.
- Sens des dépendances : `territoire` ← `gardes` ← `pharmacies` ; `urgence` → `gardes`, `territoire` ; `signalements` → `pharmacies` ; `profil` → `notifications`, `territoire` ; `releves` → `territoire`, `pharmacies` ; `support` ne dépend d'aucun module. Aucun module ne dépend de `releves` (seules les routes de `app/` l'importent).

Ces règles sont **vérifiées par ESLint** (`eslint.config.js`, règle `no-restricted-imports`, configurée module par module ; pour `releves`, le sens des dépendances lui-même est vérifié). Une règle de plus interdit toute `borderWidth` non nulle (charte : aucune bordure), et une autre réserve MapLibre à `src/commun/ui/carte`. Alias `@/` vers `src/` (tsconfig, résolu nativement par Metro et par Jest).

### Client d'API

`src/commun/api` :

- `appeler<T>(chemin, options)` renvoie toujours un `ApiResult<T>` : l'enveloppe standard (`success`, `data` ou `error{code,message,details}`, `meta{request_id, generated_at, pagination…}`) plus le statut HTTP. Chaque appel est protégé par try/catch : **erreur réseau** (`NETWORK_ERROR`), **erreur de format** (`INVALID_RESPONSE`, enveloppe absente ou incomplète) et **erreur métier** (codes de l'API) deviennent un `ApiResult`. Aucun appel ne lève d'exception.
- En-têtes : `Accept-Language: fr` et `X-Device-Token` (jeton reçu par `POST /appareils`).
- Base : `EXPO_PUBLIC_API_URL` + `/api/v1`.
- Les hooks TanStack Query convertissent l'échec en `ErreurAppel` (exception portant `code`, `details`, `requestId`).
- **Un seul endroit décide de la réaction à chaque `error.code`** : `reactions.ts` (`reactionPour`) et son hook `useReactionErreur`. Exemples : `ZONE_NOT_COVERED` ouvre l'écran « zone pas encore couverte » (avec la ville détectée), `TOO_MANY_REQUESTS` affiche « réessayez demain », `VALIDATION_FAILED` renvoie les erreurs par champ aux formulaires, `NETWORK_ERROR` et `MAINTENANCE` gardent le cache avec le bandeau, `SERVER_ERROR` part dans Sentry avec le `request_id`.

### Gestion des erreurs

- Error Boundary autour de **chaque écran** (`avecErrorBoundary`) : écran « Un problème est survenu » avec « Réessayer », erreur envoyée à Sentry.
- Gestionnaire global des erreurs non attrapées, promesses comprises (`installerGestionnaireGlobal`), relié à Sentry.
- Sentry est initialisé seulement si `EXPO_PUBLIC_SENTRY_DSN` est renseignée.

### Hors connexion

- Le cache TanStack Query est persisté dans **MMKV** (`PersistQueryClientProvider`, 7 jours). Au lancement, l'app affiche le cache puis le rafraîchit.
- Rafraîchissement au retour au premier plan, au retour du réseau (**NetInfo** branché sur `onlineManager`) et à chaque changement de zone (la zone fait partie des clés de cache).
- Sans réseau : bandeau « Hors connexion, liste de garde du 17 oct. enregistrée », et le statut ouvert/fermé/garde est **recalculé sur le téléphone** avec la règle de `src/commun/regles/statut.ts`, recopiée de l'API et vérifiée par les mêmes cas (`cas-statut.json`). La carte est remplacée par la liste (pas de fonds de carte hors ligne en V1).

### Multi-pays

Aucune constante de pays dans les écrans : numéros d’urgence, indicatif, fuseau et coordonnées du support viennent de la configuration pays de l’API (`GET /api/v1/pays`), et les assurances du référentiel du pays (`GET /api/v1/pays/{code}/assurances`), servis par l’adaptateur en démo. Le fuseau sert aux statuts, aux heures affichées et au mode nuit automatique. Les textes sont dans `src/commun/lib/i18n/fr.json` (i18next + expo-localization).

### Thème jour et nuit

`src/commun/theme` : jetons de la charte (`jetons.ts`, mêmes clés en jour et en nuit), typographie (Vonca/Urbanist pour les titres, Plus Jakarta Sans pour le texte), ombres légères, style MapLibre. `useTheme()` donne couleurs, typographie et espacements. Le mode nuit s'active **automatiquement de 19:00 à 06:00 à l'heure locale du pays**, ou à la main (bouton lune de l'accueil de nuit, ligne « Mode nuit » du profil : Automatique, Activé, Désactivé). La nuit, l'accueil met la garde en premier.

### État local

Zustand + MMKV (`src/commun/lib/preferences.ts`) : zone choisie, pays, mode nuit, filtres, profil local, préférences de notification, « Mes assurances ». La position GPS reste en mémoire (jamais enregistrée).

### Design system : boutons et champs (ajouts du 21 oct.)

- `Bouton` prend `icone="envoyer"` (nom du jeu commun, `src/commun/ui/icones/actions.tsx`) : icône au trait 20 px, couleur du texte, écart 10 px, à gauche du libellé (à droite pour `continuer` et `connexion`). Table : envoyer (avion), valider (coche), naviguer (flèche de navigation), voir (œil), liste, lune, actualiser (flèche circulaire), ajouter (+), continuer (→), annuler (croix), localisation (cible), carte, cloche, repere, connexion, bulle, photo. Les liens texte gardent `variante="lien"` sans icône. Tous les boutons d'action existants ont reçu leur icône.
- `ChampSaisie` : icône à gauche (`email`, `cadenas`, `telephone`, `whatsapp`, `horloge`, `pharmacie`, `profil`, `recherche`), fond gris et icône grise quand le champ est vide, fond vert clair et icône verte quand il est actif ou rempli ; `motDePasse` ajoute le bouton œil (« Afficher / Masquer le mot de passe »). `ChampRecherche` et `ZoneTexte` suivent les mêmes états. Jamais de bordure ni d'arrondi.

### Assurances

- Référentiel par pays : `GET /pays/{code}/assurances` (module Pharmacies, `useAssurances`, gardé 24 h). Chaque pharmacie renvoie `assurances` (`id`, `slug`, `nom`, `type`, `tiers_payant`) et `accepte_mes_assurances`.
- « Mes assurances » : enregistrées sur le téléphone (`{ slug, nom }`), puis envoyées par `PUT /appareils/moi/assurances` (`useSynchroniserMesAssurances`, retenté au retour du réseau).
- Filtre `filter[assurances]=mugef-ci,cmu` : pharmacies qui acceptent **au moins une** des assurances choisies.
- L'écran `ChoixAssurances` (16b) sert aux Filtres, au Profil et au relevé : l'écran appelant dépose la sélection de départ dans `useSelectionAssurances` (`src/commun/lib/selectionAssurances.ts`), le choix la remplace en validant (pour le Profil, il enregistre aussi « Mes assurances »).

### Espace agent terrain (module `releves`)

- Lien « Espace agent et pharmacien » en bas du Profil → connexion (`POST /auth/connexion`, Sanctum). Le **jeton est dans expo-secure-store** (`releves/jeton.ts`), jamais dans MMKV ; sans « Rester connecté », il ne vit qu'en mémoire. L'identité affichée (`useSessionAgent`, `src/commun/lib/sessionAgent.ts`) est dans MMKV : la barre d'onglets la lit pour remplacer l'onglet Profil par **« Relevés »** (icône presse-papiers). Déconnexion automatique après 30 jours sans usage, ou si le jeton a disparu.
- Relevé en 4 étapes : **position** (expo-location en haute précision, suivi continu, précision affichée, bouton désactivé au-delà de 30 m, repère fixe au centre de la carte qu'on fait glisser, écart avec le GPS enregistré, commune détectée) ; **doublons** (`GET /agent/pharmacies/proches`, rayon 100 m) ; **photos** (expo-image-picker en mode appareil photo, autorisation demandée à la première photo, réduction à 1 600 px et compression JPEG 0,7 avec expo-image-manipulator, ce qui retire les données EXIF dont la position du fichier ; façade obligatoire) ; **fiche** (nom, téléphone, WhatsApp, horaires jour par jour, 24h/24, assurances, noms libres proposés).
- Le brouillon du relevé est gardé dans MMKV (`releves/brouillon.ts`) : rien n'est perdu si l'app se ferme.
- **File d'attente hors connexion** (`releves/file.ts`, MMKV) : « Envoyer le relevé » met d'abord le relevé en file, avec un identifiant UUID généré sur le téléphone, puis tente l'envoi. `POST /agent/releves` porte toujours ce même identifiant (un renvoi après une réponse perdue ne crée pas de doublon), puis chaque photo part par `POST /agent/releves/{id}/photos` ; une photo déjà envoyée n'est pas renvoyée. Arrêt au premier problème de réseau ; un relevé refusé (validation) est mis de côté avec son message ; session expirée : la file est gardée. Envoi automatique au lancement, au retour du réseau (NetInfo) et au retour au premier plan (`useEnvoiAutomatique`). Bandeau « N relevés en attente d'envoi » dans « Mes relevés ».

## Brancher l'API réelle

1. Dans `.env` : `EXPO_PUBLIC_API_MOCK=0` et `EXPO_PUBLIC_API_URL=https://api.[domaine]`.
2. Générer les types depuis le contrat OpenAPI publié par l'API (Scramble) :

   ```bash
   OPENAPI_URL=https://api.[domaine]/docs/api.json npm run api:generer
   # ou avec un fichier local : placez openapi.json à la racine puis npm run api:generer
   ```

   La commande écrit `src/commun/api/schema.genere.ts` (via `openapi-typescript@7`, lancé par `npx` car ce paquet attend TypeScript 5 en dépendance paire). Remplacez ensuite le contenu de `src/commun/api/schema.ts` par des ré-exports des types générés, sous les mêmes noms (`Pharmacie`, `PharmacieResume`, `TourGarde`, `Pays`…). Le compilateur signalera tout écart entre le contrat et l'app.
3. Vérifier les points à aligner avec l'API (voir [À faire](#à-faire--non-vérifié)) : champs `garde.jusqua`, `note`, assurances et routes agent (voir plus bas), rayon de 10 km.

L'adaptateur de démonstration (`src/commun/api/demo/`) se branche à la place de `fetch` : tout le reste (client, hooks, cache, réactions aux erreurs) est identique avec l'API réelle. Il simule aussi les erreurs (`ZONE_NOT_COVERED` hors d'Abidjan, `VALIDATION_FAILED` sans motif, `TOO_MANY_REQUESTS` au 6ᵉ signalement du jour).

## Carte

- MapLibre, marqueurs « coupe d'Hygie » avec étiquette de distance (`0,4 km` pour la pharmacie sélectionnée, `0,7` pour les autres), point bleu de position.
- **Regroupement par commune au dézoom** : en dessous du zoom 12,5, la carte affiche les compteurs par commune (`GET /villes/{id}/compteurs`) au lieu des points (maquette 11). Le bouton « Calques » bascule entre la vue ville et la vue quartier.
- Points visibles : `GET /pharmacies/cadre?bbox=…` (plafond de 300).
- Style aux couleurs de la charte, jour et nuit (`src/commun/theme/styleCarte.ts`), par ordre de priorité :
  1. `EXPO_PUBLIC_MAP_STYLE_URL` (et `_NUIT`) : un style complet hébergé ;
  2. `EXPO_PUBLIC_MAP_TILES_URL` : des tuiles vectorielles au schéma OpenMapTiles (MapTiler, ou un fichier PMTiles servi par o2switch) ; l'app construit alors le style de la charte (fond `#EEF1EF`, routes blanches, lagune `#CFE2EC`, parcs `#D9EADD` ; en nuit `#121C17`, `#24322A`, `#12293A`) ;
  3. sinon, un **style local minimal de repli** (fond uni de la charte, sans tuiles).
- Sur le web (aperçu, export), `Carte.web.tsx` remplace la carte par la liste.

## Police Vonca

Vonca (titres) est une police sous licence fournie par le client. En attendant, les titres utilisent **Urbanist** (repli prévu par la charte).

Pour l'ajouter :

1. Déposer dans `assets/fonts/` : `Vonca-SemiBold.otf`, `Vonca-Bold.otf`, `Vonca-ExtraBold.otf` (ou `.ttf`).
2. Lancer `npm run polices:detecter` (fait automatiquement par `npm start`). Le script régénère `src/commun/theme/polices-vonca.ts` avec les `require` des seuls fichiers présents (Metro ne sait pas charger un fichier absent).
3. Relancer l'app. `policeTitre()` renvoie alors `Vonca-*`, et `useFonts` charge les fichiers. Les constantes `FAMILLE_TITRES` (« Vonca ») et `FAMILLE_TITRES_REPLI` (« Urbanist ») documentent le repli.

Pour un build EAS, les fichiers doivent être versionnés (ou ajoutés au build) : vérifier les droits de la licence.

## Icônes

- Jeu **Healthicons** (MIT, `LICENSE-healthicons`). `scripts/generer-icones.mjs` lit `../design/healthicons-icons.json` (format Iconify) et produit `src/commun/ui/icones/healthicons.tsx` : un composant `react-native-svg` par icône, avec `color` et `size` en props. Les variantes colorées de `design/icones/` (verte, rouge, grise…) correspondent à la prop `color`. Pour ajouter une icône : l'ajouter à la liste `ICONES` du script puis `npm run icones:generer`.
- La pharmacie est la **coupe d'Hygie** (`HiPharmacy`, `HiPharmacyOutline`).
- Les icônes simples absentes de Healthicons (retour, recherche, filtres, lune, itinéraire, partage, bulle WhatsApp, horloge, bouclier…) sont tracées au trait dans `src/commun/ui/icones/trait.tsx`, avec les tracés des maquettes.
- Icône d'app, icône adaptative Android et splash : générées depuis le SVG du logo (planche « Icône d'app » de la charte).

## Tests

```bash
npm test
```

| Fichier | Ce qui est vérifié |
| --- | --- |
| `src/commun/regles/__tests__/statut.test.ts` | Les 9 cas partagés `cas-statut.json` (garde > ouverte > fermée, minuit, fuseau UTC+1, dimanche) + heure de fermeture |
| `src/commun/api/__tests__/client.test.ts` | Enveloppe succès/erreur, erreur réseau, erreur de format, code inconnu, en-tête `X-Device-Token`, paramètres de filtres, réactions aux codes, adaptateur de démonstration |
| `src/commun/ui/__tests__/Pastille.test.tsx` | Pastille de statut (couleurs, badge 24, sans bordure, accessibilité), ligne de pharmacie (couleurs de statut, distance, bouton Appeler ≥ 44 px) |
| `src/modules/urgence/__tests__/Urgence.test.tsx` | Numéros d'urgence lus dans la configuration pays, appel `tel:185`, garde la plus proche, bouton SOS |
| `src/modules/gardes/__tests__/ListeGardes.test.tsx` | Liste de garde jour et nuit, filtre « Toute la nuit », ouverture de la fiche |
| `src/commun/ui/__tests__/Bouton-Champs.test.tsx` | Bouton avec icône (à gauche, « continuer » à droite, écart 10 px, sans bordure ni arrondi, lien sans icône) ; champ avec icône (vide gris, actif ou rempli vert clair), bouton œil du mot de passe |
| `src/modules/pharmacies/__tests__/Assurances.test.tsx` | `filter[assurances]` « au moins une » (union), `accepte_mes_assurances` après `PUT`, 18 assurances groupées, ordre des puces ; écran Filtres pré-rempli par « Mes assurances » (croix, « Ajouter (18 au total) », application) ; fiche : 3 puces puis « + 4 autres » qui déplie, « Accepte votre assurance » |
| `src/modules/releves/__tests__/file.test.ts` | File d'attente des relevés : mise en file, envoi (relevé puis photos), hors connexion puis reprise, **idempotence** (réponse perdue, même identifiant, un seul relevé côté API), photo interrompue renvoyée seule, relevé refusé mis de côté, session expirée, envois simultanés ; refus au-delà de 30 m ; résumé des horaires |

Parcours **Maestro** (sur un development build ou un build preview installé) :

- `e2e/trouver-garde-et-appeler.yaml` : premier lancement, autorisation de localisation, accueil, liste de garde, appel de la plus proche ;
- `e2e/changer-de-zone.yaml` : barre de zone, toutes les communes, choix de Plateau, retour à l'accueil ;
- `e2e/releve-agent.yaml` : Profil, espace agent, connexion (identifiants fictifs, œil du mot de passe), onglet « Relevés », relevé en 4 étapes (position ± 8 m, nouvelle pharmacie, photo de façade, fiche), envoi, retour à « Mes relevés », « Quitter ».

## Correspondance écran ↔ maquette

| Maquette | Écran | Route | Fichier |
| --- | --- | --- | --- |
| Main.dc.html | 01 Splash | `app/demarrage.tsx` | `src/modules/gardes/ecrans/Demarrage.tsx` |
| Localisation.dc.html | 02 Permission et localisation | `app/localisation.tsx` | `src/modules/territoire/ecrans/Localisation.tsx` |
| Accueil.dc.html | 03 Accueil | `app/(onglets)/index.tsx` | `src/modules/pharmacies/ecrans/Accueil.tsx` |
| Carte.dc.html | 04 Carte | `app/(onglets)/carte.tsx` | `src/modules/pharmacies/ecrans/Carte.tsx` |
| Garde.dc.html | 05 Pharmacies de garde | `app/(onglets)/garde.tsx` | `src/modules/gardes/ecrans/ListeGardes.tsx` |
| Detail.dc.html | 06 Détail pharmacie | `app/pharmacie/[id]/index.tsx` | `src/modules/pharmacies/ecrans/Fiche.tsx` |
| Itineraire.dc.html | 07 Itinéraire | `app/pharmacie/[id]/itineraire.tsx` | `src/modules/pharmacies/ecrans/Itineraire.tsx` |
| Urgence.dc.html | 08 Urgence | `app/(onglets)/urgence.tsx` | `src/modules/urgence/ecrans/Urgence.tsx` |
| Vide.dc.html | 09 Aucune pharmacie trouvée | composant | `src/commun/ui/EtatVide.tsx` + `src/modules/pharmacies/composants/AucunResultat.tsx` |
| Zone.dc.html | 10 Changer de zone (modal) | `app/zone/index.tsx` | `src/modules/territoire/ecrans/ChangerZone.tsx` |
| ZoneCommunes.dc.html | 10b Toutes les communes (A à Z, par distance, index) | `app/zone/communes.tsx` | `src/modules/territoire/ecrans/Communes.tsx` |
| CarteZoom.dc.html | 11 Carte dézoomée | état de la carte (zoom < 12,5) | `src/modules/pharmacies/ecrans/Carte.tsx` |
| NonCouvert.dc.html | 12 Zone pas encore couverte | `app/zone/non-couverte.tsx` | `src/modules/territoire/ecrans/NonCouverte.tsx` |
| Filtres.dc.html | 13 Filtres (modal) | `app/filtres.tsx` | `src/modules/pharmacies/ecrans/Filtres.tsx` |
| Profil.dc.html | 14 Profil et favoris | `app/(onglets)/profil.tsx` | `src/modules/profil/ecrans/Profil.tsx` |
| Pays.dc.html | 15 Choix du pays | `app/zone/pays.tsx` | `src/modules/territoire/ecrans/ChoixPays.tsx` |
| Partage.dc.html | 16 Partager (modal transparent) | `app/pharmacie/[id]/partager.tsx` | `src/modules/pharmacies/ecrans/Partage.tsx` |
| Signaler.dc.html | 17 Signaler une erreur | `app/pharmacie/[id]/signaler.tsx` | `src/modules/signalements/ecrans/Signaler.tsx` |
| Contact.dc.html | 18 Nous contacter | `app/contact.tsx` | `src/modules/support/ecrans/Contact.tsx` |
| AccueilNuit.dc.html | 19 Accueil nuit | même route qu'Accueil | `Accueil.tsx`, branche nuit |
| GardeNuit.dc.html | 20 Garde nuit | même route que Garde | `ListeGardes.tsx`, branche nuit |
| CarteNuit.dc.html | 21 Carte nuit | même route que Carte | `Carte.tsx`, thème nuit |
| ChoixAssurances.dc.html | 16b Choix des assurances (modal) | `app/assurances.tsx` (`?contexte=filtres`, `profil` ou `releve`) | `src/modules/pharmacies/ecrans/ChoixAssurances.tsx` |
| AgentConnexion.dc.html | 22 Espace agent : connexion | `app/agent/connexion.tsx` | `src/modules/releves/ecrans/Connexion.tsx` |
| AgentReleves.dc.html | 23 Mes relevés (onglet « Relevés ») | `app/(onglets)/releves.tsx` | `src/modules/releves/ecrans/MesReleves.tsx` |
| RelevePosition.dc.html | 24 Relevé, étape 1 : position | `app/releve/position.tsx` (`?pharmacie=` depuis une fiche) | `src/modules/releves/ecrans/Position.tsx` |
| ReleveDoublon.dc.html | 25 Relevé, étape 2 : doublons | `app/releve/doublons.tsx` | `src/modules/releves/ecrans/Doublons.tsx` |
| RelevePhotos.dc.html | 26 Relevé, étape 3 : photos | `app/releve/photos.tsx` | `src/modules/releves/ecrans/Photos.tsx` |
| ReleveFiche.dc.html | 27 Relevé, étape 4 : fiche | `app/releve/fiche.tsx` | `src/modules/releves/ecrans/FicheReleve.tsx` |
| Proposer.dc.html | 28 Proposer une pharmacie (usager sans compte) | `app/proposer.tsx` | `src/modules/releves/propositions/ecrans/Proposer.tsx` |
| PropositionVerification.dc.html | 28b Vérification avant envoi (feuille) | `app/proposer.tsx` | `src/modules/releves/propositions/composants/FeuilleVerification.tsx` |
| PropositionEnvoyee.dc.html | 29 Proposition envoyée | `app/proposition/envoyee.tsx` | `src/modules/releves/propositions/ecrans/PropositionEnvoyee.tsx` |
| (sans maquette) | Mes propositions | `app/propositions.tsx` | `src/modules/releves/propositions/ecrans/MesPropositions.tsx` |

Écrans existants mis à jour : Detail (section « Assurances acceptées »), Filtres (puces d'assurances et « Ajouter »), Profil (« Mes assurances », lien « Espace agent et pharmacien »), boutons de tous les écrans (icônes), champs de Contact, Signaler, recherche et édition du profil.

AccueilV2, GardeV2 et CarteV2 (exploration non retenue) n'ont pas été suivies.

## Décisions

Prises sans pouvoir consulter le client ; toutes réversibles.

1. **Expo SDK 58**, React Native 0.88, React 19.3, TypeScript 6 (gabarit `blank-typescript`) ; routes dans `app/` à la racine comme l'architecture (pas `src/app/`).
2. **Barre d'onglets personnalisée** (`tabBar` du navigateur d'onglets JavaScript d'expo-router) pour reproduire exactement la maquette ; le composant `BarreOnglets` peut aussi s'afficher seul (écran « zone non couverte », qui l'a dans la maquette).
3. **Splash à chaque lancement** (« Mise à jour du tour de garde de la semaine ») : il précharge la configuration pays et le tour de garde (au moins 1,4 s), puis ouvre l'étape de localisation la première fois, ou l'accueil ensuite. Le splash natif (expo-splash-screen) couvre le chargement des polices.
4. **Splash et localisation dans des routes séparées** (`app/demarrage.tsx`, `app/localisation.tsx`), comme le permet le tableau de la charte. Le splash vit dans le module Gardes (il met à jour le tour) pour respecter le sens des dépendances (Territoire ne dépend de personne).
5. **Accueil de jour : bouton cloche** = nouveau tour de garde. Le point rouge s'affiche tant que le tour en cours n'a pas été vu ; un appui ouvre l'onglet Garde. Il n'y a pas d'écran de notifications dans les maquettes.
6. **Bascule manuelle du mode nuit** : bouton lune sur l'accueil de nuit (maquette) et ligne « Mode nuit » ajoutée au profil (Automatique, Activé, Désactivé), faute de bascule jour → nuit dans les maquettes.
7. **Profil local** (prénom, nom, téléphone) : reste sur le téléphone, jamais envoyé (l'architecture exclut tout compte usager). En mode démo, il est prérempli avec le profil fictif des maquettes (« Amani Kouadio ») ; sinon l'accueil dit « Bonjour ».
8. **Filtres** : « Ouvertes » inclut les pharmacies de garde (elles sont ouvertes). Les cases « Ouvertes maintenant » et « De garde cette semaine » se combinent en « ou », « 24h/24 » en « et » avec le reste, et les assurances entre elles en « au moins une ». Rayon par défaut : 5 km. Les filtres du modal ne s'appliquent qu'en validant (« Voir 9 pharmacies » compte avec le brouillon).
9. **Assurances** (remplace la décision du socle) : le référentiel vient de `GET /pays/{code}/assurances` ; le champ `assurances` du type `Pays` est retiré. Le filtre est « au moins une » (`filter[assurances]`), comme l'architecture ; les anciens filtres d'assurance enregistrés sont vidés à la migration des préférences (v2).
10. **Statut et libellés** : l'API calcule le statut ; l'app ne le recalcule qu'hors connexion ou sur des données périmées. Les libellés « Ouverte jusqu'à 02:00 » / « Ouverte toute la nuit » des gardes utilisent un champ `garde.jusqua` (heure locale, `null` = toute la nuit), déduit de la colonne « fin » de la table `gardes`.
11. **Durées d'itinéraire** : V1 sans moteur d'itinéraire. Estimation : distance à vol d'oiseau majorée (×1,35 en voiture et moto, ×1,15 à pied), 12 km/h en ville, 80 m/min à pied. Elles redonnent les valeurs des maquettes (3 min / 0,6 km ; 6 min / 0,5 km à pied) et sont annoncées comme « environ » aux lecteurs d'écran. Le tracé est une ligne droite.
12. **« Démarrer avec Yango ou le GPS »** ouvre un choix : Google Maps (lien universel), Plans (iOS), Yango, autre application (`geo:` sur Android). Le lien profond Yango est **non vérifié** ; en cas d'échec, Google Maps prend le relais.
13. **Partage** : message de la maquette ; le lien « Itinéraire : … » est un lien Google Maps tant qu'aucun domaine de partage n'est configuré.
14. **Coordonnées du support** (WhatsApp, téléphone, e-mail) lues dans la configuration pays ; vides dans la démo (« bientôt disponible »).
15. **« Me prévenir »** (pays et villes pas encore couverts) : enregistré sur le téléphone seulement, faute de route d'API prévue.
16. **Module Support autonome** : il relit `GET /pays` lui-même (même clé de cache que Territoire) pour ne dépendre d'aucun module, comme le veut l'architecture.
17. **Carte** : marqueurs en vues React (fidèles aux maquettes) plutôt qu'en couches de symboles ; regroupement par commune sous le zoom 12,5 via les compteurs de l'API plutôt que le regroupement de points de MapLibre.
18. **Bouton « Calques »** de la carte : bascule vue ville (communes) ↔ vue quartier ; la maquette ne précise pas son rôle.
19. **« Signaler une erreur sur une pharmacie »** (profil) ouvre le signalement de la dernière fiche consultée, sinon explique comment faire.
20. **Données de démonstration** : pharmacies, adresses et positions fictives reprises des maquettes, toutes au même numéro fictif des maquettes (+225 01 23 45 67 89). Mention « Mode démonstration : pharmacies et numéros fictifs » en bas du profil. Les seuls vrais numéros sont SAMU 185 et pompiers 180, donnés par l'architecture.
21. **Couleurs propres à une illustration** (fond vert foncé de l'écran 02, halo du splash) : constantes locales à l'écran, hors jetons.
22. **Tests** : React Native Testing Library 14 (API asynchrone), mocks Jest de MMKV, NetInfo, Sentry et expo-location dans `jest.setup.ts`.
23. **ESLint** : `no-restricted-imports` configuré module par module, plutôt que `eslint-plugin-boundaries` (la v7 change d'API ; la règle native suffit et a été vérifiée avec des imports interdits volontaires).

Décisions du 21 oct. (icônes, assurances, espace agent) :

24. **Icône de bouton par nom** (`icone="valider"`) plutôt que par composant, pour que la table de la charte soit appliquée au même endroit ; un élément React reste accepté pour les petits boutons colorés des maquettes (Appeler, Itinéraire, WhatsApp de la carte), avec leur écart de 8 px d'origine.
25. **« Continuer » : flèche à droite**, comme le dit la charte (« continuer (flèche →, à droite) »), alors que la maquette 26 la dessine à gauche ; « Se connecter » a aussi son icône à droite (maquette 22).
26. **États des champs** : la règle de la charte (vide gris, actif ou rempli vert clair) s'applique partout, y compris aux zones de texte de Contact et Signaler et aux champs de la fiche de relevé.
27. **Assurances identifiées par leur slug** dans l'app (filtres, « Mes assurances », relevés), comme le filtre de l'API ; `slug` est ajouté aux assurances renvoyées avec chaque pharmacie (l'architecture cite `id`, `nom`, `type`, `tiers_payant`). `PUT /appareils/moi/assurances` envoie `{ "assurances": ["mugef-ci", "cmu"] }`. À confirmer avec l'API.
28. **Fiche** : les assurances de l'usager passent en premier ; une puce est verte quand la pharmacie pratique le tiers payant (« MUGEF-CI tiers payant » de la maquette), grise sinon. « Accepte votre assurance » vient de `accepte_mes_assurances`, ou d'un calcul sur le téléphone si l'API ne l'a pas encore (assurances pas encore synchronisées). Les tuiles « Services » du socle sont remplacées par la ligne « Services : … » de la nouvelle maquette Detail.
29. **Filtres pré-remplis** : tant que l'usager n'a pas validé de filtre d'assurance, le modal part de « Mes assurances » (mention « Pré-rempli avec vos assurances du Profil. ») ; rien n'est appliqué aux listes avant « Voir N pharmacies ».
30. **« Assurance absente de la liste ? »** : dans un relevé, l'agent saisit un nom libre (envoyé dans `assurances_proposees`, à valider par l'équipe) ; pour l'usager (Filtres, Profil), le lien propose d'écrire à l'équipe (« Nous contacter »).
31. **Démo « Mes assurances »** : MUGEF-CI et CMU (maquette Profil), envoyées à l'adaptateur au premier lancement. Référentiel fictif de 18 assurances : CMU, MUGEF-CI, « [Mutuelle A] » à « [Mutuelle F] », « [Assureur privé A] » à « [Assureur privé J] » (« Ajouter (18 au total) » de la maquette).
32. **Onglet « Relevés »** : route d'onglet `app/(onglets)/releves.tsx` toujours déclarée ; la barre d'onglets affiche Profil ou Relevés selon la session agent (état dans `commun/lib`, sans jeton), pour que `commun` n'importe aucun module.
33. **Connexion** : seul le rôle `agent_terrain` est admis pour l'instant (l'architecture prévoit les pharmaciens plus tard). En démo, toute adresse e-mail valide et un mot de passe de 4 caractères ou plus sont acceptés (compte fictif « Koffi Yao, Agent terrain, Abidjan »). « Mot de passe oublié » appelle `POST /auth/mot-de-passe/oubli`.
34. **Doublons à 100 m** (`rayon=100`), comme le tableau des routes de l'architecture et la demande ; le texte affiche le rayon réellement interrogé. Sans réseau, l'étape explique que l'équipe vérifiera et laisse continuer. En démo, deux pharmacies fictives sont placées à 12 m et 41 m de l'agent (maquette 25).
35. **Relevé depuis une fiche** : bouton « Mettre à jour cette fiche (agent) » sur la fiche, visible seulement pour un agent connecté (architecture : bouton « Mettre à jour » sur sa fiche) ; le brouillon reprend les informations connues et l'étape des doublons est sautée.
36. **Position** : le repère reste au centre de la partie visible de la carte et c'est la carte qu'on fait glisser (texte de la maquette) ; le point bleu est la position GPS. En démo, position simulée à ± 8 m. Le relevé reste possible sans commune détectée (l'équipe la déduit de la position).
37. **Photos** : réduites à 1 600 px de côté au plus et recompressées en JPEG (qualité 0,7) ; le nouveau fichier n'a plus de données EXIF. « Reprendre » sur la façade ; appui sur une tuile pour reprendre l'enseigne ou les horaires.
38. **Horaires du relevé** : une plage par jour, saisie dans une feuille (case « ouverte » et heures HH:MM) ; par défaut lundi au samedi 08:00 à 21:00, dimanche fermée (maquette 27). WhatsApp laissé vide = « Même numéro » (le téléphone est envoyé).
39. **« Mes relevés »** : la file locale (« À envoyer ») d'abord, puis les relevés de l'API ; compteurs Validés / En vérification / À corriger calculés sur la liste de l'API ; un appui sur un relevé affiche son état et le commentaire de l'équipe ; tirer pour actualiser relance l'envoi. « Quitter » demande confirmation s'il reste des relevés en file (ils restent sur le téléphone et partent à la prochaine connexion).
40. **Identifiant de relevé** : UUID v4 (expo-crypto), avec un repli pseudo-aléatoire si le module natif manque.
41. **Textes d'autorisation** (app.json) : appareil photo et position précise expliqués en français ; autorisations inutiles retirées (micro, position en arrière-plan, mouvement, Face ID).
42. **Propositions des usagers dans le module Relevés** (`src/modules/releves/propositions/`), comme côté API : mêmes outils de position (30 m), de photo (1 600 px, sans EXIF) et d'identifiant (UUID). Aucun compte : le client ajoute `X-Device-Token`. Envoi en deux temps (proposition puis façade) ; un nouvel appui après une coupure renvoie la même proposition et réessaie la photo. Pas de file hors ligne : l'usager est sur place, avec du réseau.
43. **Téléphone** saisi en local (« 01 02 03 04 05 ») converti au format international avec l'indicatif du pays (`+2250102030405`).
44. **Accès** : Profil (« Proposer une pharmacie manquante », à la place de « Signaler une erreur », comme la maquette 14 mise à jour ; le signalement reste sur chaque fiche) et suggestion mise en avant sur « Aucune pharmacie trouvée ».
45. **Vérification avant envoi** : « Envoyer » ouvre une feuille (récapitulatif + pharmacies connues à 100 m via `GET /pharmacies/proches?rayon=100`). « Oui, c'est celle-ci » ouvre la fiche sans rien envoyer ; « Non, c'est une autre » envoie avec `doublons_ecartes`. Sans réseau, la feuille le dit et laisse envoyer (l'équipe vérifiera). En démo, les pharmacies fictives à 12 m et 41 m de l'étape 25 servent d'exemple.
46. **Palette enrichie** (23 oct.) : nouveaux jetons `vertProfond`, `vertTendre`, `rougeProfond`, `rougeTendre`, `ocreTexte`, `ocrePoint`, `ocreClair` ; fond sable, surfaces et textes en neutres chauds. Accueil : bandeau vert profond (zone, salutation, deux accès). Garde : barre de zone et filtre en rouge profond, conseil de nuit en encadré ocre. Fiche : en-tête vert profond, statut « ouverte » en aplat vert, sections en cartes blanches. « Ferme dans N min » (moins de 30 min, `minutesAvantFermeture`) passe en ocre partout où une ligne de pharmacie est affichée. Le mode nuit garde ses couleurs.
47. **Relevés d'agents alignés sur l'API** : la file du téléphone garde son format ; `versCorpsApi()` le convertit à l'envoi (`identifiant`, `pharmacie` pour une mise à jour, adresse, téléphones au format international, assurances `{ id: as_…, tiers_payant }`), et `depuisApi()` lit `ReleveResource` (nom et quartier dans `champs`). Les photos partent sur l'identifiant donné par l'API (`re_…`), gardé dans la file (`idServeur`). La démo applique les mêmes règles que l'API (adresse obligatoire pour une création, assurances connues). Champ « Adresse ou repère » ajouté à l'étape 4 (maquette 27 mise à jour). `Assurance.logo` suit aussi le nom de l'API.
48. **Animations** (24 oct.) : Reanimated 4.7 (déjà compilé dans l'app, déclaré dans `package.json`), regroupé dans `src/commun/ui/animations.ts` (durées courtes, 90 à 300 ms, et respect de « Supprimer les animations »). Lignes de pharmacie en cascade (`rang`, 40 ms d'écart, 8 lignes au plus), halo rouge qui s'étend autour des pastilles de garde dans les listes (pas sur la carte, trop de marqueurs), anneaux du bouton SOS qui respirent, boutons qui se compriment légèrement sous le doigt (0,97, les liens ne changent que d'opacité). Sous Jest, un mock minimal de Reanimated (`jest.setup.ts`) remplace le mock officiel, qui échoue avec jest-expo.
49. **Feuilles et dialogues** (24 oct.) : une seule forme de fenêtre, la feuille `Feuille` (`src/commun/ui`) qui monte du bas au-dessus du voile, avec poignée, titre, croix facultative, marges et animation communes, sans arrondi ni bordure. Les 30 `Alert.alert` natifs (style Android, 3 boutons au plus : « Annuler » disparaissait de « Ouvrir avec », qui ne se fermait plus) sont remplacés par `alerte()` (`src/commun/lib/dialogues.ts`, même signature), affichée par `HoteDialogues` monté à la racine : première action en vert plein, autres choix en vert clair, action destructrice en rouge (`Bouton` variante `danger`), « Annuler » en dernier. Partager, l'édition du profil, l'éditeur d'horaires et la vérification avant envoi utilisent la même feuille. Filtres, Assurances et Changer de zone montent du bas ; leur pied garde 16 de marge au-dessus de la barre de navigation.
50. **Marge de la barre de navigation** (24 oct.) : l'app est dessinée bord à bord, donc tout écran sans barre d'onglets laisse libre la hauteur de la barre d'Android (`useBarreBas`, `useMargeBas` dans `src/commun/ui/margeBas.ts`, avec la mesure du lancement en secours dans les fenêtres modales). Appliqué à la fiche (« Y aller maintenant » passait sous la barre), à la localisation, aux communes, au choix de zone et de pays, à « Mes propositions », à « Proposition envoyée », à la connexion agent et à l'étape position du relevé, ainsi qu'à `PiedFixe` et `Feuille`. L'ancienne formule `max(barre, 28)` arrêtait le bouton juste au bord de la barre.
51. **Barre compacte de la fiche** (24 oct.) : quand le titre arrive sous les boutons ronds du haut, une barre claire apparaît en fondu (180 ms) avec le nom de la pharmacie ; la barre d'état passe en texte sombre. Le contenu ne passe plus sous les boutons ni sous la barre d'état.
52. **Écran de démarrage natif** : la croix du logo (`assets/splash-icon.png`) était noire dans l'image ; elle est redessinée en blanc, comme le logo de la charte. Visible après une recompilation native.
53. **Chemins courts sous Windows** : `plugins/chemins-courts-windows.js` place le dossier de travail CMake du module app à la racine du disque (`D:\cx`), sans quoi la compilation arm64-v8a dépasse 260 caractères. Sans effet hors de Windows (EAS). Le projet doit lui-même être à un chemin court (`D:\sp`).
54. **Fond de carte sans clé** : `EXPO_PUBLIC_MAP_TILES_URL` accepte aussi un fichier TileJSON. En développement : OpenFreeMap (`https://tiles.openfreemap.org/planet`, gratuit, données OpenStreetMap), avec les glyphes `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`. Pour la production, le choix reste ouvert (MapTiler ou PMTiles sur o2switch).
55. **Clavier** (24 oct.) : l'app est bord à bord, donc Android ne redimensionne plus l'écran quand le clavier s'ouvre (`adjustResize` est sans effet). Les feuilles et les six formulaires (Signaler, Contact, Assurances, connexion agent, fiche de relevé, Proposer) utilisent `KeyboardAvoidingView` en `padding` sur Android comme sur iOS. Clavier ouvert, `useBarreBas` vaut 0 : la marge de la barre de navigation n'ouvre plus de vide au-dessus du clavier.
56. **En-tête et fiche de la carte** (24 oct.) : sur un écran de 360 points, le titre « Autour de vous » était coupé et les boutons « Itinéraire » et « WhatsApp » raccourcis. La barre de zone compacte affiche un chevron au lieu de « Changer » (toujours lu par le lecteur d'écran) et ne dépasse pas 120 points ; le logo de l'en-tête de la carte est retiré (l'onglet indique déjà l'écran). Les trois actions de la fiche de la carte passent en `Bouton empile` : icône au-dessus du libellé, 60 points de haut.
57. **Écran du logo au retour** (24 oct.) : Android garde l'app en mémoire quand on la quitte, et la touche retour détruit même sa fenêtre sans effacer la mémoire JavaScript : un appui sur l'icône reprenait l'app sans le logo. Règle (`src/commun/lib/premierPlan.ts`, appliquée par `useRetourAuDemarrage` à la racine) : sortie par la touche retour depuis l'accueil, logo au retour ; autre sortie de 5 minutes ou plus, logo aussi ; sortie provoquée par l'app (appel, Maps, Yango, WhatsApp, SMS, e-mail, partage, réglages, appareil photo, via `marquerSortieVersAutreApp`), on reprend l'écran quitté. Le hook navigue vers `/demarrage` sans toucher à `demarrageFait` (le retirer démontait la barre d'onglets : erreur ROUTE_NAMES_CHANGED), après que la navigation est prête si la fenêtre a été reconstruite.
58. **Logotype du démarrage** (24 oct.) : le haut de « Pharma24 » était coupé sur Android. Les morceaux imbriqués « Pharma » et « 24 » reprenaient la hauteur de ligne du style de texte courant (≈ 22) au lieu de celle du mot ; ils portent maintenant la même hauteur que lui (1,3 × la taille de police).
59. **Branchement sur l'API réelle** (24 oct.) : l'app garde son modèle (`schema.ts`) ; `src/commun/api/traduction.ts` traduit, route par route, les requêtes et les réponses du seul transport réseau (`avecTraduction` dans `client.ts`). La démo sert toujours le modèle de l'app ; les relevés et les propositions suivent déjà le format de l'API. Réponses : pharmacies (`position` → `latitude`/`longitude`, `zone` → `commune`), pays (icône et description des urgences, support vide), villes, communes (distance calculée depuis la position demandée), commune détectée, compteurs, tour de garde, appareil, compte (prénom = premier mot du nom). Requêtes : connexion (`password`), appareil (`identifiant_anonyme`, `ville`, `zone`), favori (`pharmacie`), motifs de signalement et sujets du support au vocabulaire de l'API. Filtre « Ouvertes » (ouvertes et de garde) retiré de la requête et appliqué à la réponse ; rayon ramené à 5 km (maximum de l'API, la maquette propose 10 km : à trancher). « Mes assurances » part en identifiants `as_…` (correspondance par le référentiel en cache). Le cache persistant porte la source des données (démo ou adresse de l'API) : changer de source le jette. Tests sur de vraies réponses de l'API locale : `src/commun/api/__tests__/traduction.test.ts`. Essai local : `EXPO_PUBLIC_API_MOCK=0`, `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000`, `adb reverse tcp:8000 tcp:8000`.
60. **Points ouverts du branchement, tranchés** (24 oct.) : distances proposées 1, 2 et 5 km (limite de l'API, architecture validée) ; une préférence enregistrée à 10 km passe à 5 km (migration v3), et « Aucune pharmacie trouvée » ne propose plus d'élargir au-delà. Singulier : « 1 pharmacie » (clés `zone.meta`, `carte.commune`, `carte.resumeCommune` en `_one`/`_other`). Le résumé du pays, les coordonnées du support et le nombre de communes viennent désormais de l'API.

## Écarts avec les maquettes

- **Barre d'onglets visible sur la carte** : la maquette 04 est dessinée sans barre d'onglets (écran poussé avec flèche retour), mais la carte est un onglet selon le tableau des routes. La flèche retour ramène à l'accueil.
- **Garde de nuit (20)** : écran poussé dans la maquette (flèche retour, pas de barre) ; ici c'est l'onglet Garde en thème nuit, avec la flèche qui ramène à l'accueil.
- **Pharmacie Espoir** est verte (ouverte) sur la maquette Carte mais de garde sur la maquette Garde : les données de démo suivent la maquette Garde.
- **Statuts en direct** : les maquettes figent la scène à 23:40 ; l'app calcule l'heure réelle (« Grande Pharmacie » est donc ouverte en journée).
- **Photo de façade** : la maquette affiche « [Photo de la façade] » ; sans photo, l'app garde l'aplat sombre et l'icône d'appareil photo, sans texte.
- **Avis (4,7, 120 avis)** : affichés seulement si l'API renvoie une note (champ `note`, absent de l'architecture).
- **Distance maximale 5 km** : la maquette propose aussi 10 km, mais l'architecture validée limite le rayon de l'API à 5 km ; l'option 10 km est retirée (décision 60).
- **Tracé d'itinéraire** en ligne droite (pas de moteur d'itinéraire en V1), au lieu du trajet coudé de la maquette.
- **« Dites-le-nous »** (écran Pays) ouvre « Nous contacter » au lieu du profil (lien de la maquette).
- **Slogan du splash** : « 24h/24 · 7j/7 » garde le « · » de la maquette (la règle « pas de · » vise les méta).
- **Rendu natif non comparé pixel à pixel** : aucun appareil disponible (voir ci-dessous).
- **Doublons : « à moins de 100 m »** au lieu de « 50 m » dans le texte de la maquette 25 (rayon de l'API, décision 34).
- **Flèche de « Continuer » à droite** (charte) au lieu de gauche (maquette 26).
- **Champs de la fiche de relevé** : fond vert clair quand ils sont remplis (charte) ; la maquette 27 les dessine gris avec une icône verte.
- **Photo absente** (doublons) : icône d'appareil photo au lieu du texte « [Photo] ».
- **Case « Rester connecté »** : case carrée du design system (22 px) au lieu de la case native verte de 20 px.
- **Tuile de façade vide** : la maquette ne montre que l'état « photo prise » ; l'état vide affiche l'appareil photo, « Prendre la photo de la façade » et « Obligatoire ».
- **Puce « Ajouter »** dans la fiche de relevé quand aucune assurance n'est choisie (la maquette montre « Modifier » avec 3 assurances).
- **Bouton « Mettre à jour cette fiche (agent) »** sur la fiche, absent de la maquette Detail (architecture).
- **« Reprendre »** (photo de façade) reste un petit bouton texte sans icône, comme la maquette.
- **Proposer (28)** : « Ajuster » agrandit la carte pour faire glisser le repère, puis « Terminé » ; la maquette ne montre que l'état replié. Sans photo, la vignette affiche l'appareil photo et le bouton « Prendre la photo ».
- **Feuille 28b** : pastille de statut au lieu de la vignette « [Photo] » des pharmacies proches (la recherche publique ne renvoie pas de photo).
- **Mes propositions** n'a pas de maquette : liste sur le modèle de « Mes relevés » (23).

## À faire / non vérifié

- **Notification « proposition en ligne »** : reçue, mais l'appui n'ouvre pas encore la fiche (aucune gestion des appuis sur notification dans l'app pour l'instant).

Non vérifié faute d'appareil ou de réseau :

- **Rendu sur appareil** (iOS et Android) : aucun simulateur disponible. Vérifiés : `tsc`, ESLint, Jest, `expo export` web et Android (le bundle se construit), `expo prebuild` Android (les plugins de configuration s'appliquent). À faire : passer chaque écran sur un appareil et le comparer aux maquettes.
- **Carte native MapLibre** (marqueurs, caméra, marges, attribution, style de nuit) : non exécutée. Le type de la v11 a été suivi, mais le comportement réel reste à valider sur un development build.
- **Compatibilité des versions** : `npx expo install` a tourné en mode hors ligne (les serveurs d'Expo n'étaient pas joignables) ; `expo-doctor` a réussi 18 vérifications sur 20, les deux échecs venant seulement de l'absence de réseau. Relancer `npx expo install --check` puis `npx expo-doctor` avec réseau.
- **Lien profond Yango** : à vérifier ; repli Google Maps.
- **`router.dismissTo('/')`** depuis le choix de zone au premier lancement (pile : localisation → zone) : à tester sur appareil.
- **Web** : seul l'export est vérifié ; MMKV (Nitro) n'est pas prévu pour tourner dans un navigateur.

Espace agent et assurances, non vérifié sur appareil :

- **Appareil photo, réduction des photos, trousseau sécurisé, position haute précision** (expo-image-picker, expo-image-manipulator, expo-secure-store, `watchPositionAsync`) : simulés dans Jest, non exécutés sur un téléphone. Sur iOS avec la « position approximative », la précision dépasse 30 m : prévoir `requestTemporaryFullAccuracyAsync` si besoin (texte d'autorisation déjà fourni).
- **Envoi multipart des photos** (`FormData` avec `{ uri, name, type }`) : vérifié contre l'adaptateur seulement.
- **Repère au centre de la carte** : position du pin calculée d'après l'en-tête et la feuille du bas, à valider sur MapLibre natif.
- Parcours Maestro `releve-agent.yaml` : écrit, non exécuté (pas d'émulateur) ; les étapes de l'appareil photo système dépendent du téléphone.
- `npx expo install` a tourné en mode hors ligne : versions d'expo-secure-store, expo-image-manipulator et expo-crypto à revérifier avec `npx expo install --check`.

À faire avec l'équipe API :

- Confirmer : `slug` dans les assurances des pharmacies, corps de `PUT /appareils/moi/assurances`, réponse de `POST /auth/connexion` (`{ jeton, compte }`), corps de `POST /agent/releves` (`NouveauReleve` dans `schema.ts`, avec `zone_id` et `champs.assurances_proposees`), champ `photo` du multipart, réponse 200 (et non 409) quand un relevé est renvoyé avec le même identifiant, pagination par curseur de `GET /agent/releves` (l'app lit la première page de 50).
- Correction d'un relevé « à corriger » (`PATCH /agent/releves/{id}`) : pas d'écran dans les maquettes, non fait.
- Saisie des services dans le relevé : absente de la maquette 27 (les services connus sont repris pour une mise à jour).

- Remplacer `schema.ts` par les types générés depuis OpenAPI (`npm run api:generer`).
- Confirmer les champs utilisés par l'app : `garde.jusqua`, `garde.confirmee_le`, `prochaine_ouverture`, `ferme_a`, `horaires` et `gardes` dans les résumés (pour le recalcul hors connexion), `support` dans `Pays`, `note` dans la fiche, `meta.nombre`.
- Trancher le rayon de 10 km (maquette) face à la limite de 5 km de l'API.
- Prévoir une route « me prévenir à l'ouverture » (pays ou ville) si le client la souhaite.

Autres :

- `eas init` (projectId), identifiants définitifs, police Vonca, coordonnées du support, domaine de partage.
- Cartes de sources Sentry : ajouter `getSentryExpoConfig` dans `metro.config.js` et les variables `SENTRY_*` dans EAS.
- Fonds de carte : choisir le fournisseur (MapTiler au lancement ou PMTiles sur o2switch) et renseigner `EXPO_PUBLIC_MAP_*`.
- GitHub Actions (lint, types, tests à chaque push), comme prévu dans l'architecture.

## Licences

- Icônes : [Healthicons](https://healthicons.org), licence MIT (`LICENSE-healthicons`).
- Polices : Plus Jakarta Sans et Urbanist (Google Fonts, SIL Open Font License) ; Vonca sous licence du client.
- Fonds de carte : © OpenStreetMap (attribution affichée sur la carte).
- Gabarit Expo : `LICENSE`.
