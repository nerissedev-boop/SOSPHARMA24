# SOS Pharma 24 — Document d'architecture produit & technique (V0)
*Préparé comme document de référence CTO / pré-levée de fonds*

---

## 1. Vision produit

**Mission** : Permettre à n'importe quel utilisateur africain, en moins de 30 secondes et même en 2G, de localiser une pharmacie ouverte (notamment de garde), de la contacter, et de s'y rendre — sans friction, sans compte obligatoire pour l'usage critique.

**Pitch** : "Google Maps + Doctolib + Uber" pour les pharmacies, conçu offline-first pour l'Afrique.

**Valeurs produit** : rapidité > exhaustivité, fiabilité > esthétique, simplicité > fonctionnalités.

---

## 2. Architecture technique globale (vue d'ensemble)

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   App Mobile (Expo/RN)  │◄──────►│   API Gateway (NestJS)   │
│  Offline cache (MMKV/   │  REST  │  REST + WebSocket (Gateway)│
│  WatermelonDB/SQLite)   │  + WS  └────────────┬─────────────┘
└─────────────────────────┘                     │
        │  Push (FCM)                           ▼
        │                              ┌──────────────────┐
        │                              │   PostgreSQL +   │
        │                              │   PostGIS (Supabase)│
        │                              └──────────────────┘
        │                                        │
        ▼                                        ▼
┌─────────────────┐                    ┌──────────────────┐
│ Maps provider   │                    │ Redis (cache,    │
│ (Mapbox/Google) │                    │ pub/sub temps réel)│
└─────────────────┘                    └──────────────────┘
```

**Pourquoi cette structure** : séparation claire mobile/API/DB permet de scaler chaque couche indépendamment, et de remplacer un fournisseur (ex: Mapbox → OSM) sans réécrire le mobile.

---

## 3. Architecture mobile React Native

```
app/
 ├─ navigation/        (React Navigation: stack + tabs)
 ├─ screens/
 ├─ components/
 ├─ features/
 │   ├─ pharmacies/
 │   ├─ map/
 │   ├─ chat/
 │   ├─ orders/
 │   └─ notifications/
 ├─ services/          (api client, geoloc, cache, sync)
 ├─ store/             (Zustand ou Redux Toolkit)
 ├─ offline/           (queue de sync, DB locale)
 └─ design-system/
```

**Stack mobile recommandée** :
- Expo (managed → bare si besoin de modules natifs spécifiques) — *pourquoi* : déploiement rapide, OTA updates (Expo Updates), build cloud (EAS), idéal pour itérer vite sur un MVP africain low-budget.
- TypeScript — sécurité de типage, maintenabilité à plusieurs devs.
- React Navigation — standard de facto, performant, bien documenté.
- Zustand (état léger) + React Query (cache serveur/synchronisation) — plus simple et léger que Redux pour une équipe MVP.
- WatermelonDB ou expo-sqlite + MMKV pour stockage offline structuré et rapide.
- Reanimated 3 + Moti pour animations fluides à 60fps même sur low-end.

---

## 4. Architecture backend scalable

**Stack** : NestJS (Node.js + TypeScript) + Prisma ORM + PostgreSQL/PostGIS + Redis + Supabase (auth/storage/realtime de base).

```
backend/
 ├─ src/
 │   ├─ modules/
 │   │   ├─ pharmacies/
 │   │   ├─ users/
 │   │   ├─ orders/
 │   │   ├─ chat/
 │   │   ├─ guard-duty/   (pharmacies de garde)
 │   │   ├─ notifications/
 │   │   └─ geolocation/
 │   ├─ common/ (guards, interceptors, pipes)
 │   ├─ prisma/
 │   └─ main.ts
