import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/Theme';
import { HiMedicalSearchOutline, HiPharmacyOutline } from './icones/healthicons';
import { Texte } from './Texte';

export type Suggestion = {
  libelle: string;
  icone: ReactNode;
  onPress: () => void;
  /** Mise en avant (fond vert clair, texte vert) : « Une pharmacie manque ? Proposez-la ». */
  accent?: boolean;
  testID?: string;
};

type Props = {
  titre: string;
  texte?: string;
  /** Illustration ; par défaut la loupe verte + la coupe d'Hygie grise de la maquette « Vide ». */
  illustration?: ReactNode;
  titreSuggestions?: string;
  suggestions?: Suggestion[];
  testID?: string;
};

/** État vide réutilisable (maquette 09 « Aucune pharmacie trouvée »). */
export function EtatVide({ titre, texte, illustration, titreSuggestions, suggestions = [], testID }: Props) {
  const { couleurs: c } = useTheme();
  return (
    <View style={styles.conteneur} testID={testID}>
      {illustration ?? (
        <View style={[styles.cercle, { backgroundColor: c.vertClair }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <HiMedicalSearchOutline size={80} color={c.vert} />
          <View style={[styles.mini, { backgroundColor: c.feuille }]}>
            <HiPharmacyOutline size={28} color={c.fermeIcone} />
          </View>
        </View>
      )}
      <Texte variante="titreModal" aligne="center" titre style={styles.titre}>
        {titre}
      </Texte>
      {texte ? (
        <Texte variante="texte" couleur={c.texteSecondaire} aligne="center" style={styles.texte}>
          {texte}
        </Texte>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {titreSuggestions ? <Texte variante="boutonPetit" style={styles.titreSuggestions}>{titreSuggestions}</Texte> : null}
          {suggestions.map((s) => (
            <Pressable
              key={s.libelle}
              testID={s.testID}
              onPress={s.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [styles.suggestion, { backgroundColor: s.accent ? c.vertClair : c.surface, opacity: pressed ? 0.8 : 1 }]}
            >
              {s.icone}
              <Texte variante={s.accent ? 'boutonPetit' : 'corpsFort'} couleur={s.accent ? c.vertTexte : undefined} style={styles.texteSuggestion}>
                {s.libelle}
              </Texte>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  cercle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  mini: {
    position: 'absolute',
    right: 8,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgb(15,31,23)',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  titre: { marginTop: 10 },
  texte: { maxWidth: 290, lineHeight: 21 },
  suggestions: { alignSelf: 'stretch', gap: 8, marginTop: 10 },
  titreSuggestions: { fontSize: 13 },
  suggestion: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  texteSuggestion: { fontSize: 14 },
});
