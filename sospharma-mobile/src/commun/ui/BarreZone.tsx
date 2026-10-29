import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { rayons } from '../theme/rayons';
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
   * bandeau : aplat gris arrondi de 44 px (carte dézoomée, zone non couverte) ;
   * pastille : pilule touchable (repère, libellé, chevron) dans l'en-tête de l'écran Garde ;
   *   translucide sur l'en-tête rouge (`surFonce`), aplat de surface sur le fond de nuit.
   */
  variante?: 'entete' | 'compacte' | 'bandeau' | 'pastille';
  /** Petit libellé au-dessus (variante entete). */
  surtitre?: string;
  /** Icône contour grise (zone non couverte) au lieu du repère vert. */
  iconeNeutre?: boolean;
  /**
   * Posée sur un aplat de couleur : variante entete sur le bandeau vert profond de l'accueil
   * (texte blanc, accents vert tendre) ; variante pastille sur l'en-tête rouge de l'écran Garde.
   */
  surFonce?: boolean;
  testID?: string;
};

/** Barre de zone : « Position détectée Cocody, Abidjan  Changer ». */
export function BarreZone({ libelle, onChanger, variante = 'entete', surtitre, iconeNeutre, surFonce = false, testID }: Props) {
  const { couleurs: c } = useTheme();
  const changer = t('commun.changer');
  const a11y = `${surtitre ? `${surtitre} : ` : ''}${libelle}. ${changer}`;

  if (variante === 'pastille') {
    // Toute la pilule est touchable ; « Changer » n'est plus écrit (chevron) mais reste lu.
    const texte = surFonce ? c.blanc : c.texte;
    return (
      <Pressable
        testID={testID}
        onPress={onChanger}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        hitSlop={{ top: 4, bottom: 4 }}
        style={({ pressed }) => [
          styles.pastille,
          { backgroundColor: surFonce ? 'rgba(255,255,255,0.18)' : c.surface, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <IconeRepere size={16} color={surFonce ? c.blanc : c.rougeTexte} />
        <Texte variante="petitFort" couleur={texte} style={styles.textePastille} numberOfLines={1}>
          {libelle}
        </Texte>
        <IconeChevronBas size={14} color={texte} strokeWidth={2.6} />
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
  bandeau: { height: CIBLE_TACTILE, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: rayons.moyen },
  pastille: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: rayons.pilule,
    flexShrink: 1,
  },
  textePastille: { fontSize: 14, flexShrink: 1 },
  texteBandeau: { fontSize: 14 },
  changerPetit: { fontSize: 13 },
  souligneSimple: { textDecorationLine: 'underline' },
});
