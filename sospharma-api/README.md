# SOS Pharma 24 — API

API Laravel de SOS Pharma 24 : trouver une pharmacie ouverte ou de garde près de soi. C'est le seul point d'accès aux données pour l'app mobile (Expo) et le back-office (Angular). Elle se déploie sur l'hébergement mutualisé o2switch.

Le document de référence est `specs/architecture.md`, validé par le client. Ce dépôt correspond à l'**étape 1 de la feuille de route** (socle API), complétée par les **assurances multiples** et le module **Relevés** (agents terrain).

> ⚠️ Ce socle a été écrit **sans pouvoir être exécuté** : Packagist était inaccessible, donc pas de `vendor/`, pas d'`artisan` et pas de tests lancés. Lisez la section « À faire / non vérifié » avant la première mise en route.

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Installation locale](#installation-locale)
3. [Fichier `.env`](#fichier-env)
4. [Commandes utiles](#commandes-utiles)
5. [Architecture du code](#architecture-du-code)
6. [Format des réponses](#format-des-réponses)
7. [Liste des routes](#liste-des-routes)
8. [Déploiement sur o2switch](#déploiement-sur-o2switch-pas-à-pas)
9. [Décisions](#décisions)
10. [Incohérences relevées dans le document d'architecture](#incohérences-relevées-dans-le-document-darchitecture)
11. [À faire / non vérifié](#à-faire--non-vérifié)

---

## Prérequis

- **PHP 8.3 ou plus.** Laravel 13, la version stable du squelette, exige PHP 8.3. Le document disait « 8.2 ou plus » : voir les incohérences.
- Extensions PHP : `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `zip`, `zlib` (pour la compression des sauvegardes), et `pdo_sqlite` pour les tests.
- Composer 2.
- MySQL 8 ou MariaDB 10.6 et plus.
- `mysqldump`, pour la commande de sauvegarde.

## Installation locale

```bash
git clone <dépôt> sospharma-api && cd sospharma-api
composer install                 # installe Laravel, Sanctum, Scramble, Pest…
cp .env.example .env
php artisan key:generate
# créer la base MySQL « sospharma », puis renseigner DB_* dans .env
php artisan migrate
php artisan db:seed              # données de TEST (Abidjan, 20 pharmacies fictives, assurances, comptes)
php artisan storage:link         # photos de façade publiques (storage/app/public → public/storage)
php artisan serve                # http://localhost:8000
```

- Documentation interactive : <http://localhost:8000/docs/api> (libre en local).
- Exemple d'appel : `curl "http://localhost:8000/api/v1/pharmacies/proches?lat=5.355&lng=-3.97"`

Comptes de test créés par le seeder, tous avec le mot de passe `SEED_MOT_DE_PASSE` du `.env` :

| E-mail | Rôle |
| --- | --- |
| `SEED_ADMIN_EMAIL` (par défaut `admin@sospharma.test`) | admin |
| `editeur.abidjan@sospharma.test` | editeur_ville (Abidjan) |
| `pharmacien.test01@sospharma.test` | pharmacien, rattaché à `ph_test01` |
| `agent.abidjan@sospharma.test` | agent_terrain, rattaché à Abidjan |

Assurances de test : les régimes publics **CMU** (`as_cmu`) et **MUGEF-CI** (`as_mugefci`), puis des mutuelles et assureurs **fictifs** nommés entre crochets (`[Mutuelle fictive A]`, `[Assureur privé A]`…). Chaque pharmacie de test en accepte quelques-unes : le tirage dépend seulement des identifiants, il est donc identique à chaque seed.

## Fichier `.env`

Les variables propres au projet, en plus de celles de Laravel :

| Variable | Rôle |
| --- | --- |
| `DB_CONNECTION=mysql`, `DB_*` | Base MySQL / MariaDB |
| `APP_LOCALE=fr` | Messages (validation…) en français |
| `SOSPHARMA_ADMIN_URL` | URL du back-office : liens de réinitialisation de mot de passe |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées par CORS, séparées par des virgules (le domaine `admin.`) |
| `SANCTUM_EXPIRATION` | Durée de vie des jetons, en minutes (30 jours par défaut) |
| `SANCTUM_TOKEN_PREFIX` | Préfixe des jetons (`sp_`), utile pour les détecteurs de secrets |
| `EXPO_ACCESS_TOKEN` | Facultatif : jeton Expo si la « sécurité renforcée des notifications » est activée |
| `NOTIFICATION_HEURE_SAMEDI` | Heure locale de la notification du samedi (`08:00`) |
| `MYSQLDUMP_PATH`, `SAUVEGARDE_JOURS_CONSERVES` | Sauvegarde quotidienne |
| `SEED_ADMIN_EMAIL`, `SEED_MOT_DE_PASSE` | Comptes de **test** du seeder. Jamais en production : le seeder refuse de tourner en `production` |
| `CACHE_STORE=database` | Cache : contours des communes et configuration des pays |
| `SESSION_DRIVER=file` | L'API n'a pas de session ; seule la page `/docs/api` utilise le groupe `web` |

Les secrets (clé d'application, accès MySQL, clé Expo) restent dans le `.env` du serveur, jamais dans Git.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `php artisan migrate` | Migrations : celles de `database/migrations` plus celles de chaque module |
| `php artisan db:seed` | Données de test |
| `php artisan db:seed --class=AssurancesReferentielSeeder --force` | Régimes publics de Côte d'Ivoire (CMU, MUGEF-CI), utilisable en production |
| `php artisan storage:link` | Lien public des photos de façade validées |
| `vendor/bin/pest` (ou `php artisan test`) | Tests : unitaires, fonctionnels, architecture |
| `vendor/bin/pest --testsuite=Architecture` | Seulement les règles de dépendances entre modules |
| `vendor/bin/pint` | Mise en forme du code |
| `php artisan route:list --path=api/v1` | Liste des routes |
| `php artisan notifications:garde-samedi [--maintenant]` | Envoie les notifications « nouveau tour de garde » arrivées à échéance (`--maintenant` : sans attendre l'heure prévue) |
| `php artisan pharmacies:importer-osm [fichier] [--pays=CI] [--simulation]` | Importe les pharmacies d'OpenStreetMap comme fiches « à vérifier » (fichier Overpass `out tags center`, sinon téléchargement) ; relançable sans doublon |
| `php artisan sauvegarde:base` | Exporte la base, compressée, dans `storage/app/private/sauvegardes` |
| `php artisan scramble:export` | Exporte le contrat OpenAPI dans `api.json` (voir `openapi-notes.md`) |
| `php artisan schedule:list` | Tâches planifiées |

## Architecture du code

C'est un monolithe modulaire, comme le prévoit le document : un module par domaine métier, et un dossier `Commun` partagé.

```
app/
├── Commun/                      # utilisé par tous, n'importe aucun module
│   ├── Contrats/                # AnnuaireTerritoire, RattachementsCompte (inversion de dépendances)
│   ├── Documentation/           # extension Scramble : enveloppe + codes d'erreur
│   ├── Erreurs/                 # CodeErreur (liste fermée), ExceptionMetier, RenduErreursApi (filet global)
│   ├── Fichiers/                # ImageSansMetadonnees : retire l'EXIF (position GPS comprise) par réencodage GD/Imagick
│   ├── Geo/                     # Distance (haversine, rectangle), Geometrie (point-dans-polygone), Rectangle
│   ├── Http/                    # ApiResponse, middleware RequestId et VerifierRole, ParametresListe, AppareilCourant
│   ├── Modeles/                 # AIdentifiantPublic (ph_…, tg_…)
│   ├── Securite/                # Role (dont agent_terrain), CompteAvecRole (villesAutorisees)
│   ├── Support/                 # Dates (ISO UTC « Z »), LecteurCsv
│   ├── Validation/              # GeoJsonValide
│   └── FournisseurModule.php    # base des ServiceProviders : charge routes.php et database/migrations
└── Modules/
    ├── Territoire/              # pays, villes, zones (communes), secteurs, détection de zone
    ├── Comptes/                 # connexion Sanctum, rôles, comptes
    ├── Pharmacies/              # fiches, horaires, assurances, règle de statut, recherche, espace pharmacien
    ├── Gardes/                  # tours, import CSV, contrôle, publication → TourGardePublie
    ├── Signalements/            # réception limitée, file de traitement
    ├── Support/                 # « Nous contacter », captures
    ├── Notifications/           # appareils, favoris, Expo Push, écoute de TourGardePublie
    └── Releves/                 # agents terrain : relevés, photos, doublons, validation
```

Chaque module contient `Http/{Controllers,Requests,Resources}`, `Models`, `Services`, `Policies`, `Exceptions`, `database/migrations`, `routes.php` et son `XxxServiceProvider.php`, déclaré dans `bootstrap/providers.php`.

**Sens des dépendances.** Il est vérifié par `tests/Architecture/ModulesTest.php` :

```
Territoire  ←  Pharmacies  ←  Gardes
     ↑              ↑   ↖
     └──────────────┴── Signalements, Notifications (Notifications ne voit que Gardes\Events)
     ↑              ↑
     └──────────────┴── Relevés (de Pharmacies, seulement Pharmacies\Contrats)
Comptes et Support : aucune dépendance. Commun : aucune dépendance vers les modules.
Aucun module ne dépend de Relevés.
```

Quand un module « en dessous » a besoin d'une donnée d'un module « au-dessus », il déclare une interface et c'est le module du dessus qui la fournit :

- `Pharmacies\Contrats\SourcePeriodesGarde` est implémentée par Gardes (`SourceGardesPubliees`). La règle de statut, qui vit dans Pharmacies, connaît ainsi les gardes publiées sans dépendre de Gardes.
- `Territoire\Contrats\CompteurZones` est implémentée par Pharmacies : ce sont les compteurs par commune.
- `Commun\Contrats\AnnuaireTerritoire` est implémentée par Territoire, et `Commun\Contrats\RattachementsCompte` par Pharmacies. Elles servent à Comptes, qui ne dépend d'aucun module.
- L'événement `Gardes\Events\TourGardePublie` est écouté par `Notifications\Listeners\ProgrammerNotificationGarde`.
- `Pharmacies\Contrats\EditionFichesPharmacies` (implémenté par `EditionFichesEloquent`) est la **seule** porte d'entrée de Relevés vers Pharmacies : lire des fiches (`FichePharmacie`, objet immuable), créer ou mettre à jour une fiche, publier la photo de façade, vérifier et proposer des assurances. Le test d'architecture interdit à Relevés les modèles, services, contrôleurs, enums et exceptions de Pharmacies.

**Règle de statut.** Elle est dans `Pharmacies\Services\StatutPharmacie` : fonction pure, priorité garde > ouverte > fermée, fuseau du pays, plages qui passent minuit, prochaine ouverture. Elle est testée sur `tests/Fixtures/cas-statut.json`, copie exacte de `specs/cas-statut.json` partagée avec l'app. Les 9 cas ont été vérifiés avec la vraie bibliothèque Carbon pendant le développement.

## Format des réponses

Toutes les réponses des routes `api/*` suivent la même enveloppe :

```json
{ "success": true,  "data": { … }, "meta": { "request_id": "req_8f3a2c1b9d0e", "generated_at": "2026-10-20T23:40:12Z" } }
{ "success": false, "error": { "code": "VALIDATION_FAILED", "message": "Certaines informations sont invalides.", "details": { "motif": ["Choisissez un motif de signalement."] } }, "meta": { … } }
```

- Le `request_id` figure aussi dans l'en-tête `X-Request-Id` et dans chaque ligne de journal (via `Context`). Si le client envoie un `X-Request-Id` valide, l'API le reprend.
- `meta` selon la pagination :

| Pagination | `meta` |
| --- | --- |
| par page | `pagination: {page, per_page, total, last_page}` |
| rayon et limite | `rayon`, `limite`, `nombre` |
| carte | `nombre`, `tronque` |
| curseur | `per_page`, `next_cursor`, `prev_cursor` |

- Codes d'erreur : enum `App\Commun\Erreurs\CodeErreur`, qui reprend la liste fermée du document. Les assurances et les relevés n'en ajoutent aucun (incohérence 18).
- Listes : filtres `filter[nom]=valeur`, tri `sort=-cree_le`, recherche `q`. Chaque route a sa liste blanche, et tout autre paramètre est refusé en `BAD_REQUEST` (400).

## Liste des routes

Toutes les routes sont préfixées par `/api/v1`. Légende des colonnes « Qui » : 🌐 public, 📱 appareil (`X-Device-Token`), 👥 équipe (admin + éditeur de ville, jeton Sanctum), 🔑 admin seulement, 💊 pharmacien, 🧭 agent terrain.

| Méthode | Route | Qui | Pagination |
| --- | --- | --- | --- |
| **Territoire** | | | |
| GET | `/pays` | 🌐 | aucune |
| GET | `/pays/{code}/villes` | 🌐 | aucune |
| GET | `/villes/{id}/zones` (`?q=`) | 🌐 | aucune (avec compteurs) |
| GET | `/zones/depuis-position?lat=&lng=` | 🌐 | — |
| GET | `/villes/{id}/compteurs` | 🌐 | aucune |
| GET / POST | `/admin/pays` | 🔑 | aucune |
| PATCH / DELETE | `/admin/pays/{code}` | 🔑 | — |
| GET / POST | `/admin/villes` (`filter[pays]`, `filter[statut]`, `filter[actif]`) | 🔑 | par page |
| PATCH / DELETE | `/admin/villes/{id}` | 🔑 | — |
| GET / POST | `/admin/zones` (`filter[ville]`, `filter[type]`, `q`) | 👥 | par page |
| PATCH / DELETE | `/admin/zones/{id}` | 👥 | — |
| POST | `/admin/zones/import` (GeoJSON) | 🔑 | — |
| **Pharmacies** | | | |
| GET | `/pharmacies/proches?lat=&lng=&rayon=&limite=` (`filter[statut\|h24\|assurances]`) | 🌐 (📱 facultatif) | rayon et limite |
| GET | `/pharmacies/cadre?bbox=minLng,minLat,maxLng,maxLat` (mêmes filtres) | 🌐 (📱 facultatif) | carte (300 au plus) |
| GET | `/pharmacies/recherche?q=&ville=[&lat&lng&limite]` | 🌐 (📱 facultatif) | limite |
| GET | `/pharmacies/{id}` | 🌐 (📱 facultatif) | — |
| GET | `/pharmacies/{id}/trajet?lat=&lng=` (30/heure/appareil) | 🌐 | — |
| GET / POST | `/admin/pharmacies` (`filter[ville\|zone\|actif\|h24\|assurances]`, `q`, `sort=nom`) | 👥 (création 🔑) | par page |
| GET / PATCH / DELETE | `/admin/pharmacies/{id}` | 👥 (suppression 🔑) | — |
| PUT | `/admin/pharmacies/{id}/horaires` | 👥 | — |
| POST | `/admin/pharmacies/import` (CSV) | 🔑 | — |
| POST / DELETE | `/admin/comptes/{id}/pharmacies` | 🔑 | — |
| GET / PATCH | `/pharmacien/pharmacie` (`?pharmacie=` s'il en gère plusieurs) | 💊 | — |
| PUT | `/pharmacien/pharmacie/horaires` | 💊 | — |
| **Assurances** (module Pharmacies) | | | |
| GET | `/pays/{code}/assurances` | 🌐 | aucune |
| GET / POST | `/admin/assurances` (`filter[pays\|type\|actif]`, `q`, `sort=nom\|cree_le`) | 🔑 | par page |
| PATCH / DELETE | `/admin/assurances/{id}` | 🔑 | — |
| PUT | `/admin/pharmacies/{id}/assurances` | 👥 | — |
| PUT | `/pharmacien/pharmacie/assurances` (avec `propositions` facultatives) | 💊 | — |
| GET / PUT | `/appareils/moi/assurances` | 📱 | aucune |
| GET | `/admin/assurances/propositions` (`filter[statut\|pays\|source]`) | 🔑 | par page |
| POST | `/admin/assurances/propositions/{id}/accepter` · `/rejeter` | 🔑 | — |
| **Gardes** | | | |
| GET | `/gardes/en-cours?ville=[&lat&lng]` | 🌐 (📱 facultatif) | aucune |
| GET / POST | `/admin/tours-garde` (`filter[ville\|statut]`, `sort=-debut`) | 👥 | par page |
| GET / PATCH / DELETE | `/admin/tours-garde/{id}` | 👥 | — |
| POST | `/admin/tours-garde/import` (CSV) | 👥 | — |
| POST | `/admin/tours-garde/{id}/controler` | 👥 | — |
| POST | `/admin/tours-garde/{id}/publier` | 👥 | — |
| POST / DELETE | `/admin/tours-garde/{id}/gardes` | 👥 | — |
| GET | `/pharmacien/gardes` (`filter[periode]=a_venir\|passees`) | 💊 | par page |
| POST | `/pharmacien/gardes/{id}/confirmer` | 💊 | — |
| **Signalements** | | | |
| POST | `/pharmacies/{id}/signalements` (5/jour/appareil) | 🌐 📱 | — |
| GET | `/admin/signalements` (`filter[statut\|ville\|motif]`, `sort=-cree_le`) | 👥 | par page |
| GET | `/admin/signalements/historique` | 👥 | curseur |
| GET | `/admin/signalements/{id}` | 👥 | — |
| POST | `/admin/signalements/{id}/traiter` · `/rejeter` | 👥 | — |
| **Support** | | | |
| POST | `/support/messages` | 🌐 📱 | — |
| POST | `/support/messages/{id}/capture` (image ≤ 5 Mo) | 📱 même appareil | — |
| GET | `/admin/support/messages` (`filter[statut\|sujet]`) | 👥 | par page |
| GET | `/admin/support/messages/{id}` | 👥 | — |
| GET | `/admin/support/messages/{id}/capture` (fichier) | 👥 | — |
| POST | `/admin/support/messages/{id}/traiter` | 👥 | — |
| **Notifications et profil** | | | |
| POST | `/appareils` (renvoie le jeton d'appareil) | 🌐 | — |
| PATCH / DELETE | `/appareils/moi` | 📱 | — |
| GET / POST | `/appareils/moi/favoris` | 📱 | aucune |
| DELETE | `/appareils/moi/favoris/{pharmacie}` | 📱 | — |
| GET | `/admin/notifications/envois` | 👥 | curseur |
| POST | `/admin/notifications/test` | 🔑 | — |
| **Comptes** | | | |
| POST | `/auth/connexion` (5 essais/min) | 🌐 | — |
| POST | `/auth/deconnexion` · GET `/auth/moi` | connecté | — |
| POST | `/auth/mot-de-passe/oubli` · `/auth/mot-de-passe/reinitialiser` | 🌐 | — |
| GET / POST | `/admin/comptes` (`filter[role\|ville\|actif]`, `q` ; `villes` pour un agent terrain) | 🔑 | par page |
| PATCH / DELETE | `/admin/comptes/{id}` | 🔑 | — |
| **Relevés** (agents terrain) — 🧭 agent terrain, dans ses villes | | | |
| GET | `/agent/pharmacies/proches?lat=&lng=[&rayon≤100&limite]` | 🧭 | rayon (100 m) et limite |
| POST | `/agent/releves` (200 par jour et par agent) | 🧭 | — |
| GET | `/agent/releves` (`filter[statut]`) | 🧭 | curseur |
| PATCH | `/agent/releves/{id}` (relevé « à corriger » seulement) | 🧭 | — |
| POST | `/agent/releves/{id}/photos` (`type`, `photo` image ≤ 5 Mo) | 🧭 | — |
| **Propositions des usagers** (sans compte) | | | |
| POST | `/propositions` (3 par jour et par appareil, 10 par IP ; `doublons_ecartes` facultatif) | 📱 | — |
| POST | `/propositions/{id}/photo` (façade, image ≤ 5 Mo) | 📱 (auteur) | — |
| GET | `/propositions` (« Mes propositions ») | 📱 | curseur |
| GET | `/admin/releves` (`filter[ville\|statut\|agent\|type\|origine]`, `sort=recu_le\|releve_le` ; par défaut agents d'abord, puis appareils les plus fiables) | 👥 | par page |
| GET | `/admin/releves/{id}` (photos, comparaison avant/après, doublons) | 👥 | — |
| GET | `/admin/releves/{id}/photos/{photo}` (fichier privé) | 👥 | — |
| POST | `/admin/releves/{id}/valider` (`corrections` et `fusionner_avec` facultatifs) | 👥 | — |
| POST | `/admin/releves/{id}/a-corriger` · `/rejeter` | 👥 | — |

Toutes les routes de la section « Routes et CRUD » du document sont présentes, ainsi que celles des sections « Assurances » et « Agents terrain et relevés ». Routes en plus du document :

- `GET /admin/support/messages/{id}/capture` et `GET /admin/releves/{id}/photos/{photo}` : fichiers privés servis aux seuls comptes de l'équipe ;
- `GET /admin/assurances/propositions`, `POST …/{id}/accepter` et `…/{id}/rejeter` : traitement des assurances absentes proposées en nom libre (« l'équipe le valide avant de l'ajouter au référentiel »).

### Assurances : formats

- **Filtre** `filter[assurances]=cmu,mugef-ci` (slugs, 10 au plus) : pharmacies qui acceptent **au moins une** assurance active de la liste. L'ancien `filter[assurance]` (singulier, texte libre) est refusé en `BAD_REQUEST`.
- **Listes et fiche** : `assurances` = `[{id, nom, type, tiers_payant}]` (régimes publics d'abord, puis par nom) et `accepte_mes_assurances` = `true`/`false` si l'appareil (`X-Device-Token`) a enregistré ses assurances, sinon `null`. Même chose dans `/gardes/en-cours` et `/appareils/moi/favoris`.
- **PUT `…/assurances`** (admin, pharmacien) : `{"assurances": [{"id": "as_cmu", "tiers_payant": true, "remarque": "…"}]}` remplace toute la liste. Le pharmacien peut ajouter `"propositions": ["Nom libre"]`.
- **PUT `/appareils/moi/assurances`** : `{"assurances": ["as_cmu", "as_mugefci"]}` (20 au plus, liste vide pour tout retirer).
- Le champ `assurances` n'est plus accepté par `POST/PATCH /admin/pharmacies` ni `PATCH /pharmacien/pharmacie` (422 avec un message qui renvoie vers la route dédiée).

### Relevés : formats

`POST /agent/releves` :

```json
{
  "identifiant": "6f1c2d3e-…",            // UUID du téléphone : un renvoi rend le même relevé (200, meta.deja_recu)
  "pharmacie": "ph_…",                     // facultatif : mise à jour ; absent : nouvelle pharmacie
  "ville": "vi_abj",                       // seulement si la position n'est dans aucune commune connue
  "latitude": 5.36, "longitude": -3.96,
  "precision_m": 8,                         // 30 au plus, sinon 422
  "ajustement_m": 3,                        // écart du repère ajusté à la main
  "releve_le": "2026-10-20T09:55:00Z",
  "champs": {
    "nom": "…", "adresse": "Face au marché", "quartier": "…", "telephone": "+225…", "whatsapp": "+225…",
    "h24": false, "services": ["…"],
    "horaires": [{"jour": 2, "ouverture": "08:00", "fermeture": "20:00"}],
    "assurances": [{"id": "as_cmu", "tiers_payant": true}],
    "assurances_proposees": ["Nom libre"]
  }
}
```

`nom` et `adresse` sont obligatoires pour une nouvelle pharmacie. Photos : `POST /agent/releves/{id}/photos` en multipart (`type` = `facade|enseigne|horaires`, `photo`), une par type ; un nouvel envoi du même type remplace l'ancien. La façade est obligatoire pour valider.

### Formats d'import

**Tour de garde** (`POST /admin/tours-garde/import`, multipart) :

- champs : `ville`, `debut`, `fin` (ISO 8601, UTC par défaut), `secteur` (facultatif) et `fichier` ;
- CSV, séparateur `;` ou `,`, en-tête obligatoire ;
- dates des lignes en **heure locale de la ville** ; une case vide reprend la période du tour.

```
pharmacie;debut;fin
ph_test01;;
ph_test04;2026-10-24 20:00;2026-10-25 02:00
```

**Pharmacies** (`POST /admin/pharmacies/import`) :

- colonnes obligatoires : `nom;adresse;latitude;longitude` ;
- colonnes facultatives : `quartier;telephone;whatsapp;h24;services;assurances;zone` ;
- `services` et `assurances` séparés par `|`, téléphones au format `+225…`.

**Zones** (`POST /admin/zones/import`) : une `FeatureCollection` GeoJSON. Chaque Feature porte `properties.nom` et `properties.type` (`commune` par défaut) et une géométrie Polygon ou MultiPolygon.

Pour les trois imports, c'est **tout ou rien** : la moindre erreur annule l'import et renvoie un 422 dont `error.details` liste les erreurs ligne par ligne (`ligne_3`) ou Feature par Feature (`features.2`).

## Déploiement sur o2switch (pas à pas)

1. **Sous-domaine.** Dans cPanel › Domaines, créez `api.votre-domaine` et pointez sa racine sur le dossier `public/` du projet, par exemple `/home/<compte>/sospharma-api/public`. Activez le certificat SSL (AutoSSL / Let's Encrypt) et forcez le HTTPS.
2. **Version de PHP.** Dans cPanel › Sélecteur de version PHP, choisissez **PHP 8.3 ou plus** pour ce domaine et cochez `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `zip`. Vérifiez en SSH que `php -v` donne bien la même version : sinon, appelez le binaire complet, par exemple `/usr/local/bin/php83` ou `ea-php83`, selon ce qu'indique o2switch.
3. **Base MySQL.** Dans cPanel › Bases de données MySQL, créez une base et un utilisateur par environnement (test, production) et donnez tous les droits à l'utilisateur sur sa base.
4. **Code.** En SSH :
   ```bash
   cd ~ && git clone <dépôt> sospharma-api && cd sospharma-api
   composer install --no-dev --optimize-autoloader
   cp .env.example .env && nano .env      # APP_ENV=production, APP_DEBUG=false, APP_URL=https://api…, DB_*, SOSPHARMA_ADMIN_URL, CORS_ALLOWED_ORIGINS, MAIL_*
   php artisan key:generate
   php artisan migrate --force
   php artisan config:cache && php artisan route:cache && php artisan event:cache
   ```
   Ne lancez **pas** `db:seed` en production : il refuse de toute façon. Créez le premier compte admin avec `php artisan tinker`, puis invitez les autres comptes depuis le back-office.
5. **Droits.** `storage/` et `bootstrap/cache/` doivent être accessibles en écriture par PHP (`chmod -R 775 storage bootstrap/cache`).
6. **Tâche cron** (cPanel › Tâches cron), toutes les minutes :
   ```
   * * * * * cd /home/<compte>/sospharma-api && php artisan schedule:run >> /dev/null 2>&1
   ```
   Remplacez `php` par le binaire 8.3 si besoin. Le planificateur décide ensuite quoi lancer : notification du samedi, sauvegarde à 02:30, purge des jetons expirés.
7. **Sauvegardes hors serveur.** `sauvegarde:base` écrit dans `storage/app/private/sauvegardes`, avec 14 jours de rétention. Copiez régulièrement ce dossier ailleurs : cPanel › Sauvegarde (JetBackup), `rsync` depuis une autre machine, ou stockage externe.
8. **Mises à jour.**
   ```bash
   php artisan down
   git pull
   composer install --no-dev --optimize-autoloader
   php artisan migrate --force
   php artisan optimize:clear && php artisan config:cache && php artisan route:cache && php artisan event:cache
   php artisan up
   ```
   Pendant `down`, l'API répond `503 MAINTENANCE` dans l'enveloppe standard.
9. **Contrôle.** `https://api…/up` doit répondre 200, et `https://api…/api/v1/pays` doit renvoyer l'enveloppe. `https://api…/docs/api` demande l'e-mail et le mot de passe d'un compte admin.

## Décisions

Les choix faits sans pouvoir demander, à valider :

1. **Laravel 13 / PHP 8.3**, d'après le squelette officiel (`laravel/laravel`, branche par défaut). Sanctum `^4.3`, Scramble `^0.13.49`, Pest `^4.7` avec `pest-plugin-laravel ^4.1`. Pest 5 exige PHP 8.4, d'où Pest 4.
2. **Identifiants publics** aléatoires et non devinables : préfixe et 10 caractères (`ph_k3x9m2q7ab`), plutôt qu'un numéro séquentiel comme `ph_0142`. Préfixes : `vi` ville, `zo` zone, `sg` secteur, `ph` pharmacie, `tg` tour, `ga` garde, `si` signalement, `ms` message, `ap` appareil, `en` envoi, `co` compte. Les pays sont identifiés par leur code ISO (`CI`). Les données de test ont des identifiants lisibles (`vi_abj`, `ph_test01`, `tg_test_semaine`).
3. **Table `users`** enrichie (`id_public`, `nom`, `role`, `ville_id`, `actif`, `derniere_connexion_le`), qui tient le rôle de la table `comptes`. Le modèle `User` est dans le module Comptes.
4. **Pas de clé étrangère entre modules indépendants** : `users.ville_id`, `signalements.appareil_id`, `messages_support.appareil_id` et `traite_par` sont de simples colonnes indexées. Les autres liens ont leur clé étrangère.
5. **`pharmacies.ville_id` dénormalisé** (déductible de la zone), pour filtrer vite par ville. Si aucune zone n'est donnée, elle est détectée depuis la position ; à défaut, la ville est obligatoire et la pharmacie n'a pas de zone.
6. **Contours.** On stocke une géométrie GeoJSON (Polygon/MultiPolygon, `[lng, lat]`), le rectangle englobant (4 colonnes indexées) et le centre, recalculés à chaque enregistrement. Le cache Laravel garde un contour par zone ; il est vidé quand la zone change, comme la configuration des pays.
7. **Téléphones au format E.164** (`+2250102030405`), pour les liens `tel:` et `wa.me` côté app.
8. **Statut et gardes.** Une garde couvre `[debut, fin[`. Seuls les tours `publie` et `actif` comptent. La prochaine ouverture est cherchée sur 8 jours.
9. **`/gardes/en-cours`** renvoie les pharmacies de garde d'abord, puis par distance (si `lat`/`lng`) et par nom. Il renvoie aussi la date de la dernière confirmation, et 404 `NOT_FOUND` s'il n'y a aucun tour en cours.
10. **Contrôle d'un tour.** Problèmes bloquants pour la publication : chevauchement (→ 409 `CONFLICT`), pharmacie désactivée ou d'une autre ville, garde hors période, tour vide (→ 422). Simple avertissement : nuit sans garde, testée à 02:00 heure locale. Un tour sans secteur chevauche tous les secteurs de la ville.
11. **Publication** : transaction avec verrou, puis `TourGardePublie` émis après validation de la transaction. Le listener est synchrone : pas de worker de file d'attente sur un mutualisé.
12. **Notification du samedi.** Le listener crée un `envoi_notification` programmé au samedi suivant à 08:00, heure locale de la ville. Si la publication a lieu un samedi après 08:00, l'envoi part tout de suite. La commande passe toutes les 15 minutes le samedi entre 05:00 et 13:00 UTC, ce qui couvre les fuseaux et les nouveaux essais. Une panne d'Expo est journalisée et l'envoi est reporté de 15 minutes, au plus 5 fois. La position atteinte (`curseur_appareil_id`) est gardée pour ne pas renvoyer deux fois le même message. Les jetons `DeviceNotRegistered` passent à `null`. Le texte est « 6 pharmacies de garde près de Cocody cette semaine », avec repli sur la ville.
13. **Appareils.** `POST /appareils` (avec `identifiant_anonyme`, un UUID de l'app) renvoie un jeton `dev_…` montré une seule fois, stocké haché en SHA-256 et envoyé ensuite dans `X-Device-Token`. Un réenregistrement avec le même identifiant remet un nouveau jeton. Un jeton absent ou inconnu sur une route d'appareil donne 401 `UNAUTHENTICATED` : l'app doit alors réenregistrer l'appareil. `DELETE /appareils/moi` coupe les notifications mais garde les favoris.
14. **Favoris** dans le module Notifications, propriétaire de la table `appareils`. Le document parle d'un « module Profil » sans module API correspondant.
15. **Rôles.** L'éditeur de ville lit et corrige les fiches de sa ville (le document dit « L'éditeur corrige la fiche ») ; la création, la désactivation et l'import des pharmacies restent réservés à l'admin. Les zones : l'admin partout, l'éditeur dans sa ville ; l'import GeoJSON est réservé à l'admin. Le support est visible par toute l'équipe.
16. **`verifiee_le`** : mise à jour quand le pharmacien modifie sa fiche ou ses horaires, et quand l'équipe envoie `verifiee: true` ou remplace les horaires.
17. **Limiteurs de débit.**
    - API générale : 120 par minute (par compte ou par IP).
    - Connexion et mot de passe : 5 par minute (e-mail + IP).
    - Signalements : 5 par jour et par appareil (ou par IP sans appareil), plus 20 par jour par IP.
    - Messages et captures : 10 par jour et par appareil, plus 40 par jour par IP.
    - Enregistrement d'appareil : 20 par heure par IP.
18. **Documentation `/docs/api`.** Libre en `local`. Ailleurs, authentification HTTP Basic d'un compte admin actif, puis gate `viewApiDocs`. L'API étant sans session, le middleware `RestrictedDocsAccess` de Scramble ne peut pas voir un jeton Sanctum.
19. **Sanctum** en jetons Bearer uniquement (`stateful` et `guard` vides), expiration à 30 jours, purge quotidienne.
20. **Brouillons de tour** supprimés pour de vrai, car jamais publiés. Un tour publié ne se supprime ni ne se modifie (409).
21. **Captures** dans `storage/app/private/support/captures` (disque `local`), servies par une route d'équipe.
22. **Tests** dans `tests/{Unit,Feature,Architecture}` plutôt que dans `app/Modules/*/tests` : configuration Pest et PHPUnit plus simple. Les fichiers sont nommés par module.
23. Fichiers front-end du squelette supprimés (Vite, `resources/`, `package.json`), ainsi que `AGENTS.md` et `CLAUDE.md` (instructions Laravel Boost) et les workflows GitHub de Laravel. Ils sont remplacés par `.github/workflows/tests.yml`.
24. **Messages de validation** en français : `lang/fr/validation.php` (règles utilisées) et `lang/fr/passwords.php`.

**Assurances multiples et relevés terrain** (deuxième lot) :

25. **Référentiel par pays** (`assurances`, préfixe `as`) ; `slug` unique par pays, déduit du nom s'il n'est pas donné, et stable (il ne change que sur demande explicite) car l'app l'utilise dans `filter[assurances]`. `DELETE` désactive : les liens restent en base mais l'assurance disparaît de l'app, des filtres et de `accepte_mes_assurances`.
26. **Lien pharmacie ↔ assurance** dans `pharmacie_assurances` (pivot `PharmacieAssurance` : `tiers_payant`, `remarque`, `verifiee_le`). Une pharmacie n'accepte que des assurances actives **de son pays** (contrôlé à chaque écriture, sinon 422). `verifiee_le` du lien passe à maintenant à chaque remplacement. Quand le pharmacien remplace ses assurances, sa fiche passe aussi « vérifiée » (comme pour ses horaires, décision 16).
27. **Ancien champ texte `pharmacies.assurances`** supprimé par une migration propre : chaque nom est rapproché du référentiel par son slug ; sans correspondance, il devient une **proposition** `source = migration` en attente. Le `down()` remet les noms des assurances liées dans le champ texte. L'import CSV attend désormais des **slugs** dans la colonne `assurances` (`cmu|mugef-ci`) ; un slug inconnu est une erreur de ligne.
28. **« Mes assurances » de l'appareil** dans `appareil_assurances`, table du module Pharmacies (propriétaire du référentiel), sans clé étrangère vers `appareils` (module Notifications, décision 4). Les routes `/appareils/moi/assurances` sont déclarées dans Pharmacies avec le middleware `appareil` de Notifications (alias de route, sans import PHP). Les routes publiques des pharmacies et `/gardes/en-cours` passent par `appareil.optionnel` : un jeton absent ou inconnu ne bloque rien, `accepte_mes_assurances` vaut alors `null`. Les assurances de l'appareil sont lues une seule fois par requête (attribut de requête).
29. **Assurances absentes** : table `propositions_assurance` (préfixe `pa`, statut `en_attente|acceptee|rejetee`, source `releve|pharmacien|migration`). Un nom qui a déjà le slug d'une assurance active du pays est relié directement à la pharmacie au lieu d'être proposé ; un nom déjà proposé et en attente pour la même pharmacie est ignoré. À l'acceptation, l'admin choisit une assurance existante (`assurance`) ou en crée une (`type`, `nom`, `slug`), et la pharmacie d'origine y est reliée. Les propositions d'un relevé ne sont créées qu'**à sa validation** (pas pour un relevé rejeté).
30. **Rôle `agent_terrain`** dans `Commun\Securite\Role` ; `users.role` devient une chaîne (valeurs contrôlées par l'enum PHP) pour ne pas avoir à modifier une énumération SQL à chaque rôle. Villes de l'agent dans `compte_villes` (module Comptes, `ville_id` sans clé étrangère, décision 4), exposées par `CompteAvecRole::villesAutorisees()` (éditeur : sa ville ; agent : ses villes ; autres : aucune). `POST/PATCH /admin/comptes` acceptent `villes: [vi_…]`, obligatoire pour un agent.
31. **Ville d'un relevé** : celle de la pharmacie pour une mise à jour ; sinon la ville de la commune qui contient la position ; sinon `ville` envoyée par l'app ; sinon 422. L'agent n'agit que dans ses villes (`RelevePolicy`, 403 sinon) ; retirer une ville à un agent lui ferme aussi ses relevés en cours dans cette ville.
32. **Idempotence** : clé unique `(agent, identifiant_client)`. Un renvoi renvoie le relevé existant **sans le modifier**, avec `200` et `meta.deja_recu = true` (`201` à la première réception) ; deux envois simultanés sont départagés par la contrainte unique. Pour corriger un relevé, l'agent passe par `PATCH`, seulement quand l'équipe l'a mis « à corriger » ; il repart alors en « envoyé ».
33. **Doublons à 100 m** (`DetectionDoublons`) : rectangle `Distance::rectangle` lu par le contrat de Pharmacies, puis `Distance::metres` (haversine) de Commun. Utilisés par `GET /agent/pharmacies/proches` (rayon 100 m au plus) et dans le détail d'un relevé côté équipe.
34. **Photos** : une par type, privées dans `storage/app/private/releves/{re_…}/` (disque `local`), servies à l'équipe par une route dédiée. Chaque image est **réencodée avec GD** (ou Imagick à défaut), ce qui retire EXIF, XMP et IPTC, dont la position ; l'orientation EXIF est d'abord appliquée aux pixels. Vérifié avec PHP 8.3 et GD sur un JPEG de test portant une orientation et une position GPS : plus aucune donnée EXIF après réencodage, et l'image est bien tournée. Sans GD ni Imagick, l'image est gardée telle quelle, l'événement est journalisé et `metadonnees_supprimees = false`. JPEG et WebP sont réencodés en qualité 85 ; pas de redimensionnement côté serveur (l'app réduit à 1 600 px).
35. **Validation** (`ValidationReleves`) dans une seule transaction avec verrou : création ou mise à jour de la fiche **par le contrat** `EditionFichesPharmacies` (champs, horaires et assurances remplacés s'ils sont fournis, `verifiee_le` à maintenant, commune recalculée depuis la position), propositions d'assurances, copie publique de la façade dans `storage/app/public/pharmacies/facades` (champ `pharmacies.photo_facade`, URL dans `photo_facade` des ressources), puis statut, `traite_par`, `traite_le` et, pour une mise à jour, l'instantané `fiche_avant`. En cas d'échec, la copie publique est supprimée ; l'ancienne photo publique n'est supprimée qu'après la validation de la transaction. L'équipe peut envoyer des `corrections` (même format que `champs`), gardées à part des champs de l'agent. Pour une mise à jour, la position relevée sur place remplace celle de la fiche.
36. **Statuts** : `envoye → valide | a_corriger | rejete`, `a_corriger → envoye` (correction de l'agent) `| rejete`. Toute autre transition donne `409 CONFLICT`. La file de l'équipe montre par défaut les relevés « envoyés », du plus ancien au plus récent.
37. **Limites** : 200 relevés par jour et par agent (limiteur `releves`, sur `POST /agent/releves`) et 1 000 photos par jour (`releves-photos`), lus dans `config/sospharma.php`. Le limiteur compte aussi les renvois idempotents : une file hors ligne de quelques dizaines de relevés reste loin de la limite.
38. **Relevés dépend aussi de Comptes** (nom de l'agent et de la personne qui a traité, `filter[agent]`), comme Signalements. Le document ne cite que Territoire et Pharmacies.
39. **Propositions des usagers = relevés d'origine « public »** : même table, même file, même validation. `agent_id` devient facultatif et `appareil_id` est ajouté sans clé étrangère (la table `appareils` appartient à Notifications). La migration du socle a été modifiée directement plutôt que par une migration d'altération, la base n'étant pas encore en production.
40. **Fiabilité calculée, pas stockée** : acceptées et refusées sont comptées dans `releves` (`ReceptionPropositions::fiabilite`), pour que Relevés n'écrive pas dans la table `appareils` du module Notifications. Le document d'architecture parle de colonnes sur `appareils` : à aligner.
41. **Push à la décision par événement** : `PropositionTraitee` (Relevés) est écouté par Notifications, comme `TourGardePublie`. La règle d'architecture « aucun module ne dépend de Relevés » admet désormais ses événements. Envoi synchrone et non bloquant (une panne d'Expo est journalisée).
42. **Une proposition ne passe jamais « à corriger »** (409) : l'usager n'a pas d'écran pour corriger. L'équipe complète l'adresse dans les `corrections` (obligatoire pour créer la fiche), fusionne avec une pharmacie existante (`fusionner_avec`), ou rejette avec un motif montré dans « Mes propositions ».
43. **Présence sur place** : le téléphone envoie le repère et sa position GPS ; plus de 100 m d'écart → 422. L'écart est gardé dans `ajustement_m`.
44. **Vérification avant envoi** : l'app interroge `GET /pharmacies/proches?rayon=100` (route publique existante) et montre les pharmacies connues avant d'envoyer. Si l'usager répond « Non, c'est une autre », leurs identifiants partent dans `doublons_ecartes` ; le détail admin marque chaque doublon possible `ecarte_par_usager`. Pas de nouvelle route : la recherche publique suffit.

**Alignement avec l'app** (24 oct.) :

45. **`slug` dans les assurances des pharmacies** (listes, fiche, gardes, favoris) : c'est la valeur des filtres de l'app (`filter[assurances]=cmu,mugef-ci`) et de « Mes assurances ».
46. **`garde.jusqua`** : heure locale de fin (« 02:00 ») quand la garde s'arrête avant le matin suivant (08:00 locale, `StatutPharmacie::HEURE_MATIN`), `null` quand elle couvre toute la nuit. Calculé par la règle de statut, qui connaît le fuseau du pays.
47. **Cache de la configuration des pays** : il ne garde que des tableaux de colonnes, les modèles sont reconstruits à la lecture. Laravel 13 refuse de désérialiser des objets (`cache.serializable_classes` à `false`) : avec des modèles en cache, `GET /pays` répondait 500 dès le deuxième appel. Les tests utilisaient un cache qui ne sérialise pas ; un test force désormais la sérialisation.
48. **Champs pour l'app hors connexion** : chaque pharmacie des listes, de la fiche, des gardes et des favoris renvoie `ville` (`{id, nom}`), `horaires`, `gardes` (la garde en cours, `[{debut, fin}]`) et `ferme_a` (heure locale de fermeture si ouverte selon ses horaires, sinon `null`). L'app recalcule le statut sans réseau avec la même règle (`cas-statut.json`).
49. **Pays et villes pour l'app** : `GET /pays` renvoie `resume` (« Abidjan ouvert, autres villes bientôt », calculé depuis les villes actives et gardé dans le cache de la configuration) et `support` (`{whatsapp, telephone, email}`, colonnes `support_*` de `pays`, saisies par `POST/PATCH /admin/pays` au format E.164 ; vides tant que l'équipe ne les a pas renseignées). `GET /pays/{code}/villes` renvoie `nombre_communes`.
50. **Langue des réponses** (28 oct.) : le middleware `DefinirLangue` choisit le français ou l'anglais d'après `Accept-Language` (français par défaut et pour toute autre langue, quelle que soit `APP_LOCALE`) et renvoie `Content-Language`. Les messages restent écrits en français dans le code ; `ApiResponse::error` les traduit avec `lang/en.json` (clé = phrase française), y compris les messages par champ. Une phrase absente de `en.json` reste en français. Les messages de validation du framework existent déjà en anglais ; `lang/en/validation.php` ne fait que nommer les champs. Le résumé du pays est construit à chaque requête : le cache ne garde que les villes. Les tests envoient `Accept-Language: fr`, comme l'app.


**Données réelles** (31 oct.) :

51. **Import OpenStreetMap** (`pharmacies:importer-osm`) : 1 000 pharmacies en Côte d'Ivoire dans OSM au 31 oct. 2026, dont 96 % avec un nom mais 3 % avec un téléphone et 3,5 % avec des horaires. L'import crée des fiches non vérifiées (`verifiee_le` nul, adresse « Adresse à vérifier » si OSM n'en a pas), rattachées à la commune qui contient le point ; un point hors des communes connues est ignoré. Colonne `osm_id` (« n123 », « w456 ») : une relance met à jour les fiches importées tant qu'elles ne sont pas vérifiées, et rattache une fiche existante à moins de 80 m dont le nom concorde au lieu de la dupliquer (ses valeurs saisies priment). Licence ODbL : mention « © les contributeurs d'OpenStreetMap » et base dérivée sous la même licence si elle est redistribuée.
52. **Statut `inconnue`** (31 oct.) : une pharmacie sans garde en cours, sans 24h/24 et sans aucune plage horaire n'est plus « fermée » mais `inconnue` ; l'app affiche « Horaires à confirmer » et conseille d'appeler. C'est le cas des fiches importées d'OpenStreetMap tant qu'un agent n'a pas relevé leurs horaires. Elle sort du filtre « Ouvertes » (`filter[statut]=ouverte,garde`) mais reste dans « Toutes » ; `filter[statut]=inconnue` la retrouve. Cas ajouté à `cas-statut.json`, partagé avec l'app.

53. **Temps de trajet en voiture** (31 oct.) : `GET /pharmacies/{id}/trajet` interroge l'API Routes de Google (`computeRoutes`, voiture, trafic compris si `GOOGLE_ROUTES_TRAFIC`) et renvoie `{voiture: {minutes, distance_m}, source: "google"}`. Sans `GOOGLE_ROUTES_API_KEY`, ou si Google ne répond pas, `voiture` vaut `null` et l'app garde son estimation par la distance. Le départ est arrondi à 3 décimales (environ 100 m) : la position exacte de l'usager ne part pas chez Google, et deux demandes voisines partagent la même réponse, gardée 10 minutes (cache temporaire permis par Google, aucun stockage durable). Limite de 30 appels par heure et par appareil. Clé à restreindre à l'API Routes et à l'adresse IP du serveur, avec un quota journalier dans la console Google Cloud.

## Incohérences relevées dans le document d'architecture

1. **Version de PHP** : « PHP 8.2 ou plus », alors que la version stable récente de Laravel (13) exige PHP 8.3. Il faut donc PHP 8.3 ou plus chez o2switch.
2. **Codes d'erreur** : la liste fermée n'a pas de code pour les statuts 405 (méthode) et 413 (fichier trop gros). Ces réponses gardent leur statut HTTP, avec `error.code = BAD_REQUEST`. Il faudrait ajouter un code au document si l'app doit les distinguer.
3. **Suppression des tours** : « pas de suppression réelle des tours », mais la route `DELETE /admin/tours-garde/{id}` doit « supprimer un brouillon ». Choix retenu : suppression réelle du brouillon seulement.
4. **Comptes « ne dépend de rien »**, alors que ce module doit gérer le « lien pharmacien–pharmacie » (`/admin/comptes/{id}/pharmacies`, et la pharmacie rattachée dans `/auth/moi`). Le lien est géré par Pharmacies, et `/auth/moi` passe par un contrat de `Commun`.
5. **Règle de statut dans Pharmacies**, alors qu'elle a besoin des gardes et que Gardes dépend de Pharmacies. Résolu par inversion de dépendance (`SourcePeriodesGarde`).
6. **Compteurs par commune** (`/villes/{id}/zones` « avec compteurs », `/villes/{id}/compteurs`) : routes de Territoire qui demandent des données de Pharmacies et de Gardes. Résolu par `CompteurZones` ; la route `compteurs` est déclarée dans Pharmacies.
7. **Historique des envois** (`GET /admin/notifications/envois` : ville, destinataires, échecs) sans table correspondante dans le modèle de données. La table `envois_notification` a été ajoutée.
8. **`secteurs_garde`** : la table est décrite, mais aucune route ne la gère. Par ailleurs, `admin/zones` crée « une commune ou un secteur », alors que `zones.type` vaut « commune, quartier ». La table, le modèle et le lien depuis les tours (`secteur`) existent, mais il n'y a pas encore de CRUD des secteurs.
9. **Pagination par curseur** : le tableau donne `next_cursor` et `prev_cursor` sans dire s'ils sont dans `meta` ou dans `meta.pagination`. Choix retenu : directement dans `meta`, comme `rayon` et `limite`.
10. **`/pharmacies/recherche`** annoncée en « rayon et limite », alors que la recherche par nom n'a pas de position obligatoire. Seule la limite s'applique (`meta.rayon = null`) ; la distance est donnée si `lat` et `lng` sont fournis.
11. **Ordre de `bbox`** non précisé. Choix retenu : `minLng,minLat,maxLng,maxLat`, l'ordre GeoJSON et MapLibre.
12. **Accès à `/docs/api`** : le document dit « comptes de l'équipe », la commande dit « comptes admin ». Choix retenu : admin.
13. **Notification du samedi** : « envoyée le samedi matin, heure locale de chaque ville » alors qu'il n'y a qu'une tâche planifiée. C'est concilié par la programmation par envoi (décision 12).
14. **Sentry** : le filet global doit envoyer les erreurs à Sentry, mais le paquet ne figure pas dans la liste des dépendances demandées. Il n'est pas installé (voir « À faire »).
15. **Exemple d'identifiant `ph_0142`** : il suggère des numéros séquentiels, donc énumérables. Choix retenu : des identifiants aléatoires (décision 2).
16. **Rayon des doublons** : le parcours de l'app dit « à moins de 50 m », la table des routes « 100 m ». Choix retenu : 100 m au plus côté API (`rayon` réglable de 10 à 100 m) ; l'app peut afficher d'abord les plus proches.
17. **Adresse d'une nouvelle pharmacie** : la fiche d'un relevé (« nom, téléphone, WhatsApp, horaires, 24h/24, services, assurances ») ne cite pas l'adresse, obligatoire dans `pharmacies`. Choix retenu : `adresse` obligatoire pour un relevé de création (un repère suffit : « face au marché »).
18. **Codes d'erreur** : aucun nouveau code n'a été nécessaire. Un relevé déjà traité ou pas « à corriger » donne `CONFLICT` ; trop de relevés donne `TOO_MANY_REQUESTS`, dont la description du document (« Trop de signalements ou de messages ») est à élargir aux relevés ; une précision GPS au-delà de 30 m donne `VALIDATION_FAILED`.
19. **Rôles** : le tableau « Back-office et espace pharmacien » ne liste pas `agent_terrain`, et la table `users` du document (« villes autorisées ») suppose une liste ; elle est dans `compte_villes`.
20. **Assurances du profil** : la route `GET / PUT /appareils/moi/assurances` est dans le tableau « Assurances » (module Pharmacies) alors que l'appareil appartient à Notifications. Résolu par la décision 28.
21. **« Le même mode servira ensuite aux pharmaciens »** : pas encore fait ; les routes `agent/…` sont réservées au rôle `agent_terrain`.

## À faire / non vérifié

**Rien n'a pu être exécuté.** Packagist et les téléchargements GitHub étaient bloqués : pas de `composer install`, pas d'`artisan`, pas de tests lancés. Ce qui a été fait :

- `php -l` sur tous les fichiers PHP, sans erreur ;
- vérification par script que chaque `use App\…` pointe vers un fichier existant ;
- signatures lues dans les sources de Laravel 13.38, Sanctum 4.3, Scramble 0.13.49 et Pest 4.7 ;
- **la règle de statut a été exécutée avec la vraie bibliothèque Carbon sur les 9 cas de `cas-statut.json` : 9/9.**
- deuxième lot (assurances, relevés) : `php -l` et vérification des `use` sur tous les fichiers ; suppression de l'EXIF exécutée avec GD (décision 34). Les nouveaux tests Pest (`AssurancesTest`, `RelevesTest`, architecture) **n'ont pas tourné**.

À faire en premier :

- [ ] `composer install`, puis vérifier que `composer.lock` se résout (versions fixées « au mieux »).
- [ ] `php artisan migrate:fresh --seed` sur MySQL **et** `vendor/bin/pest` (SQLite en mémoire). Corriger ce qui casse : les tests n'ont jamais tourné.
- [ ] `vendor/bin/pint` pour harmoniser le style.
- [ ] `php artisan route:list --path=api/v1` : vérifier les 100 routes `api/v1` (76 du socle, 13 d'assurances, 11 de relevés) et leurs middlewares.
- [ ] `php artisan storage:link` sur o2switch (photos de façade), et vérifier que `APP_URL` donne la bonne URL publique.
- [ ] Migration `users.role` (énumération → chaîne) avec `->change()` : à vérifier sur MySQL/MariaDB **et** SQLite (tests).
- [ ] Ouvrir `/docs/api` et vérifier le rendu de l'extension `EnveloppeApi` : succès enveloppés, réponses d'erreur, schémas `Meta`, `ErreurApi`, `CodeErreur`. Ce que Scramble infère à partir de `ApiResponse::ok()` n'a pas pu être vu. Si `data` sort en `mixed`, ajouter des annotations de retour ou une extension par ressource.
- [ ] Vérifier `scramble:export` et l'option `security_strategy`, puis générer les clients mobile et Angular (voir `openapi-notes.md`).
- [ ] Tester l'envoi Expo Push réel avec un appareil (`POST /admin/notifications/test`), et vérifier l'heure locale du samedi.
- [ ] Tester `sauvegarde:base` sur o2switch : chemin de `mysqldump`, droits, option `--no-tablespaces`. Mettre en place la copie hors serveur.
- [ ] Vérifier sur o2switch le binaire PHP 8.3 en CLI (cron) et le comportement du cache `database` et des verrous `onOneServer`.

Fonctionnel restant :

- [ ] Brancher **Sentry** (`sentry/sentry-laravel`) dans `RenduErreursApi::configurer` (`reportable`), en ajoutant le `request_id` au contexte.
- [ ] CRUD des **secteurs de garde** (`/admin/secteurs-garde`) si le découpage diffère des communes à Abidjan.
- [ ] Remplacer les **contours fictifs** des 13 communes (rectangles approximatifs, marqués « FICTIF ») par les vrais contours, via `POST /admin/zones/import`.
- [ ] Gabarit d'e-mail en français pour l'invitation et la réinitialisation du mot de passe (aujourd'hui, la notification `ResetPassword` de Laravel, en anglais par défaut).
- [ ] Test de bout en bout de la file de notifications (lots de 100, reprise sur panne) avec `Http::fake()`.
- [ ] Faire valider par un juriste la conformité à la loi ivoirienne n° 2013-450 (ARTCI). C'est déjà noté dans le document.
- [ ] **Relevés** : purge des photos privées des relevés rejetés ou anciens (commande planifiée), et suppression de la copie publique quand une pharmacie est désactivée.
- [ ] **Relevés** : vérifier la mémoire PHP d'o2switch pour le réencodage GD d'une photo de 5 Mo (une image de 4 000 × 3 000 px occupe environ 48 Mo décodée) ; ajouter un redimensionnement côté serveur si besoin.
- [ ] **Relevés** : notifier l'agent (push) quand un relevé passe « à corriger » ; aujourd'hui, il le voit dans son suivi.
- [ ] **Relevés** : ouvrir le même mode aux pharmaciens pour leur propre fiche (document, « Règles »).
- [ ] **Assurances** : logos (aujourd'hui un chemin ou une URL saisis à la main, sans route d'envoi de fichier), et réglage du nombre de puces affichées (3, côté app).
- [ ] **Contrat OpenAPI** : vérifier le rendu Scramble des nouvelles ressources (`FichePharmacie` n'est pas exposé ; `DoublonResource` et `ReleveAdminResource::avecDetail` utilisent des tableaux).
