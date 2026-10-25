import type { ReactElement, ReactNode, Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Coordonnees } from '../../lib/geo';

/** Bornes visibles : [ouest, sud, est, nord]. */
export type Bornes = [number, number, number, number];

export type VueCarte = { centre: Coordonnees; zoom: number; bornes: Bornes };

export type RefCarte = {
  recentrer: (centre: Coordonnees, zoom?: number) => void;
};

export type PropsCarteBase = {
  nuit: boolean;
  centreInitial: Coordonnees;
  zoomInitial?: number;
  onVueChange?: (vue: VueCarte) => void;
  refCarte?: Ref<RefCarte>;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Marges intérieures (en-tête et fiche posés sur la carte). */
  marges?: { top: number; bottom: number; left?: number; right?: number };
  testID?: string;
};

export type PropsRepere = {
  id: string;
  coordonnees: Coordonnees;
  onPress?: () => void;
  children: ReactElement;
  ancre?: 'center' | 'left' | 'bottom';
};

export type PropsTrace = {
  id: string;
  points: Coordonnees[];
  couleur: string;
  epaisseur?: number;
  contour?: string;
};