```

**Pourquoi NestJS plutôt qu'Express pur** : structure modulaire imposée (DI, modules, decorators) → code maintenable à mesure que l'équipe grandit ; écosystème riche (WebSocket gateway natif, validation, guards) ; migration facile vers microservices plus tard.

---

## 5. Architecture temps réel

- **WebSocket Gateway NestJS** (Socket.io) pour : chat utilisateur ↔ pharmacie, statut de commande en direct, alertes de garde.
- **Redis Pub/Sub** pour diffuser les événements entre instances backend (scalabilité horizontale).
- **Présence & disponibilité pharmacie** : heartbeat léger (toutes les 60-120s) plutôt que connexion permanente coûteuse en data → adapté aux connexions africaines instables.

---

## 6. MVP recommandé

**Périmètre MVP (8-10 semaines, 1 ville pilote)** :
1. Détection GPS + carte des pharmacies proches
2. Liste + fiche pharmacie (horaires, contact, itinéraire)
3. Pharmacies de garde (badge + filtre)
4. Appel direct (deep link tel:)
5. Lancement trajet Yango (deep link)
6. Mode offline basique (cache des pharmacies déjà vues)
7. Notifications push de garde (zone géographique)

**Hors MVP (V2+)** : chat temps réel, commande/réservation médicaments, comptes pharmaciens, multi-villes.

---

## 7. Fonctionnalités prioritaires (classement)

| Priorité | Fonctionnalité | Justification |
|---|---|---|
| P0 | Géoloc + carte pharmacies proches | Cœur de la proposition de valeur |
| P0 | Pharmacies de garde | Cas d'usage urgence = différenciateur |
| P0 | Appel direct | Action la plus rapide en urgence |
| P1 | Itinéraire / Yango deep link | Complète le parcours "j'y vais" |
| P1 | Offline cache | Indispensable en Afrique (connexion faible) |
| P1 | Notifications de garde | Rétention + utilité réelle |
| P2 | Chat pharmacie | Engagement, mais demande modération |
| P2 | Réservation médicaments | Monétisation, mais dépend d'intégration pharmacie |

---

## 8. Roadmap V1 → V2 → V3

- **V1 (MVP, 1 ville)** : géoloc, carte, garde, appel, itinéraire, offline basique, push.
- **V2 (3-5 villes)** : chat, réservation/commande simple, comptes pharmaciens (back-office web léger), recherche avancée par molécule, avis utilisateurs.
- **V3 (multi-pays)** : marketplace complet (paiement mobile money), IA de recommandation, programme de fidélité, partenariats labo/distributeurs, API publique pour intégrateurs santé.

---

## 9-12. UX/UI, écrans, navigation, design system

**Écrans principaux** (cohérents avec la maquette fournie) :
1. Splash / Onboarding
2. Permission GPS (écran pédagogique : "Pourquoi on a besoin de votre position")
3. Accueil / Carte (recherche rapide, pharmacies proches, badge "de garde")
4. Détail pharmacie (horaires, stock, contact, bouton appel/chat/itinéraire/Yango)
5. Recherche & filtres (distance, ouvert maintenant, garde, médicament dispo)
6. Chat pharmacie
7. Commande / réservation
8. Notifications (centre + préférences de garde par zone)
9. Profil utilisateur
10. Favoris / historique

**Navigation** : Bottom Tab (Accueil/Carte, Recherche, Notifications, Profil) + Stack pour les détails. Pattern simple, familier, faible courbe d'apprentissage — critique pour utilisateurs peu habitués au digital.

**Design system** :
- Palette : vert pharmacie (confiance/santé) + rouge urgence pour les CTA critiques (cf. logo/maquette).
- Typographie lisible grande taille (accessibilité, utilisateurs stressés/âgés).
- Composants réutilisables : PharmacyCard, StatusBadge (ouvert/fermé/garde), MapMarker, ActionButton (appel/chat/itinéraire).
- Librairie recommandée : Tamagui ou NativeWind (Tailwind pour RN) — perf native + cohérence rapide.

---

## 13. Gestion de la géolocalisation

- `expo-location` : position au foreground, précision "Balanced" par défaut (économie batterie).
- Background location uniquement si nécessaire pour notifications de garde géolocalisées (avec consentement explicite et transparence — `expo-task-manager`).
- Fallback : si GPS indisponible/imprécis → recherche manuelle par ville/quartier.
- Calcul de proximité : requêtes PostGIS `ST_DWithin` / `ST_Distance` côté backend (index GiST) pour rapidité même avec des milliers de pharmacies.

---

## 14. Gestion des pharmacies de garde

- Table `guard_schedules` : pharmacie, date, plage horaire, zone.
- Job planifié (cron NestJS / Supabase Edge Function) qui active/désactive le statut "de garde" automatiquement.
- Notification push géociblée (zone + rayon) à l'activation d'une garde proche de l'utilisateur (avec opt-in).
- Affichage prioritaire (badge rouge) dans liste et carte.

---

## 15. Google Maps vs Mapbox vs OpenStreetMap

| Critère | Google Maps | Mapbox | OpenStreetMap (self-hosted) |
|---|---|---|---|
| Coût | Cher au volume (au-delà du free tier) | Tarif au chargement, plus prévisible | Gratuit (mais coût infra) |
| Données Afrique | Bonnes dans grandes villes, lacunes ailleurs | Bonnes, personnalisable | Variable, communauté locale active dans certains pays |
| Personnalisation visuelle | Limitée | Très forte (styles custom, low-data mode) | Totale |
| Offline | Limité | Bon support offline (tuiles téléchargeables) | Totale maîtrise |
| Poids/perf mobile | Moyen | Optimisé, vector tiles légers | Dépend de l'implémentation |

**Recommandation** : **Mapbox** comme choix MVP — meilleur compromis coût/personnalisation/offline pour le contexte africain (tuiles vectorielles légères = économie de data, mode offline natif). OSM en option de repli pour réduire les coûts à grande échelle (Mapbox utilise d'ailleurs des données OSM).

---

## 16. Intégration Yango (deep linking)

- Génération d'un lien `yango://route?...` ou URL universelle vers l'app Yango avec coordonnées de destination pré-remplies (pharmacie sélectionnée).
- Fallback : si Yango non installé → lien web/Play Store, ou proposer Uber/autre VTC local en option régionale.
- Tracking analytique de clic (mesurer la conversion "trouver → s'y rendre").

