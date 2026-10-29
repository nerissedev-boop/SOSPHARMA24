import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Share, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PharmacieResume } from '@/commun/api';
import { appeler, bornesLongues, dateCourte, marquerSortieVersAutreApp, signalerErreur, t, vibrationAction } from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  BlocPlusProche,
  ChargementCroix,
  Ecran,
  EnTete,
  HiPhone,
  IconeBouclier,
  IconeLune,
  IconePartage,
  LignePharmacie,
  Logo,
  NombreAnime,
  PiluleFiltres,
  SqueletteBlocProche,
  SqueletteListe,
  Texte,
  useEnTeteRepliable,
  useNavigationOnglets,
  useChargementBref,
} from '@/commun/ui';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { useTourEnCours } from '../hooks/useTourEnCours';
import { detailGarde, texteListeGardes } from '../partage';

type Choix = 'proches' | 'nuit' | 'commune';

/** Au-delà de 2 km, le temps de marche n'est plus utile la nuit : seule la distance reste. */
const MARCHE_UTILE_M = 2000;

/** 05 Pharmacies de garde (jour) et 20 (nuit) : même écran, thème différent (maquette « cartes arrondies »). */
function ListeGardes() {
  const router = useRouter();
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c, estNuit } = useTheme();
  const [choix, setChoix] = useState<Choix>('proches');
  // Le tri se fait sur le téléphone (instantané) : la croix bat un court instant pour montrer que la liste change.
  const tri = useChargementBref();
  const changerChoix = (cle: Choix) => {
    setChoix(cle);
    tri.declencher();
  };
  const { zone, libelle } = useZoneCourante();
  const { pays } = usePaysCourant();
  const { tour, fuseau, dateEnregistree, isPending } = useTourEnCours();

  const liste = useMemo(() => {
    const toutes = [...(tour?.pharmacies ?? [])].filter((p) => p.statut === 'garde');
    const filtrees =
      choix === 'nuit'
        ? toutes.filter((p) => p.garde?.jusqua === null)
        : choix === 'commune'
          ? toutes.filter((p) => !zone || p.commune_id === zone.zoneId)
          : toutes;
    return filtrees.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  }, [tour, choix, zone]);

  const ouvrir = (p: PharmacieResume) => router.push({ pathname: '/pharmacie/[id]', params: { id: p.id } });
  const tel = (p: PharmacieResume) => p.telephone && appeler(p.telephone, pays?.indicatif);
  const nombre = (tour?.pharmacies ?? []).filter((p) => p.statut === 'garde').length;
  const bornes = tour ? bornesLongues(tour.debut, tour.fin, fuseau) : null;
  const [premiere, ...autres] = liste;
  const changerZone = () => router.push('/zone');

  // Partage de la liste affichée (filtre en cours compris), par la feuille de partage du téléphone.
  const partager = async () => {
    try {
      vibrationAction();
      marquerSortieVersAutreApp();
      await Share.share({ message: texteListeGardes({ zone: libelle, bornes, pharmacies: liste, indicatif: pays?.indicatif }) });
    } catch (e) {
      signalerErreur(e, { etape: 'partage-gardes' });
    }
  };

  // Trois pilules (l'indicateur glisse de l'une à l'autre) ; elles défilent sur un petit écran.
  const filtres = (
    <PiluleFiltres
      ton="garde"
      selection={choix}
      onChange={changerChoix}
      style={styles.defilementFiltres}
      styleContenu={styles.filtres}
      options={[
        { cle: 'proches', libelle: t('garde.plusProches'), testID: 'filtre-garde-proches' },
        { cle: 'nuit', libelle: t('garde.touteNuit'), testID: 'filtre-garde-nuit' },
        { cle: 'commune', libelle: t('garde.maCommune'), testID: 'filtre-garde-commune' },
      ]}
    />
  );

  const resume = (
    <>
      <NombreAnime variante="titreModal" couleur={c.blanc} valeur={nombre} rendu={(n) => t('garde.ouvertesNuit', { count: n })} />
      {bornes ? (
        <Texte variante="texte" couleur={c.blanc}>
          {t('garde.tour', bornes)}
        </Texte>
      ) : null}
    </>
  );

  // Commune en pastille (toute la pilule mène au choix de zone) et bouton « Partager » à droite.
  const rangeeZone = (
    <View style={styles.rangeeZone}>
      <BarreZone variante="pastille" surFonce={!estNuit} libelle={libelle} onChanger={changerZone} testID="pastille-zone-garde" />
      <BoutonPartager onPress={() => void partager()} />
    </View>
  );

  const ligne = (p: PharmacieResume, i: number) => {
    const detail = detailGarde(p, fuseau);
    return (
      <LignePharmacie
        key={p.id}
        rang={i}
        testID={`garde-${p.id}`}
        nom={p.nom}
        statut={p.statut}
        libelleStatut={libelleStatut(p, fuseau, 'garde')}
        detail={detail.texte}
        detailOcre={detail.restreinte}
        ton={tonAffiche(p, fuseau)}
        // Garde enregistrée par une version précédente : pas de champ photo, on dessine la devanture.
        photoUrl={p.photo_url ?? null}
        assurance={p.accepte_mes_assurances === true}
        marcheJusquA={MARCHE_UTILE_M}
        pulsation={false}
        distanceM={p.distance_m}
        marcheMin={p.marche_min}
        onPress={() => ouvrir(p)}
        onAppeler={p.telephone ? () => tel(p) : undefined}
      />
    );
  };

  const detailPremiere = premiere ? detailGarde(premiere, fuseau) : null;
  const repli = useEnTeteRepliableMesure();

  return (
    <Ecran fond={c.fond} barreClaire hautSur={estNuit} testID="ecran-garde">
      {estNuit ? (
        <View style={styles.enteteNuit}>
          <EnTete titre={t('garde.titre')} centre varianteTitre="titreBarre" onRetour={() => allerOnglet('accueil')} />
          {rangeeZone}
          <View style={[styles.banniereNuit, { backgroundColor: c.enTeteGarde }]}>
            <View style={[styles.flex, styles.resume]}>{resume}</View>
            <View style={styles.luneNuit}>
              <IconeLune size={26} color={c.blanc} plein />
            </View>
          </View>
          {filtres}
        </View>
      ) : (
        <EnTeteRouge resume={resume} rangeeZone={rangeeZone} repli={repli} />
      )}

      <BandeauHorsConnexion dateGarde={dateEnregistree} />

      <Animated.ScrollView
        onScroll={estNuit ? undefined : repli.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.contenu, !estNuit && repli.mesuree ? { flexGrow: 1, paddingBottom: 24 + repli.margeContenu } : null]}
      >
        {!estNuit ? filtres : null}
        {isPending && !tour ? (
          // Cartes grises qui respirent pendant le premier chargement, à la place d'une roue.
          <View style={styles.liste} testID="chargement-gardes">
            {estNuit ? null : <SqueletteBlocProche />}
            <SqueletteListe nombre={5} ecart={8} />
          </View>
        ) : null}
        {estNuit && tour?.confirme_le ? (
          <View style={styles.confirmee}>
            <IconeBouclier size={16} color={c.vertTexte} />
            <Texte variante="libelle" couleur={c.texteSecondaire}>
              {t('garde.confirmee', { date: dateCourte(tour.confirme_le, fuseau) })}
            </Texte>
          </View>
        ) : null}
        {tour && liste.length === 0 ? (
          <Texte variante="texte" couleur={c.texteSecondaire} style={styles.aucune}>
            {t('garde.aucune')}
          </Texte>
        ) : null}
        {tri.visible && tour ? <ChargementCroix style={styles.chargementFiltre} testID="chargement-filtre" /> : null}
        {premiere && detailPremiere && !estNuit && !tri.visible ? (
          <BlocPlusProche
            testID="bloc-garde-plus-proche"
            garde
            titre={t('accueil.plusProcheGarde')}
            etiquettePhoto={t('garde.plusProche')}
            photoUrl={premiere.photo_url ?? null}
            nom={premiere.nom}
            statut={premiere.statut}
            libelleStatut={libelleStatut(premiere, fuseau, 'garde')}
            detail={detailPremiere.texte}
            detailOcre={detailPremiere.restreinte}
            assurance={premiere.accepte_mes_assurances === true}
            marcheJusquA={MARCHE_UTILE_M}
            distanceM={premiere.distance_m}
            marcheMin={premiere.marche_min}
            onPress={() => ouvrir(premiere)}
            onAppeler={() => tel(premiere)}
            onItineraire={() => router.push({ pathname: '/pharmacie/[id]/itineraire', params: { id: premiere.id } })}
          />
        ) : null}
        {tri.visible ? null : <View style={styles.liste}>{(estNuit ? liste : autres).map(ligne)}</View>}
        {!estNuit ? (
          // Conseil en ocre (palette enrichie) : une précaution, pas une urgence.
          <View style={[styles.conseil, { backgroundColor: c.ocreClair }]} testID="conseil-garde">
            <HiPhone size={18} color={c.ocreTexte} />
            <Texte variante="libelleMoyen" couleur={c.ocreTexte} style={styles.flex}>
              {t('garde.conseil')}
            </Texte>
          </View>
        ) : null}
      </Animated.ScrollView>
    </Ecran>
  );
}

