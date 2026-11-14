import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { t } from '../lib/i18n';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { DUREES, usePulsation } from './animations';

/** Opacité au creux de la respiration (1 au sommet). */
const OPACITE_MIN = 0.45;

/**
 * Respiration partagée : UNE animation par zone de chargement (carte, bloc), pas une par
 * bloc gris, pour ménager les téléphones d'entrée de gamme. Immobile si le téléphone demande
 * de supprimer les animations.
 */
function useRespiration() {
  const { valeur } = usePulsation(true, { duree: DUREES.respiration, allerRetour: true });
  return useAnimatedStyle(() => ({ opacity: interpolate(valeur.get(), [0, 1], [1, OPACITE_MIN]) }));
}

type PropsZone = { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string };

/**
 * Conteneur qui « respire » : y poser des `Squelette anime={false}`. Annoncé une seule fois
 * comme « Chargement » aux lecteurs d'écran.
 */
export function ZoneSquelette({ children, style, testID }: PropsZone) {
  const respiration = useRespiration();
  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('commun.chargement')}
      accessibilityState={{ busy: true }}
      style={[style, respiration]}
    >
      {children}
    </Animated.View>
  );
}

type Props = {
  largeur?: DimensionValue;
  hauteur?: DimensionValue;
  rayon?: number;
  /** false dans une `ZoneSquelette` (qui respire déjà pour tout son contenu). */
  anime?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Bloc gris de chargement (texte, vignette, bouton) à la place du contenu attendu. */
export function Squelette({ largeur = '100%', hauteur = 14, rayon = 6, anime = true, style, testID }: Props) {
  const { couleurs: c } = useTheme();
  const bloc = { width: largeur, height: hauteur, borderRadius: rayon, backgroundColor: c.surface };
  if (!anime) return <View testID={testID} style={[bloc, style]} />;
  return <ZoneSquelette testID={testID} style={[bloc, style]}>{null}</ZoneSquelette>;
}

type PropsForme = { style?: StyleProp<ViewStyle>; testID?: string };

/** Forme d'une carte de liste (vignette 56, nom, statut, distance) pendant le chargement. */
export function SqueletteCartePharmacie({ style, testID = 'squelette-carte' }: PropsForme) {
  const { couleurs: c } = useTheme();
  return (
    <ZoneSquelette testID={testID} style={[styles.carte, { backgroundColor: c.surface2 }, style]}>
      <Squelette anime={false} largeur={56} hauteur={56} rayon={12} />
      <View style={styles.textes}>
        <Squelette anime={false} largeur="72%" hauteur={14} />
        <Squelette anime={false} largeur="46%" hauteur={12} />
      </View>
      <Squelette anime={false} largeur={44} hauteur={12} />
    </ZoneSquelette>
  );
}

/** Forme du bloc « la plus proche » (pastille, deux lignes, deux boutons). */
export function SqueletteBlocProche({ style, testID = 'squelette-bloc-proche' }: PropsForme) {
  const { couleurs: c } = useTheme();
  return (
    <ZoneSquelette testID={testID} style={[styles.bloc, { backgroundColor: c.surface2 }, style]}>
      <View style={styles.ligne}>
        <Squelette anime={false} largeur={46} hauteur={46} rayon={23} />
        <View style={styles.textes}>
          <Squelette anime={false} largeur="64%" hauteur={16} />
          <Squelette anime={false} largeur="40%" hauteur={12} />
        </View>
      </View>
      <View style={styles.ligne}>
        <Squelette anime={false} hauteur={44} rayon={12} style={styles.bouton} />
        <Squelette anime={false} hauteur={44} rayon={12} style={styles.bouton} />
      </View>
    </ZoneSquelette>
  );
}

/**
 * Forme de la fiche pharmacie : façade en en-tête, feuille arrondie avec pastille et nom,
 * trois pastilles d'action et quelques lignes d'horaires. Une seule respiration pour tout.
 */
export function SqueletteFiche({ style, testID = 'squelette-fiche', hauteurPhoto = 230 }: PropsForme & { hauteurPhoto?: number }) {
  const { couleurs: c } = useTheme();
  return (
    <ZoneSquelette testID={testID} style={[styles.fiche, style]}>
      <Squelette anime={false} hauteur={hauteurPhoto} rayon={0} />
      <View style={[styles.feuilleFiche, { backgroundColor: c.fond }]}>
        <View style={[styles.ligne, styles.titreFiche]}>
          <Squelette anime={false} largeur={52} hauteur={52} rayon={26} style={styles.pastilleFiche} />
          <View style={styles.textes}>
            <Squelette anime={false} largeur="78%" hauteur={22} />
            <Squelette anime={false} largeur="42%" hauteur={14} />
          </View>
          <Squelette anime={false} largeur={48} hauteur={18} />
        </View>
        <View style={styles.actionsFiche}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.actionFiche}>
              <Squelette anime={false} largeur={50} hauteur={50} rayon={25} />
              <Squelette anime={false} largeur={56} hauteur={10} />
            </View>
          ))}
        </View>
        <View style={[styles.bloc, { backgroundColor: c.feuille }]}>
          <Squelette anime={false} largeur="40%" hauteur={16} />
          {LIGNES_HORAIRES.map((largeur, i) => (
            <Squelette key={i} anime={false} largeur={largeur} hauteur={12} />
          ))}
        </View>
      </View>
    </ZoneSquelette>
  );
}

/** Largeurs des lignes d'horaires du squelette de fiche (irrégulières, comme du vrai texte). */
const LIGNES_HORAIRES: DimensionValue[] = ['70%', '62%', '70%', '55%', '66%'];

/** Plusieurs cartes squelettes à la suite (premier chargement d'une liste). */
export function SqueletteListe({ nombre = 4, ecart = 10 }: { nombre?: number; ecart?: number }) {
  return (
    <View style={{ gap: ecart }} testID="squelette-liste">
      {Array.from({ length: nombre }, (_, i) => (
        <SqueletteCartePharmacie key={i} testID={`squelette-carte-${i}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  bloc: { padding: 14, gap: 14, borderRadius: 16 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textes: { flex: 1, gap: 8, minWidth: 0 },
  bouton: { flex: 1, width: undefined },
  fiche: { flexGrow: 1 },
  feuilleFiche: { flexGrow: 1, marginTop: -24, padding: 20, gap: 20, borderTopLeftRadius: rayons.feuille, borderTopRightRadius: rayons.feuille },
  titreFiche: { alignItems: 'flex-start' },
  pastilleFiche: { marginTop: -34 },
  actionsFiche: { flexDirection: 'row', gap: 8 },
  actionFiche: { flex: 1, alignItems: 'center', gap: 8 },
});
