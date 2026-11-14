/** Formats renvoyés par l'API (voir sospharma-api/README.md, « Format des réponses »). */

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Page<T> {
  donnees: T[];
  pagination: Pagination;
}

export interface Reference {
  id: string;
  nom: string;
}

export type Role = 'admin' | 'editeur_ville' | 'pharmacien' | 'agent_terrain';

export interface Compte {
  id: string;
  nom: string;
  email: string;
  role: Role;
  ville: Reference | null;
  villes: Reference[];
  pharmacies: Reference[];
  actif: boolean;
  derniere_connexion_le: string | null;
  cree_le: string | null;
}

export interface Plage {
  jour: number;
  ouverture: string;
  fermeture: string;
}

export interface AssurancePharmacie {
  id: string;
  nom: string;
  slug: string;
  type: string;
  actif: boolean;
  tiers_payant: boolean;
  remarque: string | null;
  verifiee_le: string | null;
}

export interface Pharmacie {
  id: string;
  nom: string;
  adresse: string;
  quartier: string | null;
  ville: Reference | null;
  zone: Reference | null;
  telephone: string | null;
  whatsapp: string | null;
  position: { lat: number; lng: number } | null;
  h24: boolean;
  services: string[];
  photo_facade: string | null;
  assurances: AssurancePharmacie[];
  horaires: Plage[] | null;
  verifiee_le: string | null;
  actif: boolean;
  cree_le: string | null;
  modifie_le: string | null;
}

/** Un numéro d'une fiche (GET admin/pharmacies/{id}/telephones), le principal en premier. */
export interface TelephonePharmacie {
  id: string;
  /** Format international : +2250707123456. */
  numero: string;
  rang: number;
  /** Rang 1 : le numéro du bouton « Appeler » dans l'app. */
  principal: boolean;
  whatsapp: boolean;
  /** Date de la dernière réponse d'une personne, oui ou non ; null : personne n'a encore vérifié. */
  whatsapp_confirme_le: string | null;
  origine: string;
}

export type StatutSignalement = 'nouveau' | 'traite' | 'rejete';

export interface Signalement {
  id: string;
  pharmacie: (Reference & Partial<Pharmacie>) | null;
  motif: string;
  motif_libelle: string;
  precisions: string | null;
  statut: StatutSignalement;
  commentaire: string | null;
  traite_par: Reference | null;
  traite_le: string | null;
  cree_le: string | null;
}

export interface MessageSupport {
  id: string;
  sujet: string;
  message: string;
  contact: string | null;
  a_une_capture: boolean;
  capture_url: string | null;
  statut: 'nouveau' | 'traite';
  traite_le: string | null;
  cree_le: string | null;
}

export interface Garde {
  id: string;
  tour: string | null;
  statut_tour: string | null;
  pharmacie: { id: string; nom: string; zone: string | null } | null;
  debut: string | null;
  fin: string | null;
  confirmee_le: string | null;
}

export interface TourGarde {
  id: string;
  ville: Reference | null;
  secteur: Reference | null;
  debut: string;
  fin: string;
  statut: 'brouillon' | 'publie';
  saisi_par: Reference | null;
  valide_par: Reference | null;
  valide_le: string | null;
  nombre_gardes: number | null;
  gardes: Garde[] | null;
  cree_le: string | null;
}

export interface ProblemeControle {
  type: string;
  message: string;
  bloquant: boolean;
  [cle: string]: unknown;
}

export interface Controle {
  tour: string;
  publiable: boolean;
  problemes: ProblemeControle[];
}

export type ActionListe = 'rattacher' | 'creer' | 'ignorer';

export interface EntreeAnalysee {
  rang: number;
  statut: string;
  action_proposee: ActionListe;
  methode: string | null;
  alertes: string[];
  pharmacie: { id: string; nom: string; telephone: string | null } | null;
  liste: {
    section: string | null;
    nom: string;
    pharmacien: string | null;
    telephones: string[];
    telephones_invalides: string[];
    telephones_corriges: boolean;
    repere: string | null;
    nouvelle: boolean;
    texte: string;
  };
}

export interface AnalyseListe {
  premier_jour: string | null;
  dernier_jour: string | null;
  pharmacies: EntreeAnalysee[];
}

export interface BilanImport {
  premier_jour: string | null;
  dernier_jour: string | null;
  tours: { ville: string; tour: string | null; etat: string; gardes: number }[];
  fiches_creees: number;
  telephones_completes: number;
  adresses_completees: number;
  ignorees: { rang: number; nom: string; raison: string }[];
}

export interface Pays {
  code: string;
  nom: string;
}

export interface Ville {
  id: string;
  nom: string;
}

export interface LigneImportPharmacie {
  ligne: number;
  nom: string;
  action: 'creer' | 'mettre_a_jour' | 'inchangee' | 'ambigue' | 'erreur' | 'retiree';
  pharmacie: Reference | null;
  methode: 'id' | 'telephone' | 'nom' | null;
  changements: string[];
  messages: string[];
  /** Ce qui a été lu dans le fichier (téléphones au format +225…). */
  valeurs?: {
    adresse: string | null;
    quartier: string | null;
    commune: string | null;
    /** Premier numéro lu, le principal. */
    telephone: string | null;
    /** Tous les numéros lus (« / » ou « | » dans la cellule) ; absent des anciennes versions de l'API. */
    telephones?: string[];
    whatsapp: string | null;
    position: { lat: number; lng: number } | null;
    h24: boolean | null;
    services: string[];
    assurances: string[];
  };
  /** Mise à jour : valeur actuelle de la fiche pour chaque champ qui change. */
  avant?: Record<string, unknown>;
}

export interface BilanImportPharmacies {
  simulation: boolean;
  creees: number;
  mises_a_jour: number;
  inchangees: number;
  ambigues: number;
  erreurs: number;
  /** Lignes retirées à la main dans l'aperçu (absent des anciennes versions de l'API). */
  retirees?: number;
  lignes: LigneImportPharmacie[];
}
