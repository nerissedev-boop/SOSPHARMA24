/** Libellés français des valeurs renvoyées par l'API. */

export const ROLES: Record<string, string> = {
  admin: 'Administrateur',
  editeur_ville: 'Éditeur de ville',
  pharmacien: 'Pharmacien',
  agent_terrain: 'Agent terrain',
};

export const MOTIFS_SIGNALEMENT: Record<string, string> = {
  fermee: 'Pharmacie fermée',
  pas_de_garde: "N'est pas de garde",
  mauvaise_adresse: 'Mauvaise adresse',
  mauvais_telephone: 'Mauvais téléphone',
  horaires_faux: 'Horaires faux',
  autre: 'Autre',
};

export const STATUTS_SIGNALEMENT: Record<string, string> = {
  nouveau: 'Nouveau',
  traite: 'Traité',
  rejete: 'Rejeté',
};

export const SUJETS_SUPPORT: Record<string, string> = {
  question: 'Question',
  probleme_technique: 'Problème technique',
  donnees_pharmacie: 'Données de pharmacie',
  suggestion: 'Suggestion',
  autre: 'Autre',
};

export const STATUTS_TOUR: Record<string, string> = {
  brouillon: 'Brouillon',
  publie: 'Publié',
};

export const STATUTS_RAPPROCHEMENT: Record<string, string> = {
  trouvee: 'Trouvée',
  a_verifier: 'À vérifier',
  inconnue: 'Inconnue',
};

export const ALERTES_RAPPROCHEMENT: Record<string, string> = {
  ville_inconnue: 'Ville absente de la base',
  autre_ville: 'Fiche trouvée dans une autre ville',
  telephone_corrige: 'Téléphone corrigé à la lecture',
  telephone_illisible: 'Téléphone illisible',
  sans_telephone: 'Sans téléphone',
  telephone_a_ajouter: 'Le numéro complétera la fiche',
  telephone_different: 'Numéro différent de la fiche',
};

export const ETATS_TOUR_IMPORT: Record<string, string> = {
  cree: 'brouillon créé',
  remplace: 'brouillon existant remplacé',
  deja_publie: 'déjà publié, laissé tel quel',
};

export const ORIGINES_TELEPHONE: Record<string, string> = {
  import: 'Import CSV',
  liste_garde: 'Liste de garde',
  osm: 'OpenStreetMap',
  agent: 'Agent terrain',
  admin: 'Équipe',
  pharmacien: 'Pharmacien',
  reprise: 'Ancienne fiche',
};

export const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function libelle(table: Record<string, string>, cle: string | null | undefined): string {
  return cle ? (table[cle] ?? cle) : '—';
}

/** « +2250778681174 » → « 07 78 68 11 74 » (numéros ivoiriens à 10 chiffres) ; un autre pays reste tel quel. */
export function telephoneLisible(numero: string): string {
  const m = numero.match(/^\+225(\d{10})$/);
  return m ? m[1].replace(/(\d{2})(?=\d)/g, '$1 ') : numero;
}
