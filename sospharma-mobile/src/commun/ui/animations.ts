import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Animations du design system (Reanimated, exécutées hors du fil JavaScript).
 * Durées courtes : l'architecture met la rapidité avant l'esthétique, et l'app vise
 * des Android d'entrée de gamme. Toutes respectent « Supprimer les animations ».
 */
export const DUREES = {
  appui: 90,
  relache: 160,
  apparition: 260,
  /** Décalage entre deux lignes d'une liste qui apparaît en cascade. */
  cascade: 40,
  pulsation: 1600,
  respiration: 1400,
} as const;

/** Au-delà, les lignes apparaissent toutes ensemble : une longue liste ne doit pas traîner. */
const RANG_MAX_CASCADE = 8;

/**
 * Apparition d'une ligne de liste : léger fondu et glissement vers le haut, décalé selon
 * son rang. Sans rang, pas d'animation (la ligne est affichée telle quelle).
 */
export function apparitionLigne(rang: number | undefined) {
  if (rang === undefined) return undefined;
  return FadeInDown.duration(DUREES.apparition)
    .delay(Math.min(rang, RANG_MAX_CASCADE) * DUREES.cascade)
    .reduceMotion(ReduceMotion.System);
}

/**
 * Retour au toucher : l'élément se comprime légèrement sous le doigt puis revient.
 * `progression` va de 0 (relâché) à 1 (appuyé), pour d'autres effets (opacité…).
 */
export function useAppui(echelle = 0.97) {
  const progression = useSharedValue(0);
  const reduit = useReducedMotion();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: reduit ? 1 : 1 - (1 - echelle) * progression.get() }],
  }));
  return {
    progression,
    style,
    onPressIn: () => progression.set(withTiming(1, { duration: DUREES.appui })),
    onPressOut: () => progression.set(withTiming(0, { duration: DUREES.relache })),
  };
}

type OptionsPulsation = {
  duree?: number;
  delai?: number;
  /** true : 0 → 1 → 0 (respiration) ; false : 0 → 1 puis reprise à 0 (halo qui s'étend). */
  allerRetour?: boolean;
};

/**
 * Valeur qui boucle de 0 à 1 tant que `actif` est vrai. Arrêtée (et `enMarche` faux)
 * si le téléphone demande de supprimer les animations : l'élément reste alors immobile.
 */
export function usePulsation(actif: boolean, { duree = DUREES.pulsation, delai = 0, allerRetour = false }: OptionsPulsation = {}) {
  const valeur = useSharedValue(0);
  const reduit = useReducedMotion();
  const enMarche = actif && !reduit;
  useEffect(() => {
    if (!enMarche) {
      cancelAnimation(valeur);
      valeur.set(0);
      return undefined;
    }
    valeur.set(0);
    valeur.set(
      withDelay(
        delai,
        withRepeat(withTiming(1, { duration: duree, easing: allerRetour ? Easing.inOut(Easing.sin) : Easing.out(Easing.quad) }), -1, allerRetour),
      ),
    );
    return () => cancelAnimation(valeur);
  }, [enMarche, duree, delai, allerRetour, valeur]);
  return { valeur, enMarche };
}
