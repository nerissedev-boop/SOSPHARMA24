import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { reactionPour } from '@/commun/api';
import {
  dateCourte,
  distanceKm,
  heureLocale,
  localeActive,
  t,
  telephoneAffiche,
  usePreferences,
  useSessionAgent,
  vibrationLegere,
  vibrationSucces,
} from '@/commun/lib';
import { CIBLE_TACTILE, ombres, rayons, useTheme } from '@/commun/theme';
import {
  apparitionLigne,
  avecErrorBoundary,
  BadgePosition,
  Bouton,
  BoutonIcone,
  DUREES,
  Ecran,
  EtatVide,
  FacadeIllustree,
  HiPhone,
  IconeBulle,
  IconeCoche,
  IconeCoeur,
  IconeEtoile,
  IconeHorloge,
  IconeLieu,
  IconeNaviguer,
  IconePartage,
  IconeRetour,
  IconeTelephoneTrait,
  PhotoFondu,
  PressableAnime,
  Texte,
  transitionListe,
  useMargeBas,
  useRetour,
} from '@/commun/ui';
import { useFavori } from '@/modules/profil';
import { usePaysCourant } from '@/modules/territoire';

import { AssurancesFiche } from '../composants/AssurancesFiche';
import { HorairesFiche } from '../composants/HorairesFiche';
import { SqueletteFichePharmacie } from '../composants/SqueletteFichePharmacie';
import { useActionsPharmacie } from '../hooks/useActions';
import { accepteMesAssurances, useMesAssurances } from '../hooks/useAssurances';
import { useLibelleStatut, usePharmacie, useTonStatut } from '../hooks/usePharmacies';

/** Photo de façade en tête (maquette piste A). */
const HAUTEUR_PHOTO = 250;
/** La grande carte remonte sur le bas de la photo. */
const CHEVAUCHEMENT = 36;
/** Boutons ronds du haut (retour, partager, favori), leur marge et leur écart. */
const BOUTON_HAUT = 44;
const MARGE_HAUT = 16;
const ECART_HAUT = 8;
/** Hauteur des boutons d'action ; WhatsApp est un carré de ce côté. */
const HAUTEUR_ACTION = 52;
/** Course du défilement sur laquelle la barre compacte apparaît (le fondu suit le doigt). */
const COURSE_BARRE = 24;
/** Dégradé sombre sous la barre d'état, sur une vraie photo seulement. */
const HAUTEUR_VOILE = 120;
/** À partir de ce facteur de taille de police, « Appeler » prend toute la largeur. */
const POLICE_GRANDE = 1.3;
/** Le cœur « bat » une fois quand la pharmacie entre dans les favoris. */
const ECHELLE_COEUR = 1.25;
const RESSORT_COEUR = { damping: 12, stiffness: 320, mass: 0.8 };
/** Zone tactile autour du lien « Signaler une erreur ». */
const MARGE_LIEN = 8;

