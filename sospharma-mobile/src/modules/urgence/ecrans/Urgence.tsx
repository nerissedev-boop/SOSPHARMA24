import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { comparerDistance, distanceKm, t, vibrationAction } from '@/commun/lib';
import { ombres, policeTexte, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  Ecran,
  EnTete,
  Feuille,
  HiPharmacy,
  HiPhone,
  IconeChevronDroite,
  IconeItineraire,
  PressableAnime,
  Texte,
  useNavigationOnglets,
  usePulsation,
} from '@/commun/ui';
import { useTourEnCours } from '@/modules/gardes';
import { useActionsPharmacie } from '@/modules/pharmacies';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { BoutonsUrgence } from '../composants/BoutonsUrgence';

/** Piste A : anneau extérieur, anneau intérieur, puis le disque SOS au centre (diamètres). */
const DIAMETRE_ANNEAU = 300;
const DIAMETRE_ANNEAU_INTERIEUR = 240;
const DIAMETRE_SOS = 180;
/** Halo du bouton SOS : une vague lente (~2 s) qui part du bouton et s'estompe en s'étendant. */
const DUREE_HALO = 2000;
/** Le halo s'arrête au bord de l'anneau extérieur. */
const ECHELLE_MAX_HALO = DIAMETRE_ANNEAU / DIAMETRE_SOS;
/** Textes dans le disque SOS (taille fixe) : agrandissement limité pour qu'ils y tiennent. */
const LOUPE_MAX_DISQUE = 1.3;

/**
 * 08 Urgence (piste A, 11 nov.) : titre et zone centrés, bouton SOS dans ses deux anneaux,
 * bandeau de la garde la plus proche, puis les numéros d'urgence du pays en gros boutons blancs.
 */
