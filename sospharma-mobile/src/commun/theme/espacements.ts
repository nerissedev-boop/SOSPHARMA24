/** Espacements relevés dans les maquettes (gouttière 16 partout, blocs 14, écarts 8–16). */
export const espacements = {
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  gouttiere: 16,
} as const;

/** Cible tactile minimale (charte : 48 dp, recommandation Android). */
export const CIBLE_TACTILE = 48;

/** Hauteurs récurrentes des maquettes. */
export const hauteurs = {
  /** Filtres de 40, zone tactile portée à 48 par `hitSlop`. */
  filtre: 40,
  champ: 48,
  /** Appeler et Y aller, partout. */
  boutonAction: 56,
  boutonPrincipal: 52,
  boutonPied: 54,
  ongletBarre: 78,
  ligneMenu: 52,
} as const;
