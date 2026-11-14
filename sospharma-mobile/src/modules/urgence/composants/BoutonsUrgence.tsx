import { StyleSheet, View } from 'react-native';

import type { NumeroUrgence } from '@/commun/api';
import { appeler, t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { PressableAnime, Texte } from '@/commun/ui';

/** Largeur de départ d'un bouton : trois tiennent sur une ligne de téléphone, un quatrième passe dessous. */
const LARGEUR_BASE = 96;

type Props = { urgences: NumeroUrgence[] };

/**
 * Numéros d'urgence de l'écran Urgence (piste A) : gros boutons blancs posés sur le fond rouge,
 * nom court et numéro lisibles d'un coup d'œil. Ils viennent de la configuration du pays (jamais en dur).
 * Le nom complet et la description restent lus par le lecteur d'écran.
 */
export function BoutonsUrgence({ urgences }: Props) {
  const { couleurs: c } = useTheme();
  return (
    <View style={styles.grille}>
      {urgences.map((u) => (
        <PressableAnime
          key={u.code}
          testID={`urgence-${u.code}`}
          // appeler() vibre déjà (action franche) : pas de second retour haptique ici.
          onPress={() => void appeler(u.numero)}
          accessibilityRole="button"
          accessibilityLabel={t('urgence.appeler', { nom: u.libelle, numero: u.numero })}
          accessibilityHint={u.description || undefined}
          style={[styles.bouton, { backgroundColor: c.sosNumero }]}
        >
          <Texte variante="nom" couleur={c.sosNumeroTexte} aligne="center" numberOfLines={2}>
            {u.libelle_court || u.libelle}
          </Texte>
          <Texte variante="distanceGrande" couleur={c.sosNumeroTexte} aligne="center" numberOfLines={1} style={styles.numero}>
            {u.numero}
          </Texte>
        </PressableAnime>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bouton: {
    flexGrow: 1,
    flexBasis: LARGEUR_BASE,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayons.carte,
  },
  numero: { fontVariant: ['tabular-nums'] },
});