function Urgence() {
  const router = useRouter();
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c } = useTheme();
  const { width } = useWindowDimensions();
  const { pays } = usePaysCourant();
  const { zone, libelle: libelleZone } = useZoneCourante();
  const { tour } = useTourEnCours();
  const plusProche = [...(tour?.pharmacies ?? [])]
    .filter((p) => p.statut === 'garde')
    .sort(comparerDistance)[0];
  const echelle = Math.min(1, (width - 40) / DIAMETRE_ANNEAU);
  // Halo qui s'étend depuis le bouton et s'estompe ; immobile (et masqué) si le téléphone
  // demande de supprimer les animations (usePulsation suit ce réglage).
  const halo = usePulsation(true, { duree: DUREE_HALO });
  const styleHalo = useAnimatedStyle(() => {
    const v = halo.valeur.get();
    return { opacity: interpolate(v, [0, 1], [1, 0]), transform: [{ scale: interpolate(v, [0, 1], [1, ECHELLE_MAX_HALO]) }] };
  });
  const actions = useActionsPharmacie();
  // SOS : la garde la plus proche avec « Appeler » et « Itinéraire » ; sans garde connue, la liste.
  const [choixSos, setChoixSos] = useState(false);
  const sos = () => {
    vibrationAction();
    if (plusProche) setChoixSos(true);
    else allerOnglet('garde');
  };
  // Trajet vers la plus proche : temps à pied puis distance ; sans position GPS, « Position à confirmer ».
  const aPied = plusProche && plusProche.marche_min !== null ? t('urgence.aPied', { minutes: plusProche.marche_min }) : null;
  const sansPosition = plusProche?.latitude === null;
  const distance = plusProche && !sansPosition ? distanceKm(plusProche.distance_m) || null : null;

  return (
    <Ecran fond={c.sosFond} barreClaire testID="ecran-urgence">
      <ScrollView contentContainerStyle={styles.contenu}>
        {/* Titre et zone centrés : on voit tout de suite où l'on cherche. */}
        <View style={styles.entete}>
          <EnTete titre={t('urgence.titre')} centre varianteTitre="titreEcran" couleur={c.sosTexte} onRetour={() => allerOnglet('accueil')} />
          {zone ? (
            <Texte variante="corps" couleur={c.sosTexte} aligne="center" numberOfLines={2} testID="urgence-zone">
              {libelleZone}
            </Texte>
          ) : null}
        </View>

        <View style={[styles.cercles, { transform: [{ scale: echelle }] }]}>
          {/* Deux anneaux fixes, halo animé par-dessus : le bouton SOS lui-même ne bouge pas tant qu'on ne le touche pas. */}
          <View pointerEvents="none" style={[styles.anneau, styles.anneauExterieur, { backgroundColor: c.sosAnneauExterieur }]} />
          <View pointerEvents="none" style={[styles.anneau, styles.anneauInterieur, { backgroundColor: c.sosAnneauInterieur }]} />
          {halo.enMarche ? (
            <Animated.View
              pointerEvents="none"
              testID="halo-sos"
              style={[styles.anneau, styles.halo, { backgroundColor: c.sosHalo }, styleHalo]}
            />
          ) : null}
          <PressableAnime
            testID="bouton-sos"
            echelle={0.95}
            onPress={sos}
            accessibilityRole="button"
            accessibilityLabel={`${t('urgence.sos')}, ${t('urgence.sosTexte')}`}
            style={[styles.sos, ombres.sos, { backgroundColor: c.sosBouton }]}
          >
            <Texte style={styles.texteSos} couleur={c.sosBoutonTexte} maxFontSizeMultiplier={LOUPE_MAX_DISQUE}>
              {t('urgence.sos')}
            </Texte>
            <Texte
              variante="petitFort"
              couleur={c.sosBoutonLegende}
              aligne="center"
              style={styles.texteSousSos}
              numberOfLines={3}
              maxFontSizeMultiplier={LOUPE_MAX_DISQUE}
            >
              {t('urgence.sosTexte')}
            </Texte>
          </PressableAnime>
        </View>

        {plusProche ? (
          <PressableAnime
            testID="urgence-plus-proche"
            echelle={0.98}
            vibration
            onPress={() => router.push({ pathname: '/pharmacie/[id]', params: { id: plusProche.id } })}
            accessibilityRole="button"
            accessibilityLabel={[
              `${t('urgence.plusProche')} : ${plusProche.nom}`,
              aPied,
              sansPosition ? t('commun.positionAConfirmer') : distance,
            ]
              .filter(Boolean)
              .join(', ')}
            style={[styles.plusProche, { backgroundColor: c.sosBandeau }]}
          >
            <View style={[styles.pastille, { backgroundColor: c.sosPastille }]}>
              <HiPharmacy size={24} color={c.sosPastilleIcone} />
            </View>
            {/* Grandes polices : chaque ligne se replie, le chevron garde sa place à droite. */}
            <View style={styles.textes}>
              <Texte variante="libelle" couleur={c.sosTexte} numberOfLines={2}>
                {t('urgence.plusProche')}
              </Texte>
              <Texte variante="nomGrand" couleur={c.sosTexte} numberOfLines={2}>
                {plusProche.nom}
              </Texte>
              {aPied || distance || sansPosition ? (
                <View style={styles.trajet}>
                  {aPied ? (
                    <Texte variante="petit" couleur={c.sosTexte} numberOfLines={2}>
                      {aPied}
                    </Texte>
                  ) : null}
                  {sansPosition ? (
                    <Texte variante="petit" couleur={c.sosTexte} numberOfLines={2}>
                      {t('commun.positionAConfirmer')}
                    </Texte>
                  ) : distance ? (
                    <Texte variante="petit" couleur={c.sosTexte} numberOfLines={1}>
                      {aPied ? `· ${distance}` : distance}
                    </Texte>
                  ) : null}
                </View>
              ) : null}
            </View>
            <IconeChevronDroite size={18} color={c.sosTexte} strokeWidth={2.4} />
          </PressableAnime>
        ) : null}

        {/* Numéros de la configuration pays : rien n'est écrit en dur, pas de bouton sans numéro connu. */}
        {pays && pays.urgences.length > 0 ? (
          <View style={styles.aide}>
            <Texte variante="sectionPetite" titre couleur={c.sosTexte}>
              {t('urgence.besoin')}
            </Texte>
            <BoutonsUrgence urgences={pays.urgences} />
          </View>
        ) : null}
      </ScrollView>

      {plusProche ? (
        <Feuille
          visible={choixSos}
          onFermer={() => setChoixSos(false)}
          titre={plusProche.nom}
          message={[t('urgence.plusProche'), distanceKm(plusProche.distance_m), plusProche.marche_min !== null ? t('urgence.aPied', { minutes: plusProche.marche_min }) : null]
            .filter(Boolean)
            .join(' · ')}
          testID="feuille-sos"
          pied={
            <View style={styles.actionsSos}>
              <Bouton
                libelle={t('commun.appeler')}
                accessibilityLabel={`${t('commun.appeler')} ${plusProche.nom}`}
                icone={<HiPhone size={20} color={c.texteSurCouleur} />}
                onPress={() => {
                  setChoixSos(false);
                  actions.appeler(plusProche);
                }}
                testID="sos-appeler"
              />
              {plusProche.latitude === null ? null : (
                <Bouton
                  libelle={t('commun.itineraire')}
                  variante="blanc"
                  icone={<IconeItineraire size={18} color={c.pastilleActionIcone} />}
                  onPress={() => {
                    setChoixSos(false);
                    actions.itineraire(plusProche);
                  }}
                  testID="sos-itineraire"
                />
              )}
              <Bouton libelle={t('urgence.autresGardes')} variante="lien" onPress={() => { setChoixSos(false); allerOnglet('garde'); }} testID="sos-autres" />
            </View>
          }
        />
      ) : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { flexGrow: 1, paddingBottom: 24 },
  entete: { paddingTop: 16, paddingHorizontal: 20 },
  // Le tout est réduit (transform) sur les écrans de moins de 340 px : les anneaux ne débordent jamais.
  cercles: {
    alignSelf: 'center',
    width: DIAMETRE_ANNEAU,
    height: DIAMETRE_ANNEAU,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anneau: { position: 'absolute' },
  anneauExterieur: { width: DIAMETRE_ANNEAU, height: DIAMETRE_ANNEAU, borderRadius: DIAMETRE_ANNEAU / 2 },
  anneauInterieur: { width: DIAMETRE_ANNEAU_INTERIEUR, height: DIAMETRE_ANNEAU_INTERIEUR, borderRadius: DIAMETRE_ANNEAU_INTERIEUR / 2 },
  halo: { width: DIAMETRE_SOS, height: DIAMETRE_SOS, borderRadius: DIAMETRE_SOS / 2 },
  sos: {
    width: DIAMETRE_SOS,
    height: DIAMETRE_SOS,
    borderRadius: DIAMETRE_SOS / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  texteSos: { fontFamily: policeTexte(800), fontSize: 46, lineHeight: 50 },
  texteSousSos: { maxWidth: 130 },
  plusProche: {
    marginTop: 28,
    marginHorizontal: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: rayons.grandeCarte,
  },
  pastille: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  textes: { flex: 1, minWidth: 0, gap: 2 },
  trajet: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 },
  aide: { marginTop: 22, marginHorizontal: 20, gap: 10 },
  actionsSos: { gap: 10 },
});

export default avecErrorBoundary(Urgence, 'Urgence');
