import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reactionPour, type AssurancePharmacie, type PlageHoraire } from '@/commun/api';
import { dateCourte, heureLocale, localeActive, t, telephoneAffiche, usePreferences, useSessionAgent } from '@/commun/lib';
import { ombres, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  BoutonIcone,
  DistanceMarche,
  Ecran,
  EtatVide,
  HiGeoLocation,
  HiInsuranceCardOutline,
  HiPhone,
  FacadeIllustree,
  IconeBouclier,
  IconeBulle,
  IconeCoche,
  IconeCoeur,
  IconeEtoile,
  IconeHorloge,
  IconeItineraire,
  IconePartage,
  IconeRetour,
  IconeTelephoneTrait,
  PastilleStatut,
  PhotoFondu,
  Texte,
  useRetour,
  useMargeBas,
} from '@/commun/ui';
import { useFavori } from '@/modules/profil';
import { usePaysCourant } from '@/modules/territoire';

import { useActionsPharmacie } from '../hooks/useActions';
import { accepteMesAssurances, trierAssurancesFiche, useMesAssurances } from '../hooks/useAssurances';
import { useLibelleStatut, usePharmacie, useTonStatut } from '../hooks/usePharmacies';

const MAX_PUCES = 3;
/** Hauteur de la photo de façade (styles.photo). */
const HAUTEUR_PHOTO = 230;
/** Taille des boutons ronds du haut (retour, favori, partager). */
const BOUTON_HAUT = 44;

/** Lundi en tête, comme un calendrier. */
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];

/** Horaires des 7 jours, aujourd'hui en gras : savoir si la pharmacie ouvre demain ou dimanche. */
function HorairesSemaine({ horaires, aujourdhui }: { horaires: PlageHoraire[]; aujourdhui: number }) {
  const { couleurs: c } = useTheme();
  return (
    <View style={styles.semaine} testID="horaires-semaine">
      {ORDRE_JOURS.map((jour) => {
        const plages = horaires.filter((h) => h.jour === jour).map((h) => `${h.ouverture}–${h.fermeture}`);
        const fort = jour === aujourdhui;
        const nom = t(`horaires.jours.${jour}`);
        const valeur = plages.length ? plages.join(', ') : t('fiche.ferme');
        return (
          <View key={jour} style={styles.jourHoraire} accessible accessibilityLabel={`${nom} ${valeur}`}>
            <Texte variante={fort ? 'nomPetit' : 'texte'} style={styles.nomJour}>
              {nom.charAt(0).toUpperCase() + nom.slice(1)}
            </Texte>
            <Texte variante={fort ? 'nomPetit' : 'texte'} couleur={plages.length ? undefined : c.texteSecondaire}>
              {valeur}
            </Texte>
          </View>
        );
      })}
    </View>
  );
}

