import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { distanceKm, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { DUREES, IconeChevronBas, Texte } from '@/commun/ui';

import type { GroupeCommune } from '../regroupement';

type Props = { groupe: GroupeCommune; ouvert: boolean; onPress: () => void };

/**
 * Titre de commune écrit comme dans la liste de l'Ordre (refonte v2) : la commune en gras et en casse
 * normale, puis « · 4 de garde », la distance de la plus proche et le chevron. Il se touche pour
 * déplier ou replier ses pharmacies.
 * Le lecteur d'écran entend la phrase complète et l'état déplié.
 *
 * Mouvement : le chevron pivote d'un demi-tour (220 ms, départ vif, arrivée douce, fil UI) ;
 * il bascule sans tourner si le téléphone supprime les animations.
 */
export function EnTeteGroupe({ groupe, ouvert, onPress }: Props) {
  const { couleurs: c } = useTheme();
  const nom = groupe.nom || t('garde.sansCommune');
  const nombre = t('garde.groupeNombre', { count: groupe.pharmacies.length });
  const detail =
    groupe.plusProcheM === null
      ? nombre
      : t('garde.groupeDetail', { count: groupe.pharmacies.length, distance: distanceKm(groupe.plusProcheM) });
  const rotation = useSharedValue(ouvert ? 1 : 0);
  useEffect(() => {
    rotation.set(withTiming(ouvert ? 1 : 0, { duration: DUREES.glissement, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [ouvert, rotation]);
  const styleChevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get() * 180}deg` }] }));
  return (
    <Pressable
      testID={`groupe-${groupe.cle || 'sans-commune'}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: ouvert }}
      accessibilityLabel={`${nom}, ${detail}`}
      style={({ pressed }) => [styles.groupe, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Texte variante="petit" couleur={c.texteSecondaire} style={styles.titre}>
        <Texte variante="sectionMoyenne" titre>
          {nom}
        </Texte>
        {` · ${nombre}`}
      </Texte>
      {groupe.plusProcheM !== null ? (
        <Texte variante="petitFort" style={styles.chiffres}>
          {distanceKm(groupe.plusProcheM)}
        </Texte>
      ) : null}
      <Animated.View style={styleChevron}>
        <IconeChevronBas size={18} color={c.texteSecondaire} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupe: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  titre: { flex: 1 },
  chiffres: { fontVariant: ['tabular-nums'] },
});
