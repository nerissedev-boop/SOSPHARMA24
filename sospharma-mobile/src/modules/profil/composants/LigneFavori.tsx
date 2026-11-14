import { Pressable, StyleSheet, View } from 'react-native';

import type { StatutPharmacie } from '@/commun/api';
import { distanceKm, t } from '@/commun/lib';
import type { TonStatut } from '@/commun/regles';
import { CIBLE_TACTILE, rayons, useTheme } from '@/commun/theme';
import { BadgePosition, HiPhone, RepereStatut, Texte } from '@/commun/ui';

type Props = {
  nom: string;
  statut: StatutPharmacie;
  /** « Ouverte jusqu'à 21:00 », « Ferme dans 20 min », « Fermée »… */
  libelleStatut: string;
  /** « ocre » quand la pharmacie ferme dans moins de 30 min. */
  ton: TonStatut;
  distanceM: number | null;
  /** Pas de position GPS : ni distance, badge « Position à confirmer ». */
  positionAConfirmer: boolean;
  onPress: () => void;
  /** Bouton rond d'appel ; absent sans numéro. */
  onAppeler?: () => void;
  testID?: string;
};

/**
 * Ligne de « Mes pharmacies » (refonte v2) : posée dans le groupe à plat, sans vignette ni flèche.
 * Le nom, l'état, la distance, puis le bouton d'appel, comme dans les listes.
 */
export function LigneFavori({ nom, statut, libelleStatut, ton, distanceM, positionAConfirmer, onPress, onAppeler, testID }: Props) {
  const { couleurs: c } = useTheme();
  const distance = positionAConfirmer ? null : distanceKm(distanceM) || null;
  const description = [nom, libelleStatut, positionAConfirmer ? t('commun.positionAConfirmer') : distance].filter(Boolean).join(', ');
  return (
    <View style={styles.ligne} testID={testID}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={description}
        style={({ pressed }) => [styles.zone, pressed && { backgroundColor: c.carteAppuyee }]}
      >
        <View style={styles.textes}>
          <Texte variante="corpsFort" numberOfLines={2}>
            {nom}
          </Texte>
          <RepereStatut statut={statut} ton={ton} libelle={libelleStatut} numberOfLines={1} />
          {positionAConfirmer ? <BadgePosition petit /> : null}
        </View>
        {distance ? (
          <Texte variante="boutonPetit" style={styles.chiffres}>
            {distance}
          </Texte>
        ) : null}
      </Pressable>
      {onAppeler ? (
        <Pressable
          onPress={onAppeler}
          accessibilityRole="button"
          accessibilityLabel={`${t('commun.appeler')} ${nom}`}
          testID={testID ? `${testID}-appeler` : undefined}
          style={({ pressed }) => [styles.appel, { backgroundColor: c.boutonBlocSecondaire, opacity: pressed ? 0.8 : 1 }]}
        >
          <HiPhone size={22} color={c.pastilleActionIcone} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 6 },
  // Déborde de 8 dans la marge du groupe : la teinte d'appui garde de l'air autour du contenu.
  zone: {
    flex: 1,
    minWidth: 0,
    minHeight: CIBLE_TACTILE,
    marginLeft: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: rayons.touche,
  },
  textes: { flex: 1, minWidth: 0, gap: 2 },
  chiffres: { fontVariant: ['tabular-nums'] },
  appel: { width: CIBLE_TACTILE, height: CIBLE_TACTILE, borderRadius: CIBLE_TACTILE / 2, alignItems: 'center', justifyContent: 'center' },
});
