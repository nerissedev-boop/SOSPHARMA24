export type {
  ChampsReleve,
  Compte,
  Connexion,
  NouveauReleve,
  PharmacieProche,
  Releve,
  StatutReleve,
  TypePhotoReleve,
  TypeReleve,
} from '@/commun/api';

/** Photo prise sur le téléphone, déjà réduite (1 600 px) et recompressée (sans données EXIF). */
export type PhotoLocale = { uri: string; largeur: number; hauteur: number };

/** Position validée à l'étape 1. */
export type PositionReleve = {
  latitude: number;
  longitude: number;
  /** Précision GPS annoncée par le téléphone, en mètres. */
  precision_m: number;
  /** Écart entre la position GPS et le repère ajusté à la main, en mètres. */
  ajustement_m: number;
};

/** État affiché dans « Mes relevés » : file locale (à envoyer) ou statut de l'API. */
export type EtatAffiche = 'a_envoyer' | 'envoye' | 'valide' | 'a_corriger' | 'rejete';
