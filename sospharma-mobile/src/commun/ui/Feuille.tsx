import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { t } from '../lib/i18n';
import { useTheme } from '../theme/Theme';
import { BoutonIcone } from './BoutonIcone';
import { IconeFermer } from './icones/trait';
import { useBarreBas } from './margeBas';
import { Texte } from './Texte';

const DUREE_OUVERTURE = 260;
const DUREE_FERMETURE = 200;

type Props = {
  visible: boolean;
  /** Fermeture demandée : voile touché, bouton retour d'Android, croix. */
  onFermer: () => void;
  titre?: string;
  /** Texte sous le titre (dialogues). */
  message?: string;
  /** Croix en haut à droite (par défaut quand il y a un titre). */
  croix?: boolean;
  /** Contenu long : il défile dans la feuille, limitée à 90 % de l'écran. */
  defilement?: boolean;
  /** false : un appui sur le voile ne ferme pas (choix obligatoire). */
  fermableParVoile?: boolean;
  children?: ReactNode;
  /** Bas de la feuille, hors défilement (boutons d'action). */
  pied?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Feuille du design system, qui monte du bas de l'écran au-dessus d'un voile sombre.
 * Seule forme de fenêtre de l'app (dialogues, partage, éditions, vérification) : même
 * poignée, mêmes marges, même animation, aucun arrondi ni bordure (charte).
 * La feuille reste affichée le temps de son animation de fermeture.
 */
export function Feuille({
  visible,
  onFermer,
  titre,
  message,
  croix,
  defilement = false,
  fermableParVoile = true,
  children,
  pied,
  style,
  testID,
}: Props) {
  const { couleurs: c } = useTheme();
  const basSur = useBarreBas();
  const reduit = useReducedMotion();
  const [affichee, setAffichee] = useState(visible);
  const progression = useSharedValue(0);
  const hauteur = useSharedValue(600);

  if (visible && !affichee) setAffichee(true);

  useEffect(() => {
    if (visible) {
      progression.set(withTiming(1, { duration: reduit ? 0 : DUREE_OUVERTURE, easing: Easing.out(Easing.cubic) }));
      return undefined;
    }
    progression.set(withTiming(0, { duration: reduit ? 0 : DUREE_FERMETURE, easing: Easing.in(Easing.quad) }));
    const minuteur = setTimeout(() => setAffichee(false), reduit ? 0 : DUREE_FERMETURE);
    return () => clearTimeout(minuteur);
  }, [visible, reduit, progression]);

  const styleVoile = useAnimatedStyle(() => ({ opacity: progression.get() }));
  const styleFeuille = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progression.get(), [0, 1], [hauteur.get(), 0]) }],
  }));

  const avecCroix = croix ?? Boolean(titre);
  const corps = (
    <>
      {titre || avecCroix ? (
        <View style={styles.entete}>
          {titre ? (
            <Texte variante="titreModal" titre accessibilityRole="header" style={styles.titre}>
              {titre}
            </Texte>
          ) : (
            <View style={styles.titre} />
          )}
          {avecCroix ? (
            <BoutonIcone accessibilityLabel={t('commun.fermer')} onPress={onFermer} fond={c.boutonSecondaire} taille={40} testID="feuille-fermer">
              <IconeFermer size={18} color={c.texteSecondaire} />
            </BoutonIcone>
          ) : null}
        </View>
      ) : null}
      {message ? (
        <Texte variante="corps" couleur={c.texteSecondaire}>
          {message}
        </Texte>
      ) : null}
      {children}
    </>
  );

  return (
    <Modal visible={affichee} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onFermer}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.voile }, styleVoile]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={fermableParVoile ? onFermer : undefined}
          accessibilityRole="button"
          accessibilityLabel={t('commun.fermer')}
          importantForAccessibility={fermableParVoile ? 'yes' : 'no-hide-descendants'}
        />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={styles.bas} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          testID={testID}
          onLayout={(e) => hauteur.set(e.nativeEvent.layout.height)}
          style={[styles.feuille, { backgroundColor: c.feuille, paddingBottom: basSur + 20 }, styleFeuille, style]}
        >
          <View style={[styles.poignee, { backgroundColor: c.boutonSecondaire }]} />
          {defilement ? (
            <ScrollView style={styles.defilement} contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
              {corps}
            </ScrollView>
          ) : (
            <View style={styles.contenu}>{corps}</View>
          )}
          {pied ? <View style={styles.pied}>{pied}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bas: { flex: 1, justifyContent: 'flex-end' },
  feuille: { maxHeight: '90%', paddingTop: 10 },
  poignee: { alignSelf: 'center', width: 40, height: 4, marginBottom: 14 },
  defilement: { flexGrow: 0 },
  contenu: { paddingHorizontal: 20, gap: 14 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titre: { flex: 1 },
  pied: { paddingHorizontal: 20, paddingTop: 18, gap: 10 },
});
