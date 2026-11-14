/**
 * Trois rayons et le rond (refonte v2, 14 nov.), chacun avec un rôle ; toujours sans bordure.
 * Dans la carte « la plus proche », les boutons sont posés à 8 du bord : 12 + 8 = 20, leurs coins
 * suivent ceux de la carte.
 */
export const rayons = {
  /** Repères : « 24 », assurances, « Hors connexion », étiquettes du plan. */
  repere: 6,
  /** Ce qu'on touche : boutons, champs, filtres, zone. */
  touche: 12,
  /** Surfaces : carte la plus proche, bas des bandeaux, listes, carte d'infos, feuilles, barre d'onglets. */
  surface: 20,
  /** Les vrais ronds seulement : boutons d'appel, boutons du haut, marqueurs, interrupteur. */
  rond: 999,
} as const;
