import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
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
  commencerVisite,
  dateCourte,
  distanceKm,
  heureLocale,
  marquerSortieVersAutreApp,
  signalerErreur,
  t,
  telephoneAffiche,
  usePreferences,
  useSessionAgent,
  vibrationLegere,
  vibrationSucces,
} from '@/commun/lib';
import { CIBLE_TACTILE, ombres, rayons, useTheme } from '@/commun/theme';
import {
  ActionsPharmacie,
  apparitionLigne,
  avecErrorBoundary,
  BadgePosition,
  Bouton,
  BoutonIcone,
  DUREES,
  Ecran,
  EtatVide,
  FacadeIllustree,
  IconeBulle,
  IconeCoche,
  IconeCoeur,
  IconeHorloge,
  IconeLieu,
  IconePartage,
  IconeRetour,
  IconeTelephoneTrait,
  IconeVoiture,
  PhotoFondu,
  PressableAnime,
  RepereStatut,
  Texte,
  transitionListe,
  useMargeBas,
  useRetour,
} from '@/commun/ui';
import { useFavori } from '@/modules/profil';
import { usePaysCourant } from '@/modules/territoire';

import { messageChauffeur } from '../chauffeur';
import { AssurancesFiche } from '../composants/AssurancesFiche';
import { HorairesFiche } from '../composants/HorairesFiche';
import { SqueletteFichePharmacie } from '../composants/SqueletteFichePharmacie';
import { useActionsPharmacie } from '../hooks/useActions';
import { accepteMesAssurances, useMesAssurances } from '../hooks/useAssurances';
import { useLibelleStatut, usePharmacie, useTonStatut } from '../hooks/usePharmacies';

/** Photo de façade en tête (refonte v2) ; sans photo, une bande plus basse avec la devanture dessinée. */
const HAUTEUR_PHOTO = 224;
const HAUTEUR_SANS_PHOTO = 144;
/** La grande carte remonte sur le bas de la photo. */
const CHEVAUCHEMENT = 26;
/** Boutons ronds du haut (retour, partager, favori), leur marge et leur écart. */
const BOUTON_HAUT = CIBLE_TACTILE;
const MARGE_HAUT = 16;
const ECART_HAUT = 8;
/** Course du défilement sur laquelle la barre compacte apparaît (le fondu suit le doigt). */
const COURSE_BARRE = 24;
/** Dégradé sombre sous la barre d'état, sur une vraie photo seulement. */
const HAUTEUR_VOILE = 120;
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
  const { couleurs: c, estNuit } = useTheme();
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
      fond={estNuit ? c.boutonSecondaire : c.feuille}
      style={estNuit ? null : ombres.boutonRond}
      onPress={basculer}
      testID="bouton-favori"
    >
      <Animated.View style={styleCoeur}>
        <IconeCoeur size={20} color={c.vertTexte} strokeWidth={2.2} plein={estFavori} />
      </Animated.View>
    </BoutonIcone>
  );
}

type PropsActionLigne = { libelle: string; icone: ReactNode; onPress: () => void; accessibilityLabel?: string; testID?: string };

/** Action posée dans une ligne d'infos (WhatsApp, Envoyer au chauffeur) : 40 de haut, 48 de zone tactile. */
function ActionLigne({ libelle, icone, onPress, accessibilityLabel, testID }: PropsActionLigne) {
  const { couleurs: c, estNuit } = useTheme();
  return (
    <PressableAnime
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? libelle}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[styles.actionLigne, { backgroundColor: c.boutonBlocSecondaire }]}
      testID={testID}
    >
      {icone}
      <Texte variante="boutonPetit" couleur={estNuit ? c.texte : c.vertTexte} numberOfLines={1}>
        {libelle}
      </Texte>
    </PressableAnime>
  );
}

/**
 * 06 Détail pharmacie (refonte v2, 14 nov.) : photo de façade de 224 (voilée la nuit), ou bande de
 * 144 avec la devanture dessinée ; grande carte qui la chevauche (état, nom, distance, Appeler et
 * Y aller), carte d'infos à plat (horaires dépliables, repère et « Envoyer au chauffeur », téléphone
 * et WhatsApp, assurances), puis « Infos vérifiées » et « Signaler ».
 */
