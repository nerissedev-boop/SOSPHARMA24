import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LayoutAnimationConfig, ReduceMotion } from 'react-native-reanimated';

import type { StatutPharmacie } from '../api/schema';
import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import type { TonStatut } from '../regles/libelles';
import { hauteurs } from '../theme/espacements';
import { ombres } from '../theme/ombres';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { DUREES } from './animations';
import { BadgeAssurance } from './BadgeAssurance';
import { BadgePosition } from './BadgePosition';
import { Bouton } from './Bouton';
import { HiPhone } from './icones/healthicons';
import { IconeChevronDroite, IconeItineraire, IconeTelephoneTrait } from './icones/trait';
import { PhotoFondu } from './PhotoFondu';
import { RepereStatut } from './RepereStatut';
import { Texte } from './Texte';

/** Au-delà, « Y aller » ne tient plus à côté d'« Appeler » : les deux boutons s'empilent. */
const ECHELLE_EMPILEMENT = 1.3;
/**
 * Bandeau photo en tête de carte : hauteur fixe (rien ne saute quand l'image arrive), gardée basse
 * parce que chaque point pris ici repousse Appeler vers le bas de l'écran.
 */
const HAUTEUR_PHOTO = 104;
/** Vignette de l'aperçu sur le plan : moins haute que l'état, le nom et la distance réunis, l'aperçu ne grandit pas. */
const TAILLE_VIGNETTE = 56;

type PropsActions = {
  nom: string;
  /** « La nuit, appelez avant de vous déplacer. », juste au-dessus d'Appeler, là où l'on décide. */
  conseil?: boolean;
  /** Absent sans numéro : « Y aller » prend toute la largeur. */
  onAppeler?: () => void;
  /** Absent sans position : « Appeler » prend toute la largeur. */
  onYAller?: () => void;
  testID?: string;
};

/**
 * Appeler (vert plein) et Y aller (fond pâle, icône verte), 56 dp et libellés de 19 px gras, sur
 * tous les écrans. À poser dans une carte de 16 de marge intérieure : les boutons s'arrêtent à 8 du
 * bord, et leur rayon de 12 suit celui de la carte (12 + 8 = 20). Ils s'empilent à 130 % de police.
 */
export function ActionsPharmacie({ nom, conseil = false, onAppeler, onYAller, testID }: PropsActions) {
  const { couleurs: c } = useTheme();
  const { fontScale } = useWindowDimensions();
  const empiles = fontScale >= ECHELLE_EMPILEMENT;
  if (!onAppeler && !onYAller) return null;
  return (
    <>
      {conseil ? (
        <View style={styles.conseil} testID="conseil-garde">
          <IconeTelephoneTrait size={16} color={c.pastilleActionIcone} />
          <Texte variante="petit" couleur={c.texteSecondaire} style={styles.flexible}>
            {t('garde.conseil')}
          </Texte>
        </View>
      ) : null}
      <View style={[styles.actions, empiles && styles.actionsEmpilees]}>
        {onAppeler ? (
          <Bouton
            libelle={t('commun.appeler')}
            accessibilityLabel={`${t('commun.appeler')} ${nom}`}
            onPress={onAppeler}
            hauteur={hauteurs.boutonAction}
            typo="boutonAction"
            icone={<HiPhone size={22} color={c.texteSurCouleur} />}
            style={empiles ? null : styles.appeler}
            testID={testID ? `${testID}-appeler` : undefined}
          />
        ) : null}
        {onYAller ? (
          <Bouton
            libelle={t('commun.yAller')}
            accessibilityLabel={t('commun.yAllerA11y', { nom })}
            variante="blanc"
            onPress={onYAller}
            hauteur={hauteurs.boutonAction}
            typo="boutonAction"
            icone={<IconeItineraire size={22} color={c.pastilleActionIcone} />}
            style={empiles ? null : styles.yAller}
            testID={testID ? `${testID}-y-aller` : undefined}
          />
        ) : null}
      </View>
    </>
  );
}