/** Bouton « Partager » en pilule : blanc sur l'en-tête rouge, aplat sombre la nuit. */
function BoutonPartager({ onPress }: { onPress: () => void }) {
  const { couleurs: c, estNuit } = useTheme();
  const texte = estNuit ? c.texte : c.rougeTexteFort;
  return (
    <Pressable
      testID="bouton-partager-gardes"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('garde.partagerA11y')}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.partager, { backgroundColor: estNuit ? c.surface : c.blanc, opacity: pressed ? 0.85 : 1 }]}
    >
      <IconePartage size={16} color={estNuit ? c.rougeTexte : c.rougeTexteFort} strokeWidth={2.2} />
      <Texte variante="boutonPetit" couleur={texte}>
        {t('garde.partager')}
      </Texte>
    </Pressable>
  );
}

/** Hauteur des parties de l'en-tête rouge qui restent une fois replié : marge haute + ligne du titre + marge basse. */
const HAUTEUR_TITRE = 16 + 44 + 12;

/**
 * En-tête repliable dont la hauteur dépliée est mesurée au premier affichage (elle dépend de la
 * langue, de la taille du texte et de la zone sûre) ; tant qu'elle n'est pas connue, rien ne bouge.
 */
function useEnTeteRepliableMesure() {
  const { top } = useSafeAreaInsets();
  const [hauteur, setHauteur] = useState<number | null>(null);
  const repliee = HAUTEUR_TITRE + top;
  const repli = useEnTeteRepliable(hauteur ?? repliee + 1, repliee);
  const mesurer = (e: LayoutChangeEvent) => {
    if (hauteur === null) setHauteur(Math.round(e.nativeEvent.layout.height));
  };
  return { ...repli, mesuree: hauteur !== null, mesurer };
}

