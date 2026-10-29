import { useCallback, useEffect, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeInDown,
  FadeOut,
  interpolate,
  LinearTransition,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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
  /** Lignes qui se réorganisent (filtre changé) et indicateur qui glisse entre deux pilules. */
  glissement: 220,
  /** Sortie d'une ligne retirée de la liste. */
  disparition: 160,
  /** Nombre qui défile jusqu'à sa valeur. */
  compteur: 300,
  /** Fondu d'une photo arrivée du réseau. */
  image: 220,
} as const;

/** Courbe des mouvements courts (glissements) : départ vif, arrivée douce. */
const COURBE_GLISSEMENT = Easing.out(Easing.cubic);

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

/**
 * Lignes d'une liste qui se réorganisent (filtre changé, tri modifié) : les lignes restantes
 * glissent vers leur nouvelle place, celles qui sortent s'effacent en fondu.
 * À poser sur la vue racine de chaque ligne (avec ou sans `entering={apparitionLigne(rang)}`) :
 *
 *   <Animated.View key={p.id} {...transitionListe} entering={apparitionLigne(rang)}>…</Animated.View>
 *
 * Dans une `Animated.FlatList`, passer plutôt `itemLayoutAnimation={transitionListe.layout}`.
 * La clé React de chaque ligne doit être stable (identifiant de pharmacie), sinon Reanimated
 * ne reconnaît pas les lignes déplacées.
 */
export const transitionListe = {
  layout: LinearTransition.duration(DUREES.glissement).easing(COURBE_GLISSEMENT).reduceMotion(ReduceMotion.System),
  exiting: FadeOut.duration(DUREES.disparition).reduceMotion(ReduceMotion.System),
} as const;

/**
 * En-tête qui se replie au défilement : le titre reste, le résumé (sous-titre, compteur,
 * bloc d'aide…) s'efface pendant que l'en-tête passe de `hauteurDepliee` à `hauteurRepliee`.
 * Le mouvement suit le doigt (aucune animation autonome) ; si le téléphone demande de
 * supprimer les animations, le résumé s'efface sans glisser.
 *
 * Utilisation (l'en-tête est AU-DESSUS du défilement, pas dedans) :
 *
 *   const { onScroll, styleEnTete, styleResume, styleSeparateur, margeContenu } =
 *     useEnTeteRepliable(148, 64);
 *   <Animated.View style={[styles.enTete, styleEnTete]}>        // overflow: 'hidden'
 *     <Texte titre variante="titre">Pharmacies de garde</Texte>   // reste visible
 *     <Animated.View style={styleResume}>…résumé…</Animated.View>
 *     <Animated.View style={[styles.filet, styleSeparateur]} />   // filet bas, optionnel
 *   </Animated.View>
 *   <Animated.ScrollView
 *     onScroll={onScroll}
 *     scrollEventThrottle={16}
 *     contentContainerStyle={{ flexGrow: 1, paddingBottom: margeContenu }}
 *   >…</Animated.ScrollView>
 *
 * `margeContenu` (= course du repli) évite que l'en-tête « tremble » quand la liste est
 * courte : sans elle, le repli agrandit la zone visible, le défilement revient à 0, l'en-tête
 * se redéplie… Le gestionnaire marche aussi avec `Animated.FlatList`.
 */
export function useEnTeteRepliable(hauteurDepliee: number, hauteurRepliee: number) {
  const defilement = useSharedValue(0);
  const reduit = useReducedMotion();
  const course = Math.max(hauteurDepliee - hauteurRepliee, 1);
  const onScroll = useAnimatedScrollHandler((e) => {
    defilement.set(Math.max(e.contentOffset.y, 0));
  });
  const styleEnTete = useAnimatedStyle(() => ({
    height: interpolate(defilement.get(), [0, course], [hauteurDepliee, hauteurRepliee], Extrapolation.CLAMP),
  }));
  // Le résumé a disparu aux 60 % de la course : il ne chevauche jamais le titre.
  const styleResume = useAnimatedStyle(() => {
    const p = interpolate(defilement.get(), [0, course * 0.6], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - p, transform: [{ translateY: reduit ? 0 : -8 * p }] };
  });
  // Filet sous l'en-tête replié, pour le détacher de la liste qui passe dessous.
  const styleSeparateur = useAnimatedStyle(() => ({
    opacity: interpolate(defilement.get(), [course * 0.8, course], [0, 1], Extrapolation.CLAMP),
  }));
  return { onScroll, defilement, styleEnTete, styleResume, styleSeparateur, margeContenu: course };
}

/**
 * Nombre qui défile jusqu'à `valeur` à l'apparition, puis d'une valeur à l'autre quand elle
 * change (12 → 5 après un filtre). L'animation tourne sur le fil UI ; le texte n'est mis à
 * jour côté React qu'à chaque changement d'entier (une vingtaine de fois au plus).
 * Le composant qui l'utilise est rendu à chaque pas : le garder petit (voir `NombreAnime`).
 * « Supprimer les animations » : la valeur finale s'affiche directement.
 */
export function useCompteurAnime(valeur: number, duree: number = DUREES.compteur): number {
  const reduit = useReducedMotion();
  const anime = useSharedValue(reduit ? valeur : 0);
  const [affiche, setAffiche] = useState(reduit ? valeur : 0);
  useEffect(() => {
    anime.set(withTiming(valeur, { duration: duree, easing: COURBE_GLISSEMENT, reduceMotion: ReduceMotion.System }));
  }, [valeur, duree, anime]);
  useAnimatedReaction(
    () => Math.round(anime.get()),
    (entier, precedent) => {
      if (entier !== precedent) scheduleOnRN(setAffiche, entier);
    },
  );
  return affiche;
}

/**
 * Photo arrivée du réseau : invisible jusqu'à son chargement, puis fondu court.
 *
 *   const { style, onLoad } = useApparitionImage();
 *   <Animated.Image source={{ uri }} onLoad={onLoad} style={[styles.photo, style]} />
 *
 * Poser le fond gris (ou un `Squelette` immobile) sur le conteneur : il reste visible tant que
 * la photo n'est pas là. Avec « Supprimer les animations », la photo apparaît d'un coup.
 */
export function useApparitionImage() {
  const opacite = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: opacite.get() }));
  const onLoad = useCallback(() => {
    opacite.set(withTiming(1, { duration: DUREES.image, reduceMotion: ReduceMotion.System }));
  }, [opacite]);
  return { style, onLoad };
}
