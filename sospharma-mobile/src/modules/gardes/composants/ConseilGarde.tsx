import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { Texte } from '@/commun/ui';

import { IconeConseil } from './IconeConseil';

/**
 * « La nuit, appelez avant de vous déplacer. » juste sous la plus proche, là où l'on décide
 * d'appeler ou de partir. En ocre (palette enrichie) : une précaution, pas une urgence.
 */
export function ConseilGarde({ style }: { style?: StyleProp<ViewStyle> }) {
  const { couleurs: c } = useTheme();
  return (
    <View style={[styles.conseil, { backgroundColor: c.ocreClair }, style]} testID="conseil-garde">
      <IconeConseil size={18} color={c.ocreTexte} />
      <Texte variante="petitFort" couleur={c.ocreTexte} style={styles.texte}>
        {t('garde.conseil')}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  conseil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: rayons.moyen,
  },
  texte: { flex: 1 },
});
