import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { t } from '../lib/i18n';
import { useTheme } from '../theme/Theme';
import { usePulsation } from './animations';

/** Un battement : la croix gonfle, se contracte, puis se repose. */
const DUREE_BATTEMENT = 1100;

/** Durée minimale d'affichage : en deçà, la croix clignoterait sans qu'on la voie battre. */
export const CHARGEMENT_MINIMUM_MS = 600;

/**
 * Vrai tant que `actif` l'est, puis encore jusqu'à `minimum` ms après son début : une réponse
 * rapide du serveur ne fait pas clignoter le chargement.
 */
export function useChargementVisible(actif: boolean, minimum = CHARGEMENT_MINIMUM_MS) {
  const debut = useRef(0);
  const [precedent, setPrecedent] = useState(actif);
  const [prolonge, setProlonge] = useState(false);
  // Fin du chargement repérée pendant le rendu (et non dans un effet) : pas de rendu en cascade.
  if (actif !== precedent) {
    setPrecedent(actif);
    if (!actif) setProlonge(true);
  }
  useEffect(() => {
    if (actif) debut.current = Date.now();
  }, [actif]);
  useEffect(() => {
    if (!prolonge) return undefined;
    const minuteur = setTimeout(() => setProlonge(false), Math.max(0, minimum - (Date.now() - debut.current)));
    return () => clearTimeout(minuteur);
  }, [prolonge, minimum]);
  return actif || prolonge;
}

/**
 * Chargement court déclenché à la main (filtre trié sur le téléphone, résultat instantané) :
 * `declencher()` affiche la croix pendant `duree` ms.
 */
export function useChargementBref(duree = CHARGEMENT_MINIMUM_MS) {
  const [visible, setVisible] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);
  const declencher = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    setVisible(true);
    minuteur.current = setTimeout(() => setVisible(false), duree);
  }, [duree]);
  return { visible, declencher };
}

type Props = {
  /** Côté de la croix (46 dans une zone de liste, 18 dans une pilule). */
  taille?: number;
  /** Halo vert qui s'élargit à chaque battement (désactivé dans les petites tailles). */
  halo?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Chargement de la marque : croix de pharmacie verte qui bat comme un cœur, avec un halo.
 * Affiché après un appui sur un filtre, le temps que la liste arrive. Immobile si le téléphone
 * demande de supprimer les animations ; annoncé « Chargement » aux lecteurs d'écran.
 */
export function ChargementCroix({ taille = 46, halo = true, style, testID }: Props) {
  const { couleurs: c } = useTheme();
  const { valeur } = usePulsation(true, { duree: DUREE_BATTEMENT });
  const styleCroix = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(valeur.get(), [0, 0.3, 0.5, 1], [1, 1.15, 0.95, 1]) }],
  }));
  const styleHalo = useAnimatedStyle(() => ({
    opacity: interpolate(valeur.get(), [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(valeur.get(), [0, 1], [0.6, 2.4]) }],
  }));
  const branche = Math.round(taille * 0.35);
  const decalage = (taille - branche) / 2;
  const arrondi = Math.max(2, Math.round(taille / 12));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('commun.chargement')}
      accessibilityState={{ busy: true }}
      style={[styles.centre, style]}
      testID={testID}
    >
      {halo ? (
        <Animated.View style={[styles.halo, { width: taille, height: taille, borderRadius: taille / 2, backgroundColor: c.vert }, styleHalo]} />
      ) : null}
      <Animated.View style={[{ width: taille, height: taille }, styleCroix]}>
        <View style={[styles.branche, { left: decalage, width: branche, height: taille, borderRadius: arrondi, backgroundColor: c.vert }]} />
        <View style={[styles.branche, { top: decalage, width: taille, height: branche, borderRadius: arrondi, backgroundColor: c.vert }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  branche: { position: 'absolute' },
});
