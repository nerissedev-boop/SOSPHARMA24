/**
 * Jetons de couleur de la charte SOS Pharma 24 (specs/charte.md).
 * Règle : vert = la pharmacie et les actions ; rouge = la garde, le « 24 » et l'urgence.
 * Palette enrichie (23 oct.) : gammes de vert et de rouge (profond → pâle), neutres chauds (fond sable,
 * cartes blanches) et une couleur de service, l'ocre, réservée aux états intermédiaires
 * (« ferme dans 20 min », « en vérification », « à envoyer »).
 * Les deux thèmes ont exactement les mêmes clés.
 */
export type Jetons = {
  // Marque
  vert: string;
  vertFonce: string;
  vertDegradeClair: string;
  vertTexte: string;
  vertClair: string;
  rouge: string;
  rougeVif: string;
  rougeTexte: string;
  rougeTexteFort: string;
  rougeClair: string;
  /** Gammes : surfaces fortes (bandeau d'accueil, en-tête de fiche) et texte clair posé dessus. */
  vertProfond: string;
  vertTendre: string;
  rougeProfond: string;
  rougeTendre: string;
  /** Ocre : états intermédiaires seulement, jamais décoratif. */
  ocreTexte: string;
  ocrePoint: string;
  ocreClair: string;
  blanc: string;
  // Texte
  texte: string;
  texteSecondaire: string;
  texteTertiaire: string;
  texteSurCouleur: string;
  // Surfaces
  fond: string;
  surface: string;
  surface2: string;
  boutonSecondaire: string;
  boutonSecondaireTexte: string;
  feuille: string;
  /** Cartes des listes et blocs arrondis (charte « cartes », 28 oct.) : blanc le jour, surface sombre la nuit. */
  carte: string;
  /** Carte sous le doigt : teinte verte très pâle qui confirme l'appui (29 oct.). */
  carteAppuyee: string;
  enTeteCarte: string;
  champ: string;
  voile: string;
  // Composants
  navigation: string;
  ongletInactif: string;
  ongletActif: string;
  ongletGardeActif: string;
  ongletUrgenceActif: string;
  filtreFond: string;
  filtreTexte: string;
  filtreSelection: string;
  filtreSelectionTexte: string;
  blocProche: string;
  blocProcheTitre: string;
  blocProcheGarde: string;
  blocProcheGardeTitre: string;
  boutonBlocSecondaire: string;
  pastilleAction: string;
  pastilleActionIcone: string;
  fermeFond: string;
  fermeIcone: string;
  enTeteGarde: string;
  /**
   * Écran Garde, piste A (maquette validée le 11 nov.) : bandeau rouge foncé en tête d'écran, plus
   * sombre la nuit pour ne pas éblouir. Texte blanc 7,9:1 (jour) et 13,5:1 (nuit) ; sous-titre
   * `rougeTendre` 5,7:1 et 7,9:1.
   */
  bandeauGarde: string;
  /** Bouton rond posé sur ce bandeau (blanc translucide, comme la pastille de zone) : icône blanche ≥ 5,5:1. */
  bandeauGardeBouton: string;
  /**
   * Bouton « Itinéraire » et étiquette de la carte « La plus proche de garde » : rouge très pâle le
   * jour, aplat relevé la nuit pour se détacher de la carte sombre. Texte `rougeTexteFort` 5,7:1 et 5,4:1.
   */
  boutonGardeClair: string;
  bandeauInfo: string;
  bandeauInfoTexte: string;
  /** Bandeau « relevés en attente d'envoi » (orange doux de la maquette 23). */
  attenteFond: string;
  attenteTexte: string;
  attenteIcone: string;
  /** Segments inactifs de la barre d'étapes du relevé. */
  etapeInactive: string;
  photoFond: string;
  photoTexte: string;
  /** Devanture dessinée (fiche sans photo) : mur, vitrine et porte, cadre autour. */
  facadeMur: string;
  facadeOuverture: string;
  facadeCadre: string;
  etoile: string;
  bleuPosition: string;
  bleuPositionHalo: string;
  bleuPositionContour: string;
  etiquetteCarte: string;
  etiquetteCarteTexte: string;
  etiquetteSelection: string;
  etiquetteSelectionTexte: string;
  // Écran Urgence (fond rouge, bouton SOS) : contrastes WCAG AA vérifiés dans les deux thèmes.
  /** Fond de l'écran Urgence ; plus sombre la nuit pour ne pas éblouir. */
  sosFond: string;
  /** Texte et icônes posés sur le fond d'urgence. */
  sosTexte: string;
  /** Gros bouton SOS, son texte rouge et sa légende. */
  sosBouton: string;
  sosBoutonTexte: string;
  sosBoutonLegende: string;
  /** Anneaux décoratifs autour du bouton, et halo qui pulse (opacité animée par-dessus). */
  sosAnneauExterieur: string;
  sosAnneauInterieur: string;
  sosHalo: string;
  /** Bandeau « pharmacie de garde la plus proche » et sa pastille ronde. */
  sosBandeau: string;
  sosPastille: string;
  sosPastilleIcone: string;
  /**
   * Gros boutons blancs des numéros d'urgence (piste A, 11 nov.) et leur texte rouge foncé.
   * Contraste du texte : 6,6:1 sur blanc le jour, 5,6:1 sur blanc cassé la nuit.
   */
  sosNumero: string;
  sosNumeroTexte: string;
  /**
   * Bouton « Modifier » posé sur le bandeau vert profond du Profil (piste A) : blanc translucide.
   * Libellé blanc dessus : 7,6:1 le jour, 11,5:1 la nuit.
   */
  profilBandeauBouton: string;
  // Puces et filets posés sur une carte blanche (fiche pharmacie, piste A, 11 nov.).
  // Contrastes WCAG AA vérifiés dans les deux thèmes (texte ≥ 4,5:1 sur ces fonds).
  /** Puce neutre posée sur une carte (assurances) ; texte en `texte` ou `vertTexte`. */
  puceFond: string;
  /** Puce verte douce (statut « ouverte ») ; texte en `vertTexte`. Visible aussi la nuit sur `carte`. */
  puceVerteFond: string;
  /** Puce verte forte (« Accepte votre assurance », vos assurances) et son texte. */
  puceForteFond: string;
  puceForteTexte: string;
  /** Filet de 1 px entre deux lignes d'une carte. */
  separateur: string;
  // Carte (style MapLibre)
  carteFond: string;
  carteRoute: string;
  carteRouteSecondaire: string;
  carteLagune: string;
  carteParc: string;
  carteTexte: string;
  carteTexteEau: string;
  // Ombres
  ombre: string;
};