---

## 17-19. Offline-first, synchronisation, cache

- **Stockage local** : WatermelonDB (ou SQLite) pour données structurées (pharmacies, horaires) + MMKV pour clés/valeurs rapides (préférences, tokens).
- **Stratégie** : cache-first avec React Query (`staleTime` long pour données pharmacies peu volatiles), synchronisation en arrière-plan dès que la connexion revient.
- **Queue de synchronisation** : actions utilisateur (favoris, commandes) stockées localement puis rejouées au backend dès reconnexion (pattern outbox).
- **Compression** : réponses API en gzip/JSON minifié, pagination stricte, images en WebP basse résolution avec lazy loading.

---

## 20. Notifications push

- Firebase Cloud Messaging (FCM) — gratuit, fiable sur Android (majorité du parc africain).
- Segmentation géographique (topics par zone/ville) pour alertes de garde pertinentes uniquement.
- Throttling pour éviter la fatigue notificationnelle (max X/jour).

---

## 21-22. Recherche intelligente & filtres

- Recherche texte (nom pharmacie, quartier, médicament) avec indexation PostgreSQL `pg_trgm` pour tolérance aux fautes de frappe.
- Filtres combinables : distance, ouvert maintenant, de garde, médicament disponible, note utilisateurs.
- Tri par défaut : proximité + statut (garde/ouvert en premier).

---

## 23-25. Performance, faible connexion, Android low-end

- Bundle JS minimal (Hermes engine activé par défaut sur Expo/RN récents).
- Listes virtualisées (`FlashList` plutôt que FlatList) pour fluidité sur appareils à faible RAM.
- Images optimisées (WebP, CDN avec redimensionnement à la volée).
- Mode "données réduites" : désactivation des tuiles satellite, chargement carte en mode vectoriel léger.
- Tests réguliers sur appareils Android d'entrée de gamme (2-3 Go RAM) via device farm (Firebase Test Lab).

---

## 26-29. Sécurité, authentification, permissions, données santé

- **Auth** : Supabase Auth (email/téléphone + OTP SMS) — adapté car beaucoup d'utilisateurs s'identifient par numéro de téléphone plutôt qu'email.
- **Permissions GPS** : demande contextuelle (jamais au lancement à froid), explication claire de l'usage, fallback si refus.
- **Sécurité API** : JWT + refresh tokens, rate limiting (NestJS Throttler), validation stricte (class-validator), HTTPS obligatoire.
- **Données santé** : chiffrement au repos (PostgreSQL + Supabase encryption), minimisation des données collectées, conformité aux régulations locales de protection des données (ex. lois nationales inspirées du RGPD), consentement explicite pour toute donnée sensible (historique de commandes médicaments).

