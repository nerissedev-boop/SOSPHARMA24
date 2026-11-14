# SOS Pharma 24 · App mobile

Contexte produit, charte et direction artistique : `../CLAUDE.md`. Règles Expo : `AGENTS.md`. Référence détaillée : `README.md`.

## Stack
Expo SDK 58, React Native 0.88, TypeScript 6, expo-router, Reanimated 4 + worklets, TanStack Query (cache persistant MMKV), Zustand, MapLibre, i18next, Sentry, Jest + Testing Library, Maestro (e2e). Node 22.13 ou plus.

## Commandes
| Action | Commande |
|---|---|
| Lancer | `npx expo start` (development build requis) ; web : `npm run web` |
| Tout vérifier | `npm run verifier` (tsc + eslint + jest) |
| Tests d'un module | `npx jest src/modules/<module>` |
| e2e | `npm run e2e` (Maestro, dossier `e2e/`) |
| Ajouter une dépendance | `npx expo install <paquet>` |
| Types de l'API | `npm run api:generer` |
| Build Android | dans `D:\sp` (voir pièges) ou `npx eas-cli@latest build --profile <profil>` |

## Conventions
- Routes dans `app/` : un fichier d'une ligne qui réexporte un écran de `src/modules/<module>/ecrans/`. Jamais de `src/app/`.
- Modules (`src/modules/`) : gardes, notifications, pharmacies, profil, releves, signalements, support, territoire, urgence. Un module n'importe les autres que par `@/modules/<nom>` ; `src/commun` n'importe aucun module (règle ESLint).
- Design system : `src/commun/ui/` (réutiliser avant de créer), jetons `src/commun/theme/jetons.ts` (mêmes clés jour et nuit, jamais de couleur en dur), typographie `src/commun/theme/typographie.ts`, animations `src/commun/ui/animations.ts` (`DUREES`, `ReduceMotion.System`).
- Textes : `src/commun/lib/i18n/fr.json` **et** `en.json`, vouvoiement. Mettre à jour les tests si un texte change.
- Client d'API : `src/commun/api/` ; adaptateur de démonstration dans `src/commun/api/demo/`.

## ⚠️ Pièges
- **Mode démo** : `EXPO_PUBLIC_API_MOCK=1` (défaut) sert des pharmacies **fictives**. Vérifier le `.env` avant de conclure qu'un écran marche avec la vraie API.
- **`D:\sp` n'est pas un dépôt Git** : copie à chemin court pour compiler Android sous Windows (limite de longueur des chemins). Avant chaque build, vérifier que `D:\sp` n'a pas de modification plus récente, puis y recopier `src/` et `app/` du dépôt. Build : `cd /d/sp/android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease --max-workers=2 -PreactNativeArchitectures=arm64-v8a,x86_64`.
- `android/` est généré (non versionné) : ne pas le modifier à la main, passer par `app.json` ou `plugins/`.
- Les variables `EXPO_PUBLIC_*` finissent dans le bundle : jamais de secret.
- Police Vonca : fichiers absents (repli Urbanist), à récupérer dans les dossiers du site du client puis à déposer dans `assets/fonts/` ; `npm run polices:detecter` régénère `polices-vonca.ts`.
- Le rendu web ne remplace pas un vrai Android d'entrée de gamme (Galaxy A14) pour juger la fluidité.
