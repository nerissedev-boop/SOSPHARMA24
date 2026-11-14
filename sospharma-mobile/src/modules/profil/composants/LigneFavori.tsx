import { Pressable, StyleSheet, View } from 'react-native';

import type { StatutPharmacie } from '@/commun/api';
import { distanceKm, t } from '@/commun/lib';
import type { TonStatut } from '@/commun/regles';
import { CIBLE_TACTILE, rayons, useTheme, type Jetons } from '@/commun/theme';
import { BadgePosition, FacadeIllustree, IconeChevronDroite, PhotoFondu, Texte } from '@/commun/ui';

type Props = {
  nom: string;
  statut: StatutPharmacie;
  /** « Ouverte jusqu'à 21:00 », « Ferme dans 20 min », « Fermée »… */
  libelleStatut: string;
  /** « ocre » quand la pharmacie ferme dans moins de 30 min. */
  ton: TonStatut;
  distanceM: number | null;
  /** Photo de façade validée ; `null` : devanture dessinée. */
  photoUrl: string | null;
  /** Pas de position GPS : ni distance, badge « Position à confirmer ». */
  positionAConfirmer: boolean;
  onPress: () => void;
  testID?: string;
};

/** Vert = ouverte, rouge = de garde, ocre = ferme bientôt, gris = fermée ou horaires à confirmer. */
function couleurStatut(statut: StatutPharmacie, ton: TonStatut, c: Jetons): string {
  if (ton === 'ocre') return c.ocreTexte;
  if (statut === 'garde') return c.rougeTexteFort;
  if (statut === 'ouverte') return c.vertTexte;
  return c.texteSecondaire;
}

/**
 * Ligne de la carte « Pharmacies favorites » (piste A) : posée DANS la carte blanche, donc sans fond
 * ni ombre propres ; sous le doigt, elle se teinte de vert pâle (retour immédiat, même sur un téléphone lent).
 */
export function LigneFavori({ nom, statut, libelleStatut, ton, distanceM, photoUrl, positionAConfirmer, onPress, testID }: Props) {
  const { couleurs: c } = useTheme();
  const distance = positionAConfirmer ? null : distanceKm(distanceM) || null;
  const description = [nom, libelleStatut, positionAConfirmer ? t('commun.positionAConfirmer') : distance].filter(Boolean).join(', ');
  const facade = <FacadeIllustree taille="vignette" style={styles.vignette} />;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={description}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: c.carteAppuyee }]}
    >
      {photoUrl ? <PhotoFondu uri={photoUrl} style={[styles.vignette, { backgroundColor: c.surface }]} repli={facade} /> : facade}
      <View style={styles.textes}>
        <Texte variante="nom" numberOfLines={2}>
          {nom}
        </Texte>
        {/* Statut en couleur, distance en gris : « Ouverte · 650 m » comme sur l'Accueil. */}
        <Texte variante="petit" couleur={c.texteSecondaire} numberOfLines={2}>
          <Texte variante="petitFort" couleur={couleurStatut(statut, ton, c)}>
            {libelleStatut}
          </Texte>
          {distance ? ` · ${distance}` : ''}
        </Texte>
        {positionAConfirmer ? <BadgePosition petit /> : null}
      </View>
      <IconeChevronDroite size={16} color={c.texteTertiaire} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Déborde de 8 dans la marge de la carte : la teinte d'appui garde de l'air autour du contenu.
  ligne: {
    minHeight: CIBLE_TACTILE,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: rayons.moyen,
  },
  vignette: { width: 48, height: 48, borderRadius: rayons.vignette, flexShrink: 0 },
  textes: { flex: 1, minWidth: 0, gap: 2 },
});
