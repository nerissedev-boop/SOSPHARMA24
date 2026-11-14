/**
 * Jetons de couleur de la charte SOS Pharma 24 (specs/charte.md).
 * Règle : vert = la pharmacie et les actions ; rouge = la garde, le « 24 » et l'urgence.
 * Palette enrichie (23 oct.) : gammes de vert et de rouge (profond → pâle), cartes blanches et une
 * couleur de service, l'ocre, réservée aux états intermédiaires (« ferme dans 20 min », « en
 * vérification », « à envoyer »).
 * Refonte v2 (14 nov.) : les neutres du jour passent du sable, trop jaune, à une gamme argentée.
 * Le canal vert y est un ou deux points au-dessus des deux autres, pour rester dans la famille du
 * vert de la marque ; rien de commun avec les gris bleutés de Tailwind. La nuit ne change pas.
 * Contrastes WCAG 2.2 du jour (seuil 4,5:1 pour le texte) :
 * - sur `fond` #F3F5F3 : texte 15,2:1 · texteSecondaire 6,2:1 · texteTertiaire 5,4:1 · vertTexte 6,2:1
 *   · rougeTexteFort 6,0:1 · ocreTexte 5,8:1 ;
 * - sur `surface` #E8EBE8 (champs, filtres, puces) : texte 13,9:1 · texteSecondaire 5,6:1
 *   · texteTertiaire 4,9:1 · vertTexte 5,7:1. Aplat sur le fond : 1,1:1, le libellé identifie l'élément ;
 * - sur `carte` #FFFFFF : texteSecondaire 6,8:1 · texteTertiaire 5,9:1 ;
 * - texteSecondaire 6,2:1 sur boutonBlocSecondaire et 5,9:1 sur rougeClair ;
 * - blanc sur `vert` #1B8A3E : 4,42:1, d'où les libellés Appeler et Y aller en 19 px gras
 *   (grand texte au sens WCAG, seuil 3:1).
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
  /** #565D58 le jour (l'ancien sable tirait vers le kaki). */
  texteSecondaire: string;
  /** #5F6661 le jour : icônes et texte discret, 4,9:1 au plus bas (sur `surface`). */
  texteTertiaire: string;
  texteSurCouleur: string;
  // Surfaces
  fond: string;
  /** Champs, filtres, puces, boutons secondaires : un cran sous le fond, sans bordure. */
  surface: string;
  /** Aplat de fond sans texte propre. */
  surface2: string;
  boutonSecondaire: string;
  boutonSecondaireTexte: string;
  feuille: string;
  /** Surfaces des listes et blocs arrondis : blanc le jour, surface sombre la nuit. */
  carte: string;
  /** Ligne ou carte sous le doigt : teinte verte très pâle qui confirme l'appui (29 oct.). */
  carteAppuyee: string;
  enTeteCarte: string;
  champ: string;
  voile: string;
  /** Voile posé sur une photo de façade : aucun le jour, 50 % la nuit (une façade en plein soleil éblouirait). */
  voilePhoto: string;
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
  /** Carte « la plus proche » (Accueil, Garde, Urgence, Carte) : blanche le jour, relevée la nuit. */
  blocProche: string;
  /** Bouton « Y aller » et bouton rond d'appel des listes : vert très pâle le jour. */
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
  /**
   * Bouton posé sur un bandeau foncé (zone, mode nuit, partager) et blocs de chargement de ces
   * bandeaux : blanc translucide, icône blanche ≥ 5,5:1.
   */
  boutonSurFonce: string;
  /** Repères « en attente » (relevés à envoyer, hors connexion) : ocre doux. */
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
  bleuPosition: string;
  bleuPositionHalo: string;
  bleuPositionContour: string;
  etiquetteCarte: string;
  etiquetteCarteTexte: string;
  etiquetteSelection: string;
  etiquetteSelectionTexte: string;
  /** Bandeau de l'écran Urgence ; plus sombre la nuit, et le reste de l'écran reste sombre. */
  sosFond: string;
  /** Texte et icônes posés sur ce bandeau. */
  sosTexte: string;
  // Puces et filets posés sur une carte blanche (fiche pharmacie, piste A, 11 nov.).
  /** Puce neutre posée sur une carte (assurances) ; texte en `texte` ou `vertTexte`. */
  puceFond: string;
  /** Puce verte douce (statut « ouverte ») ; texte en `vertTexte`. Visible aussi la nuit sur `carte`. */
  puceVerteFond: string;
  /** Puce verte forte (« Accepte votre assurance », vos assurances) et son texte. */
  puceForteFond: string;
  puceForteTexte: string;
  /** Filet de 1 px entre deux lignes : 1,3:1 sur carte blanche le jour, décoratif. */
  separateur: string;
  // Carte (style MapLibre)
  carteFond: string;
  carteRoute: string;
  carteRouteSecondaire: string;
  carteLagune: string;
  carteParc: string;
  carteTexte: string;
  carteTexteEau: string;
  /** Halo des pastilles de commune sur la carte dézoomée. */
  carteHaloCommune: string;
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
  texteSecondaire: '#565D58',
  texteTertiaire: '#5F6661',
  texteSurCouleur: '#FFFFFF',

  fond: '#F3F5F3',
  surface: '#E8EBE8',
  surface2: '#EDF0ED',
  boutonSecondaire: '#E8EBE8',
  boutonSecondaireTexte: '#1C1F1A',
  feuille: '#FFFFFF',
  carte: '#FFFFFF',
  carteAppuyee: '#EEF7F1',
  enTeteCarte: '#FFFFFF',
  champ: '#E8EBE8',
  voile: 'rgba(15,31,23,0.55)',
  voilePhoto: 'rgba(0,0,0,0)',

  navigation: '#FFFFFF',
  ongletInactif: '#565D58',
  ongletActif: '#1B8A3E',
  ongletGardeActif: '#B71C1C',
  ongletUrgenceActif: '#B71C1C',
  filtreFond: '#E8EBE8',
  filtreTexte: '#1C1F1A',
  filtreSelection: '#0F3D22',
  filtreSelectionTexte: '#FFFFFF',
  blocProche: '#FFFFFF',
  boutonBlocSecondaire: '#EEF7F1',
  pastilleAction: '#EEF7F1',
  pastilleActionIcone: '#1B8A3E',
  fermeFond: '#E8EBE8',
  fermeIcone: '#565D58',
  enTeteGarde: '#D32F2F',
  bandeauGarde: '#9E1F1F',
  boutonSurFonce: 'rgba(255,255,255,0.18)',
  attenteFond: '#FFF1D6',
  attenteTexte: '#8A5300',
  attenteIcone: '#D98E04',
  etapeInactive: '#D9DED9',
  photoFond: '#2F3A34',
  photoTexte: '#C9D3CD',
  // Le mur passe au blanc pour rester visible sur le cadre (1,3:1) et dans le cercle vert pâle de l'état vide.
  facadeMur: '#FFFFFF',
  facadeOuverture: '#C4CAC4',
  facadeCadre: '#DEE3DE',
  bleuPosition: '#2563EB',
  bleuPositionHalo: 'rgba(37,99,235,0.14)',
  bleuPositionContour: '#FFFFFF',
  etiquetteCarte: '#FFFFFF',
  etiquetteCarteTexte: '#1C1F1A',
  etiquetteSelection: '#0F3D22',
  etiquetteSelectionTexte: '#FFFFFF',

  sosFond: '#D32F2F',
  sosTexte: '#FFFFFF',

  puceFond: '#E8EBE8',
  puceVerteFond: '#EEF7F1',
  puceForteFond: '#0F3D22',
  puceForteTexte: '#FFFFFF',
  separateur: '#DFE3DF',

  carteFond: '#EEF1EF',
  carteRoute: '#FFFFFF',
  carteRouteSecondaire: '#FFFFFF',
  carteLagune: '#CFE2EC',
  carteParc: '#D9EADD',
  carteTexte: '#7A867F',
  carteTexteEau: '#6F8FA0',
  carteHaloCommune: 'rgba(27,138,62,0.18)',

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
  voilePhoto: 'rgba(0,0,0,0.5)',

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
  boutonBlocSecondaire: '#2A382F',
  pastilleAction: '#17211B',
  pastilleActionIcone: '#4CC77A',
  fermeFond: '#1F2B23',
  fermeIcone: '#9FB0A6',
  enTeteGarde: '#9E1F1F',
  bandeauGarde: '#5E1010',
  boutonSurFonce: 'rgba(255,255,255,0.18)',
  attenteFond: '#2B2214',
  attenteTexte: '#F2C27B',
  attenteIcone: '#F2C27B',
  etapeInactive: '#2A382F',
  photoFond: '#1F2B23',
  photoTexte: '#A3B3A9',
  facadeMur: '#2A3530',
  facadeOuverture: '#3A4741',
  facadeCadre: '#17211B',
  bleuPosition: '#3B82F6',
  bleuPositionHalo: 'rgba(59,130,246,0.18)',
  bleuPositionContour: '#0E1511',
  etiquetteCarte: '#17211B',
  etiquetteCarteTexte: '#E8EFEA',
  etiquetteSelection: '#E8EFEA',
  etiquetteSelectionTexte: '#0E1511',

  sosFond: '#9E1F1F',
  sosTexte: '#FFFFFF',

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
  carteHaloCommune: 'rgba(27,138,62,0.18)',

  ombre: 'rgb(0,0,0)',
};
