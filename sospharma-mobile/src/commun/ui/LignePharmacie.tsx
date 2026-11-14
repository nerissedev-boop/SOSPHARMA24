import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { StatutPharmacie } from '../api/schema';
import type { TonStatut } from '../regles/libelles';
import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { transitionListe } from './animations';
import { BadgeAssurance } from './BadgeAssurance';
import { BadgePosition } from './BadgePosition';
import { HiPhone } from './icones/healthicons';
import { IconeChevronDroite } from './icones/trait';
import { RepereStatut } from './RepereStatut';
import { Texte } from './Texte';

/** Bouton d'appel des lignes denses : 40 de diamètre, zone tactile portée à 48. */
const APPEL_DENSE = 40;

export type PropsLignePharmacie = {
  nom: string;
  statut: StatutPharmacie;
  /** Libellé du statut : 2e ligne de la variante dense, et toujours lu par le lecteur d'écran. */
  libelleStatut: string;
  distanceM: number | null;
  marcheMin: number | null;
  /** Quartier ou commune, écrit sur chaque ligne. */
  commune?: string | null;
  /**
   * dense (Accueil, recherche) : nom et distance, puis l'état et le quartier ;
   * garde (listes de garde) : nom, puis distance et quartier, puis le numéro, comme la liste de l'Ordre.
   */
  variante?: 'dense' | 'garde';
  /** Numéro déjà mis en forme (variante garde). */
  numero?: string | null;
  /** Garde qui s'arrête avant le matin (« jusqu'à 04:00 ») : seule mention en ocre de la ligne. */
  restriction?: string | null;
  /** Ton calculé (tonAffiche) : « ocre » quand la pharmacie ferme dans moins de 30 min. */
  ton?: TonStatut;
  onPress?: () => void;
  /** Bouton rond « Appeler » à droite ; absent sans numéro. */
  onAppeler?: () => void;
  /** Badge « Votre assurance ». */
  assurance?: boolean;
  /** Badge « Position à confirmer » : pas de position GPS, donc ni distance ni itinéraire. */
  positionAConfirmer?: boolean;
  /** Temps de marche affiché seulement en deçà de cette distance (mètres) ; absent : toujours. */
  marcheJusquA?: number;
  /** Première ligne de la surface : coins hauts arrondis, pas de filet au-dessus. */
  premiere?: boolean;
  /** Dernière ligne de la surface : coins bas arrondis. */
  derniere?: boolean;
  /** Dans une liste qui se réorganise (filtre changé) : la ligne glisse vers sa place, s'efface en sortant. */
  animee?: boolean;
  testID?: string;
};

/**
 * Ligne d'une liste imprimée (refonte v2) : une seule surface blanche par liste, un filet entre deux
 * lignes, ni carte ni ombre par ligne, ni vignette. Le nom prend toute la largeur. Un petit chevron
 * tout à droite dit que la ligne ouvre la fiche.
 * Pas d'entrée en cascade : une liste qui vient du cache s'affiche telle quelle.
 */
