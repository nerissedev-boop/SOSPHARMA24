/**
 * Types des données de l'API SOS Pharma 24 (v1), écrits à la main d'après
 * specs/architecture.md (sections Modèle de données, Format des réponses, Routes et CRUD).
 *
 * À REMPLACER par les types générés depuis le fichier OpenAPI de l'API (Scramble) :
 *   OPENAPI_URL=https://api.[domaine]/docs/api.json npm run api:generer
 * qui écrit src/commun/api/schema.genere.ts ; il suffira alors de ré-exporter ici
 * les types `components["schemas"][...]` sous les mêmes noms.
 *
 * Conventions : clés en snake_case, dates ISO UTC avec Z, distances en mètres,
 * durées en minutes, identifiants préfixés (ph_0142), donnée inconnue = null.
 */

/** « inconnue » : aucun horaire connu (fiche importée, pas encore relevée) ; affiché « Horaires à confirmer ». */
export type StatutPharmacie = 'garde' | 'ouverte' | 'fermee' | 'inconnue';

export type NumeroUrgence = {
  code: string;
  libelle: string;
  libelle_court: string;
  description: string;
  numero: string;
  icone: 'ambulance' | 'pompiers' | 'police' | 'autre';
};

export type Pays = {
  code: string;
  nom: string;
  indicatif: string;
  fuseau: string;
  devise: string;
  langues: string[];
  statut: 'ouvert' | 'bientot';
  resume: string | null;
  urgences: NumeroUrgence[];
  support: { whatsapp: string | null; telephone: string | null; email: string | null };
};

export type Ville = {
  id: string;
  pays_code: string;
  nom: string;
  statut: 'ouverte' | 'bientot';
  latitude: number;
  longitude: number;
  nombre_communes: number;
};

export type Zone = {
  id: string;
  ville_id: string;
  nom: string;
  type: 'commune' | 'quartier';
  latitude: number;
  longitude: number;
  nombre_pharmacies: number;
  nombre_gardes: number;
  distance_m: number | null;
};

export type ZoneDetectee = { zone: Zone; ville: Ville; pays_code: string };

export type CompteurCommune = {
  zone_id: string;
  nom: string;
  latitude: number;
  longitude: number;
  nombre_pharmacies: number;
  nombre_gardes: number;
};

export type PlageHoraire = { jour: number; ouverture: string; fermeture: string };
export type PeriodeGarde = { debut: string; fin: string };

export type GardeEnCours = {
  debut: string;
  fin: string;
  /** Heure locale de fin la nuit ("02:00"), null = toute la nuit. */
  jusqua: string | null;
  confirmee_le: string | null;
};

// ---------------- Assurances (référentiel par pays, plusieurs par pharmacie) ----------------

export type TypeAssurance = 'publique' | 'mutuelle' | 'privee';

/** GET /pays/{code}/assurances, GET|PUT /appareils/moi/assurances. */
export type Assurance = {
  id: string;
  /** Valeur des filtres : filter[assurances]=mugef-ci,cmu. */
  slug: string;
  nom: string;
  type: TypeAssurance;
  /** URL du logo (champ « logo » de AssuranceResource). */
  logo: string | null;
};

/** Assurance acceptée par une pharmacie (table pharmacie_assurances). */
export type AssurancePharmacie = {
  id: string;
  slug: string;
  nom: string;
  type: TypeAssurance;
  tiers_payant: boolean;
};

export type PharmacieResume = {
  id: string;
  nom: string;
  adresse: string;
  commune: string;
  commune_id: string;
  ville: string;
  latitude: number;
  longitude: number;
  telephone: string | null;
  whatsapp: string | null;
  h24: boolean;
  statut: StatutPharmacie;
  prochaine_ouverture: string | null;
  ferme_a: string | null;
  garde: GardeEnCours | null;
  horaires: PlageHoraire[];
  gardes: PeriodeGarde[];
  assurances: AssurancePharmacie[];
  /** Vrai ou faux si l'appareil a enregistré ses assurances, sinon null. */
  accepte_mes_assurances: boolean | null;
  distance_m: number | null;
  marche_min: number | null;
  /** Photo de façade (relevé terrain validé), présente aussi dans les listes et le tour de garde. */
  photo_url: string | null;
};

export type Pharmacie = PharmacieResume & {
  pays_code: string;
  services: string[];
  verifiee_le: string | null;
  note: { moyenne: number; nombre: number } | null;
};

export type TourGarde = {
  id: string;
  ville_id: string;
  debut: string;
  fin: string;
  confirme_le: string | null;
  pharmacies: PharmacieResume[];
};

export type Appareil = {
  jeton: string;
  ville_suivie: string | null;
  commune_defaut: string | null;
  notification_garde: boolean;
};

export type MotifSignalement = 'fermee' | 'tel' | 'adresse' | 'garde' | 'autre';
export type Signalement = { id: string; pharmacie_id: string; motif: MotifSignalement; cree_le: string };

export type SujetSupport = 'app' | 'pharma' | 'idee' | 'autre';
export type MessageSupport = { id: string; sujet: SujetSupport; cree_le: string };

