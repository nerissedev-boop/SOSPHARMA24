import { StyleSheet, View } from 'react-native';

import { t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { BoutonIcone, IconeFermer, IconeRetour, Texte } from '@/commun/ui';

export const NOMBRE_ETAPES = 4;

type Props = {
  etape: number;
  titre: string;
  onRetour: () => void;
  /** Étape 1 : croix « Annuler le relevé » ; ensuite flèche retour. */
  icone?: 'fermer' | 'retour';
};

/** En-tête des étapes du relevé (maquettes 24 à 27) : titre, « Étape N sur 4 », barre d'étapes. */
export function EnTeteReleve({ etape, titre, onRetour, icone = 'retour' }: Props) {
  const { couleurs: c } = useTheme();
  return (
    <View style={styles.bloc}>
      <View style={styles.ligne}>
        <BoutonIcone
          accessibilityLabel={icone === 'fermer' ? t('releve.annuler') : t('commun.retour')}
          onPress={onRetour}
          style={styles.retour}
          testID="bouton-retour"
        >
          {icone === 'fermer' ? <IconeFermer size={22} color={c.texte} /> : <IconeRetour size={22} color={c.texte} />}
        </BoutonIcone>
        <Texte variante="titreModal" titre style={styles.titre} numberOfLines={1}>
          {titre}
        </Texte>
        <Texte variante="petit" couleur={c.texteSecondaire} testID="etape-releve">
          {t('releve.etape', { etape, total: NOMBRE_ETAPES })}
        </Texte>
      </View>
      <View
        style={styles.barre}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: NOMBRE_ETAPES, now: etape }}
        accessibilityLabel={t('releve.etape', { etape, total: NOMBRE_ETAPES })}
      >
        {Array.from({ length: NOMBRE_ETAPES }, (_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i < etape ? c.vert : c.etapeInactive }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 12 },
  ligne: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retour: { marginLeft: -10 },
  titre: { flex: 1 },
  barre: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4 },
});
