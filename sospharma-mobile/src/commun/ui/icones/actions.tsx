import type { ComponentType } from 'react';

import {
  IconeActualiser,
  IconeAppareilPhoto,
  IconeBulle,
  IconeCarteDepliee,
  IconeCloche,
  IconeCoche,
  IconeConnexion,
  IconeContinuer,
  IconeEnvoyer,
  IconeFermer,
  IconeLieu,
  IconeListe,
  IconeLune,
  IconeNaviguer,
  IconeOeil,
  IconePlus,
  IconeViseur,
  type PropsIconeTrait,
} from './trait';

/**
 * Jeu d'icônes des boutons d'action (charte, « Boutons », ajout du 21 oct.) :
 * une icône au trait par action, 20 px, de la couleur du texte du bouton.
 */
const ICONES_ACTION = {
  envoyer: IconeEnvoyer,
  valider: IconeCoche,
  naviguer: IconeNaviguer,
  voir: IconeOeil,
  liste: IconeListe,
  lune: IconeLune,
  actualiser: IconeActualiser,
  ajouter: IconePlus,
  continuer: IconeContinuer,
  annuler: IconeFermer,
  localisation: IconeViseur,
  carte: IconeCarteDepliee,
  cloche: IconeCloche,
  repere: IconeLieu,
  connexion: IconeConnexion,
  bulle: IconeBulle,
  photo: IconeAppareilPhoto,
} satisfies Record<string, ComponentType<PropsIconeTrait>>;

export type NomIcone = keyof typeof ICONES_ACTION;

/** Icônes placées à droite du libellé (flèche « continuer », « se connecter »). */
export const ICONES_A_DROITE: readonly NomIcone[] = ['continuer', 'connexion'];

/** Épaisseur de trait des maquettes pour les icônes de boutons (2,2 ; 2,6 pour le +). */
const EPAISSEUR: Partial<Record<NomIcone, number>> = { ajouter: 2.6, photo: 2 };

export function IconeNommee({ nom, size = 20, color, strokeWidth }: { nom: NomIcone; size?: number; color: string; strokeWidth?: number }) {
  const Composant = ICONES_ACTION[nom];
  return <Composant size={size} color={color} strokeWidth={strokeWidth ?? EPAISSEUR[nom] ?? 2.2} />;
}

export const NOMS_ICONES = Object.keys(ICONES_ACTION) as NomIcone[];
