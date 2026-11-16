import { useEffect, useMemo, useState } from 'react';
import { BackHandler, PanResponder, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PharmacieResume } from '@/commun/api';
import type { TonStatut } from '@/commun/regles';
import { CartePlusProche } from '@/commun/ui';

const DUREE_OUVERTURE = 260;
const DUREE_FERMETURE = 200;
/** Glissé vers le bas au-delà de cette distance (ou assez vite) : l'aperçu se ferme. */
const SEUIL_FERMETURE = 60;
const VITESSE_FERMETURE = 0.6;

type Props = {
  /** Pharmacie choisie sur la carte (la plus proche à l'ouverture) ; `null` : aperçu fermé (il redescend avant de disparaître). */
  pharmacie: PharmacieResume | null;
  /** C'est la plus proche : la carte porte l'étiquette « La plus proche ». */
  plusProche: boolean;
  libelleStatut: (p: PharmacieResume) => string;
  tonStatut: (p: PharmacieResume) => TonStatut;
  onOuvrir: (p: PharmacieResume) => void;
  onAppeler: (p: PharmacieResume) => void;
  onYAller: (p: PharmacieResume) => void;
  onFermer: () => void;
  /** Hauteur mesurée (marges de la carte : le point choisi ne passe pas sous l'aperçu). */
  onHauteur?: (hauteur: number) => void;
  testID?: string;
};

/**
 * Aperçu posé sur le plan : la carte « la plus proche » en variante compacte (sans repère), la
 * même que sur l'Accueil. Elle monte du bas (260 ms, sortie cubique) et se ferme en glissant vers
 * le bas, par le bouton retour d'Android ou quand l'écran touche la carte ailleurs (onFermer).
 * « Supprimer les animations » : l'aperçu apparaît et disparaît d'un coup.
 */
export function FeuillePharmacieCarte({
  pharmacie,
  plusProche,
  libelleStatut,
  tonStatut,
  onOuvrir,
  onAppeler,
  onYAller,
  onFermer,
  onHauteur,
  testID = 'apercu-carte',
}: Props) {
  const reduit = useReducedMotion();
  // Dernière pharmacie affichée : elle reste visible pendant la descente.
  const [affichee, setAffichee] = useState<PharmacieResume | null>(pharmacie);
  if (pharmacie && pharmacie !== affichee) setAffichee(pharmacie);

  const hauteur = useSharedValue(320);
  const decalage = useSharedValue(320);
  const glisse = useSharedValue(0);
  const ouverte = pharmacie !== null;

  useEffect(() => {
    glisse.set(0);
    if (ouverte) {
      decalage.set(withTiming(0, { duration: reduit ? 0 : DUREE_OUVERTURE, easing: Easing.out(Easing.cubic) }));
      return undefined;
    }
    decalage.set(withTiming(hauteur.get() + 40, { duration: reduit ? 0 : DUREE_FERMETURE, easing: Easing.in(Easing.quad) }));
    const minuteur = setTimeout(() => setAffichee(null), reduit ? 0 : DUREE_FERMETURE);
    return () => clearTimeout(minuteur);
  }, [ouverte, reduit, decalage, glisse, hauteur]);

  // Bouton retour d'Android : il ferme l'aperçu avant de quitter l'écran.
  useEffect(() => {
    if (!ouverte) return undefined;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      onFermer();
      return true;
    });
    return () => abonnement.remove();
  }, [ouverte, onFermer]);

  // Glisser vers le bas : l'aperçu suit le doigt, puis se ferme ou revient en place.
  const glissement = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => glisse.set(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > SEUIL_FERMETURE || g.vy > VITESSE_FERMETURE) {
            onFermer();
          } else {
            glisse.set(withTiming(0, { duration: reduit ? 0 : DUREE_FERMETURE }));
          }
        },
        onPanResponderTerminate: () => glisse.set(withTiming(0, { duration: reduit ? 0 : DUREE_FERMETURE })),
      }),
    [glisse, reduit, onFermer],
  );

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: decalage.get() + glisse.get() }] }));

  if (!affichee) return null;
  const p = affichee;

  const surMesure = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    hauteur.set(h);
    onHauteur?.(h);
  };

  return (
    <Animated.View {...glissement.panHandlers} onLayout={surMesure} style={[styles.feuille, style]}>
      <CartePlusProche
        id={p.id}
        testID={testID}
        compacte
        surPlan
        plusProche={plusProche}
        nom={p.nom}
        statut={p.statut}
        ton={tonStatut(p)}
        libelleStatut={libelleStatut(p)}
        distanceM={p.distance_m}
        marcheMin={p.marche_min}
        photoUrl={p.photo_url}
        commune={p.commune}
        positionAConfirmer={p.latitude === null}
        onPress={() => onOuvrir(p)}
        onAppeler={p.telephone ? () => onAppeler(p) : undefined}
        onYAller={() => onYAller(p)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  feuille: { position: 'absolute', left: 12, right: 12, bottom: 20 },
});
