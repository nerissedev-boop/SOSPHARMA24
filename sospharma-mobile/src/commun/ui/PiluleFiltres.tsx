import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { vibrationLegere } from '../lib/haptique';
import { useTheme } from '../theme/Theme';
import { DUREES } from './animations';
import { Texte } from './Texte';

export type OptionPilule<C extends string = string> = { cle: C; libelle: string; testID?: string };

type Props<C extends string> = {
  options: readonly OptionPilule<C>[];
  selection: C;
  onChange: (cle: C) => void;
  /** « garde » : sélection rouge profond, texte blanc (écran Garde). Sinon couleurs des filtres. */
  ton?: 'neutre' | 'garde';
  /** Petit « tic » haptique au changement (par défaut). */
  vibration?: boolean;
  /** Marges du contenu défilant (par défaut 16 de chaque côté, comme les écrans). */
  styleContenu?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const HAUTEUR = 36;
const ANIMATION = { duration: DUREES.glissement, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

type Place = { x: number; largeur: number };

/**
 * Rangée de filtres en pilules : l'indicateur de sélection GLISSE de l'ancienne pilule à la
 * nouvelle (positions mesurées par onLayout, mouvement sur le fil UI), et les libellés passent
 * d'une couleur à l'autre en fondu. Défile horizontalement si les pilules débordent.
 *
 * Trois couches superposées : fonds gris des pilules, indicateur, puis libellés touchables.
 * Tant que les pilules ne sont pas mesurées (premier rendu), chacune porte son propre fond.
 */
export function PiluleFiltres<C extends string>({
  options,
  selection,
  onChange,
  ton = 'neutre',
  vibration = true,
  styleContenu,
  style,
  testID,
}: Props<C>) {
  const { couleurs: c } = useTheme();
  const reduit = useReducedMotion();
  const fondSelection = ton === 'garde' ? c.rougeProfond : c.filtreSelection;
  const texteSelection = ton === 'garde' ? c.blanc : c.filtreSelectionTexte;

  const [places, setPlaces] = useState<Record<string, Place>>({});
  const defilement = useRef<ScrollViewInstance>(null);
  const x = useSharedValue(0);
  const largeur = useSharedValue(0);
  const dejaPlace = useRef(false);

  const mesuree = places[selection];
  const pret = options.every((o) => places[o.cle]);

  useEffect(() => {
    if (!mesuree) return;
    if (!dejaPlace.current) {
      // Premier placement : sans glissement depuis le bord.
      x.set(mesuree.x);
      largeur.set(mesuree.largeur);
      dejaPlace.current = true;
      return;
    }
    x.set(withTiming(mesuree.x, ANIMATION));
    largeur.set(withTiming(mesuree.largeur, ANIMATION));
    // Amène la pilule choisie dans le champ si la rangée déborde.
    defilement.current?.scrollTo({ x: Math.max(0, mesuree.x - 24), animated: !reduit });
  }, [mesuree, x, largeur, reduit]);

  const styleIndicateur = useAnimatedStyle(() => ({
    width: largeur.get(),
    transform: [{ translateX: x.get() }],
  }));

  const mesurer = useCallback((cle: string, e: LayoutChangeEvent) => {
    const { x: px, width } = e.nativeEvent.layout;
    setPlaces((avant) => {
      const p = avant[cle];
      if (p && p.x === px && p.largeur === width) return avant;
      return { ...avant, [cle]: { x: px, largeur: width } };
    });
  }, []);

  const choisir = (cle: C) => {
    if (cle === selection) return;
    if (vibration) vibrationLegere();
    onChange(cle);
  };

  return (
    <ScrollView
      ref={defilement}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.defilement, style]}
      contentContainerStyle={[styles.contenu, styleContenu]}
      testID={testID}
    >
      <View style={styles.rangee}>
        {pret
          ? options.map((o) => (
              <View
                key={`fond-${o.cle}`}
                pointerEvents="none"
                style={[styles.couche, { left: places[o.cle].x, width: places[o.cle].largeur, backgroundColor: c.filtreFond }]}
              />
            ))
          : null}
        {pret ? <Animated.View pointerEvents="none" style={[styles.couche, { backgroundColor: fondSelection }, styleIndicateur]} /> : null}
        {options.map((o) => (
          <Pilule
            key={o.cle}
            libelle={o.libelle}
            testID={o.testID}
            selectionnee={o.cle === selection}
            fond={pret ? 'transparent' : o.cle === selection ? fondSelection : c.filtreFond}
            couleurTexte={c.filtreTexte}
            couleurTexteSelection={texteSelection}
            onPress={() => choisir(o.cle)}
            onLayout={(e) => mesurer(o.cle, e)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

type PropsPilule = {
  libelle: string;
  selectionnee: boolean;
  fond: string;
  couleurTexte: string;
  couleurTexteSelection: string;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  testID?: string;
};

/** Une pilule : deux libellés superposés (normal / sélectionné) qui se relaient en fondu. */
function Pilule({ libelle, selectionnee, fond, couleurTexte, couleurTexteSelection, onPress, onLayout, testID }: PropsPilule) {
  const progression = useSharedValue(selectionnee ? 1 : 0);
  useEffect(() => {
    progression.set(withTiming(selectionnee ? 1 : 0, ANIMATION));
  }, [selectionnee, progression]);
  const styleNormal = useAnimatedStyle(() => ({ opacity: 1 - progression.get() }));
  const styleSelection = useAnimatedStyle(() => ({ opacity: progression.get() }));
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={{ selected: selectionnee }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.pilule, { backgroundColor: fond, opacity: pressed ? 0.85 : 1 }]}
    >
      <Animated.View style={styleNormal}>
        <Texte variante="petitFort" couleur={couleurTexte} numberOfLines={1}>
          {libelle}
        </Texte>
      </Animated.View>
      <Animated.View style={[styles.libelleSelection, styleSelection]} importantForAccessibility="no-hide-descendants">
        <Texte variante="petitFort" couleur={couleurTexteSelection} numberOfLines={1} accessible={false}>
          {libelle}
        </Texte>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  defilement: { flexGrow: 0 },
  contenu: { paddingHorizontal: 16 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  couche: { position: 'absolute', top: 0, left: 0, height: HAUTEUR, borderRadius: 999 },
  pilule: { height: HAUTEUR, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  libelleSelection: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
