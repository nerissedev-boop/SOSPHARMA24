import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { vibrationLegere } from '../lib/haptique';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
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

/** Puce de filtre : pilule de 34 px, sans bordure (charte « cartes », 28 oct.). */
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
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [styles.puce, { backgroundColor: fond, paddingHorizontal, opacity: pressed ? 0.85 : 1 }]}
    >
      {point ? <View style={[styles.point, { backgroundColor: point === 'vert' ? c.vert : c.rouge }]} /> : null}
      {icone}
      <Texte variante={selectionne && ton === 'garde' ? 'boutonPetit' : 'petitFort'} couleur={texte} style={styles.texte}>
        {libelle}
      </Texte>
      {badge24 ? (
        <View style={[styles.badge, { backgroundColor: c.rouge }]}>
          <Texte variante="miniFort" couleur={c.blanc}>
            24
          </Texte>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  puce: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: rayons.pilule },
  texte: { fontSize: 13 },
  point: { width: 10, height: 10, borderRadius: 5 },
  badge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: rayons.pilule },
});
