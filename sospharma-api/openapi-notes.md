# Contrat OpenAPI : export et génération des clients

L'API publie un contrat **OpenAPI 3.1** généré par [Scramble](https://scramble.dedoc.co) à partir du code : routes, Form Requests et API Resources, sans annotations. C'est le seul lien entre les trois dépôts (`sospharma-api`, `sospharma-mobile`, `sospharma-admin`).

L'extension `App\Commun\Documentation\EnveloppeApi` y ajoute :

- l'enveloppe standard sur toutes les réponses de succès (`success`, `data`, `meta`) ;
- les réponses d'erreur 400, 401, 403, 404, 409, 422, 429, 500 et 503 au format `ErreurApi` ;
- les schémas `Meta`, `ErreurApi` et `CodeErreur` (liste fermée des codes).

## 1. Exporter le fichier JSON

### a) Avec la commande Artisan (recommandé)

La version de Scramble utilisée (0.13.x) fournit la commande `scramble:export` :

```bash
php artisan scramble:export                 # écrit api.json à la racine (config scramble.export_path)
php artisan scramble:export --path=openapi/sospharma-v1.json
```

Faites-le à chaque version de l'API, puis publiez le fichier : release GitHub, ou commit dans un dossier `contrat/` partagé.

### b) Par la route HTTP

- En local : `http://localhost:8000/docs/api.json`
- Ailleurs : la route est protégée par HTTP Basic (compte **admin** actif, gate `viewApiDocs`).

```bash
curl -u admin@sospharma.test:MOT_DE_PASSE https://api.votre-domaine/docs/api.json -o api.json
```

La page lisible est `/docs/api` (Stoplight Elements).

## 2. Générer les clients

### App mobile (Expo, TypeScript + TanStack Query)

Exemple avec [orval](https://orval.dev), qui génère des hooks TanStack Query :

```bash
npx orval --input ../sospharma-api/api.json --output src/commun/api/genere.ts --client react-query
```

Autre possibilité : `openapi-typescript` (types seuls) avec `openapi-fetch`. Le client doit renvoyer un type unique `ApiResult<T>` : il lit `success`, renvoie `data`, et convertit `error.code` (type `CodeErreur` généré) en action côté app.

### Back-office (Angular)

```bash
npx @openapitools/openapi-generator-cli generate \
  -i ../sospharma-api/api.json -g typescript-angular -o src/app/commun/api
```

L'intercepteur HTTP Angular déballe l'enveloppe (`data`) et traite `error` de façon centralisée : 401 renvoie à la connexion, 422 remplit les erreurs de formulaire depuis `error.details`.

## 3. Règles de version

- Routes préfixées par `/api/v1`. Un changement qui casse l'existant ouvre `/api/v2`, et l'ancienne version reste active.
- « Le contrat d'abord » : toute nouvelle donnée commence dans l'API, puis on exporte `api.json` et on régénère les clients.
- La version du contrat vient de `API_VERSION` dans `.env` (`config/scramble.php`, clé `info.version`).

## 4. Points à vérifier (non exécutés lors de l'écriture du socle)

- Rendu réel de l'enveloppe : selon ce que Scramble infère de `ApiResponse::ok()`, `data` peut apparaître en type `mixed`. Si c'est le cas, préciser les types : annotations PHPDoc sur les contrôleurs, ou extension Scramble par ressource.
- Schéma de sécurité Bearer : il est appliqué automatiquement aux routes `auth:sanctum` (`security_strategy` dans `config/scramble.php`).
- L'en-tête `X-Device-Token` des routes d'appareil n'est pas encore décrit dans le contrat. Il faudra l'ajouter dans l'extension si le client généré doit l'envoyer tout seul. Il est désormais **facultatif** sur les routes publiques des pharmacies et `/gardes/en-cours` (il sert à calculer `accepte_mes_assurances`) et **obligatoire** sur `/appareils/moi/assurances` : l'extension devrait le déclarer comme paramètre d'en-tête, facultatif ou obligatoire selon le middleware (`appareil.optionnel` ou `appareil`).
- `accepte_mes_assurances` est `boolean | null` : vérifier que Scramble le génère bien nullable (le type est inféré de `AssurancesAppareil::accepte(): ?bool`).
- Réponses binaires (pas d'enveloppe) : `GET /admin/support/messages/{id}/capture` et `GET /admin/releves/{id}/photos/{photo}`. Scramble peut les décrire en JSON par erreur : les exclure de l'extension `EnveloppeApi` ou annoter leur type `StreamedResponse`.
- `POST /agent/releves` répond `201` (création) ou `200` avec `meta.deja_recu = true` (renvoi idempotent) : le décrire à la main si Scramble ne voit que le `201`.
- `POST /agent/releves/{id}/photos` est en `multipart/form-data` (champ `photo`) : vérifier le schéma généré et le client mobile (envoi d'un fichier depuis Expo).
- Le détail d'un relevé (`comparaison`, `doublons`, `pharmacie`) est construit par `ReleveAdminResource::avecDetail()` à partir de tableaux : Scramble le verra sans doute en `object` libre. Prévoir des annotations si le back-office veut des types précis.