---

## 30-32. Modèle de données / PostgreSQL / Supabase

**Entités principales** :
- `User` (id, phone, name, role, created_at)
- `Pharmacy` (id, name, location[geography(Point)], address, phone, opening_hours[json], is_guard, rating)
- `GuardSchedule` (id, pharmacy_id, date, start_time, end_time, zone)
- `Medication` (id, name, category, requires_prescription)
- `PharmacyStock` (pharmacy_id, medication_id, available, quantity_estimate)
- `Order` (id, user_id, pharmacy_id, status, items[json], created_at)
- `ChatMessage` (id, conversation_id, sender_type, content, created_at)
- `Notification` (id, user_id, type, payload, read_at)
- `Favorite` (user_id, pharmacy_id)

**PostGIS** : colonne `location geography(Point, 4326)` + index GiST pour requêtes de proximité performantes.

**Pourquoi Supabase en complément** : auth prête à l'emploi, storage (images pharmacies), realtime sur tables Postgres, accélère le MVP sans sacrifier le contrôle (c'est du Postgres standard, donc portable).

---

## 33-35. APIs REST, endpoints, exemple Prisma

**Endpoints clés** :
```
GET  /pharmacies/nearby?lat=&lng=&radius=&filters=
GET  /pharmacies/:id
GET  /pharmacies/guard?zone=
POST /orders
GET  /orders/:id
POST /chat/:pharmacyId/messages
GET  /notifications
PATCH /users/me/preferences
```

**Exemple de modèle Prisma** :
```prisma
model Pharmacy {
  id            String   @id @default(uuid())
  name          String
  phone         String
  address       String
  latitude      Float
  longitude     Float
  isGuard       Boolean  @default(false)
  openingHours  Json
  ratingAvg     Float?   @default(0)
  createdAt     DateTime @default(now())

  guardSchedules GuardSchedule[]
  stocks         PharmacyStock[]
  orders         Order[]

  @@index([latitude, longitude])
}

model GuardSchedule {
  id          String   @id @default(uuid())
  pharmacyId  String
  date        DateTime
  startTime   DateTime
  endTime     DateTime
  zone        String

  pharmacy    Pharmacy @relation(fields: [pharmacyId], references: [id])
}
```
*(Note : pour les requêtes géospatiales avancées, utiliser une vue/raw query PostGIS en complément de Prisma, qui ne supporte pas nativement `geography`.)*

---

## 36-38. Structure de projet & stack technologique

```
sos-pharma-24/
 ├─ apps/
 │   ├─ mobile/        (Expo + RN + TS)
 │   └─ api/           (NestJS + Prisma)
 ├─ packages/
 │   ├─ shared-types/  (DTO partagés mobile/back)
 │   └─ design-system/
 └─ infra/             (Docker, migrations, scripts CI/CD)
```

**Stack récapitulative** :

| Couche | Choix | Alternative écartée | Raison |
|---|---|---|---|
| Mobile | Expo + RN + TS | Flutter | Écosystème JS unifié avec le backend, OTA updates, recrutement plus facile en Afrique francophone |
| State | Zustand + React Query | Redux Toolkit | Moins de boilerplate, MVP plus rapide |
| Backend | NestJS | Express pur | Structure, DI, scalabilité d'équipe |
| DB | PostgreSQL + PostGIS | MongoDB | Requêtes géospatiales matures, intégrité relationnelle (commandes, stocks) |
| BaaS | Supabase | Firebase | SQL natif, portabilité, coût prévisible (voir §39) |
| Maps | Mapbox | Google Maps | Coût + offline + personnalisation (voir §15) |
| Cache/Realtime | Redis | — | Pub/sub multi-instance, scalabilité horizontale |

---

## 39. Firebase vs Supabase

