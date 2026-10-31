import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { StatutPharmacie } from '../api/schema';
import type { TonStatut } from '../regles/libelles';
import { estInactive } from '../regles/statut';
import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import { CIBLE_TACTILE } from '../theme/espacements';
import { ombres } from '../theme/ombres';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { apparitionLigne, transitionListe, useAppui } from './animations';
import { BadgeAssurance } from './BadgeAssurance';
import { BadgePosition } from './BadgePosition';
import { DistanceMarche } from './DistanceMarche';
import { FacadeIllustree } from './FacadeIllustree';
import { HiPhone } from './icones/healthicons';
import { IconeChevronDroite } from './icones/trait';
import { PastilleStatut } from './PastilleStatut';
import { PhotoFondu } from './PhotoFondu';
import { Texte } from './Texte';

export type PropsLignePharmacie = {
  nom: string;
  statut: StatutPharmacie;
  /** Libellé du statut : 2e ligne visible (sauf si `detail` est donné) et toujours lu par le lecteur d'écran. */
  libelleStatut: string;
  distanceM: number | null;
  marcheMin: number | null;
  onPress?: () => void;
  /** Bouton rond « Appeler » à droite (listes) ; absent dans les favoris. */
  onAppeler?: () => void;
  /** Ton calculé (tonAffiche) : « ocre » quand la pharmacie ferme dans moins de 30 min. */
  ton?: TonStatut;
  /** Variante « favori » du profil : pastille 38 (vignette 48), distance seule. */
  variante?: 'liste' | 'favori';
  iconeMarche?: boolean;
  /** Position dans la liste : la ligne apparaît en cascade (fondu et glissement). Absent : pas d'animation. */
  rang?: number;
  /**
   * Photo de façade : vignette 56 × 56 à la place de la pastille de statut. `null` (pas encore
   * de photo validée) : devanture dessinée. Absent : pastille de statut.
   */
  photoUrl?: string | null;
  /**
   * 2e ligne visible à la place du statut (écran Garde : « Cocody », ou « Cocody · ouverte jusqu'à 02:00 »).
   * Le statut complet reste dans le libellé d'accessibilité.
   */
  detail?: string;
  /** 2e ligne en ocre (garde qui s'arrête avant le matin). */
  detailOcre?: boolean;
  /** Badge « Votre assurance » sous la 2e ligne. */
  assurance?: boolean;
  /** Badge « Position à confirmer » : pas de position GPS, donc ni distance ni itinéraire. */
  positionAConfirmer?: boolean;
  /** Temps de marche affiché seulement en deçà de cette distance (mètres) ; absent : toujours. */
  marcheJusquA?: number;
  /** Halo pulsé autour des pastilles de garde (par défaut dans les listes). */
  pulsation?: boolean;
  testID?: string;
};

/**
 * Ligne de liste des maquettes Accueil, Garde et Profil : carte blanche arrondie (16) posée sur
 * le fond clair, sans bordure ni séparateur ; l'écran espace les cartes de 8.
 */