// ---------------- Comptes et agents terrain (Sanctum) ----------------

export type RoleCompte = 'admin' | 'editeur_ville' | 'pharmacien' | 'agent_terrain';

export type Compte = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: RoleCompte;
  villes: { id: string; nom: string }[];
};

/** POST /auth/connexion. */
export type Connexion = { jeton: string; compte: Compte };

export type TypeReleve = 'creation' | 'mise_a_jour';
export type StatutReleve = 'envoye' | 'valide' | 'a_corriger' | 'rejete';
export type TypePhotoReleve = 'facade' | 'enseigne' | 'horaires';

/** Champs proposés par l'agent (JSON `champs` de la table releves). */
export type ChampsReleve = {
  nom: string;
  /** Adresse ou repère (« face au marché »), obligatoire pour une nouvelle pharmacie. */
  adresse: string;
  telephone: string | null;
  whatsapp: string | null;
  horaires: PlageHoraire[];
  h24: boolean;
  services: string[];
  /** Identifiants publics du référentiel (as_…). */
  assurances: string[];
  /** Noms libres proposés, à valider par l'équipe. */
  assurances_proposees: string[];
};

/**
 * Relevé tel que la file du téléphone le garde. `id` est généré par le téléphone (idempotence) ;
 * il est converti au format de l'API (CorpsReleveApi) au moment de l'envoi.
 */
export type NouveauReleve = {
  id: string;
  type: TypeReleve;
  pharmacie_id: string | null;
  latitude: number;
  longitude: number;
  precision_m: number;
  ajustement_m: number;
  zone_id: string | null;
  champs: ChampsReleve;
  releve_le: string;
};

/** Corps de POST /agent/releves, au format de l'API Laravel (EnregistrerReleveRequest). */
export type CorpsReleveApi = {
  identifiant: string;
  pharmacie?: string;
  latitude: number;
  longitude: number;
  precision_m: number;
  ajustement_m: number;
  releve_le: string;
  champs: {
    nom: string;
    adresse?: string;
    telephone?: string | null;
    whatsapp?: string | null;
    h24: boolean;
    services: string[];
    horaires: PlageHoraire[];
    assurances: { id: string; tiers_payant: boolean }[];
    assurances_proposees: string[];
  };
};

/** Relevé renvoyé par l'API (ReleveResource). */
export type ReleveApi = {
  id: string;
  identifiant: string;
  type: TypeReleve;
  statut: StatutReleve;
  commentaire: string | null;
  ville: { id: string; nom: string } | null;
  position: { lat: number; lng: number };
  precision_m: number;
  ajustement_m: number | null;
  champs: { nom?: string; quartier?: string | null } & Record<string, unknown>;
  photos: { id?: string; type: TypePhotoReleve }[];
  releve_le: string;
  recu_le: string;
  traite_le: string | null;
};

/** Relevé tel que l'app l'affiche (« Mes relevés »), converti depuis ReleveApi. */
export type Releve = {
  /** Identifiant public de l'API (re_…), utilisé pour les photos. */
  id: string;
  /** Identifiant généré par le téléphone. */
  identifiant: string;
  type: TypeReleve;
  pharmacie_id: string | null;
  nom: string;
  commune: string | null;
  statut: StatutReleve;
  commentaire: string | null;
  releve_le: string;
  recu_le: string;
  photos: { type: TypePhotoReleve }[];
};

/** Corps de POST /propositions (usager sans compte) : `identifiant` est généré par le téléphone (idempotence). */
export type NouvelleProposition = {
  identifiant: string;
  /** Repère, éventuellement ajusté à la main. */
  latitude: number;
  longitude: number;
  /** Position du téléphone : 100 m au plus du repère, sinon 422. */
  gps_latitude: number;
  gps_longitude: number;
  precision_m: number;
  releve_le: string;
  nom: string;
  telephone: string | null;
  /** Pharmacies connues à 100 m, montrées avant l'envoi et écartées par l'usager (« Non, c'est une autre »). */
  doublons_ecartes?: string[];
};

export type StatutProposition = 'en_verification' | 'en_ligne' | 'refusee';

/** Proposition vue par l'appareil qui l'a envoyée (« Mes propositions »). */
export type Proposition = {
  id: string;
  identifiant: string;
  statut: StatutProposition;
  nom: string;
  ville: { id: string; nom: string } | null;
  photo_facade_recue: boolean;
  /** Fiche publiée (en ligne seulement). */
  pharmacie_id: string | null;
  motif_refus: string | null;
  envoyee_le: string;
  traitee_le: string | null;
};

/** Doublon possible (GET /agent/pharmacies/proches). */
export type PharmacieProche = PharmacieResume & { verifiee_le: string | null };

export type Pagination = { page: number; per_page: number; total: number; last_page: number };

export type Meta = {
  request_id: string;
  generated_at: string;
  pagination?: Pagination;
  rayon?: number;
  limite?: number;
  nombre?: number;
  tronque?: boolean;
  next_cursor?: string | null;
  prev_cursor?: string | null;
  /** Renvoi idempotent : la ressource avait déjà été reçue (relevés, propositions). */
  deja_recu?: boolean;
};