type Props = {
  /** Identifiant de la pharmacie : quand il change, l'ancienne carte s'efface et la nouvelle apparaît au même endroit. */
  id: string;
  nom: string;
  statut: StatutPharmacie;
  ton?: TonStatut;
  /** État écrit après le repère (« Ouverte 24h/24 », « De garde · toute la nuit »), lu tel quel. */
  libelleStatut: string;
  distanceM: number | null;
  /** Temps de marche déjà filtré par l'écran (null au-delà de l'utile). */
  marcheMin: number | null;
  /** Adresse écrite comme un repère, avec la commune (« Face à la mairie · Cocody »). */
  repere?: string | null;
  /**
   * Photo de façade validée (`photo_url`), pour reconnaître la devanture en arrivant. Sans photo, rien :
   * pas de devanture dessinée sur la carte. Variante compacte (plan) : vignette de 56 à gauche du nom.
   */
  photoUrl?: string | null;
  /** Commune ajoutée après la distance quand le repère n'est pas affiché (variante compacte). */
  commune?: string | null;
  /** Variante de la Carte : sans repère, nom un peu plus petit. */
  compacte?: boolean;
  /** Étiquette « La plus proche » ; false pour une pharmacie choisie sur le plan. */
  plusProche?: boolean;
  assurance?: boolean;
  /** Pas de position GPS : badge à la place de la distance, et pas de « Y aller ». */
  positionAConfirmer?: boolean;
  conseil?: boolean;
  /** Toute la partie haute ouvre la fiche ; les boutons, eux, agissent. */
  onPress?: () => void;
  onAppeler?: () => void;
  onYAller?: () => void;
  /** Ombre de la carte posée sur le plan (plus marquée) au lieu de celle des écrans à bandeau. */
  surPlan?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Carte « la plus proche » (refonte v2, 14 nov.), la même sur l'Accueil, la Garde, l'Urgence et la
 * Carte : la photo de façade quand elle est validée, l'état, le nom en grand, la distance, le repère,
 * un lien discret vers la fiche, puis Appeler et Y aller. C'est le seul élément de l'écran qui porte
 * une ombre (le jour). Sous le doigt, la carte se teinte comme une ligne de liste.
 *
 * Mouvement : quand la plus proche change (filtre, position), fondu croisé au même endroit (entrée
 * 220 ms, sortie 160 ms, fil UI). Rien au premier affichage, ni quand le téléphone supprime les animations.
 */
export function CartePlusProche({
  id,
  nom,
  statut,
  ton,
  libelleStatut,
  distanceM,
  marcheMin,
  repere,
  photoUrl,
  commune,
  compacte = false,
  plusProche = true,
  assurance = false,
  positionAConfirmer = false,
  conseil = false,
  onPress,
  onAppeler,
  onYAller,
  surPlan = false,
  style,
  testID,
}: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const [appuyee, setAppuyee] = useState(false);
  const photo = compacte ? null : photoUrl || null;
  const repereVisible = compacte ? null : repere || null;
  const distance = positionAConfirmer ? null : distanceKm(distanceM) || null;
  const marche = distance && marcheMin !== null ? t('garde.aPied', { minutes: marcheMin }) : null;
  const suite = [marche, repereVisible ? null : commune || null].filter(Boolean).join(' · ');
  const description = [
    plusProche ? `${t('commun.laPlusProche')} : ${nom}` : nom,
    libelleStatut,
    assurance ? t('commun.votreAssurance') : null,
    positionAConfirmer ? t('commun.positionAConfirmer') : distance,
    suite || null,
    repereVisible,
  ]
    .filter(Boolean)
    .join(', ');
  const ombre = estNuit ? null : surPlan ? ombres.fiche : ombres.carte;
  // Variante compacte (aperçu sur le plan) : petite vignette à gauche, l'aperçu ne grandit pas et Appeler ne bouge pas.
  const vignette = compacte ? photoUrl || null : null;

  const entete = (
    <>
      <View style={styles.haut}>
        <RepereStatut statut={statut} ton={ton} libelle={libelleStatut} testID={testID ? `${testID}-statut` : undefined} />
        {plusProche ? (
          <Texte variante="libelleMoyen" couleur={c.texteSecondaire}>
            {t('commun.laPlusProche')}
          </Texte>
        ) : null}
      </View>
      <Texte variante={compacte ? 'titre' : 'nomPlusProche'} titre numberOfLines={3} style={styles.nom}>
        {nom}
      </Texte>
      {distance || suite || positionAConfirmer ? (
        <Texte variante="texte" couleur={c.texteSecondaire} testID={testID ? `${testID}-details` : undefined}>
          {distance ? (
            <Texte variante="distanceGrande" style={styles.chiffres}>
              {distance}
            </Texte>
          ) : null}
          {distance && suite ? ' · ' : null}
          {suite}
        </Texte>
      ) : null}
    </>
  );

  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        key={id}
        entering={FadeIn.duration(DUREES.glissement).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(DUREES.disparition).reduceMotion(ReduceMotion.System)}
        style={[styles.carte, { backgroundColor: appuyee ? c.carteAppuyee : c.blocProche }, ombre, style]}
        testID={testID}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() => setAppuyee(true)}
          onPressOut={() => setAppuyee(false)}
          disabled={!onPress}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={description}
          accessibilityHint={onPress ? t('carte.ouvrirFicheIndice') : undefined}
          style={styles.infos}
        >
          {photo ? (
            // Si l'image ne charge pas, le bandeau disparaît plutôt que de rester gris.
            <PhotoFondu uri={photo} repli={null} style={[styles.photo, { backgroundColor: c.surface }]} testID={testID ? `${testID}-photo` : undefined} />
          ) : null}
          {vignette ? (
            // Si l'image ne charge pas, la vignette disparaît et le texte reprend toute la largeur.
            <View style={styles.avecVignette}>
              <PhotoFondu uri={vignette} repli={null} style={[styles.vignette, { backgroundColor: c.surface }]} testID={testID ? `${testID}-vignette` : undefined} />
              <View style={styles.colonne}>{entete}</View>
            </View>
          ) : (
            entete
          )}
          {repereVisible ? (
            <Texte variante="petit" couleur={c.texteSecondaire} testID={testID ? `${testID}-repere` : undefined}>
              {repereVisible}
            </Texte>
          ) : null}
          {assurance || positionAConfirmer ? (
            <View style={styles.badges}>
              {assurance ? <BadgeAssurance testID={testID ? `${testID}-assurance` : undefined} /> : null}
              {positionAConfirmer ? <BadgePosition testID={testID ? `${testID}-position` : undefined} /> : null}
            </View>
          ) : null}
          {/* Simple indice : c'est toute la partie haute, bien plus grande que 48 dp, qui ouvre la fiche. */}
          {onPress ? (
            <View style={styles.lienFiche} testID={testID ? `${testID}-lien-fiche` : undefined}>
              <Texte variante="petitFort" couleur={c.vertTexte} style={styles.texteLien}>
                {t('carte.lienFiche')}
              </Texte>
              <IconeChevronDroite size={16} color={c.vertTexte} strokeWidth={2.6} />
            </View>
          ) : null}
        </Pressable>
        <ActionsPharmacie
          nom={nom}
          conseil={conseil}
          onAppeler={onAppeler}
          onYAller={positionAConfirmer ? undefined : onYAller}
          testID={testID}
        />
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  carte: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, borderRadius: rayons.surface },
  infos: { gap: 4 },
  // À 8 du bord de la carte, rayon 12 : ses coins suivent ceux de la carte, comme les boutons.
  photo: { height: HAUTEUR_PHOTO, marginTop: -6, marginHorizontal: -8, marginBottom: 8, borderRadius: rayons.touche },
  avecVignette: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  vignette: { width: TAILLE_VIGNETTE, height: TAILLE_VIGNETTE, borderRadius: rayons.touche },
  colonne: { flex: 1, minWidth: 0, gap: 4 },
  haut: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 10, rowGap: 4 },
  nom: { marginTop: 2 },
  chiffres: { fontVariant: ['tabular-nums'] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  lienFiche: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, marginTop: 2 },
  texteLien: { flexShrink: 1 },
  conseil: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  flexible: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, marginHorizontal: -8 },
  actionsEmpilees: { flexDirection: 'column' },
  appeler: { flex: 1.25 },
  yAller: { flex: 1 },
});
