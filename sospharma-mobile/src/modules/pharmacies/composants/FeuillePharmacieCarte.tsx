import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler, PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PharmacieResume } from '@/commun/api';
import { distanceKm, t } from '@/commun/lib';
import { CIBLE_TACTILE, ombres, rayons, useTheme } from '@/commun/theme';
import { Bouton, DistanceMarche, FacadeIllustree, HiPhone, IconeChevronDroite, IconeItineraire, PhotoFondu, Texte } from '@/commun/ui';

const DUREE_OUVERTURE = 260;
const DUREE_FERMETURE = 200;
/** Glissé vers le bas au-delà de cette distance (ou assez vite) : l'aperçu se ferme. */
const SEUIL_FERMETURE = 60;
const VITESSE_FERMETURE = 0.6;

type Props = {
  /** Pharmacie touchée sur la carte ; `null` : aperçu fermé (il redescend avant de disparaître). */
  pharmacie: PharmacieResume | null;
  libelleStatut: (p: PharmacieResume) => string;
  /** Ligne sous le statut (note des avis, garde confirmée le…). */
  complement?: ReactNode;
  onOuvrir: (p: PharmacieResume) => void;
  onAppeler: (p: PharmacieResume) => void;
  onItineraire: (p: PharmacieResume) => void;
  onFermer: () => void;
  /** Hauteur mesurée (marges de la carte : le point choisi ne passe pas sous l'aperçu). */
  onHauteur?: (hauteur: number) => void;
  testID?: string;
};

/**
 * Aperçu d'une pharmacie touchée sur la carte : carte arrondie qui remonte du bas, la carte
 * restant visible au-dessus. Photo de façade (ou devanture dessinée), nom, statut, distance,
 * Appeler et Itinéraire ; un appui sur l'aperçu ouvre la fiche. Se ferme en glissant vers le
 * bas, par le bouton retour d'Android, ou quand l'écran touche la carte ailleurs (onFermer).
 * « Supprimer les animations » : l'aperçu apparaît et disparaît d'un coup.
 */
export function FeuillePharmacieCarte({ pharmacie, libelleStatut, complement, onOuvrir, onAppeler, onItineraire, onFermer, onHauteur, testID = 'apercu-carte' }: Props) {
  const { couleurs: c, estNuit } = useTheme();
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
  const statut = libelleStatut(p);
  const couleurStatut =
    p.statut === 'garde' ? (estNuit ? c.rougeTexte : c.rougeTexteFort) : p.statut === 'ouverte' ? c.vertTexte : p.statut === 'inconnue' ? c.texteSecondaire : c.texteTertiaire;
  const description = [p.nom, statut, distanceKm(p.distance_m)].filter(Boolean).join(', ');

  const surMesure = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    hauteur.set(h);
    onHauteur?.(h);
  };

  return (
    <Animated.View
      {...glissement.panHandlers}
      onLayout={surMesure}
      style={[styles.feuille, { backgroundColor: c.feuille }, ombres.fiche, style]}
      testID={testID}
    >
      <View style={[styles.poignee, { backgroundColor: c.boutonSecondaire }]} accessible={false} />
      <Pressable
        onPress={() => onOuvrir(p)}
        accessibilityRole="button"
        accessibilityLabel={description}
        accessibilityHint={t('carte.ouvrirFicheIndice')}
        style={({ pressed }) => [styles.entete, pressed && { backgroundColor: c.carteAppuyee }]}
        testID={`${testID}-ouvrir`}
      >
        {p.photo_url ? (
          <PhotoFondu
            uri={p.photo_url}
            style={[styles.vignette, { backgroundColor: c.surface }]}
            repli={<FacadeIllustree taille="vignette" style={styles.vignette} testID={`${testID}-facade`} />}
            testID={`${testID}-photo`}
          />
        ) : (
          <FacadeIllustree taille="vignette" style={styles.vignette} testID={`${testID}-facade`} />
        )}
        <View style={styles.textes}>
          <Texte variante="nomGrand" numberOfLines={2}>
            {p.nom}
          </Texte>
          <Texte variante="petitFort" couleur={couleurStatut} numberOfLines={2}>
            {statut}
          </Texte>
          {complement}
        </View>
        <DistanceMarche distanceM={p.distance_m} marcheMin={p.marche_min} grande varianteDistance="distanceGrande" />
        <IconeChevronDroite size={16} color={c.texteTertiaire} strokeWidth={2.4} />
      </Pressable>
      <View style={styles.actions}>
        <Bouton
          libelle={t('commun.appeler')}
          accessibilityLabel={t('carte.appelerNom', { nom: p.nom })}
          hauteur={50}
          icone={<HiPhone size={18} color={c.texteSurCouleur} />}
          onPress={() => onAppeler(p)}
          style={styles.action}
          testID={`${testID}-appeler`}
        />
        <Bouton
          libelle={t('commun.itineraire')}
          accessibilityLabel={t('carte.itineraireNom', { nom: p.nom })}
          variante="clair"
          hauteur={50}
          icone={<IconeItineraire size={16} color={c.pastilleActionIcone} />}
          onPress={() => onItineraire(p)}
          style={styles.action}
          testID={`${testID}-itineraire`}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  feuille: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 20,
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 12,
    borderRadius: rayons.grandeCarte,
  },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: rayons.pilule },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: CIBLE_TACTILE, padding: 4, borderRadius: rayons.carte },
  vignette: { width: 64, height: 64, borderRadius: rayons.vignette, flexShrink: 0 },
  textes: { flex: 1, gap: 3, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: 140, minHeight: CIBLE_TACTILE },
});