/** Section « Assurances acceptées (N) » : 3 puces au plus puis « + N autres » qui déplie. */
function SectionAssurances({ fiche }: { fiche: { assurances: AssurancePharmacie[]; accepte_mes_assurances?: boolean | null; services: string[] } }) {
  const { couleurs: c } = useTheme();
  const { slugs: miennes } = useMesAssurances();
  const [deplie, setDeplie] = useState(false);
  const triees = trierAssurancesFiche(fiche.assurances, miennes);
  const visibles = deplie ? triees : triees.slice(0, MAX_PUCES);
  const reste = triees.length - visibles.length;
  const accepte = accepteMesAssurances(fiche, miennes);
  const services = fiche.services.map((s) => t(`services.${s}`, { defaultValue: s }).toLocaleLowerCase('fr'));
  return (
    <View style={[styles.sectionAssurances, styles.carteBlanche, { backgroundColor: c.feuille }]} testID="section-assurances">
      {triees.length > 0 ? (
        <>
          <View style={styles.titreAssurances}>
            <HiInsuranceCardOutline size={24} color={c.texte} />
            <Texte variante="sectionPetite" titre style={styles.flex}>
              {t('fiche.assurances', { count: triees.length })}
            </Texte>
            {accepte ? (
              <View style={[styles.accepte, { backgroundColor: c.vert }]} testID="puce-accepte-assurance">
                <IconeCoche size={12} color={c.blanc} strokeWidth={3} />
                <Texte variante="libelleFort" couleur={c.blanc}>
                  {t('fiche.accepteVotreAssurance')}
                </Texte>
              </View>
            ) : null}
          </View>
          <View style={styles.puces}>
            {visibles.map((a) => (
              <View
                key={a.id}
                testID={`puce-fiche-${a.slug}`}
                style={[styles.puce, { backgroundColor: a.tiers_payant ? c.vertClair : c.surface }]}
              >
                <Texte variante="petitFort" couleur={a.tiers_payant ? c.vertTexte : c.texte} style={a.tiers_payant ? styles.gras : undefined}>
                  {a.nom}
                </Texte>
                {a.tiers_payant ? (
                  <Texte variante="mini" couleur={c.texteSecondaire}>
                    {t('fiche.tiersPayant')}
                  </Texte>
                ) : null}
              </View>
            ))}
            {reste > 0 ? (
              <Pressable onPress={() => setDeplie(true)} accessibilityRole="button" style={styles.autres} testID="bouton-autres-assurances">
                <Texte variante="petitFort" couleur={c.vertTexte} style={styles.gras}>
                  {t('fiche.autresAssurances', { count: reste })}
                </Texte>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
      {services.length > 0 ? (
        <Texte variante="petit" couleur={c.texteSecondaire}>
          {t('fiche.servicesListe', { services: services.join(', ') })}
        </Texte>
      ) : null}
    </View>
  );
}

function ActionRonde({ libelle, icone, onPress, a11y }: { libelle: string; icone: ReactNode; onPress: () => void; a11y?: string }) {
  const { couleurs: c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? libelle} style={styles.action}>
      <View style={[styles.rondAction, { backgroundColor: c.pastilleAction }]}>{icone}</View>
      <Texte variante="libelleMoyen">{libelle}</Texte>
    </Pressable>
  );
}

/** 06 Détail pharmacie. */
function Fiche() {
  const margeBas = useMargeBas(0);
  const router = useRouter();
  const retour = useRetour();
  const insets = useSafeAreaInsets();
  const { couleurs: c, estNuit } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Barre compacte : elle apparaît quand le titre arrive sous les boutons ronds du haut,
  // pour que le contenu ne passe plus dessous ni sous la barre d'état.
  const hauteurBarre = insets.top + 16 + BOUTON_HAUT + 12;
  const seuilBarre = HAUTEUR_PHOTO - hauteurBarre;
  const [compact, setCompact] = useState(false);
  const apparition = useSharedValue(0);
  useEffect(() => {
    apparition.set(withTiming(compact ? 1 : 0, { duration: 180 }));
  }, [compact, apparition]);
  const styleBarre = useAnimatedStyle(() => ({ opacity: apparition.get() }));
  const { fiche, error, isPending } = usePharmacie(id ?? '');
  const { pays, fuseau } = usePaysCourant();
  const libelleStatut = useLibelleStatut();
  const tonStatut = useTonStatut();
  const actions = useActionsPharmacie();
  const definirDerniereFiche = usePreferences((e) => e.definirDerniereFiche);
  const favori = useFavori(id ?? '', fiche);
  const agent = useSessionAgent((e) => e.agent);

  useEffect(() => {
    if (id) definirDerniereFiche(id);
  }, [id, definirDerniereFiche]);

  if (!fiche) {
    const reaction = error ? reactionPour(error) : null;
    return (
      <Ecran testID="ecran-fiche">
        <View style={styles.entetePlein}>
          <BoutonIcone accessibilityLabel={t('commun.retour')} onPress={retour} style={styles.retourPlein}>
            <IconeRetour size={22} color={c.texte} />
          </BoutonIcone>
        </View>
        {isPending ? (
          <ActivityIndicator color={c.vert} style={styles.chargement} />
        ) : (
          <View style={styles.introuvable}>
            <EtatVide titre={reaction && 'message' in reaction ? reaction.message : t('erreurs.introuvable')} />
          </View>
        )}
      </Ecran>
    );
  }

  // Palette enrichie : « ouverte » en aplat vert plein, garde en rouge pâle, « ferme bientôt » en ocre.
  const ocre = tonStatut(fiche) === 'ocre';
  const couleurStatut = ocre ? c.ocreTexte : fiche.statut === 'garde' ? c.rougeTexteFort : fiche.statut === 'ouverte' ? c.blanc : c.texteTertiaire;
  const fondStatut = ocre ? c.ocreClair : fiche.statut === 'garde' ? c.rougeClair : fiche.statut === 'ouverte' ? c.vert : c.surface;
  const jour = heureLocale(new Date(), fuseau).jourSemaine;

  return (
    <Ecran hautSur={false} barreClaire={!compact || estNuit} testID="ecran-fiche">
      <ScrollView
        contentContainerStyle={[styles.defilement, { paddingBottom: margeBas }]}
        bounces={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const passe = e.nativeEvent.contentOffset.y > seuilBarre;
          if (passe !== compact) setCompact(passe);
        }}
      >
        {/* Photo de façade validée, sinon la devanture dessinée (comme dans les listes). */}
        <View style={[styles.photo, { backgroundColor: c.surface }]} accessible accessibilityRole="image" accessibilityLabel={t('fiche.photo')}>
          {fiche.photo_url ? (
            <PhotoFondu uri={fiche.photo_url} style={StyleSheet.absoluteFill} testID="fiche-photo" />
          ) : (
            <FacadeIllustree taille="grande" largeur={260} style={StyleSheet.absoluteFill} testID="fiche-facade" />
          )}
        </View>
        <View style={[styles.contenu, { backgroundColor: c.fond }]}>
          <View style={styles.ligneTitre}>
            <View style={[styles.pastille, { shadowColor: c.ombre }]}>
              <PastilleStatut statut={fiche.statut} taille={52} tailleIcone={32} badge24={fiche.statut === 'garde'} />
            </View>
            <View style={styles.titres}>
              <Texte variante="titre" titre>
                {fiche.nom}
              </Texte>
              <View style={styles.ligneStatut}>
                <View style={[styles.badgeStatut, { backgroundColor: fondStatut }]}>
                  <Texte variante="libelleFort" couleur={couleurStatut}>
                    {libelleStatut(fiche)}
                  </Texte>
                </View>
                {fiche.note ? (
                  <View style={styles.note}>
                    <IconeEtoile size={14} color={c.etoile} />
                    <Texte variante="petit" couleur={c.texteSecondaire}>
                      <Texte variante="petitFort">{fiche.note.moyenne.toLocaleString(localeActive())}</Texte>{' '}
                      {t('carte.avis', { count: fiche.note.nombre })}
                    </Texte>
                  </View>
                ) : null}
              </View>
            </View>
            <DistanceMarche distanceM={fiche.distance_m} marcheMin={fiche.marche_min} grande varianteDistance="distanceGrande" />
          </View>

          <View style={styles.actions}>
            <ActionRonde libelle={t('commun.appeler')} icone={<HiPhone size={22} color={c.pastilleActionIcone} />} onPress={() => actions.appeler(fiche)} />
            <ActionRonde
              libelle={t('commun.itineraire')}
              icone={<IconeItineraire size={20} color={c.pastilleActionIcone} />}
              onPress={() => actions.itineraire(fiche)}
            />
            {/* WhatsApp seulement si la pharmacie a donné un numéro ; Favori et Partager restent en haut. */}
            {fiche.whatsapp ? (
              <ActionRonde libelle={t('commun.whatsapp')} icone={<IconeBulle size={20} color={c.pastilleActionIcone} />} onPress={() => actions.whatsapp(fiche)} />
            ) : null}
          </View>

          <View style={[styles.section, styles.carteBlanche, { backgroundColor: c.feuille }]}>
            <Texte variante="sectionPetite" titre>
              {t('fiche.informations')}
            </Texte>
            <View style={styles.info}>
              <HiGeoLocation size={22} color={c.fermeIcone} accessibilityLabel={t('fiche.adresse')} />
              <View style={styles.flex}>
                <Texte variante="texte">{fiche.adresse}</Texte>
                <Texte variante="texte" couleur={c.texteSecondaire}>
                  {[fiche.ville, pays?.nom].filter(Boolean).join(', ')}
                </Texte>
              </View>
            </View>
            {fiche.telephone ? (
              <Pressable onPress={() => actions.appeler(fiche)} accessibilityRole="link" style={[styles.info, styles.centre]}>
                <IconeTelephoneTrait size={22} color={c.fermeIcone} accessibilityLabel={t('fiche.telephone')} />
                <Texte variante="texte">{telephoneAffiche(fiche.telephone, pays?.indicatif)}</Texte>
              </Pressable>
            ) : null}
            <View style={[styles.info, fiche.h24 ? styles.centre : null]}>
              <IconeHorloge size={22} color={c.fermeIcone} accessibilityLabel={t('fiche.horaires')} />
              {fiche.h24 ? (
                <Texte variante="texte">{t('fiche.h24')}</Texte>
              ) : fiche.horaires.length === 0 ? (
                // Fiche importée, pas encore relevée : on ne montre pas sept jours « Fermée ».
                <Texte variante="texte" couleur={c.texteSecondaire} style={styles.flex} testID="horaires-a-confirmer">
                  {t('statut.appelerAvant')}
                </Texte>
              ) : (
                <HorairesSemaine horaires={fiche.horaires} aujourdhui={jour} />
              )}
            </View>
            <View style={[styles.verifiee, { backgroundColor: c.vertClair }]}>
              <IconeBouclier size={20} color={c.vert} />
              <Texte variante="petitFort" couleur={c.vertTexte} style={styles.flex}>
                {fiche.verifiee_le ? t('fiche.verifiee', { date: dateCourte(fiche.verifiee_le, fuseau) }) : t('fiche.nonVerifiee')}
              </Texte>
              <Pressable
                onPress={() => router.push({ pathname: '/pharmacie/[id]/signaler', params: { id: fiche.id } })}
                accessibilityRole="link"
                hitSlop={12}
                testID="lien-signaler"
              >
                <Texte variante="libelleFort" couleur={c.vertTexte} style={styles.souligne}>
                  {t('fiche.signaler')}
                </Texte>
              </Pressable>
            </View>
          </View>

          <SectionAssurances fiche={fiche} />

          {agent ? (
            <Bouton
              libelle={t('fiche.mettreAJour')}
              icone="actualiser"
              variante="clair"
              typo="boutonPetit"
              onPress={() => router.push({ pathname: '/releve/position', params: { pharmacie: fiche.id } })}
              testID="bouton-mettre-a-jour-fiche"
            />
          ) : null}

          <Bouton
            libelle={t('fiche.yAller')}
            icone="naviguer"
            onPress={() => actions.itineraire(fiche)}
            style={styles.yAller}
            testID="bouton-y-aller"
          />
        </View>
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        testID="barre-compacte"
        style={[
          styles.barre,
          { height: hauteurBarre, paddingTop: insets.top + 16, backgroundColor: c.fond },
          !estNuit && ombres.enTete,
          styleBarre,
        ]}
      >
        <Texte variante="nom" numberOfLines={1} style={styles.titreBarre}>
          {fiche.nom}
        </Texte>
      </Animated.View>

      <View style={[styles.boutonsHaut, { top: insets.top + 16 }]} pointerEvents="box-none">
        <BoutonIcone accessibilityLabel={t('commun.retour')} rond fond={c.blanc} onPress={retour} testID="bouton-retour">
          <IconeRetour size={20} color="#1A1A1A" />
        </BoutonIcone>
        <View style={styles.boutonsDroite}>
          <BoutonIcone
            accessibilityLabel={favori.estFavori ? t('fiche.favoriRetirer') : t('fiche.favoriAjouter')}
            accessibilityState={{ selected: favori.estFavori }}
            rond
            fond={c.blanc}
            onPress={favori.basculer}
            testID="bouton-favori"
          >
            <IconeCoeur size={20} color={c.rouge} plein={favori.estFavori} />
          </BoutonIcone>
          <BoutonIcone
            accessibilityLabel={t('fiche.partager')}
            rond
            fond={c.blanc}
            onPress={() => router.push({ pathname: '/pharmacie/[id]/partager', params: { id: fiche.id } })}
            testID="bouton-partager"
          >
            <IconePartage size={20} color="#1A1A1A" />
          </BoutonIcone>
        </View>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  defilement: { flexGrow: 1 },
  entetePlein: { paddingTop: 16, paddingHorizontal: 20 },
  retourPlein: { marginLeft: -10 },
  chargement: { marginTop: 80 },
  introuvable: { paddingTop: 60, paddingHorizontal: 24 },
  photo: { height: 230, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  semaine: { flex: 1, gap: 4 },
  jourHoraire: { flexDirection: 'row', gap: 12 },
  nomJour: { width: 52 },
  // Le contenu remonte sur l'en-tête comme une feuille : haut arrondi de 24 (charte « cartes »).
  contenu: { flexGrow: 1, marginTop: -24, padding: 20, gap: 16, borderTopLeftRadius: rayons.feuille, borderTopRightRadius: rayons.feuille },
  ligneTitre: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pastille: { marginTop: -34, borderRadius: 26, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  titres: { flex: 1, gap: 6, minWidth: 0 },
  ligneStatut: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badgeStatut: { paddingHorizontal: 10, paddingVertical: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 6, minHeight: 44 },
  rondAction: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12 },
  /** Cartes blanches posées sur le fond sable (palette enrichie), sans bordure. */
  carteBlanche: { padding: 14, borderRadius: rayons.carte },
  info: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 24 },
  centre: { alignItems: 'center', minHeight: 44 },
  verifiee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: rayons.moyen },
  souligne: { textDecorationLine: 'underline' },
  sectionAssurances: { gap: 10 },
  titreAssurances: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accepte: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { minHeight: 34, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  autres: { minHeight: 34, paddingHorizontal: 12, justifyContent: 'center' },
  gras: { fontFamily: 'PlusJakartaSans_700Bold' },
  yAller: { marginTop: 'auto' },
  // Au-dessus de la barre compacte (Android dessine une vue à élévation par-dessus ses voisines).
  boutonsHaut: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2, elevation: 6 },
  boutonsDroite: { flexDirection: 'row', gap: 10 },
  barre: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'center' },
  // Entre le bouton retour (16 + 44) et les deux boutons de droite (2 × 44 + 10 + 16), plus 12 d'écart.
  titreBarre: { height: BOUTON_HAUT, lineHeight: BOUTON_HAUT, marginLeft: 16 + BOUTON_HAUT + 12, marginRight: 16 + 2 * BOUTON_HAUT + 10 + 12 },
});

export default avecErrorBoundary(Fiche, 'Fiche');
