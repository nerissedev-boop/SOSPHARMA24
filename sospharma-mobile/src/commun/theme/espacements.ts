/** Espacements relevés dans les maquettes (gouttière 20, blocs 14, écarts 8–16). */
export const espacements = {
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  gouttiere: 20,
} as const;

/** Cible tactile minimale (charte : 44 px). */
export const CIBLE_TACTILE = 44;

/** Hauteurs récurrentes des maquettes. */
export const hauteurs = {
  filtre: 34,
  champ: 46,
  boutonBloc: 44,
  boutonCarte: 46,
  boutonPrincipal: 52,
  boutonPied: 54,
  ongletBarre: 78,
  ligneMenu: 52,
} as const;
