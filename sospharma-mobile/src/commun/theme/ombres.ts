import type { ViewStyle } from 'react-native';

/**
 * Ombres très légères de la charte (pas de bordure : la séparation se fait par aplats, arrondis et ombres).
 * iOS : shadow* ; Android : elevation (approximation, pas de direction).
 */
export const ombres = {
  /** 0 -8px 24px rgba(15,31,23,0.06) : barre d'onglets, pieds d'écran. */
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
  /** 0 4px 16px rgba(15,31,23,0.06) : cartes blanches des listes (charte « cartes », 28 oct.). */
  carte: {
    shadowColor: 'rgb(15,31,23)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** 0 8px 24px rgba(0,0,0,0.12) : fiches posées sur la carte. */
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
  /** 0 2px 8px rgba(0,0,0,0.12) : boutons ronds de la carte. */
  boutonRond: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  /** 0 12px 32px rgba(0,0,0,0.2) : gros bouton SOS. */
  sos: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} satisfies Record<string, ViewStyle>;