type Repli = ReturnType<typeof useEnTeteRepliableMesure>;

/** En-tête rouge du jour : au défilement, la commune et le résumé s'effacent, le titre reste. */
function EnTeteRouge({ resume, rangeeZone, repli }: { resume: ReactNode; rangeeZone: ReactNode; repli: Repli }) {
  const { couleurs: c } = useTheme();
  // L'en-tête rouge passe sous la barre d'état : on y reporte la zone sûre.
  const { top } = useSafeAreaInsets();
  return (
    <Animated.View
      onLayout={repli.mesurer}
      style={[styles.enteteRouge, { backgroundColor: c.enTeteGarde, paddingTop: 16 + top }, repli.mesuree ? repli.styleEnTete : null]}
    >
      <View style={styles.ligneTitre}>
        <Logo largeur={28} variante="inverse" />
        <Texte variante="titre" couleur={c.blanc} titre style={styles.flex}>
          {t('garde.titre')}
        </Texte>
        <IconeLune size={24} color={c.blanc} plein />
      </View>
      <Animated.View style={[styles.resumeEnTete, repli.styleResume]}>
        {rangeeZone}
        <View style={styles.resume}>{resume}</View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  enteteRouge: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 6,
    overflow: 'hidden',
    borderBottomLeftRadius: rayons.feuille,
    borderBottomRightRadius: rayons.feuille,
  },
  ligneTitre: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeeZone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2, marginBottom: 4 },
  partager: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: rayons.pilule,
    flexShrink: 0,
  },
  resume: { gap: 2 },
  resumeEnTete: { gap: 6 },
  enteteNuit: { paddingTop: 16, paddingHorizontal: 20, gap: 14 },
  banniereNuit: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: rayons.grandeCarte,
  },
  luneNuit: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Le défilement des pilules va d'un bord à l'autre de l'écran ; la gouttière passe dans le contenu.
  defilementFiltres: { marginHorizontal: -20 },
  filtres: { paddingHorizontal: 20 },
  chargementFiltre: { height: 220 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  confirmee: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -4 },
  aucune: { paddingVertical: 16 },
  liste: { gap: 8 },
  conseil: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: rayons.moyen,
  },
});

export default avecErrorBoundary(ListeGardes, 'ListeGardes');