/** Dégradé sombre en haut d'une vraie photo : la barre d'état (texte blanc) reste lisible. */
function VoileHaut({ couleur, hauteur }: { couleur: string; hauteur: number }) {
  return (
    <View pointerEvents="none" style={[styles.voileHaut, { height: hauteur }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="voile-haut-fiche" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={couleur} stopOpacity={0.4} />
            <Stop offset="1" stopColor={couleur} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#voile-haut-fiche)" />
      </Svg>
    </View>
  );
}

/**
 * Ligne de la carte d'infos précédée d'un filet (aplat de 1 px : la charte n'a pas de bordure).
 * Elle glisse avec son filet quand une ligne au-dessus se déplie.
 */
function LigneAvecFilet({ children }: { children: ReactNode }) {
  const { couleurs: c } = useTheme();
  return (
    <Animated.View layout={transitionListe.layout}>
      <View style={[styles.filet, { backgroundColor: c.separateur }]} />
      {children}
    </Animated.View>
  );
}

/**
 * Favori : le cœur « bat » une fois (1 → 1,25 en 90 ms, retour au ressort) et le téléphone vibre
 * quand la pharmacie entre dans les favoris ; simple « tic » quand elle en sort.
 * « Supprimer les animations » : le cœur se remplit sans battre.
 */
function BoutonFavori({ estFavori, onBasculer }: { estFavori: boolean; onBasculer: () => void }) {
  const { couleurs: c } = useTheme();
  const reduit = useReducedMotion();
  const echelle = useSharedValue(1);
  const styleCoeur = useAnimatedStyle(() => ({ transform: [{ scale: echelle.get() }] }));
  const basculer = () => {
    if (estFavori) {
      vibrationLegere();
    } else {
      vibrationSucces();
      if (!reduit) echelle.set(withSequence(withTiming(ECHELLE_COEUR, { duration: DUREES.appui }), withSpring(1, RESSORT_COEUR)));
    }
    onBasculer();
  };
  return (
    <BoutonIcone
      accessibilityLabel={estFavori ? t('fiche.favoriRetirer') : t('fiche.favoriAjouter')}
      accessibilityState={{ selected: estFavori }}
      rond
      fond={c.feuille}
      style={ombres.boutonRond}
      onPress={basculer}
      testID="bouton-favori"
    >
      <Animated.View style={styleCoeur}>
        <IconeCoeur size={20} color={c.vertTexte} strokeWidth={2.2} plein={estFavori} />
      </Animated.View>
    </BoutonIcone>
  );
}

/**
 * 06 Détail pharmacie (piste A, 11 nov.) : photo de façade pleine largeur, grande carte qui la
 * chevauche (statut, nom, distance, Appeler / Y aller / WhatsApp), carte d'infos (horaires du
 * jour dépliables, adresse, téléphone, assurances), puis « Infos vérifiées » et « Signaler ».
 */
function Fiche() {
  const margeBas = useMargeBas(24);
  const router = useRouter();
  const retour = useRetour();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { couleurs: c, estNuit } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fiche, error, isPending } = usePharmacie(id ?? '');
  const { pays, fuseau } = usePaysCourant();
  const libelleStatut = useLibelleStatut();
  const tonStatut = useTonStatut();
  const actions = useActionsPharmacie();
  const definirDerniereFiche = usePreferences((e) => e.definirDerniereFiche);
  const favori = useFavori(id ?? '', fiche);
  const agent = useSessionAgent((e) => e.agent);
  const { slugs: miennes } = useMesAssurances();
  // Adresse d'une photo qui n'a pas chargé : la devanture dessinée la remplace (repli de PhotoFondu)
  // et le voile de la barre d'état disparaît avec elle.
  const [photoEnEchec, setPhotoEnEchec] = useState<string | null>(null);
  // Squelette au premier rendu : le contenu arrivera en cascade. Fiche déjà en cache (ouverte
  // depuis une liste) : elle est là d'emblée, sans animation.
  const [squeletteVu] = useState(() => !fiche && isPending);

  // Barre compacte (nom de la pharmacie) : elle apparaît quand la grande carte arrive sous les
  // boutons ronds, pour que le contenu ne passe plus dessous ni sous la barre d'état.
  const hauteurBarre = insets.top + MARGE_HAUT + BOUTON_HAUT + 12;
  const debutBarre = HAUTEUR_PHOTO - CHEVAUCHEMENT - hauteurBarre;
  const defilement = useSharedValue(0);
  const [compact, setCompact] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    defilement.set(e.contentOffset.y);
  });
  // Fil UI : on ne prévient React (couleur de la barre d'état) qu'au passage du seuil.
  useAnimatedReaction(
    () => defilement.get() > debutBarre + COURSE_BARRE / 2,
    (passe, avant) => {
      if (passe !== avant) scheduleOnRN(setCompact, passe);
    },
    [debutBarre],
  );
  // Le fondu suit le doigt (aucune animation autonome) : rien à couper si les animations sont supprimées.
  const styleBarre = useAnimatedStyle(() => ({
    opacity: interpolate(defilement.get(), [debutBarre, debutBarre + COURSE_BARRE], [0, 1], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    if (id) definirDerniereFiche(id);
  }, [id, definirDerniereFiche]);

  const boutonRetour = (
    <BoutonIcone accessibilityLabel={t('commun.retour')} rond fond={c.feuille} style={ombres.boutonRond} onPress={retour} testID="bouton-retour">
      <IconeRetour size={20} color={c.texte} />
    </BoutonIcone>
  );

  if (!fiche && isPending) {
    // Squelette fidèle à la fiche (photo, grande carte, infos) plutôt qu'une roue : la page « se dessine ».
    return (
      <Ecran hautSur={false} barreClaire={estNuit} testID="ecran-fiche">
        <SqueletteFichePharmacie hauteurPhoto={HAUTEUR_PHOTO} chevauchement={CHEVAUCHEMENT} testID="fiche-chargement" />
        <View style={[styles.boutonsHaut, { top: insets.top + MARGE_HAUT }]} pointerEvents="box-none">
          {boutonRetour}
        </View>
      </Ecran>
    );
  }

  if (!fiche) {
    const reaction = error ? reactionPour(error) : null;
    return (
      <Ecran testID="ecran-fiche">
        <View style={styles.entetePlein}>
          <BoutonIcone accessibilityLabel={t('commun.retour')} onPress={retour} style={styles.retourPlein}>
            <IconeRetour size={22} color={c.texte} />
          </BoutonIcone>
        </View>
        <View style={styles.introuvable}>
          <EtatVide titre={reaction && 'message' in reaction ? reaction.message : t('erreurs.introuvable')} />
        </View>
      </Ecran>
    );
  }

  // Statut en puce douce : vert (ouverte), rouge (garde), ocre (ferme bientôt), neutre (fermée, à confirmer).
  const ocre = tonStatut(fiche) === 'ocre';
  const fondStatut = ocre ? c.ocreClair : fiche.statut === 'garde' ? c.rougeClair : fiche.statut === 'ouverte' ? c.puceVerteFond : c.fermeFond;
  const texteStatut = ocre ? c.ocreTexte : fiche.statut === 'garde' ? c.rougeTexteFort : fiche.statut === 'ouverte' ? c.vertTexte : c.texteSecondaire;
  const jour = heureLocale(new Date(), fuseau).jourSemaine;
  // Position à confirmer : ni distance ni « Y aller », un badge et un conseil d'appeler.
  const sansPosition = fiche.latitude === null || fiche.longitude === null;
  const accepte = accepteMesAssurances(fiche, miennes);
  const photoVisible = Boolean(fiche.photo_url) && photoEnEchec !== fiche.photo_url;
  const grandesPolices = fontScale >= POLICE_GRANDE;
  const numero = fiche.telephone ? telephoneAffiche(fiche.telephone, pays?.indicatif) : null;
  const villePays = [fiche.ville, pays?.nom].filter(Boolean).join(', ');
  const distance = fiche.distance_m !== null ? distanceKm(fiche.distance_m) : null;
  const marche = distance && fiche.marche_min !== null ? t('fiche.aPied', { minutes: fiche.marche_min }) : null;
  const lieu = [distance, marche, fiche.commune].filter(Boolean).join(' · ');
  const noteLue = fiche.note ? `${fiche.note.moyenne.toLocaleString(localeActive())} ${t('carte.avis', { count: fiche.note.nombre })}` : null;
  const metaLue = [sansPosition ? t('commun.positionAConfirmer') : null, distance, marche, fiche.commune, noteLue].filter(Boolean).join(', ');
  const entree = (rang: number) => (squeletteVu ? apparitionLigne(rang) : undefined);
  const facade = <FacadeIllustree taille="grande" largeur={260} style={[StyleSheet.absoluteFill, styles.facade]} testID="fiche-facade" />;

  return (
    <Ecran hautSur={false} barreClaire={compact ? estNuit : photoVisible || estNuit} testID="ecran-fiche">
      <Animated.ScrollView
        contentContainerStyle={[styles.defilement, { paddingBottom: margeBas }]}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {/* Photo de façade validée ; sinon, ou si elle ne charge pas, la devanture dessinée. */}
        <View
          style={[styles.photo, { backgroundColor: c.surface }]}
          accessible={photoVisible}
          accessibilityRole={photoVisible ? 'image' : undefined}
          accessibilityLabel={photoVisible ? t('fiche.photo') : undefined}
        >
          {fiche.photo_url ? (
            <PhotoFondu
              uri={fiche.photo_url}
              style={StyleSheet.absoluteFill}
              repli={facade}
              onError={() => setPhotoEnEchec(fiche.photo_url)}
              testID="fiche-photo"
            />
          ) : (
            facade
          )}
          {photoVisible ? <VoileHaut couleur={c.ombre} hauteur={insets.top + HAUTEUR_VOILE} /> : null}
        </View>

        <View style={styles.corps}>
          <Animated.View
            entering={entree(0)}
            style={[styles.cartePrincipale, { backgroundColor: c.carte }, estNuit ? null : ombres.fiche]}
            testID="fiche-carte"
          >
            <View style={styles.puces}>
              <View style={[styles.puce, { backgroundColor: fondStatut }]} testID="fiche-statut">
                <Texte variante="libelleFort" couleur={texteStatut} numberOfLines={2}>
                  {libelleStatut(fiche, 'carte')}
                </Texte>
              </View>
              {accepte ? (
                <View style={[styles.puce, styles.puceIcone, { backgroundColor: c.puceForteFond }]} testID="puce-accepte-assurance">
                  <IconeCoche size={12} color={c.puceForteTexte} strokeWidth={3} />
                  <Texte variante="libelleFort" couleur={c.puceForteTexte} style={styles.texteRetrecit}>
                    {t('fiche.accepteVotreAssurance')}
                  </Texte>
                </View>
              ) : null}
            </View>

            <Texte variante="titreEcran" titre numberOfLines={4}>
              {fiche.nom}
            </Texte>

            {metaLue ? (
              <View style={styles.meta} accessible accessibilityLabel={metaLue}>
                {sansPosition ? <BadgePosition testID="fiche-position-a-confirmer" /> : null}
                {lieu ? (
                  <Texte variante="texte" couleur={c.texteSecondaire} style={styles.chiffres}>
                    {lieu}
                  </Texte>
                ) : null}
                {fiche.note ? (
                  <View style={styles.note}>
                    <IconeEtoile size={14} color={c.etoile} />
                    <Texte variante="texte" couleur={c.texteSecondaire}>
                      <Texte variante="nomPetit">{fiche.note.moyenne.toLocaleString(localeActive())}</Texte>{' '}
                      {t('carte.avis', { count: fiche.note.nombre })}
                    </Texte>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Bouton
                libelle={t('commun.appeler')}
                typo="boutonGrand"
                hauteur={HAUTEUR_ACTION}
                icone={<HiPhone size={20} color={c.texteSurCouleur} />}
                onPress={() => actions.appeler(fiche)}
                style={grandesPolices ? styles.actionPleine : styles.action}
                testID="bouton-appeler"
              />
              {sansPosition ? null : (
                <Bouton
                  libelle={t('fiche.yAllerCourt')}
                  variante="blanc"
                  typo="boutonGrand"
                  hauteur={HAUTEUR_ACTION}
                  icone={<IconeNaviguer size={18} color={c.pastilleActionIcone} />}
                  onPress={() => actions.itineraire(fiche)}
                  style={styles.action}
                  testID="bouton-y-aller"
                />
              )}
              {/* WhatsApp seulement si la pharmacie a donné un numéro ; Favori et Partager restent en haut. */}
              {fiche.whatsapp ? (
                <PressableAnime
                  onPress={() => actions.whatsapp(fiche)}
                  accessibilityRole="button"
                  accessibilityLabel={t('fiche.whatsapp')}
                  style={[styles.whatsapp, { backgroundColor: c.boutonBlocSecondaire }]}
                  testID="bouton-whatsapp"
                >
                  <IconeBulle size={22} color={c.pastilleActionIcone} />
                </PressableAnime>
              ) : null}
            </View>
            {sansPosition ? (
              <Texte variante="petit" couleur={c.texteSecondaire} testID="fiche-conseil-appeler">
                {t('commun.positionAConfirmerTexte')}
              </Texte>
            ) : null}
          </Animated.View>

          {/* La carte d'infos et ce qui suit glissent quand les horaires ou les assurances se déplient. */}
          <Animated.View
            entering={entree(1)}
            layout={transitionListe.layout}
            style={[styles.carteInfos, { backgroundColor: c.carte }]}
            testID="fiche-infos"
          >
            <HorairesFiche horaires={fiche.horaires} h24={fiche.h24} aujourdhui={jour} />
            <LigneAvecFilet>
              <View
                style={styles.ligneInfo}
                accessible
                accessibilityLabel={[t('fiche.adresse'), fiche.adresse, villePays].filter(Boolean).join(', ')}
              >
                <IconeLieu size={20} color={c.pastilleActionIcone} />
                <View style={styles.textesInfo}>
                  <Texte variante="libelle" couleur={c.texteSecondaire}>
                    {t('fiche.adresse')}
                  </Texte>
                  <Texte variante="corpsFort">{fiche.adresse}</Texte>
                  {villePays ? (
                    <Texte variante="texte" couleur={c.texteSecondaire}>
                      {villePays}
                    </Texte>
                  ) : null}
                </View>
              </View>
            </LigneAvecFilet>
            {numero ? (
              <LigneAvecFilet>
                <Pressable
                  onPress={() => actions.appeler(fiche)}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('fiche.telephone')}, ${numero}`}
                  style={({ pressed }) => [styles.ligneInfo, pressed && styles.appuye]}
                  testID="lien-telephone"
                >
                  <IconeTelephoneTrait size={20} color={c.pastilleActionIcone} />
                  <View style={styles.textesInfo}>
                    <Texte variante="libelle" couleur={c.texteSecondaire}>
                      {t('fiche.telephone')}
                    </Texte>
                    <Texte variante="corpsFort" couleur={c.vertTexte} style={styles.chiffres}>
                      {numero}
                    </Texte>
                  </View>
                </Pressable>
              </LigneAvecFilet>
            ) : null}
            {fiche.assurances.length > 0 || fiche.services.length > 0 ? (
              <LigneAvecFilet>
                <AssurancesFiche assurances={fiche.assurances} services={fiche.services} />
              </LigneAvecFilet>
            ) : null}
          </Animated.View>

          <Animated.View entering={entree(2)} layout={transitionListe.layout} style={styles.pied}>
            <View style={styles.verifiee}>
              {fiche.verifiee_le ? (
                <IconeCoche size={16} color={c.pastilleActionIcone} strokeWidth={2.6} />
              ) : (
                // Pas encore vérifiées : état intermédiaire, donc ocre.
                <IconeHorloge size={16} color={c.ocreTexte} />
              )}
              <Texte variante="petit" couleur={c.texteSecondaire} style={styles.texteRetrecit}>
                {fiche.verifiee_le ? t('fiche.verifiee', { date: dateCourte(fiche.verifiee_le, fuseau) }) : t('fiche.nonVerifiee')}
              </Texte>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/pharmacie/[id]/signaler', params: { id: fiche.id } })}
              accessibilityRole="link"
              hitSlop={MARGE_LIEN}
              style={({ pressed }) => [styles.lien, pressed && styles.appuye]}
              testID="lien-signaler"
            >
              <Texte variante="petitFort" couleur={c.vertTexte}>
                {t('fiche.signaler')}
              </Texte>
            </Pressable>
          </Animated.View>

          {agent ? (
            <Animated.View layout={transitionListe.layout}>
              <Bouton
                libelle={t('fiche.mettreAJour')}
                icone="actualiser"
                variante="clair"
                typo="boutonPetit"
                onPress={() => router.push({ pathname: '/releve/position', params: { pharmacie: fiche.id } })}
                testID="bouton-mettre-a-jour-fiche"
              />
            </Animated.View>
          ) : null}
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        testID="barre-compacte"
        style={[
          styles.barre,
          { height: hauteurBarre, paddingTop: insets.top + MARGE_HAUT, backgroundColor: c.fond },
          estNuit ? null : ombres.enTete,
          styleBarre,
        ]}
      >
        <View style={styles.titreBarre}>
          <Texte variante="nom" numberOfLines={1}>
            {fiche.nom}
          </Texte>
        </View>
      </Animated.View>

      <View style={[styles.boutonsHaut, { top: insets.top + MARGE_HAUT }]} pointerEvents="box-none">
        {boutonRetour}
        <View style={styles.boutonsDroite}>
          <BoutonIcone
            accessibilityLabel={t('fiche.partager')}
            rond
            fond={c.feuille}
            style={ombres.boutonRond}
            onPress={() => router.push({ pathname: '/pharmacie/[id]/partager', params: { id: fiche.id } })}
            testID="bouton-partager"
          >
            <IconePartage size={20} color={c.texte} />
          </BoutonIcone>
          <BoutonFavori estFavori={favori.estFavori} onBasculer={favori.basculer} />
        </View>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  defilement: { flexGrow: 1 },
  entetePlein: { paddingTop: 16, paddingHorizontal: 20 },
  retourPlein: { marginLeft: -10 },
  introuvable: { paddingTop: 60, paddingHorizontal: 24 },
  photo: { height: HAUTEUR_PHOTO, overflow: 'hidden' },
  // La devanture reste au-dessus de la bande que recouvre la grande carte.
  facade: { paddingBottom: CHEVAUCHEMENT },
  voileHaut: { position: 'absolute', top: 0, left: 0, right: 0 },
  corps: { marginTop: -CHEVAUCHEMENT, paddingHorizontal: 16, gap: 14 },
  cartePrincipale: { borderRadius: rayons.feuille, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  puce: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: rayons.pilule, flexShrink: 1 },
  puceIcone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  texteRetrecit: { flexShrink: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  /** Chiffres de même largeur pour les distances, durées et numéros. */
  chiffres: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  action: { flex: 1, minWidth: 0 },
  // Grandes polices : « Appeler » seul sur sa ligne, « Y aller » et WhatsApp dessous.
  actionPleine: { flexBasis: '100%', flexGrow: 1 },
  whatsapp: { width: HAUTEUR_ACTION, minHeight: HAUTEUR_ACTION, borderRadius: rayons.moyen, alignItems: 'center', justifyContent: 'center' },
  // overflow : la semaine qui se replie ne déborde pas pendant que la carte rétrécit.
  carteInfos: { borderRadius: rayons.grandeCarte, paddingHorizontal: 16, paddingVertical: 4, overflow: 'hidden' },
  ligneInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: CIBLE_TACTILE },
  textesInfo: { flex: 1, minWidth: 0, gap: 2 },
  /** Filet entre deux lignes : un aplat de 1 px, pas une bordure (charte). */
  filet: { height: 1 },
  appuye: { opacity: 0.7 },
  pied: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingHorizontal: 4 },
  verifiee: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minHeight: CIBLE_TACTILE },
  lien: { minHeight: CIBLE_TACTILE, justifyContent: 'center' },
  // Au-dessus de la barre compacte (Android dessine une vue à élévation par-dessus ses voisines).
  boutonsHaut: { position: 'absolute', left: MARGE_HAUT, right: MARGE_HAUT, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2, elevation: 6 },
  boutonsDroite: { flexDirection: 'row', gap: ECART_HAUT },
  barre: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Entre le bouton retour et les deux boutons de droite, avec 12 d'écart de chaque côté.
  titreBarre: {
    height: BOUTON_HAUT,
    justifyContent: 'center',
    marginLeft: MARGE_HAUT + BOUTON_HAUT + 12,
    marginRight: MARGE_HAUT + 2 * BOUTON_HAUT + ECART_HAUT + 12,
  },
});

export default avecErrorBoundary(Fiche, 'Fiche');
