# SOS Pharma 24 · Back-office

Contexte produit, charte et pièges communs : `../CLAUDE.md`. Référence détaillée : `README.md`.

## Stack
Angular 21 (composants autonomes, signaux, sans zone.js), Tailwind CSS 4 (via `.postcssrc.json`), lucide-angular 1, Vitest. Textes en français uniquement. Hébergement prévu : o2switch (domaine à définir).

## Commandes
| Action | Commande |
|---|---|
| Lancer (API locale) | `npm start` (http://localhost:4200, nécessite `php artisan serve --port=8000` dans `sospharma-api`) |
| Lancer (API en ligne) | `npm run start:enligne` — données réelles |
| Build de production | `npm run build` → `dist/sospharma-admin/browser` (API en ligne) |
| Tests | `npm test` |
| Format | `npx prettier --write <fichier>` |

Adresses de l'API : `src/environments/environment.ts` (en ligne) et `environment.local.ts`.

## Conventions
- `src/app/noyau/` : client de l'API, session, protections des routes, types, libellés ; `src/app/ui/` : coquille, pagination, chargement ; `src/app/pages/<domaine>/`.
- Couleurs : jetons `@theme` de `src/styles.css`, repris de `sospharma-mobile/src/commun/theme/jetons.ts` (vert `marque`, rouge `alerte`, `ocre` pour les états intermédiaires). Classes maison (`champ`, `bouton-principal`…) déclarées en `@utility`.
- Noms en français. Densité et lisibilité des tableaux avant la décoration.

## ⚠️ Pièges
- Tailwind 4 refuse `@apply` d'une classe maison déclarée en `@layer` : la déclarer en `@utility`.
- `LucideAngularComponent` n'est pas autonome : importer `LucideAngularModule` et passer l'icône par `[img]`.
- `npm run start:enligne` et le build de production écrivent dans la vraie base. Faire les essais d'écriture avec `npm start` (API locale).
- CORS en ligne n'autorise que `http://localhost:4200` : à l'hébergement, ajouter le domaine à `CORS_ALLOWED_ORIGINS` et `SOSPHARMA_ADMIN_URL` dans le `.env` du serveur, puis `php artisan optimize`.