export const jetonsJour: Jetons = {
  vert: '#1B8A3E',
  vertFonce: '#136B30',
  vertDegradeClair: '#2FA858',
  vertTexte: '#14692F',
  vertClair: '#EEF7F1',
  rouge: '#D32F2F',
  rougeVif: '#E53935',
  rougeTexte: '#C62828',
  rougeTexteFort: '#B71C1C',
  rougeClair: '#FDECEC',
  vertProfond: '#0F3D22',
  vertTendre: '#CFE8D6',
  rougeProfond: '#7F1414',
  rougeTendre: '#F7D4D2',
  ocreTexte: '#8A5300',
  ocrePoint: '#D98E04',
  ocreClair: '#FFF1D6',
  blanc: '#FFFFFF',

  texte: '#1C1F1A',
  texteSecondaire: '#5A5F55',
  texteTertiaire: '#63675E',
  texteSurCouleur: '#FFFFFF',

  fond: '#FBF8F3',
  surface: '#F2EDE4',
  surface2: '#F6F2EB',
  boutonSecondaire: '#F2EDE4',
  boutonSecondaireTexte: '#1C1F1A',
  feuille: '#FFFFFF',
  carte: '#FFFFFF',
  carteAppuyee: '#EEF7F1',
  enTeteCarte: '#FFFFFF',
  champ: '#F2EDE4',
  voile: 'rgba(15,31,23,0.55)',

  navigation: '#FFFFFF',
  ongletInactif: '#5A5F55',
  ongletActif: '#1B8A3E',
  ongletGardeActif: '#B71C1C',
  ongletUrgenceActif: '#B71C1C',
  filtreFond: '#F2EDE4',
  filtreTexte: '#1C1F1A',
  filtreSelection: '#0F3D22',
  filtreSelectionTexte: '#FFFFFF',
  blocProche: '#FFFFFF',
  blocProcheTitre: '#14692F',
  blocProcheGarde: '#FFFFFF',
  blocProcheGardeTitre: '#B71C1C',
  boutonBlocSecondaire: '#EEF7F1',
  pastilleAction: '#EEF7F1',
  pastilleActionIcone: '#1B8A3E',
  fermeFond: '#F2EDE4',
  fermeIcone: '#5A5F55',
  enTeteGarde: '#D32F2F',
  bandeauGarde: '#9E1F1F',
  bandeauGardeBouton: 'rgba(255,255,255,0.18)',
  boutonGardeClair: '#FDECEC',
  bandeauInfo: '#F2EDE4',
  bandeauInfoTexte: '#5A5F55',
  attenteFond: '#FFF1D6',
  attenteTexte: '#8A5300',
  attenteIcone: '#D98E04',
  etapeInactive: '#E6E0D5',
  photoFond: '#2F3A34',
  photoTexte: '#C9D3CD',
  facadeMur: '#F6F2EB',
  facadeOuverture: '#CFC7B8',
  facadeCadre: '#E4DED3',
  etoile: '#F5A623',
  bleuPosition: '#2563EB',
  bleuPositionHalo: 'rgba(37,99,235,0.14)',
  bleuPositionContour: '#FFFFFF',
  etiquetteCarte: '#FFFFFF',
  etiquetteCarteTexte: '#1C1F1A',
  etiquetteSelection: '#0F3D22',
  etiquetteSelectionTexte: '#FFFFFF',

  sosFond: '#D32F2F',
  sosTexte: '#FFFFFF',
  sosBouton: '#FFFFFF',
  sosBoutonTexte: '#D32F2F',
  sosBoutonLegende: '#1C1F1A',
  sosAnneauExterieur: 'rgba(255,255,255,0.08)',
  sosAnneauInterieur: 'rgba(255,255,255,0.12)',
  sosHalo: 'rgba(255,255,255,0.45)',
  sosBandeau: 'rgba(0,0,0,0.18)',
  sosPastille: '#FFFFFF',
  sosPastilleIcone: '#D32F2F',
  sosNumero: '#FFFFFF',
  sosNumeroTexte: '#B71C1C',
  profilBandeauBouton: 'rgba(255,255,255,0.16)',

  puceFond: '#F2EDE4',
  puceVerteFond: '#EEF7F1',
  puceForteFond: '#0F3D22',
  puceForteTexte: '#FFFFFF',
  separateur: '#F2EDE4',

  carteFond: '#EEF1EF',
  carteRoute: '#FFFFFF',
  carteRouteSecondaire: '#FFFFFF',
  carteLagune: '#CFE2EC',
  carteParc: '#D9EADD',
  carteTexte: '#7A867F',
  carteTexteEau: '#6F8FA0',

  ombre: 'rgb(15,31,23)',
};