export function LignePharmacie({
  nom,
  statut,
  libelleStatut,
  distanceM,
  marcheMin,
  onPress,
  onAppeler,
  variante = 'liste',
  iconeMarche = true,
  ton,
  rang,
  photoUrl,
  detail,
  detailOcre = false,
  assurance = false,
  positionAConfirmer = false,
  marcheJusquA,
  pulsation,
  testID,
}: PropsLignePharmacie) {
  const { couleurs: c, estNuit } = useTheme();
  const couleurStatut = ton === 'ocre' ? c.ocreTexte : statut === 'garde' ? c.rougeTexteFort : statut === 'ouverte' ? c.vertTexte : statut === 'inconnue' ? c.texteSecondaire : c.texteTertiaire;
  const couleurDetail = detailOcre ? c.ocreTexte : detail !== undefined ? c.texteSecondaire : couleurStatut;
  const favori = variante === 'favori';
  const description = [nom, libelleStatut, assurance ? t('commun.votreAssurance') : null, positionAConfirmer ? t('commun.positionAConfirmer') : distanceKm(distanceM)].filter(Boolean).join(', ');
  // La carte entière se comprime sous le doigt (retour tactile façon cartes).
  const appui = useAppui(0.98);
  // Sous le doigt, la carte se teinte de vert pâle : l'appui est confirmé même sur un téléphone lent.
  const [appuyee, setAppuyee] = useState(false);
  const marcheVisible = marcheJusquA === undefined || (distanceM !== null && distanceM < marcheJusquA) ? marcheMin : null;
  return (
    <Animated.View
      entering={apparitionLigne(rang)}
      // Dans une liste animée, les cartes glissent vers leur place quand le filtre change.
      layout={rang === undefined ? undefined : transitionListe.layout}
      exiting={rang === undefined ? undefined : transitionListe.exiting}
      style={[styles.ligne, favori && styles.ligneFavori, { backgroundColor: appuyee ? c.carteAppuyee : c.carte }, !estNuit && ombres.carte, appui.style]}
      testID={testID}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          setAppuyee(true);
          appui.onPressIn();
        }}
        onPressOut={() => {
          setAppuyee(false);
          appui.onPressOut();
        }}
        accessibilityRole="button"
        accessibilityLabel={description}
        style={styles.zone}
      >
        {photoUrl ? (
          <PhotoFondu
            uri={photoUrl}
            style={[styles.vignette, favori && styles.vignetteFavori, { backgroundColor: c.surface }]}
            testID={testID ? `${testID}-photo` : undefined}
          />
        ) : photoUrl === null ? (
          <FacadeIllustree taille="vignette" style={[styles.vignette, favori && styles.vignetteFavori]} testID={testID ? `${testID}-facade` : undefined} />
        ) : (
          <PastilleStatut
            statut={statut}
            pulsation={pulsation ?? !favori}
            ton={ton === 'ocre' ? 'ocre' : undefined}
            taille={favori ? 38 : 40}
            tailleIcone={favori ? (estInactive(statut) ? 22 : 24) : estInactive(statut) ? 24 : 26}
          />
        )}
        <View style={styles.textes}>
          <Texte variante={favori ? 'nom' : 'nomPetit'} numberOfLines={favori ? 1 : 2}>
            {nom}
          </Texte>
          <Texte variante={detail !== undefined ? 'petit' : 'libelleMoyen'} couleur={couleurDetail} numberOfLines={1}>
            {detail ?? libelleStatut}
          </Texte>
          {assurance ? <BadgeAssurance petit testID={testID ? `${testID}-assurance` : undefined} /> : null}
          {positionAConfirmer ? <BadgePosition petit testID={testID ? `${testID}-position` : undefined} /> : null}
        </View>
        {favori ? (
          <Texte variante="boutonPetit" style={styles.distanceFavori}>
            {distanceKm(distanceM)}
          </Texte>
        ) : (
          <DistanceMarche distanceM={distanceM} marcheMin={marcheVisible} icone={iconeMarche} />
        )}
        {/* Flèche : la carte s'ouvre (le rond vert, lui, appelle tout de suite). */}
        {onPress ? <IconeChevronDroite size={16} color={c.texteTertiaire} strokeWidth={2.4} /> : null}
      </Pressable>
      {onAppeler ? (
        <Pressable
          onPress={onAppeler}
          accessibilityRole="button"
          accessibilityLabel={`${t('commun.appeler')} ${nom}`}
          testID={testID ? `${testID}-appeler` : undefined}
          style={({ pressed }) => [styles.appel, { backgroundColor: c.pastilleAction, opacity: pressed ? 0.8 : 1 }]}
        >
          <HiPhone size={20} color={c.pastilleActionIcone} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: rayons.carte,
  },
  ligneFavori: { minHeight: 58, paddingLeft: 10, paddingRight: 14 },
  zone: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, minHeight: CIBLE_TACTILE },
  vignette: { width: 56, height: 56, borderRadius: rayons.vignette, flexShrink: 0 },
  vignetteFavori: { width: 48, height: 48 },
  textes: { flex: 1, gap: 3, minWidth: 0 },
  distanceFavori: { fontSize: 13 },
  appel: {
    width: CIBLE_TACTILE,
    height: CIBLE_TACTILE,
    borderRadius: CIBLE_TACTILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