function Fiche() {
  const margeBas = useMargeBas(24);
  const router = useRouter();
  const retour = useRetour();
  const insets = useSafeAreaInsets();
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
  const photoVisible = Boolean(fiche?.photo_url) && photoEnEchec !== fiche?.photo_url;
  const hauteurHaut = photoVisible ? HAUTEUR_PHOTO : HAUTEUR_SANS_PHOTO;
  const hauteurBarre = insets.top + MARGE_HAUT + BOUTON_HAUT + 12;
  const debutBarre = hauteurHaut - CHEVAUCHEMENT - hauteurBarre;
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
    <BoutonIcone
      accessibilityLabel={t('commun.retour')}
      rond
      fond={estNuit ? c.boutonSecondaire : c.feuille}
      style={estNuit ? null : ombres.boutonRond}
      onPress={retour}
      testID="bouton-retour"
    >
      <IconeRetour size={20} color={c.texte} />
    </BoutonIcone>
  );

  if (!fiche && isPending) {
    // Squelette fidèle à la fiche (photo, grande carte, infos) plutôt qu'une roue : la page « se dessine ».
    return (
      <Ecran hautSur={false} barreClaire={estNuit} testID="ecran-fiche">
        <SqueletteFichePharmacie hauteurPhoto={HAUTEUR_SANS_PHOTO} chevauchement={CHEVAUCHEMENT} testID="fiche-chargement" />
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

  const jour = heureLocale(new Date(), fuseau).jourSemaine;
  // Position à confirmer : ni distance ni « Y aller », un badge et un conseil d'appeler.
  const sansPosition = fiche.latitude === null || fiche.longitude === null;
  const accepte = accepteMesAssurances(fiche, miennes);
  const numero = fiche.telephone ? telephoneAffiche(fiche.telephone, pays?.indicatif) : null;
  const communeVille = [fiche.commune, fiche.ville].filter(Boolean).join(', ');
  const distance = !sansPosition && fiche.distance_m !== null ? distanceKm(fiche.distance_m) : null;
  const marche = distance && fiche.marche_min !== null ? t('fiche.aPied', { minutes: fiche.marche_min }) : null;
  const suite = [marche, fiche.commune].filter(Boolean).join(' · ');
  const metaLue = [sansPosition ? t('commun.positionAConfirmer') : null, distance, marche, fiche.commune].filter(Boolean).join(', ');
  const entree = (rang: number) => (squeletteVu ? apparitionLigne(rang) : undefined);
  const facade = <FacadeIllustree taille="grande" largeur={104} style={[StyleSheet.absoluteFill, styles.facade]} testID="fiche-facade" />;
  // Taxi ou proche qui conduit : l'adresse, la commune et le lien de position, par WhatsApp ou SMS (l'habitude Yango).
  const envoyerAuChauffeur = async () => {
    try {
      commencerVisite({ id: fiche.id, nom: fiche.nom });
      marquerSortieVersAutreApp();
      await Share.share({ message: messageChauffeur(fiche, pays?.indicatif) });
    } catch (e) {
      signalerErreur(e, { etape: 'envoi-chauffeur' });
    }
  };

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
          style={[styles.photo, { height: hauteurHaut, backgroundColor: c.facadeCadre }]}
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
            <RepereStatut statut={fiche.statut} ton={tonStatut(fiche)} libelle={libelleStatut(fiche, 'carte')} testID="fiche-statut" />

            <Texte variante="titreEcran" titre numberOfLines={4}>
              {fiche.nom}
            </Texte>

            {metaLue ? (
              <View style={styles.meta} accessible accessibilityLabel={metaLue}>
                {sansPosition ? <BadgePosition testID="fiche-position-a-confirmer" /> : null}
                {distance || suite ? (
                  <Texte variante="texte" couleur={c.texteSecondaire}>
                    {distance ? (
                      <Texte variante="distanceGrande" style={styles.chiffres}>
                        {distance}
                      </Texte>
                    ) : null}
                    {distance && suite ? ' · ' : null}
                    {suite}
                  </Texte>
                ) : null}
              </View>
            ) : null}

            {accepte ? (
              <View style={[styles.puce, { backgroundColor: c.puceForteFond }]} testID="puce-accepte-assurance">
                <IconeCoche size={12} color={c.puceForteTexte} strokeWidth={3} />
                <Texte variante="libelleFort" couleur={c.puceForteTexte} style={styles.texteRetrecit}>
                  {t('fiche.accepteVotreAssurance')}
                </Texte>
              </View>
            ) : null}

            {sansPosition ? (
              <Texte variante="petit" couleur={c.texteSecondaire} testID="fiche-conseil-appeler">
                {t('commun.positionAConfirmerTexte')}
              </Texte>
            ) : null}

            <ActionsPharmacie
              nom={fiche.nom}
              // La garde, ou la nuit : on appelle avant de se déplacer.
              conseil={fiche.statut === 'garde' || estNuit}
              onAppeler={() => actions.appeler(fiche)}
              onYAller={sansPosition ? undefined : () => actions.itineraire(fiche)}
              testID="bouton"
            />
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
              <View style={[styles.ligneInfo, styles.ligneHaut]}>
                <IconeLieu size={20} color={c.pastilleActionIcone} />
                <View style={styles.textesInfo}>
                  <View accessible accessibilityLabel={[t('fiche.repere'), fiche.adresse, communeVille].filter(Boolean).join(', ')}>
                    <Texte variante="libelle" couleur={c.texteSecondaire}>
                      {t('fiche.repere')}
                    </Texte>
                    <Texte variante="corpsFort">{fiche.adresse}</Texte>
                    {communeVille ? (
                      <Texte variante="petit" couleur={c.texteSecondaire}>
                        {communeVille}
                      </Texte>
                    ) : null}
                  </View>
                  <ActionLigne
                    libelle={t('fiche.envoyerChauffeur')}
                    icone={<IconeVoiture size={18} color={c.pastilleActionIcone} />}
                    onPress={() => void envoyerAuChauffeur()}
                    testID="bouton-chauffeur"
                  />
                </View>
              </View>
            </LigneAvecFilet>
            {numero ? (
              <LigneAvecFilet>
                <View style={styles.ligneInfo}>
                  <Pressable
                    onPress={() => actions.appeler(fiche)}
                    accessibilityRole="link"
                    accessibilityLabel={`${t('fiche.telephone')}, ${numero}`}
                    style={({ pressed }) => [styles.lienTelephone, pressed && styles.appuye]}
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
                  {/* WhatsApp seulement si la pharmacie a donné un numéro ; Favori et Partager restent en haut. */}
                  {fiche.whatsapp ? (
                    <ActionLigne
                      libelle={t('commun.whatsapp')}
                      accessibilityLabel={t('fiche.whatsapp')}
                      icone={<IconeBulle size={18} color={c.pastilleActionIcone} />}
                      onPress={() => actions.whatsapp(fiche)}
                      testID="bouton-whatsapp"
                    />
                  ) : null}
                </View>
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
  photo: { overflow: 'hidden' },
  // La devanture reste au-dessus de la bande que recouvre la grande carte.
  facade: { paddingBottom: CHEVAUCHEMENT + 2 },
  voileHaut: { position: 'absolute', top: 0, left: 0, right: 0 },
  corps: { marginTop: -CHEVAUCHEMENT, paddingHorizontal: 16, gap: 14 },
  // Le conseil et les deux boutons (ActionsPharmacie) portent leurs propres marges.
  cartePrincipale: { borderRadius: rayons.surface, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  puce: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 10, paddingVertical: 4, borderRadius: rayons.repere },
  texteRetrecit: { flexShrink: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  /** Chiffres de même largeur pour les distances, durées et numéros. */
  chiffres: { fontVariant: ['tabular-nums'] },
  actionLigne: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', height: 40, marginTop: 8, paddingHorizontal: 14, borderRadius: rayons.touche },
  // overflow : la semaine qui se replie ne déborde pas pendant que la carte rétrécit.
  carteInfos: { borderRadius: rayons.surface, paddingHorizontal: 16, paddingVertical: 4, overflow: 'hidden' },
  ligneInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: CIBLE_TACTILE },
  ligneHaut: { alignItems: 'flex-start' },
  lienTelephone: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: CIBLE_TACTILE },
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
