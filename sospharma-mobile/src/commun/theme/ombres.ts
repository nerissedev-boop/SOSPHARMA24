import type { ViewStyle } from 'react-native';

/**
 * Ombres très légères de la charte (pas de bordure : la séparation se fait par aplats et arrondis).
 * Refonte v2 (14 nov.) : une seule ombre par écran, celle de la carte de la pharmacie (la plus
 * proche, ou celle de la fiche). S'y ajoutent ce qui est posé sur le plan de la Carte et les boutons
 * posés sur une photo. Listes, groupes, carte d'infos et barre d'onglets restent à plat. Rien la nuit.
 * iOS : shadow* ; Android : elevation (approximation, pas de direction).
 */
export const ombres = {
  /** 0 -8px 24px rgba(15,31,23,0.06) : pieds d'écran fixes au-dessus d'un formulaire. */
  barre: {
    shadowColor: 'rgb(15,31,23)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  /** 0 6px 20px rgba(15,31,23,0.06) : en-têtes posés sur la carte. */
  enTete: {
    shadowColor: 'rgb(15,31,23)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  /** 0 4px 16px rgba(15,31,23,0.06) : carte « la plus proche », la seule de l'écran. */
  carte: {
    shadowColor: 'rgb(15,31,23)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** 0 8px 24px rgba(0,0,0,0.12) : carte de la fiche, carte posée sur le plan. */
  fiche: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  /** 0 3px 8px rgba(0,0,0,0.2) : marqueurs. */
  marqueur: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  /** 0 8px 18px rgba(15,31,23,0.3) : marqueur sélectionné. */
  marqueurSelection: {
    shadowColor: 'rgb(15,31,23)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 8,
  },
  /** 0 2px 8px rgba(0,0,0,0.12) : boutons ronds posés sur le plan ou sur une photo. */
  boutonRond: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
} satisfies Record<string, ViewStyle>;
