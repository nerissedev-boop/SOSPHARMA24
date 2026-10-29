/**
 * Rayons d'arrondi de la charte « cartes » (28 oct. 2026, maquette façon Yango) :
 * cartes blanches arrondies sur fond clair, toujours sans bordure.
 * Les éléments réellement ronds (pastilles, boutons ronds) gardent un rayon de moitié de leur côté.
 */
export const rayons = {
  /** Petits badges posés sur un élément (« 24 », case à cocher). */
  mini: 6,
  /** Segments, puces internes, étiquettes rectangulaires. */
  petit: 10,
  /** Vignette photo des lignes de pharmacie (56 × 56). */
  vignette: 12,
  /** Boutons, champs, bandeaux d'information, photo de la carte « La plus proche ». */
  moyen: 14,
  /** Cartes des listes (lignes de pharmacie, sections de la fiche). */
  carte: 16,
  /** Grandes cartes (« La plus proche »), barre d'onglets (haut). */
  grandeCarte: 20,
  /** Haut des feuilles et des dialogues, bas des en-têtes colorés. */
  feuille: 24,
  /** Filtres, badges et pastilles en forme de pilule. */
  pilule: 999,
} as const;
