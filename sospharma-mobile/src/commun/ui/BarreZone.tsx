import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { useTheme } from '../theme/Theme';
import { HiGeoLocation } from './icones/healthicons';
import { IconeChevronBas, IconeRepere } from './icones/trait';
import { Texte } from './Texte';

type Props = {
  /** Texte principal : « Cocody, Abidjan », « Cocody », « Abidjan, toutes communes »... */
  libelle: string;
  onChanger: () => void;
  /**
   * entete : accueil (« Position détectée » au-dessus) ;
   * compacte : en-tête de la carte ;
   * bandeau : aplat gris de 44 px (carte dézoomée, zone non couverte, garde de nuit) ;
   * garde : aplat sombre sur l'en-tête rouge de l'écran Garde.
   */
  variante?: 'entete' | 'compacte' | 'bandeau' | 'garde';
  /** Petit libellé au-dessus (variante entete). */
  surtitre?: string;
  /** Icône contour grise (zone non couverte) au lieu du repère vert. */
  iconeNeutre?: boolean;
  /** Variante entete posée sur le bandeau vert profond de l'accueil : texte blanc, accents vert tendre. */
  surFonce?: boolean;
  testID?: string;
};

/** Barre de zone : « Position détectée Cocody, Abidjan  Changer ». */
export function BarreZone({ libelle, onChanger, variante = 'entete', surtitre, iconeNeutre, surFonce = false, testID }: Props) {
  const { couleurs: c } = useTheme();
  const changer = t('commun.changer');
  const a11y = `${surtitre ? `${surtitre} : ` : ''}${libelle}. ${changer}`;

  if (variante === 'garde') {
    return (
      <Pressable
        testID={testID}
        onPress={onChanger}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.bandeau, { backgroundColor: c.rougeProfond, opacity: pressed ? 0.85 : 1 }]}
      >
        <IconeRepere size={20} color={c.blanc} />
        <Texte variante="corpsFort" couleur={c.blanc} style={[styles.flex, styles.texteBandeau]} numberOfLines={1}>
          {libelle}
        </Texte>
        <Texte variante="libelleFort" couleur={c.blanc} style={styles.souligne}>
          {changer}
        </Texte>
      </Pressable>
    );
  }

  if (variante === 'bandeau') {
    return (
      <Pressable
        testID={testID}
        onPress={onChanger}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.bandeau, { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }]}
      >
        <HiGeoLocation size={22} color={iconeNeutre ? c.fermeIcone : c.vertTexte} />
        <Texte variante="corpsFort" style={[styles.flex, styles.texteBandeau]} numberOfLines={1}>
          {libelle}
        </Texte>
        <Texte variante="boutonPetit" couleur={c.vertTexte} style={styles.changerPetit}>
          {changer}
        </Texte>
      </Pressable>
    );
  }

  if (variante === 'compacte') {
    return (
      <Pressable
        testID={testID}
        onPress={onChanger}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.compacte, { opacity: pressed ? 0.75 : 1 }]}
      >
        <HiGeoLocation size={18} color={c.vertTexte} />
        <Texte variante="petitFort" numberOfLines={1} style={styles.nomCompact}>
          {libelle}
        </Texte>
        {/* Un chevron plutôt que « Changer » : sur un écran de 360 points, le titre de la carte
            n'avait plus la place de s'afficher. « Changer » reste dans le libellé d'accessibilité. */}
        <IconeChevronBas size={16} color={c.vertTexte} />
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onChanger}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.entete, { opacity: pressed ? 0.75 : 1 }]}
    >
      <HiGeoLocation size={24} color={surFonce ? c.vertTendre : c.vertTexte} />
      <View style={styles.textesEntete}>
        <Texte variante="mini" couleur={surFonce ? c.vertTendre : c.texteSecondaire} style={styles.surtitre}>
          {surtitre ?? t('commun.positionDetectee')}
        </Texte>
        <Texte variante="nomPetit" numberOfLines={1} couleur={surFonce ? c.blanc : undefined}>
          {libelle}
          <Texte variante="petit" couleur={surFonce ? c.vertTendre : c.vertTexte} style={surFonce ? styles.souligneSimple : undefined}>
            {'   '}
            {changer}
          </Texte>
        </Texte>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, minHeight: CIBLE_TACTILE, flexShrink: 1 },
  textesEntete: { gap: 1, flexShrink: 1 },
  surtitre: { fontFamily: 'PlusJakartaSans_400Regular' },
  compacte: { flexDirection: 'row', alignItems: 'center', gap: 6, height: CIBLE_TACTILE, maxWidth: 120, flexShrink: 1 },
  nomCompact: { flexShrink: 1 },
  bandeau: { height: CIBLE_TACTILE, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  texteBandeau: { fontSize: 14 },
  changerPetit: { fontSize: 13 },
  souligne: { fontSize: 13, textDecorationLine: 'underline' },
  souligneSimple: { textDecorationLine: 'underline' },
});
