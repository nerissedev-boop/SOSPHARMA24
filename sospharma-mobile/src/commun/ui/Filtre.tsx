import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { vibrationLegere } from '../lib/haptique';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { Badge24 } from './RepereStatut';
import { Texte } from './Texte';

type Props = {
  libelle: string;
  selectionne: boolean;
  onPress: () => void;
  /** « garde » : sélectionnée en rouge profond (De garde, Plus proches de l'écran Garde). Sinon vert profond. */
  ton?: 'neutre' | 'garde';
  /** Point de couleur devant le libellé (carte : vert = ouvertes, rouge = de garde). */
  point?: 'vert' | 'rouge';
  /** Petit badge rouge « 24 » après le libellé (accueil). */
  badge24?: boolean;
  icone?: ReactNode;
  paddingHorizontal?: number;
  testID?: string;
};

/** Puce de filtre : 40 dp de haut (48 de zone tactile), rayon de 12, sans bordure. */
export function Filtre({ libelle, selectionne, onPress, ton = 'neutre', point, badge24, icone, paddingHorizontal = 14, testID }: Props) {
  const { couleurs: c } = useTheme();
  const fond = selectionne ? (ton === 'garde' ? c.rougeProfond : c.filtreSelection) : c.filtreFond;
  const texte = selectionne ? (ton === 'garde' ? c.blanc : c.filtreSelectionTexte) : c.filtreTexte;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!selectionne) vibrationLegere();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={{ selected: selectionne }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.puce, { backgroundColor: fond, paddingHorizontal, opacity: pressed ? 0.85 : 1 }]}
    >
      {point ? <View style={[styles.point, { backgroundColor: point === 'vert' ? c.vert : c.rouge }]} /> : null}
      {icone}
      <Texte variante={selectionne && ton === 'garde' ? 'boutonPetit' : 'petitFort'} couleur={texte} style={styles.texte}>
        {libelle}
      </Texte>
      {badge24 ? <Badge24 /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  puce: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: rayons.touche },
  texte: { fontSize: 13 },
  point: { width: 10, height: 10, borderRadius: 5 },
});
