import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { useTheme } from '../theme/Theme';
import type { Variante } from '../theme/typographie';
import { BoutonIcone } from './BoutonIcone';
import { IconeFermer, IconeRetour } from './icones/trait';
import { Logo } from './Logo';
import { Texte } from './Texte';

type Props = {
  titre: string;
  onRetour?: () => void;
  /** « fermer » (croix) pour les modaux : Changer de zone, Filtres. */
  icone?: 'retour' | 'fermer';
  /** Titre centré (Urgence, Garde de nuit). */
  centre?: boolean;
  /** Logo à gauche du titre (carte). */
  logo?: boolean;
  varianteTitre?: Variante;
  couleur?: string;
  droite?: ReactNode;
  /** Texte secondaire juste après le titre (« 13 communes »). */
  apresTitre?: ReactNode;
  testID?: string;
};

/** En-tête des maquettes : hauteur 44, bouton retour décalé de −10 px, titre Vonca/Urbanist. */
export function EnTete({
  titre,
  onRetour,
  icone = 'retour',
  centre = false,
  logo = false,
  varianteTitre = 'titre',
  couleur,
  droite,
  apresTitre,
  testID,
}: Props) {
  const { couleurs: c } = useTheme();
  const teinte = couleur ?? c.texte;
  return (
    <View style={styles.entete} testID={testID}>
      {onRetour ? (
        <BoutonIcone
          accessibilityLabel={icone === 'fermer' ? t('commun.fermer') : t('commun.retour')}
          onPress={onRetour}
          style={styles.retour}
          testID="bouton-retour"
        >
          {icone === 'fermer' ? <IconeFermer size={22} color={teinte} /> : <IconeRetour size={22} color={teinte} />}
        </BoutonIcone>
      ) : null}
      {logo ? (
        <View style={styles.logo}>
          <Logo largeur={24} />
        </View>
      ) : null}
      <View style={[styles.titre, centre && styles.titreCentre]} pointerEvents="none">
        <Texte variante={varianteTitre} couleur={teinte} titre numberOfLines={1} aligne={centre ? 'center' : 'left'}>
          {titre}
        </Texte>
        {apresTitre}
      </View>
      {droite}
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { minHeight: CIBLE_TACTILE, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retour: { marginLeft: -10 },
  logo: { marginRight: 4 },
  titre: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  titreCentre: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
});
