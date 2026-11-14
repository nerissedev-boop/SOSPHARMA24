import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, Share, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { estErreurAppel, type PharmacieResume } from '@/commun/api';
import {
  appeler,
  bornesLongues,
  commencerVisite,
  comparerDistance,
  jourMois,
  marquerSortieVersAutreApp,
  repereEtCommune,
  signalerErreur,
  t,
  telephoneAffiche,
  useEnLigne,
  usePreferences,
  vibrationAction,
} from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { CIBLE_TACTILE, espacements, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  CartePlusProche,
  ChargementCroix,
  Ecran,
  EtatVide,
  HiPharmacy,
  IconeActualiser,
  IconeChevronBas,
  LignePharmacie,
  PiluleFiltres,
  SqueletteBlocProche,
  SqueletteListe,
  Texte,
  useChargementBref,
} from '@/commun/ui';
import { NumerosUrgence, usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { BandeauGarde, CHEVAUCHEMENT } from '../composants/BandeauGarde';
import { EnTeteGroupe } from '../composants/EnTeteGroupe';
import { useTourEnCours } from '../hooks/useTourEnCours';
import { detailGarde, texteListeGardes } from '../partage';
import { LIMITE_PREMIERES, regrouperParCommune, type GroupeCommune } from '../regroupement';

type Choix = 'proches' | 'nuit' | 'commune';

/**
 * Éléments de la liste virtualisée, sous l'en-tête (bandeau, plus proche) : seules les lignes
 * visibles sont dessinées, ce qui compte quand la ville a une centaine de pharmacies de garde.
 * Chaque ligne sait si elle ouvre ou ferme sa surface (une surface par liste, une par commune).
 */
type Element =
  | { type: 'filtres' }
  | { type: 'etat' }
  | { type: 'ligne'; p: PharmacieResume; premiere: boolean; derniere: boolean; dansGroupe: boolean }
  | { type: 'plus'; nombre: number }
  | { type: 'groupe'; groupe: GroupeCommune; ouvert: boolean }
  | { type: 'secours' };

function cleElement(e: Element): string {
  switch (e.type) {
    case 'ligne':
      return `ligne-${e.p.id}`;
    case 'groupe':
      return `groupe-${e.groupe.cle}`;
    default:
      return e.type;
  }
}

/** Lignes d'une même surface : la première et la dernière portent les coins arrondis. */
function lignes(pharmacies: PharmacieResume[], dansGroupe: boolean): Element[] {
  return pharmacies.map((p, i): Element => ({ type: 'ligne', p, premiere: i === 0, derniere: i === pharmacies.length - 1, dansGroupe }));
}

/** Au-delà de 2 km, le temps de marche n'est plus utile la nuit : seule la distance reste. */
const MARCHE_UTILE_M = 2000;

/**
 * 05 Pharmacies de garde (refonte v2) : même écran le jour et la nuit, seul le thème change.
 * Bandeau rouge foncé avec la période du tour et la date de confirmation, la plus proche en grande
 * carte qui le chevauche, puis les filtres (collés en haut au défilement) et la liste, comme celle
 * de l'Ordre : nom, distance et quartier, numéro ; les 10 plus proches, puis les autres par commune.
 */
function ListeGardes() {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const reduit = useReducedMotion();
  const refListe = useRef<FlatList<Element>>(null);
  const [choix, setChoix] = useState<Choix>('proches');
  // Le tri se fait sur le téléphone (instantané) : la croix bat un court instant pour montrer que la liste change.
  const tri = useChargementBref();
  // Au-delà des 10 premières : un bouton, puis les autres par commune.
  const [toutAfficher, setToutAfficher] = useState(false);
  // Communes dépliées ou repliées à la main : la commune de l'usager est ouverte d'office.
  const [basculees, setBasculees] = useState<ReadonlySet<string>>(() => new Set());
  const changerChoix = (cle: Choix) => {
    setChoix(cle);
    setToutAfficher(false);
    tri.declencher();
    // Filtres collés en haut : on remonte là où s'affiche la plus proche du nouveau choix.
    refListe.current?.scrollToOffset({ offset: 0, animated: !reduit });
  };
  const basculer = (cle: string) =>
    setBasculees((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(cle)) apres.add(cle);
      return apres;
    });
  const { zone, libelle } = useZoneCourante();
  const { pays } = usePaysCourant();
  const filtresCarte = usePreferences((e) => e.filtres);
  const definirFiltres = usePreferences((e) => e.definirFiltres);
  const { tour, fuseau, dataUpdatedAt, isPending, isError, error, refetch } = useTourEnCours();
  const client = useQueryClient();
  const enLigne = useEnLigne();
  const [actualisation, setActualisation] = useState(false);
  // Glisser pour actualiser le tour de garde. Hors connexion, rien n'est relancé : la liste enregistrée
  // reste affichée (le bandeau dit de quand elle date) et la roue ne tourne pas dans le vide.
  const actualiser = async () => {
    if (!enLigne) return;
    setActualisation(true);
    try {
      await client.invalidateQueries({ queryKey: ['gardes', 'en-cours'] });
    } finally {
      setActualisation(false);
    }
  };

  // Sans tour enregistré : premier chargement, hors connexion ou erreur (chacun son état).
  const sansListe = tour === undefined;
  const horsLigneSansListe = sansListe && !enLigne;
  const enErreur = sansListe && enLigne && isError;
  const aucunTour = enErreur && estErreurAppel(error) && error.code === 'NOT_FOUND';
  const chargement = sansListe && enLigne && !isError && isPending;

  const liste = useMemo(() => {
    const toutes = [...(tour?.pharmacies ?? [])].filter((p) => p.statut === 'garde');
    const filtrees =
      choix === 'nuit'
        ? toutes.filter((p) => p.garde?.jusqua === null)
        : choix === 'commune'
          ? toutes.filter((p) => !zone || p.commune_id === zone.zoneId)
          : toutes;
    return filtrees.sort(comparerDistance);
  }, [tour, choix, zone]);

  const ouvrir = (p: PharmacieResume) => router.push({ pathname: '/pharmacie/[id]', params: { id: p.id } });
  const tel = (p: PharmacieResume) => {
    if (!p.telephone) return;
    commencerVisite({ id: p.id, nom: p.nom });
    void appeler(p.telephone, pays?.indicatif);
  };
  const nombre = (tour?.pharmacies ?? []).filter((p) => p.statut === 'garde').length;
  const bornes = tour ? bornesLongues(tour.debut, tour.fin, fuseau) : null;
  const [premiere, ...autres] = liste;
  const changerZone = () => router.push('/zone');
  // Pas de liste cette semaine : les pharmacies ouvertes 24h/24, elles, restent ouvertes.
  const voir24h = () => {
    definirFiltres({ ...filtresCarte, h24: true });
    router.navigate('/carte');
  };

  // Partage de la liste affichée (filtre en cours compris), par la feuille de partage du téléphone.
  const partager = async () => {
    try {
      vibrationAction();
      marquerSortieVersAutreApp();
      await Share.share({
        message: texteListeGardes({
          zone: libelle,
          bornes,
          pharmacies: liste,
          indicatif: pays?.indicatif,
        }),
      });
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
      styleContenu={styles.gouttiere}
      options={[
        { cle: 'proches', libelle: t('garde.plusProches'), testID: 'filtre-garde-proches' },
        { cle: 'nuit', libelle: t('garde.touteNuit'), testID: 'filtre-garde-nuit' },
        { cle: 'commune', libelle: t('garde.maCommune'), testID: 'filtre-garde-commune' },
      ]}
    />
  );

  const ligne = (e: Extract<Element, { type: 'ligne' }>) => {
    const { p } = e;
    return (
      <LignePharmacie
        key={p.id}
        testID={`garde-${p.id}`}
        variante="garde"
        animee
        premiere={e.premiere}
        derniere={e.derniere}
        nom={p.nom}
        statut={p.statut}
        libelleStatut={libelleStatut(p, fuseau, 'garde')}
        ton={tonAffiche(p, fuseau)}
        // Sous le titre de sa commune, la ligne donne le repère plutôt que de répéter la commune.
        commune={e.dansGroupe ? p.adresse || null : p.commune}
        numero={p.telephone ? telephoneAffiche(p.telephone, pays?.indicatif) : null}
        restriction={detailGarde(p, fuseau).restriction}
        assurance={p.accepte_mes_assurances === true}
        positionAConfirmer={p.latitude === null}
        marcheJusquA={MARCHE_UTILE_M}
        distanceM={p.distance_m}
        marcheMin={p.marche_min}
        onPress={() => ouvrir(p)}
        onAppeler={p.telephone ? () => tel(p) : undefined}
      />
    );
  };

  // La plus proche du choix en cours : quand un filtre la change, fondu croisé au même endroit.
  const carte = premiere ? (
    <CartePlusProche
      id={premiere.id}
      testID="bloc-garde-plus-proche"
      nom={premiere.nom}
      statut={premiere.statut}
      ton={tonAffiche(premiere, fuseau)}
      libelleStatut={libelleStatut(premiere, fuseau, 'carte')}
      distanceM={premiere.distance_m}
      marcheMin={premiere.distance_m !== null && premiere.distance_m < MARCHE_UTILE_M ? premiere.marche_min : null}
      repere={repereEtCommune(premiere)}
      photoUrl={premiere.photo_url}
      assurance={premiere.accepte_mes_assurances === true}
      positionAConfirmer={premiere.latitude === null}
      conseil
      onPress={() => ouvrir(premiere)}
      onAppeler={premiere.telephone ? () => tel(premiere) : undefined}
      onYAller={() => router.push({ pathname: '/pharmacie/[id]/itineraire', params: { id: premiere.id } })}
    />
  ) : chargement ? (
    <SqueletteBlocProche />
  ) : null;

  // En-tête de la liste (jamais virtualisé) : la carte chevauche le bas du bandeau.
  const tete = (
    <View>
      <BandeauGarde
        libelleZone={libelle}
        onChangerZone={changerZone}
        onPartager={() => void partager()}
        partageActif={!sansListe}
        nombre={tour ? nombre : null}
        bornes={bornes}
        confirmeeLe={tour?.confirme_le ? jourMois(tour.confirme_le, fuseau) : null}
        misAJourLe={dataUpdatedAt}
        masquerHorsConnexion={horsLigneSansListe}
        fuseau={fuseau}
        reserverResume={chargement}
        chevauche={carte !== null}
      />
      {carte ? <View style={[styles.gouttiere, styles.chevauchement]}>{carte}</View> : null}
    </View>
  );

  // Les 10 premières d'office (la plus proche comprise, dans la carte), puis un bouton pour les autres.
  const visibles = tri.visible ? [] : autres;
  const enTete = visibles.slice(0, LIMITE_PREMIERES - 1);
  const reste = visibles.slice(enTete.length);
  // Sans liste à filtrer (hors connexion, erreur), les filtres n'ont rien à faire.
  const avecFiltres = !horsLigneSansListe && !enErreur;
  const elements: Element[] = [];
  if (avecFiltres) elements.push({ type: 'filtres' });
  if (chargement || horsLigneSansListe || enErreur || (tour !== undefined && (tri.visible || liste.length === 0))) elements.push({ type: 'etat' });
  if ((horsLigneSansListe || enErreur) && pays && pays.urgences.length > 0) elements.push({ type: 'secours' });
  elements.push(...lignes(enTete, false));
  if (reste.length > 0 && !toutAfficher) elements.push({ type: 'plus', nombre: reste.length });
  if (reste.length > 0 && toutAfficher) {
    const groupes = regrouperParCommune(reste, zone?.zoneId ?? null);
    if (groupes.length === 1) {
      // Une seule commune (filtre « Ma commune ») : pas de titre de groupe.
      elements.push(...lignes(reste, false));
    } else {
      for (const groupe of groupes) {
        const ouvert = basculees.has(groupe.cle) !== (groupe.cle !== '' && groupe.cle === zone?.zoneId);
        elements.push({ type: 'groupe', groupe, ouvert });
        if (ouvert) elements.push(...lignes(groupe.pharmacies, true));
      }
    }
  }

  const reessayer = {
    libelle: t('commun.reessayer'),
    icone: <IconeActualiser size={20} color={c.vertTexte} />,
    onPress: () => void refetch(),
    accent: true,
    testID: 'garde-reessayer',
  };

  // Premier chargement, croix du tri, liste vide, hors connexion sans liste, erreur.
  const etat = (): ReactNode => {
    if (chargement) {
      // Lignes grises qui respirent à la place de la liste (la carte du haut a son propre squelette).
      return (
        <View testID="chargement-gardes">
          <SqueletteListe nombre={5} />
        </View>
      );
    }
    if (horsLigneSansListe) {
      // Ni roue ni pictogramme : une phrase dit pourquoi, Réessayer suit, les secours restent dessous.
      return (
        <EtatVide titre={t('garde.horsConnexionTitre')} texte={t('garde.horsConnexionTexte')} dessin="aucun" suggestions={[reessayer]} testID="garde-hors-connexion" />
      );
    }
    if (aucunTour) {
      return (
        <EtatVide
          titre={t('garde.pasDeListeTitre')}
          texte={t('garde.pasDeListeTexte')}
          dessin="gardeVide"
          suggestions={[
            { libelle: t('garde.voir24h'), icone: <HiPharmacy size={20} color={c.pastilleActionIcone} />, onPress: voir24h, accent: true, testID: 'garde-voir-24h' },
          ]}
          testID="garde-erreur"
        />
      );
    }
    if (enErreur) {
      return <EtatVide titre={t('garde.erreurTitre')} texte={t('garde.erreurTexte')} dessin="gardeVide" suggestions={[reessayer]} testID="garde-erreur" />;
    }
    if (tri.visible) return <ChargementCroix style={styles.chargementFiltre} testID="chargement-filtre" />;
    return <EtatVide titre={t('garde.aucuneTitre')} texte={t('garde.aucune')} dessin="gardeVide" testID="garde-aucune" />;
  };

  const rendreElement: ListRenderItem<Element> = ({ item }) => {
    switch (item.type) {
      case 'filtres':
        // Fond plein d'un bord à l'autre : la liste passe dessous quand les filtres restent collés en haut.
        return <View style={[styles.filtres, { backgroundColor: c.fond }]}>{filtres}</View>;
      case 'etat':
        // Les dessins (vide, erreur) respirent davantage que les squelettes et la croix.
        return <View style={[styles.gouttiere, styles.etat, !(chargement || tri.visible) && styles.etatDessin]}>{etat()}</View>;
      case 'secours':
        return pays ? (
          <View style={styles.gouttiere} testID="garde-secours">
            <Texte variante="section" titre style={styles.etiquette}>
              {t('garde.enCasDUrgence')}
            </Texte>
            <NumerosUrgence urgences={pays.urgences} />
          </View>
        ) : null;
      case 'ligne':
        return <View style={styles.gouttiere}>{ligne(item)}</View>;
      case 'plus': {
        const libellePlus = t('garde.afficherAutres', { count: item.nombre });
        return (
          <View style={styles.gouttiere}>
            <Pressable
              testID="bouton-afficher-autres"
              onPress={() => setToutAfficher(true)}
              accessibilityRole="button"
              accessibilityLabel={libellePlus}
              style={({ pressed }) => [styles.plus, { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }]}
            >
              <Texte variante="boutonPetit" couleur={c.rougeTexteFort}>
                {libellePlus}
              </Texte>
              <IconeChevronBas size={16} color={c.rougeTexteFort} />
            </Pressable>
          </View>
        );
      }
      case 'groupe':
        return (
          <View style={[styles.gouttiere, styles.celluleGroupe]}>
            <EnTeteGroupe groupe={item.groupe} ouvert={item.ouvert} onPress={() => basculer(item.groupe.cle)} />
          </View>
        );
    }
  };

  return (
    // La barre d'état prend la couleur du bandeau : il passe dessous au défilement sans laisser de trou.
    <Ecran fond={c.bandeauGarde} barreClaire testID="ecran-garde">
      <FlatList
        ref={refListe}
        testID="liste-gardes"
        data={elements}
        keyExtractor={cleElement}
        renderItem={rendreElement}
        ListHeaderComponent={tete}
        // 0 = l'en-tête (bandeau, plus proche), 1 = les filtres, qui restent collés en haut.
        stickyHeaderIndices={avecFiltres ? [1] : undefined}
        // L'en-tête n'est pas compté : 11 éléments couvrent largement le premier écran.
        initialNumToRender={11}
        windowSize={7}
        style={[styles.flex, { backgroundColor: c.fond }]}
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl refreshing={actualisation} onRefresh={() => void actualiser()} tintColor={c.vert} colors={[c.vert]} testID="actualiser-gardes" />
        }
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Pas de marge sur le conteneur : bandeau et filtres vont d'un bord à l'autre, le reste porte la gouttière.
  contenu: { paddingBottom: 24 },
  gouttiere: { paddingHorizontal: espacements.gouttiere },
  chevauchement: { marginTop: -CHEVAUCHEMENT },
  filtres: { paddingTop: 16, paddingBottom: 12 },
  etat: { marginTop: 8 },
  etatDessin: { paddingVertical: 16 },
  etiquette: { marginTop: 8, marginBottom: 10, paddingHorizontal: 4 },
  chargementFiltre: { height: 220 },
  celluleGroupe: { marginTop: 6 },
  plus: {
    marginTop: 12,
    minHeight: CIBLE_TACTILE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: rayons.touche,
  },
});

export default avecErrorBoundary(ListeGardes, 'ListeGardes');
