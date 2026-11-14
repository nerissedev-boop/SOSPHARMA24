import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { distanceKm, t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import {
  BadgeAssurance,
  BadgePosition,
  DUREES,
  HiPhone,
  IconeChevronDroite,
  IconeItineraire,
  PressableAnime,
  Squelette,
  Texte,
  ZoneSquelette,
} from '@/commun/ui';

type Props = {
  nom: string;
  /** Statut de garde (« Ouverte toute la nuit », « Ouverte jusqu'à 02:00 », « Ferme dans 20 min »). */
  libelleStatut: string;
  /** La garde s'arrête avant le matin ou ferme bientôt : statut en ocre (état intermédiaire). */
  ocre: boolean;
  commune: string;
  distanceM: number | null;
  /** Temps de marche déjà filtré par l'écran (null au-delà de 2 km). */
  marcheMin: number | null;
  assurance: boolean;
  /** Pas de position GPS : badge à la place de la distance, et pas d'itinéraire. */
  positionAConfirmer: boolean;
  onPress: () => void;
  /** Absent sans numéro : « Itinéraire » prend toute la largeur. */
  onAppeler?: () => void;
  /** Absent sans position : « Appeler » prend toute la largeur. */
  onItineraire?: () => void;
  testID?: string;
};

/** Ombre douce teintée de rouge profond (maquette : 0 10 30 rgba(127,20,20,0.14)) ; aucune la nuit. */
function ombreTeintee(couleur: string): ViewStyle {
  return { shadowColor: couleur, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 15, elevation: 8 };
}

/** Au-delà, « Itinéraire » ne tient plus à côté d'« Appeler » : les deux boutons s'empilent. */
const ECHELLE_EMPILEMENT = 1.3;

/**
 * Carte « La plus proche de garde » (piste A) : grande carte qui chevauche le bas du bandeau.
 * Étiquette, nom, statut de garde, commune et distance ; toute la partie haute ouvre la fiche,
 * les deux gros boutons agissent tout de suite (Appeler en vert plein, Itinéraire sur fond pâle à icône verte : mêmes couleurs que sur l'Accueil, la garde se reconnaît à l'étiquette et au statut).
 *
 * Mouvement : la carte entre en fondu (220 ms, fil UI) et sort plus vite (160 ms). L'écran lui donne
 * la pharmacie pour clé : quand un filtre change la plus proche, l'ancienne s'efface pendant que la
 * nouvelle apparaît au même endroit, sans glissement. Rien ne bouge si le téléphone supprime les animations.
 */
export function CarteGardeProche({
  nom,
  libelleStatut,
  ocre,
  commune,
  distanceM,
  marcheMin,
  assurance,
  positionAConfirmer,
  onPress,
  onAppeler,
  onItineraire,
  testID,
}: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const { fontScale } = useWindowDimensions();
  const empiles = fontScale >= ECHELLE_EMPILEMENT;
  const titre = t('garde.plusProcheTitre');
  const distance = positionAConfirmer ? null : distanceKm(distanceM) || null;
  const marche = !positionAConfirmer && marcheMin !== null ? t('garde.aPied', { minutes: marcheMin }) : null;
  const details = [commune || null, distance, marche].filter(Boolean).join(' · ');
  const description = [
    `${titre} : ${nom}`,
    libelleStatut,
    commune || null,
    assurance ? t('commun.votreAssurance') : null,
    positionAConfirmer ? t('commun.positionAConfirmer') : distance,
    marche,
  ]
    .filter(Boolean)
    .join(', ');
  const styleBouton = empiles ? styles.boutonEmpile : styles.boutonEnLigne;

  return (
    <Animated.View
      entering={FadeIn.duration(DUREES.glissement).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(DUREES.disparition).reduceMotion(ReduceMotion.System)}
      testID={testID}
      style={[styles.carte, { backgroundColor: c.blocProcheGarde }, estNuit ? null : ombreTeintee(c.rougeProfond)]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={description}
        style={({ pressed }) => [styles.infos, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={styles.haut}>
          <View style={[styles.etiquette, { backgroundColor: c.boutonGardeClair }]}>
            <Texte variante="libelleFort" couleur={c.rougeTexteFort} numberOfLines={1}>
              {titre}
            </Texte>
          </View>
          {/* Flèche : toute la partie haute ouvre la fiche (les boutons, eux, agissent). */}
          <IconeChevronDroite size={18} color={c.texteTertiaire} strokeWidth={2.4} />
        </View>
        <Texte variante="titreModal" numberOfLines={2}>
          {nom}
        </Texte>
        <View style={styles.statut}>
          <View style={[styles.point, { backgroundColor: ocre ? c.ocrePoint : c.rouge }]} />
          <Texte variante="nomPetit" couleur={ocre ? c.ocreTexte : c.rougeTexteFort} style={styles.texteStatut} testID={testID ? `${testID}-statut` : undefined}>
            {libelleStatut}
          </Texte>
        </View>
        {details ? (
          <Texte variante="texte" couleur={c.texteSecondaire} testID={testID ? `${testID}-details` : undefined}>
            {details}
          </Texte>
        ) : null}
        {assurance || positionAConfirmer ? (
          <View style={styles.badges}>
            {assurance ? <BadgeAssurance testID={testID ? `${testID}-assurance` : undefined} /> : null}
            {positionAConfirmer ? <BadgePosition testID={testID ? `${testID}-position` : undefined} /> : null}
          </View>
        ) : null}
      </Pressable>
      {onAppeler || onItineraire ? (
        <View style={[styles.actions, empiles && styles.actionsEmpilees]}>
          {onAppeler ? (
            <BoutonCarte
              libelle={t('commun.appeler')}
              accessibilityLabel={`${t('commun.appeler')} ${nom}`}
              onPress={onAppeler}
              fond={c.vert}
              couleur={c.texteSurCouleur}
              icone={<HiPhone size={20} color={c.texteSurCouleur} />}
              style={styleBouton}
              testID={testID ? `${testID}-appeler` : undefined}
            />
          ) : null}
          {onItineraire ? (
            <BoutonCarte
              libelle={t('commun.itineraire')}
              accessibilityLabel={t('garde.itineraireA11y', { nom })}
              onPress={onItineraire}
              fond={c.boutonBlocSecondaire}
              couleur={estNuit ? c.texte : c.vertTexte}
              icone={<IconeItineraire size={17} color={c.pastilleActionIcone} />}
              style={styleBouton}
              testID={testID ? `${testID}-itineraire` : undefined}
            />
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

type PropsBouton = {
  libelle: string;
  accessibilityLabel: string;
  onPress: () => void;
  fond: string;
  couleur: string;
  icone: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Gros bouton de la carte (52 de haut, arrondi 14) qui se comprime sous le doigt. */
function BoutonCarte({ libelle, accessibilityLabel, onPress, fond, couleur, icone, style, testID }: PropsBouton) {
  return (
    <PressableAnime
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.bouton, { backgroundColor: fond }, style]}
    >
      {icone}
      <Texte variante="boutonGrand" couleur={couleur} numberOfLines={1} style={styles.libelleBouton}>
        {libelle}
      </Texte>
    </PressableAnime>
  );
}

/**
 * Forme de la carte pendant le premier chargement, fidèle à la carte finale (étiquette, nom,
 * deux lignes, deux boutons). Seuls les blocs gris respirent : le fond blanc de la carte reste
 * immobile sur le bandeau rouge.
 */
export function SqueletteCarteGarde() {
  const { couleurs: c, estNuit } = useTheme();
  return (
    <View style={[styles.carte, { backgroundColor: c.blocProcheGarde }, estNuit ? null : ombreTeintee(c.rougeProfond)]}>
      <ZoneSquelette testID="squelette-carte-garde" style={styles.squelette}>
        <Squelette anime={false} largeur={136} hauteur={24} rayon={rayons.pilule} />
        <Squelette anime={false} largeur="72%" hauteur={22} />
        <Squelette anime={false} largeur="46%" hauteur={14} />
        <Squelette anime={false} largeur="64%" hauteur={14} />
        <View style={styles.actions}>
          <Squelette anime={false} hauteur={52} rayon={rayons.moyen} style={styles.boutonSquelette} />
          <Squelette anime={false} hauteur={52} rayon={rayons.moyen} style={styles.boutonSquelette} />
        </View>
      </ZoneSquelette>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { padding: 16, gap: 14, borderRadius: rayons.grandeCarte },
  infos: { gap: 6 },
  haut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  etiquette: { minHeight: 26, paddingHorizontal: 10, justifyContent: 'center', borderRadius: rayons.pilule, flexShrink: 1 },
  statut: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  point: { width: 8, height: 8, borderRadius: 4 },
  texteStatut: { flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  actionsEmpilees: { flexDirection: 'column' },
  bouton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: rayons.moyen,
  },
  boutonEnLigne: { flex: 1 },
  boutonEmpile: { alignSelf: 'stretch' },
  libelleBouton: { flexShrink: 1 },
  squelette: { gap: 10 },
  boutonSquelette: { flex: 1, width: undefined, marginTop: 4 },
});
