# SOS Pharma 24 · Back-office

Back-office web de l'équipe (admins et éditeurs de ville), branché sur l'API Laravel `sospharma-api`.

- Angular 21 (composants autonomes, signaux, sans zone.js), Tailwind CSS 4, icônes Lucide.
- Couleurs reprises de l'app mobile (`sospharma-mobile/src/commun/theme/jetons.ts`).
- Textes en français uniquement.

## Lancer

```bash
npm install
npm start              # http://localhost:4200, branché sur l'API locale (php artisan serve --port=8000 dans sospharma-api)
npm run start:enligne  # même chose avec l'API en ligne : données réelles, prudence en écriture
```

| Commande | API utilisée |
| --- | --- |
| `npm start` | locale : `http://localhost:8000/api/v1` |
| `npm run start:enligne` | en ligne : `https://api.oculismanager.com/api/v1` (celle de l'app mobile, données réelles) |
| `npm run build` | en ligne, version de production dans `dist/sospharma-admin/browser` |
| `npm test` | aucune (tests unitaires Vitest) |

Les adresses sont dans `src/environments/` : `environment.ts` (en ligne) et `environment.local.ts`.
Le compte de test du seeder (`admin@sospharma.test`) n'existe qu'en local.

**CORS.** L'API en ligne n'accepte aujourd'hui que l'origine `http://localhost:4200`. Quand le back-office sera hébergé sur un domaine, ajouter ce domaine à `CORS_ALLOWED_ORIGINS` et le mettre dans `SOSPHARMA_ADMIN_URL` dans le `.env` du serveur (puis `php artisan optimize`), sinon le navigateur bloquera tous les appels et les liens de réinitialisation pointeront vers localhost.

## Organisation

```
src/app/
├── noyau/            # client de l'API, session, protections des routes, types, libellés
├── ui/               # coquille (menu), pagination, chargement
└── pages/
    ├── connexion/    # connexion, mot de passe oublié, réinitialisation (lien de l'e-mail)
    ├── tableau-bord/ # compteurs des files d'attente
    ├── pharmacies/   # annuaire, fiche (infos, position, horaires), import CSV (mise à jour ou création)
    ├── gardes/       # tours, fiche d'un tour (contrôle, publication), liste officielle
    ├── signalements/
    ├── support/
    └── comptes/      # admin seulement
```

## Décisions

1. **Jeton Sanctum dans `localStorage`** (`sospharma.jeton`), envoyé en `Authorization: Bearer`. L'API est sans session ni cookie. Un 401 efface le jeton et renvoie à la connexion.
2. **Enveloppe de l'API déballée** dans `ApiService` : les écrans reçoivent `data`, ou `{donnees, pagination}` pour les listes. Les erreurs deviennent des `ErreurApi` avec le premier message de chaque champ.
3. **Paramètres vides retirés** avant l'envoi, car l'API refuse tout paramètre inattendu (`BAD_REQUEST`).
4. **Rôles** : seuls `admin` et `editeur_ville` entrent. Un pharmacien ou un agent terrain est déconnecté avec un message. Les écrans réservés à l'admin dans l'API (comptes, liste de garde officielle) le sont aussi dans le menu et les routes. L'éditeur de ville ne voit pas le filtre par ville : l'API limite déjà ses listes à sa ville.
5. **Liste des villes** lue par les routes publiques `/pays` et `/pays/{code}/villes`, car `/admin/villes` est réservée à l'admin.
6. **Fichiers privés** (capture du support) téléchargés avec le jeton puis affichés depuis la mémoire.
7. **Import de pharmacies** (admin) : choisir la ville (un fichier par ville ; ses communes s'affichent, cliquables pour copier le nom à mettre dans la colonne `commune`) et un CSV, prévisualiser (simulation de l'API, ligne par ligne : à créer, mise à jour avec les champs qui changent, déjà à jour, ambiguë, erreur), puis enregistrer. Les lignes ambiguës ou en erreur sont laissées de côté. Un modèle de fichier se télécharge depuis l'écran.
8. **Liste de garde officielle** : coller le texte, relire (filtre « À relire » par défaut : tout sauf les fiches trouvées sans alerte), simuler, puis importer. L'import ne crée que des brouillons, à contrôler et publier depuis la fiche du tour.

## Fait et vérifié

- Compilation de développement et de production sans erreur (production : 312 ko au chargement).
- 3 tests unitaires du client de l'API (enveloppe, erreurs, jeton et 401).
- Tous les appels des écrans rejoués contre l'API locale le 31 oct. 2026 avec le compte admin de test : connexion, compteurs, listes et filtres, fiche, communes, tour, CORS, analyse et simulation d'import de `tests/Fixtures/liste-garde-interieur.txt`.

## À faire, non vérifié

- **Pas encore regardé dans un navigateur** : la mise en page et les parcours n'ont été vérifiés qu'à la compilation et par les appels réseau.
- Import de pharmacies : simulation essayée sur la base locale (Abidjan) le 31 oct. 2026 ; l'enregistrement n'est vérifié que par les tests de l'API.
- Aucune autre action d'écriture n'a été essayée contre l'API locale : enregistrer une fiche, des horaires, publier un tour, clôturer un signalement, créer un compte, importer pour de vrai.
- Écrans absents : relevés des agents terrain et propositions des usagers, assurances et propositions d'assurances, territoire (pays, villes, communes, import GeoJSON), import CSV des tours, création d'une pharmacie à la main, rattachement pharmacien ↔ pharmacie, journal des notifications.
- Hébergement o2switch : servir `index.html` pour toutes les adresses (règle de réécriture `.htaccess`), sinon un rechargement sur `/pharmacies` donne une 404.
