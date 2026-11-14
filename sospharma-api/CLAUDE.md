# SOS Pharma 24 · API

Contexte produit, charte et pièges communs : `../CLAUDE.md`. Référence détaillée : `README.md` (« Décisions », « À faire / non vérifié »).

## Stack
Laravel 13, PHP 8.3, MySQL 8.4 (Laragon en local, base `sospharma`), Sanctum (jetons `sp_`), Scramble (doc OpenAPI), Pest 4. Hébergement mutualisé o2switch, en ligne sur `https://api.oculismanager.com/api/v1`.

## Commandes
| Action | Commande |
|---|---|
| Lancer | `php artisan serve` (http://localhost:8000, doc : `/docs/api`) |
| Tests | `php artisan optimize:clear` puis `vendor/bin/pest` |
| Règles entre modules | `vendor/bin/pest --testsuite=Architecture` |
| Format | `vendor/bin/pint` |
| Routes | `php artisan route:list --path=api/v1` |
| Données de test | `php artisan migrate:fresh --seed` (local seulement) |
| Liste de garde | `php artisan gardes:analyser-liste fichier.txt`, puis `gardes:importer-liste fichier.txt --simulation` |
| Contrat OpenAPI | `php artisan scramble:export` (voir `openapi-notes.md`) |

## Conventions
- Suivre le skill `standard-api` (REST strict, format de réponse unique, logs, tests de bout en bout).
- Monolithe modulaire : `app/Modules/<Module>/{Http/{Controllers,Requests,Resources},Models,Services,Policies,Exceptions,database/migrations,routes.php}` + `XxxServiceProvider` déclaré dans `bootstrap/providers.php`. Partagé : `app/Commun` (n'importe aucun module).
- Sens des dépendances : Territoire ← Pharmacies ← Gardes ; Signalements, Notifications et Relevés au-dessus ; Comptes et Support isolés. Un module du dessous qui a besoin d'une donnée du dessus déclare une interface dans `Contrats/`. Vérifié par `tests/Architecture/ModulesTest.php`.
- Réponses : `ApiResponse`, erreurs par `ExceptionMetier` + `CodeErreur` (liste fermée). Dates en ISO UTC « Z » (`Commun/Support/Dates`). Identifiants publics préfixés (`ph_…`, `tg_…`).
- Noms en français, messages en français (`lang/`), `declare(strict_types=1)`.
- Toute nouvelle décision se note dans `README.md`, section « Décisions » (numérotée).

## ⚠️ Pièges
- **Les tests peuvent vider la vraie base** : avec une config en cache, `RefreshDatabase` vise MySQL au lieu de SQLite en mémoire (c'est arrivé le 31 oct. 2026). `tests/TestCase.php` arrête les tests dans ce cas ; lancer `php artisan optimize:clear` avant. Si MySQL est éteint, l'étape « cache » de `optimize:clear` échoue (`CACHE_STORE=database`), mais la config est bien vidée.
- **Le seeder crée des comptes et des pharmacies fictifs** : jamais en production (il refuse de tourner en `production`).
- **Ne jamais lancer `migrate:fresh` / `db:wipe`** sur la base locale sans accord : elle contient les imports réels (OSM, listes de garde).
- Un changement fait ici n'atteint l'API en ligne qu'après commit, push et déploiement manuel sur o2switch (README, « Déploiement sur o2switch »).
- La CI (`.github/workflows/tests.yml`) est dans ce sous-dossier : GitHub ne l'exécute pas. Lancer les tests à la main.
- Secrets dans `.env` (non versionné) ; clé Google Routes vide volontairement (temps de trajet inactif).
