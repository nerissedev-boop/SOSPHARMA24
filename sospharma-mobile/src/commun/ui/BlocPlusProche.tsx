import { Pressable, StyleSheet, View } from 'react-native';

import type { StatutPharmacie } from '../api/schema';
import { distanceKm } from '../lib/format';
import { t } from '../lib/i18n';
import { ombres } from '../theme/ombres';
import { rayons } from '../theme/rayons';
import { useTheme } from '../theme/Theme';
import { BadgeAssurance } from './BadgeAssurance';
import { Bouton } from './Bouton';
import { DistanceMarche } from './DistanceMarche';
import { FacadeIllustree } from './FacadeIllustree';
import { HiPhone } from './icones/healthicons';
import { IconeItineraire } from './icones/trait';
import { PastilleStatut } from './PastilleStatut';
import { PhotoFondu } from './PhotoFondu';
import { Texte } from './Texte';

type Props = {
  titre: string;
  nom: string;
  statut: StatutPharmacie;
  /** Libellé du statut : 2e ligne visible (sauf si `detail` est donné) et toujours lu par le lecteur d'écran. */
  libelleStatut: string;
  distanceM: number | null;
  marcheMin: number | null;
  /** Variante garde : fond rouge clair, titre rouge, pastille rouge avec badge 24. */
  garde?: boolean;
  /**
   * Photo de façade : bandeau photo (108 de haut) en tête de carte, avec l'étiquette rouge
   * `etiquettePhoto` posée en haut à gauche, à la place du titre et de la pastille. `null` (pas
   * encore de photo validée) : même bandeau avec la devanture dessinée. Absent : titre et pastille.
   */
  photoUrl?: string | null;
  /** Texte de l'étiquette posée sur la photo (par défaut le titre). */
  etiquettePhoto?: string;
  /** 2e ligne visible à la place du statut (écran Garde : la commune). */
  detail?: string;
  /** 2e ligne en ocre (garde qui s'arrête avant le matin). */
  detailOcre?: boolean;
  /** Badge « Votre assurance » à côté de la 2e ligne. */
  assurance?: boolean;
  /** Temps de marche affiché seulement en deçà de cette distance (mètres) ; absent : toujours. */
  marcheJusquA?: number;
  onPress?: () => void;
  onAppeler?: () => void;
  onItineraire?: () => void;
  testID?: string;
};

/**
 * Bloc « La plus proche ouverte » ou « La plus proche de garde » : grande carte arrondie (20),
 * blanche sur fond clair, détachée par une ombre très légère (pas de bordure).
 */
export function BlocPlusProche({
  titre,
  nom,
  statut,
  libelleStatut,
  distanceM,
  marcheMin,
  garde = false,
  photoUrl,
  etiquettePhoto,
  detail,
  detailOcre = false,
  assurance = false,
  marcheJusquA,
  onPress,
  onAppeler,
  onItineraire,
  testID,
}: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const ombre = estNuit ? null : ombres.carte;
  const couleurStatut = statut === 'garde' ? c.rougeTexteFort : statut === 'ouverte' ? c.vertTexte : c.texteTertiaire;
  const couleurDetail = detailOcre ? c.ocreTexte : detail !== undefined ? c.texteSecondaire : couleurStatut;
  const marcheVisible = marcheJusquA === undefined || (distanceM !== null && distanceM < marcheJusquA) ? marcheMin : null;
  const avecPhoto = photoUrl !== undefined;
  const description = [`${titre} : ${nom}`, libelleStatut, assurance ? t('commun.votreAssurance') : null, distanceKm(distanceM)]
    .filter(Boolean)
    .join(', ');

  const secondaire = (
    <View style={styles.secondaire}>
      <Texte variante={detail !== undefined ? 'petit' : 'petitFort'} couleur={couleurDetail} numberOfLines={1} style={styles.detail}>
        {detail ?? libelleStatut}
      </Texte>
      {assurance ? <BadgeAssurance testID={testID ? `${testID}-assurance` : undefined} /> : null}
    </View>
  );

  return (
    <View
      testID={testID}
      style={[styles.bloc, avecPhoto && styles.blocPhoto, { backgroundColor: garde ? c.blocProcheGarde : c.blocProche }, ombre]}
    >
      {avecPhoto ? null : (
        <Texte variante="libelleFort" couleur={garde ? c.blocProcheGardeTitre : c.blocProcheTitre}>
          {titre}
        </Texte>
      )}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={description}
        style={({ pressed }) => [styles.ouvrir, { opacity: pressed ? 0.75 : 1 }]}
      >
        {avecPhoto ? (
          <View style={[styles.photo, { backgroundColor: c.surface }]}>
            {photoUrl ? (
              <PhotoFondu uri={photoUrl} style={StyleSheet.absoluteFill} testID={testID ? `${testID}-photo` : undefined} />
            ) : (
              <FacadeIllustree taille="grande" style={StyleSheet.absoluteFill} testID={testID ? `${testID}-facade` : undefined} />
            )}
            <View style={[styles.etiquette, { backgroundColor: c.rouge }]}>
              <Texte variante="libelleFort" couleur={c.blanc}>
                {etiquettePhoto ?? titre}
              </Texte>
            </View>
          </View>
        ) : null}
        <View style={[styles.ligne, avecPhoto && styles.lignePhoto]}>
          {avecPhoto ? null : <PastilleStatut statut={statut} taille={46} tailleIcone={30} badge24={statut === 'garde'} />}
          <View style={styles.textes}>
            <Texte variante="nomGrand" numberOfLines={2} style={avecPhoto ? styles.nomPhoto : undefined}>
              {nom}
            </Texte>
            {secondaire}
          </View>
          <DistanceMarche distanceM={distanceM} marcheMin={marcheVisible} grande />
        </View>
      </Pressable>
      <View style={[styles.actions, avecPhoto && styles.actionsPhoto]}>
        <Bouton
          libelle={t('commun.appeler')}
          accessibilityLabel={`${t('commun.appeler')} ${nom}`}
          onPress={onAppeler}
          hauteur={avecPhoto ? 48 : estNuit ? 46 : 44}
          typo="boutonPetit"
          icone={<HiPhone size={18} color={c.blanc} />}
          style={styles.action}
          testID={testID ? `${testID}-appeler` : undefined}
        />
        <Bouton
          libelle={t('commun.itineraire')}
          variante="blanc"
          onPress={onItineraire}
          hauteur={avecPhoto ? 48 : estNuit ? 46 : 44}
          icone={<IconeItineraire size={16} color={c.pastilleActionIcone} />}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { padding: 14, gap: 12, borderRadius: rayons.grandeCarte },
  blocPhoto: { paddingTop: 10, paddingHorizontal: 10, paddingBottom: 14 },
  ouvrir: { gap: 12 },
  photo: { height: 108, borderRadius: rayons.moyen, overflow: 'hidden' },
  etiquette: {
    position: 'absolute',
    top: 10,
    left: 10,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: rayons.pilule,
    justifyContent: 'center',
  },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lignePhoto: { paddingHorizontal: 6 },
  textes: { flex: 1, gap: 4, minWidth: 0 },
  nomPhoto: { fontSize: 17, lineHeight: 22 },
  secondaire: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  detail: { flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionsPhoto: { paddingHorizontal: 4 },
  action: { flex: 1 },
});