export function LignePharmacie({
  nom,
  statut,
  libelleStatut,
  distanceM,
  marcheMin,
  commune,
  variante = 'dense',
  numero,
  restriction,
  ton,
  onPress,
  onAppeler,
  assurance = false,
  positionAConfirmer = false,
  marcheJusquA,
  premiere = true,
  derniere = true,
  animee = false,
  testID,
}: PropsLignePharmacie) {
  const { couleurs: c } = useTheme();
  // Sous le doigt, la ligne se teinte de vert pâle : l'appui est confirmé même sur un téléphone lent.
  const [appuyee, setAppuyee] = useState(false);
  const distance = positionAConfirmer ? '' : distanceKm(distanceM);
  const marche = distance && marcheMin !== null && (marcheJusquA === undefined || (distanceM ?? Infinity) < marcheJusquA) ? t('commun.min', { valeur: marcheMin }) : null;
  const description = [nom, libelleStatut, restriction, assurance ? t('commun.votreAssurance') : null, positionAConfirmer ? t('commun.positionAConfirmer') : distance, commune]
    .filter(Boolean)
    .join(', ');
  const garde = variante === 'garde';
  const suite = [marche, commune].filter(Boolean).join(' · ');

  const badges =
    assurance || positionAConfirmer ? (
      <View style={styles.badges}>
        {assurance ? <BadgeAssurance petit testID={testID ? `${testID}-assurance` : undefined} /> : null}
        {positionAConfirmer ? <BadgePosition petit testID={testID ? `${testID}-position` : undefined} /> : null}
      </View>
    ) : null;

  return (
    <Animated.View
      layout={animee ? transitionListe.layout : undefined}
      exiting={animee ? transitionListe.exiting : undefined}
      style={[
        styles.ligne,
        { backgroundColor: appuyee ? c.carteAppuyee : c.carte },
        premiere && styles.haut,
        derniere && styles.bas,
      ]}
      testID={testID}
    >
      {premiere ? null : <View style={[styles.filet, { backgroundColor: c.separateur }]} />}
      <Pressable
        onPress={onPress}
        onPressIn={() => setAppuyee(true)}
        onPressOut={() => setAppuyee(false)}
        accessibilityRole="button"
        accessibilityLabel={description}
        accessibilityHint={onPress ? t('carte.ouvrirFicheIndice') : undefined}
        style={[styles.zone, garde ? styles.zoneGarde : styles.zoneDense]}
      >
        {garde ? (
          <>
            <Texte variante="nom">{nom}</Texte>
            {distance || suite ? (
              <Texte variante="petit" couleur={c.texteSecondaire}>
                {distance ? (
                  <Texte variante="petitFort" couleur={c.texte} style={styles.chiffres}>
                    {distance}
                  </Texte>
                ) : null}
                {distance && suite ? ' · ' : null}
                {suite}
              </Texte>
            ) : null}
            {numero || restriction ? (
              <Texte variante="petitFort" style={styles.chiffres} testID={testID ? `${testID}-numero` : undefined}>
                {numero}
                {numero && restriction ? ' · ' : null}
                {restriction ? (
                  <Texte variante="petitFort" couleur={c.ocreTexte}>
                    {restriction}
                  </Texte>
                ) : null}
              </Texte>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.premiereLigne}>
              <Texte variante="nomPetit" style={styles.flexible}>
                {nom}
              </Texte>
              {distance ? (
                <Texte variante="petitFort" couleur={c.texte} style={styles.chiffres}>
                  {distance}
                </Texte>
              ) : null}
            </View>
            <View style={styles.secondeLigne}>
              <RepereStatut statut={statut} ton={ton} libelle={libelleStatut} variante="petit" numberOfLines={1} testID={testID ? `${testID}-statut` : undefined} />
              {commune ? (
                <Texte variante="petit" couleur={c.texteSecondaire} numberOfLines={1} style={styles.commune}>
                  {`· ${commune}`}
                </Texte>
              ) : null}
            </View>
          </>
        )}
        {badges}
      </Pressable>
      {onAppeler ? (
        <Pressable
          onPress={onAppeler}
          accessibilityRole="button"
          accessibilityLabel={`${t('commun.appeler')} ${nom}`}
          hitSlop={garde ? undefined : (CIBLE_TACTILE - APPEL_DENSE) / 2}
          testID={testID ? `${testID}-appeler` : undefined}
          style={({ pressed }) => [
            styles.appel,
            garde ? styles.appelGarde : styles.appelDense,
            { backgroundColor: c.boutonBlocSecondaire, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <HiPhone size={garde ? 22 : 20} color={c.pastilleActionIcone} />
        </Pressable>
      ) : null}
      {onPress ? (
        // Le chevron prolonge la zone de la ligne (même appui, même teinte) ; le lecteur d'écran ne
        // le voit pas, la ligne porte déjà le libellé et l'indice.
        <Pressable
          onPress={onPress}
          onPressIn={() => setAppuyee(true)}
          onPressOut={() => setAppuyee(false)}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.chevron}
          testID={testID ? `${testID}-chevron` : undefined}
        >
          <IconeChevronDroite size={16} color={c.texteTertiaire} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  haut: { borderTopLeftRadius: rayons.surface, borderTopRightRadius: rayons.surface },
  bas: { borderBottomLeftRadius: rayons.surface, borderBottomRightRadius: rayons.surface },
  /** Filet d'1 px dans la largeur du texte : un aplat, pas une bordure (charte). */
  filet: { position: 'absolute', top: 0, left: 14, right: 14, height: 1 },
  zone: { flex: 1, minWidth: 0, minHeight: CIBLE_TACTILE, justifyContent: 'center' },
  zoneDense: { paddingVertical: 10, gap: 2 },
  zoneGarde: { paddingVertical: 12, gap: 2 },
  premiereLigne: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  secondeLigne: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  commune: { flexShrink: 1 },
  flexible: { flex: 1 },
  chiffres: { fontVariant: ['tabular-nums'] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  appel: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  appelDense: { width: APPEL_DENSE, height: APPEL_DENSE, borderRadius: APPEL_DENSE / 2 },
  appelGarde: { width: CIBLE_TACTILE, height: CIBLE_TACTILE, borderRadius: CIBLE_TACTILE / 2 },
  // Collé au bouton d'appel (l'écart de la ligne est de 12) et au bord droit : il ne prend pas de place au nom.
  chevron: { alignSelf: 'stretch', justifyContent: 'center', marginLeft: -6, marginRight: -6, paddingHorizontal: 2 },
});
