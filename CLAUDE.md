# SOS Pharma 24

## En bref
- **Produit** : trouver en quelques secondes une pharmacie ouverte ou de garde près de soi, l'appeler ou s'y rendre. Abidjan (Côte d'Ivoire) d'abord, d'autres villes et pays par configuration.
- **Utilisateurs** : le grand public, parfois en urgence ou la nuit, souvent sur un Android d'entrée de gamme (référence : Samsung Galaxy A14) avec un réseau faible ; les agents terrain (relevés de pharmacies) ; l'équipe interne (admins, éditeurs de ville) dans le back-office ; les pharmaciens.
- **Langues** : app en français et anglais ; back-office et messages de l'API en français.
- **Principes** : rapidité > exhaustivité, fiabilité > esthétique, simplicité > fonctionnalités.

## Stack et structure
Monorepo GitHub `nerissedev-boop/SOSPHARMA24`, branche `main`. Chaque sous-projet a son `CLAUDE.md` (commandes, conventions, pièges propres).

| Dossier | Rôle | Stack |
|---|---|---|
| `sospharma-api/` | API REST `/api/v1`, seul accès aux données | Laravel 13, PHP 8.3, MySQL 8, Sanctum, Scramble, Pest 4 |
| `sospharma-admin/` | Back-office (gardes, pharmacies, imports, signalements, comptes) | Angular 21, Tailwind CSS 4, lucide-angular, Vitest |
| `sospharma-mobile/` | App grand public + espace agent terrain | Expo SDK 58, React Native 0.88, expo-router, Reanimated 4, TanStack Query + MMKV, MapLibre, Jest, Maestro |

**Documents de référence** : les `README.md` de chaque sous-projet (« Décisions », « À faire / non vérifié »). `ARCHITECTURE.md` à la racine est une V0 ancienne (NestJS, Supabase, Mapbox) qui **ne correspond pas** au code. `specs/architecture.md` et `specs/charte.md`, cités dans le code, ne sont pas dans le dépôt.

## Commandes essentielles
| Action | Commande | Dossier |
|---|---|---|
| Tests API | `php artisan optimize:clear` puis `vendor/bin/pest` | `sospharma-api` |
| Format API | `vendor/bin/pint` | `sospharma-api` |
| Back-office (API locale) | `npm start` | `sospharma-admin` |
| Tests back-office | `npm test` (pas de script lint ; format par Prettier) | `sospharma-admin` |
| Vérifier l'app | `npm run verifier` (tsc + eslint + jest) | `sospharma-mobile` |

## Conventions communes
- **Noms en français** dans tout le code (classes, fonctions, fichiers, routes).
- API : skill `standard-api`, monolithe modulaire (`app/Modules/*`, `app/Commun`).
- Textes de l'app : `fr.json` **et** `en.json`, vouvoiement.
- Agent design du projet : `.claude/agents/designer-ux-ui.md` (connaît la charte et les écrans).

## Direction artistique
- **Idée forte** : chaque écran est une croix verte allumée dans la nuit. Il donne un seul signal, lisible d'un coup d'œil à 2 h du matin : quelle pharmacie, à quelle distance, « Appeler ». Dans la piste A (choisie le 11 nov. 2026), le bandeau foncé est la nuit et la grande carte « la plus proche » est l'enseigne ; le reste vient après, plus calme.
- **Références humaines** :
  - La croix verte des officines, allumée la nuit : le vert veut dire « ouvert » et « on y va ». Son battement (`ChargementCroix`) est le seul mouvement de la marque.
  - La liste de garde de l'Ordre telle qu'elle circule sur WhatsApp : ordre nom, téléphone, repère ; groupes par commune ; période du tour en tête ; date de confirmation visible. Le partage renvoie une liste en texte, lisible dans WhatsApp.
  - Les adresses par repères (« face au marché, boulevard Latrille ») : l'adresse s'écrit comme un repère, la photo de façade ouvre la fiche pour reconnaître la devanture en arrivant.
  - Yango : cartes blanches arrondies sans bordure, une action principale, l'adresse envoyée au chauffeur.
  - Wave : une couleur forte, l'action dès l'ouverture, rien à lire avant d'agir, sur les mêmes Android d'entrée de gamme.
- **Ce qu'on refuse** :
  - Le décor « africain » de catalogue (wax, kente, masques, couchers de soleil, personnages illustrés). Le local, ce sont les communes, les repères, Yango, la CMU, le tour de garde.
  - Les signes « IA » : dégradés et halos flous (sauf le logo et le voile qui rend lisible le haut d'une photo), verre dépoli et `blur` (coûteux sur un A14), bento, tuiles de chiffres, icône dans un carré coloré, emojis, bordures (interdites par une règle ESLint), tout autre jeu d'icônes que Healthicons et le trait des maquettes.
  - Les images de stock (pharmacienne souriante, 3D, blobs) : une vraie façade validée, sinon la devanture dessinée.
  - Le mouvement qui décore : compteur qui part de 0, cascade sur une liste déjà en cache, parallaxe, Lottie, deux boucles visibles en même temps.
  - Tout ce qui retarde quelqu'un en urgence : attente imposée au démarrage, carrousel de bienvenue, compte obligatoire, demande de note, carte plein écran par défaut, roue qui tourne hors connexion.
  - Une couleur hors de son sens : du rouge ailleurs que pour la garde, le « 24 » et l'urgence (exception : le texte d'erreur sous un champ), de l'ocre décoratif, un gris froid de Tailwind parmi les neutres sable.
  - Une même action en deux couleurs : « Appeler » vert plein et « Itinéraire » blanc à icône verte sur tous les écrans ; la garde se reconnaît à l'étiquette, à la pastille et au « 24 » (tranché le 12 nov. 2026).
  - Une nuit qui éblouit : en mode nuit, aucun aplat blanc ou sable plein écran, splash compris.
- **Voix des textes** :
  - Vouvoiement. Français standard avec les mots d'ici, sans nouchi ni familiarité. Une idée par phrase, une quinzaine de mots au plus. Un verbe sur chaque bouton (« Appeler », « Y aller », « Envoyer le signalement »).
  - Mots d'ici : commune, repère, de garde, tour de garde, tiers payant, CMU, chauffeur, 24h/24. « Position à confirmer », jamais « coordonnées GPS manquantes ». Une heure, une distance ou une date plutôt qu'un adjectif.
  - À suivre : « La nuit, appelez avant de vous déplacer. » · « Il est 02:10. Les pharmacies de garde passent en premier. » · « Position pas encore relevée : appelez la pharmacie pour connaître le chemin. »
  - À éviter : « Votre santé, notre priorité », « Comment pouvons-nous vous aider aujourd'hui ? », « Un problème est survenu » sans cause ni action, « Bienvenue ! Trouvez facilement votre pharmacie », « Valider » tout court.
  - Ponctuation française : apostrophe ’, guillemets « », espace insécable avant : ; ? !, « … » et jamais « ... ».
- **Back-office** : un outil de bureau, donc la densité d'abord : tableaux compacts, en-tête collé, filtres en place, téléphones, dates et compteurs en `tabular-nums` (compteurs à droite). Filets de tableau admis ; pas de tuiles KPI ni de carte à ombre autour de chaque bloc. Mêmes jetons que l'app à la place de `stone-*` et `red-*` ; « Erreur » et « Ambiguë » en ocre ; une suppression est un bouton neutre au libellé exact, avec confirmation.
- **Test avant de livrer un écran** :
  - À 2 h, en mode nuit, sur un Galaxy A14 : voit-on la plus proche et « Appeler » en 3 secondes, sans défiler ni être ébloui ?
  - En mode avion, police à 130 % : l'écran reste-t-il utile et daté, sans texte coupé ?
  - Logo masqué : devine-t-on Abidjan et une pharmacie, ou pourrait-ce être une app de livraison ?
  - Chaque rouge dit-il garde ou urgence, chaque ocre une attente, chaque mouvement un changement ?

## Charte graphique
- Couleurs (jetons dans `sospharma-mobile/src/commun/theme/jetons.ts`, reprises dans `sospharma-admin/src/styles.css` `@theme`) :
  - **Vert** `#1B8A3E` = la pharmacie et les actions.
  - **Rouge** `#D32F2F` (bandeau Garde `#9E1F1F`) = la garde, le « 24 » et l'urgence.
  - **Ocre** = états intermédiaires seulement (« ferme dans 20 min », « en vérification », « à envoyer »).
  - Neutres chauds : fond sable `#FBF8F3`, cartes blanches, texte `#1C1F1A`.
- Typographie : titres **Vonca** (licence client, fichiers à récupérer dans les dossiers du site ; repli **Urbanist** en attendant), texte **Plus Jakarta Sans** (`sospharma-mobile/src/commun/theme/typographie.ts`). Back-office : police système.
- Thèmes : clair et sombre dans l'app, **mêmes clés de jetons** ; jamais de couleur en dur. Back-office : clair seulement.
- Animations : `sospharma-mobile/src/commun/ui/animations.ts` (`DUREES` : 90 à 300 ms), sur le fil UI, coupées par « Supprimer les animations » / `ReduceMotion.System`.
- Accessibilité : contrastes WCAG AA notés en commentaire dans `jetons.ts` ; cibles ≥ 48 dp.

## Hébergement et déploiement
- **API** : o2switch (cPanel, cron chaque minute), en ligne sur `https://api.oculismanager.com/api/v1`. Déploiement manuel : un commit poussé n'est pas en ligne tant qu'il n'est pas déployé.
- **Back-office** : o2switch, domaine à définir (penser à `CORS_ALLOWED_ORIGINS` et `SOSPHARMA_ADMIN_URL` sur le serveur).
- **App** : EAS (`eas.json` : development avec démo, preview, production) ; build Android local depuis `D:\sp`.
- **CI** : `sospharma-api/.github/workflows/tests.yml` est dans un sous-dossier, GitHub ne l'exécute pas (laissé tel quel pour l'instant).

## ⚠️ Pièges
- **Pas encore dans Git** (au 13 nov. 2026) : `sospharma-admin/`, les `CLAUDE.md` et `.claude/`. Une perte du disque les efface. À commiter dès que possible.
- **Tests API qui vident la base** : avec une config en cache, les tests visent MySQL au lieu de SQLite en mémoire (arrivé le 31 oct. 2026). Garde-fou dans `tests/TestCase.php` ; toujours `php artisan optimize:clear` avant.
- **`D:\sp` n'est pas un dépôt Git** : copie de `sospharma-mobile` pour compiler Android sous la limite de chemins Windows. Recopier `src/` et `app/` avant chaque build ; ne jamais y laisser de modification non reportée.
- **Mode démo de l'app** (`EXPO_PUBLIC_API_MOCK=1`, par défaut) : pharmacies **fictives**.
- **Back-office** : `npm run start:enligne` et le build de production écrivent dans la vraie base.
- **Expo** : `npx expo install` pour les dépendances ; ne pas modifier `android/` à la main.
- Node 22 requis par l'app (via nvm, pas forcément dans le PATH du shell des outils).
- Ne pas commiter ni pousser sans accord. Compte d'envoi : `nerissedev-boop` (inclus dans l'URL du remote).