| Critère | Firebase | Supabase |
|---|---|---|
| Base de données | NoSQL (Firestore) | PostgreSQL (relationnel + PostGIS) |
| Requêtes géospatiales | Limitées (geohash manuel) | Natives via PostGIS |
| Coût à l'échelle | Peut grimper vite (lectures/écritures) | Plus prévisible (instance Postgres) |
| Verrouillage fournisseur | Fort (NoSQL propriétaire) | Faible (Postgres standard, exportable) |
| Auth | Très mature | Mature, basée sur GoTrue, suffisante |
| Realtime | Très mature | Bon (basé sur réplication Postgres) |

**Recommandation** : **Supabase**, car le cœur métier (proximité géographique, stocks, commandes) est intrinsèquement relationnel et géospatial — Postgres/PostGIS est largement supérieur ici. Firebase reste une option valable uniquement pour FCM (notifications), que l'on peut utiliser indépendamment.

---

## 40. Google Maps vs Mapbox — synthèse décisionnelle
*(détail au §15)* → **Mapbox pour le MVP**, réévaluation possible si un partenariat Google Cloud (crédits startup) devient disponible.

---

## 41. Coûts approximatifs (estimation MVP, ordre de grandeur mensuel)

| Poste | Estimation |
|---|---|
| Supabase (plan Pro) | ~25 $/mois (départ), évolutif |
| Mapbox (forfait usage) | ~0-50 $/mois selon volume MVP |
| Hébergement API (Railway/Render/Fly.io) | ~10-30 $/mois |
| FCM (notifications) | Gratuit |
| EAS Build/Submit (Expo) | Plan gratuit suffisant au début, ~30 $/mois si build fréquents |
| Nom de domaine + SSL | ~15 $/an |
| **Total MVP** | **~100-150 $/mois** |

*Ces coûts restent volontairement bas pour un MVP — l'objectif est de valider la traction avant d'investir dans une infra plus lourde.*

---

## 42-45. Infrastructure, monitoring, analytics, CI/CD

- **Infra** : conteneurisation Docker, déploiement sur Railway/Render/Fly.io (simplicité, coûts maîtrisés) avec migration possible vers AWS/GCP à l'échelle.
- **Monitoring** : Sentry (erreurs mobile + backend), Grafana/Prometheus ou solution managée (Better Stack) pour les métriques serveur.
- **Analytics produit** : PostHog ou Amplitude (funnels : recherche → visite fiche → appel/itinéraire → conversion).
- **CI/CD mobile** : EAS Build + EAS Submit (Expo) avec pipelines GitHub Actions (lint, tests, build preview à chaque PR).
- **CI/CD backend** : GitHub Actions → tests → build Docker → déploiement automatique.

---

## 46. Déploiement Play Store

- Prioriser **Android** (parc majoritaire en Afrique) avant iOS.
- Compte développeur Google Play (25 $ unique).
- Process : build AAB via EAS → tests internes → fermé → ouvert progressif (rollout %) pour limiter les risques.
- Respect des règles Play Store sur permissions sensibles (localisation) — fournir une politique de confidentialité claire.

---

## 47-48. Scalabilité multi-ville / multi-pays

- Architecture multi-tenant légère dès le départ : chaque pharmacie rattachée à une `city_id`/`country_id`, requêtes filtrées par zone géographique.
- Internationalisation (i18n) prête dès le MVP (langues locales : français, anglais, langues nationales selon pays cibles).
- Gestion des devises et numéros de téléphone localisés.
- Déploiement progressif ville par ville avec onboarding manuel des pharmacies (phase de confiance avant automatisation).

---

## 49-51. Monétisation, business model, partenariats

**Sources de revenus potentielles** :
1. Commission sur commandes/réservations de médicaments.
2. Abonnement premium pour pharmacies (mise en avant, statistiques de visibilité).
3. Publicité ciblée (laboratoires, mutuelles santé) — à introduire prudemment pour ne pas nuire à la confiance.
4. Partenariats avec assurances/mutuelles santé locales.

**Partenariats pharmacies** : programme d'onboarding actif (équipe terrain), incitations early-adopters (visibilité gratuite les 3 premiers mois), formation à l'usage du back-office.

---

## 52-53. Évolutions futures & IA

