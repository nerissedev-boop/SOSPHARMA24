import { Pressable, StyleSheet, View } from 'react-native';

import type { Zone } from '@/commun/api';
import { distanceKmEntier, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { Texte } from '@/commun/ui';

type Props = {
  zone: Zone;
  ici: boolean;
  onPress: () => void;
  hauteur?: number;
};

/** Ligne de commune (Changer de zone, Toutes les communes) : nom, compteurs, distance. */
export function LigneCommune({ zone, ici, onPress, hauteur = 56 }: Props) {
  const { couleurs: c } = useTheme();
  const meta = t('zone.meta', { count: zone.nombre_pharmacies, gardes: zone.nombre_gardes });
  const distance = ici ? t('zone.vousYEtes') : zone.distance_m !== null ? distanceKmEntier(zone.distance_m) : '';
  return (
    <Pressable
      testID={`commune-${zone.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[zone.nom, meta, distance].filter(Boolean).join(', ')}
      accessibilityState={{ selected: ici }}
      style={({ pressed }) => [
        styles.ligne,
        { minHeight: hauteur, backgroundColor: ici ? c.vertClair : 'transparent', opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.textes}>
        <Texte variante="nom" numberOfLines={1}>
          {zone.nom}
        </Texte>
        <Texte variante="libelle" couleur={c.texteSecondaire}>
          {meta}
        </Texte>
      </View>
      <Texte variante="boutonPetit" couleur={ici ? c.vertTexte : c.texteSecondaire} style={styles.distance}>
        {distance}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginHorizontal: -12 },
  textes: { flex: 1, gap: 2, minWidth: 0 },
  distance: { fontSize: 13 },
});
