import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { IconeFermer, IconePlus, Texte } from '@/commun/ui';

type Puce = { cle: string; libelle: string };

type Props = {
  puces: Puce[];
  /** Croix « Retirer » sur chaque puce (Filtres). */
  onRetirer?: (cle: string) => void;
  /** Puce d'action vert clair en fin de liste : « Ajouter (18 au total) » ou « Modifier ». */
  action?: { libelle: string; onPress: () => void; plus?: boolean; testID?: string };
  /** Hauteur des puces : 38 (Filtres) ou 36 (fiche de relevé). */
  hauteur?: number;
};

/** Puces d'assurances choisies : noires, en pilule, sans bordure (maquettes Filtres et ReleveFiche). */
export function PucesAssurances({ puces, onRetirer, action, hauteur = 38 }: Props) {
  const { couleurs: c } = useTheme();
  return (
    <View style={styles.puces}>
      {puces.map((p) =>
        onRetirer ? (
          <Pressable
            key={p.cle}
            onPress={() => onRetirer(p.cle)}
            accessibilityRole="button"
            accessibilityLabel={t('assurances.retirer', { nom: p.libelle })}
            accessibilityState={{ selected: true }}
            testID={`puce-assurance-${p.cle}`}
            style={[styles.puce, styles.puceRetirable, { height: hauteur, backgroundColor: c.filtreSelection }]}
          >
            <Texte variante="petitFort" couleur={c.filtreSelectionTexte} style={styles.gras}>
              {p.libelle}
            </Texte>
            <IconeFermer size={14} color={c.filtreSelectionTexte} strokeWidth={2.6} />
          </Pressable>
        ) : (
          <View key={p.cle} style={[styles.puce, { height: hauteur, backgroundColor: c.filtreSelection }]} testID={`puce-assurance-${p.cle}`}>
            <Texte variante="petitFort" couleur={c.filtreSelectionTexte}>
              {p.libelle}
            </Texte>
          </View>
        ),
      )}
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          testID={action.testID}
          style={[styles.puce, styles.action, { height: hauteur, backgroundColor: c.vertClair }]}
        >
          {action.plus ? <IconePlus size={14} color={c.vertTexte} strokeWidth={2.6} /> : null}
          <Texte variante="petitFort" couleur={c.vertTexte} style={styles.gras}>
            {action.libelle}
          </Texte>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 36, borderRadius: rayons.pilule },
  puceRetirable: { paddingLeft: 12, paddingRight: 10, gap: 8, minHeight: 44 },
  action: { gap: 6, minHeight: 44 },
  gras: { fontFamily: 'PlusJakartaSans_700Bold' },
});