- Prédiction de disponibilité des médicaments (modèle simple basé sur historique + déclarations pharmaciens).
- Chatbot d'orientation santé (FAQ urgences, premiers gestes) — **avec garde-fous stricts** (ne jamais remplacer un avis médical, redirection systématique vers professionnel).
- Recommandations personnalisées (médicaments récurrents, rappels de traitement).
- Reconnaissance d'ordonnance par photo (OCR) pour accélérer les commandes — V3+, nécessite validation réglementaire.

---

## 54-55. Risques techniques & business

| Type | Risque | Mitigation |
|---|---|---|
| Technique | Données pharmacies obsolètes/incorrectes | Processus de vérification + signalement utilisateur + mise à jour terrain régulière |
| Technique | Connexion instable → mauvaise UX | Offline-first dès le MVP (non négociable) |
| Technique | Charge GPS/carte → coûts/perfs | Cache agressif, requêtes limitées, vector tiles |
| Business | Faible adoption pharmaciens | Programme d'onboarding actif, valeur immédiate (visibilité gratuite) |
| Business | Dépendance à un seul partenaire VTC (Yango) | Architecture de deep-link générique, multi-fournisseurs |
| Réglementaire | Vente en ligne de médicaments encadrée | Collaboration juridique dès la conception du module commande |

---

## 56-57. Recommandations stratégiques & erreurs à éviter

**Recommandations** :
- Lancer dans **une seule ville pilote**, valider la traction, puis dupliquer.
- Prioriser la confiance (données fiables) avant les fonctionnalités avancées (chat, commande).
- Investir tôt dans l'offline-first — c'est un facteur de différenciation décisif en Afrique, pas une option.

**Erreurs à éviter** :
- Construire pour "toutes les villes" dès le départ (sur-ingénierie prématurée).
- Sous-estimer le travail terrain (onboarding manuel des pharmacies est incontournable au début).
- Négliger les tests sur appareils réels low-end (le simulateur ne reflète pas la réalité du marché).
- Vouloir tout faire en V1 (chat + commande + IA) → diluer l'effort et retarder le lancement.

---

## 58-59. Plan de développement & planning réaliste

| Phase | Durée | Contenu |
|---|---|---|
| Cadrage & design | 2 semaines | Spécifications détaillées, maquettes finalisées, modèle de données |
| Setup technique | 1 semaine | Repo, CI/CD, environnements, design system de base |
| Core mobile (carte, géoloc, fiches) | 3 semaines | Écrans P0 |
| Backend core (API pharmacies, garde) | 3 semaines (en parallèle) | Endpoints P0, PostGIS, seed data ville pilote |
| Offline + notifications | 2 semaines | Cache, sync, push |
| Tests, optimisation low-end | 1-2 semaines | Device farm, corrections perf |
| Lancement pilote (1 ville) | 1 semaine | Déploiement Play Store fermé, onboarding pharmacies |
| **Total MVP** | **~12-14 semaines** | |

---

## 60. Équipe technique idéale (MVP)

| Rôle | Nombre | Justification |
|---|---|---|
| Lead/CTO (full-stack senior) | 1 | Architecture, arbitrages techniques, code critique |
| Développeur mobile (RN/Expo) | 1-2 | Vélocité sur l'app, l'élément central du produit |
| Développeur backend (NestJS) | 1 | API, base de données, temps réel |
| Product designer (UX/UI mobile) | 1 (mi-temps possible) | Cohérence du parcours urgence, design system |
| Chargé de partenariats/terrain | 1 | Onboarding pharmacies, données fiables (rôle non-tech mais critique) |

*Une équipe de 4-5 personnes est suffisante pour livrer un MVP solide en ~3 mois ; le rôle terrain est aussi important que les rôles techniques pour la réussite du lancement.*

---

### Synthèse — pourquoi cette architecture est "fundable"
Elle est **pragmatique** (coûts MVP ~100-150$/mois), **scalable** (Postgres/PostGIS + Nest modulaire supportent la croissance multi-ville sans réécriture), **différenciante** (offline-first + UX urgence = barrière à l'entrée pour des concurrents génériques type Google Maps), et **réaliste pour le contexte africain** (low-end Android, connexions faibles, paiements mobiles à anticiper).