export const jetonsNuit: Jetons = {
  vert: '#1B8A3E',
  vertFonce: '#136B30',
  vertDegradeClair: '#2FA858',
  vertTexte: '#4CC77A',
  vertClair: '#17211B',
  rouge: '#D32F2F',
  rougeVif: '#E53935',
  rougeTexte: '#FF8A85',
  rougeTexteFort: '#FF8A85',
  rougeClair: '#1F2B23',
  vertProfond: '#0B2416',
  vertTendre: '#A8D5B6',
  rougeProfond: '#5E1010',
  rougeTendre: '#F2B8B5',
  ocreTexte: '#F2C27B',
  ocrePoint: '#C98A12',
  ocreClair: '#2B2214',
  blanc: '#FFFFFF',

  texte: '#E8EFEA',
  texteSecondaire: '#A3B3A9',
  texteTertiaire: '#A3B3A9',
  texteSurCouleur: '#FFFFFF',

  fond: '#0E1511',
  surface: '#17211B',
  surface2: '#1F2B23',
  boutonSecondaire: '#2A382F',
  boutonSecondaireTexte: '#E8EFEA',
  feuille: '#17211B',
  carte: '#17211B',
  carteAppuyee: '#1E3326',
  enTeteCarte: '#0E1511',
  champ: '#17211B',
  voile: 'rgba(0,0,0,0.6)',

  navigation: '#121A15',
  ongletInactif: '#A3B3A9',
  ongletActif: '#4CC77A',
  ongletGardeActif: '#FF8A85',
  ongletUrgenceActif: '#FF8A85',
  filtreFond: '#17211B',
  filtreTexte: '#E8EFEA',
  filtreSelection: '#E8EFEA',
  filtreSelectionTexte: '#0E1511',
  blocProche: '#1F2B23',
  blocProcheTitre: '#4CC77A',
  blocProcheGarde: '#1F2B23',
  blocProcheGardeTitre: '#FF8A85',
  boutonBlocSecondaire: '#2A382F',
  pastilleAction: '#17211B',
  pastilleActionIcone: '#4CC77A',
  fermeFond: '#1F2B23',
  fermeIcone: '#9FB0A6',
  enTeteGarde: '#9E1F1F',
  bandeauGarde: '#5E1010',
  bandeauGardeBouton: 'rgba(255,255,255,0.18)',
  boutonGardeClair: '#2A382F',
  bandeauInfo: '#17211B',
  bandeauInfoTexte: '#C9D6CE',
  attenteFond: '#2B2214',
  attenteTexte: '#F2C27B',
  attenteIcone: '#F2C27B',
  etapeInactive: '#2A382F',
  photoFond: '#1F2B23',
  photoTexte: '#A3B3A9',
  facadeMur: '#2A3530',
  facadeOuverture: '#3A4741',
  facadeCadre: '#17211B',
  etoile: '#F5A623',
  bleuPosition: '#3B82F6',
  bleuPositionHalo: 'rgba(59,130,246,0.18)',
  bleuPositionContour: '#0E1511',
  etiquetteCarte: '#17211B',
  etiquetteCarteTexte: '#E8EFEA',
  etiquetteSelection: '#E8EFEA',
  etiquetteSelectionTexte: '#0E1511',

  sosFond: '#9E1F1F',
  sosTexte: '#FFFFFF',
  sosBouton: '#F3EAE9',
  sosBoutonTexte: '#B71C1C',
  sosBoutonLegende: '#1C1F1A',
  sosAnneauExterieur: 'rgba(255,255,255,0.06)',
  sosAnneauInterieur: 'rgba(255,255,255,0.10)',
  sosHalo: 'rgba(255,255,255,0.30)',
  sosBandeau: 'rgba(0,0,0,0.22)',
  sosPastille: '#F3EAE9',
  sosPastilleIcone: '#B71C1C',
  sosNumero: '#F3EAE9',
  sosNumeroTexte: '#B71C1C',
  profilBandeauBouton: 'rgba(255,255,255,0.12)',

  puceFond: '#24302A',
  puceVerteFond: '#1E3326',
  puceForteFond: '#136B30',
  puceForteTexte: '#FFFFFF',
  separateur: '#24302A',

  carteFond: '#121C17',
  carteRoute: '#24322A',
  carteRouteSecondaire: '#1E2A23',
  carteLagune: '#12293A',
  carteParc: '#16261D',
  carteTexte: '#6E7F75',
  carteTexteEau: '#4F7590',

  ombre: 'rgb(0,0,0)',
};
