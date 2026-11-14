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
  dateCourte,
  marquerSortieVersAutreApp,
  signalerErreur,
  t,
  useEnLigne,
  vibrationAction,
} from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { espacements, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  ChargementCroix,
  Ecran,
  EtatVide,
  IconeActualiser,
  IconeBouclier,
  IconeChevronBas,
  IconeSansReseau,
  LignePharmacie,
  PiluleFiltres,
  SqueletteListe,
  Texte,
  useChargementBref,
} from '@/commun/ui';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { BandeauGarde, CHEVAUCHEMENT } from '../composants/BandeauGarde';
import { CarteGardeProche, SqueletteCarteGarde } from '../composants/CarteGardeProche';
import { ConseilGarde } from '../composants/ConseilGarde';
import { EnTeteGroupe } from '../composants/EnTeteGroupe';
import { useTourEnCours } from '../hooks/useTourEnCours';
import { detailGarde, texteListeGardes } from '../partage';
import { LIMITE_PREMIERES, regrouperParCommune, type GroupeCommune } from '../regroupement';

type Choix = 'proches' | 'nuit' | 'commune';

/**
 * Éléments de la liste virtualisée, sous l'en-tête (bandeau, plus proche, conseil) : seules les
 * lignes visibles sont dessinées, ce qui compte quand la ville a une centaine de pharmacies de garde.
 */
type Element =
  | { type: 'filtres' }
  | { type: 'etat' }
  | { type: 'ligne'; p: PharmacieResume; rang: number }
  | { type: 'plus'; nombre: number }
  | { type: 'groupe'; groupe: GroupeCommune; ouvert: boolean }
  | { type: 'pied' };

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

/** Au-delà de 2 km, le temps de marche n'est plus utile la nuit : seule la distance reste. */
const MARCHE_UTILE_M = 2000;

/**
 * 05 Pharmacies de garde, piste A (maquette validée le 11 nov.) : même écran le jour et la nuit,
 * seul le thème change. Bandeau rouge foncé, la plus proche en grande carte qui le chevauche,
 * le conseil d'appeler, puis les filtres (collés en haut au défilement) et la liste : les
 * 10 plus proches, puis les autres par commune.
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
  const { tour, fuseau, dateEnregistree, isPending, isError, error, refetch } = useTourEnCours();
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
        positionAConfirmer={p.latitude === null}
        marcheJusquA={MARCHE_UTILE_M}
        pulsation={false}
        distanceM={p.distance_m}
        marcheMin={p.marche_min}
        onPress={() => ouvrir(p)}
        onAppeler={p.telephone ? () => tel(p) : undefined}
      />
    );
  };

  // La plus proche du choix en cours : sa clé la fait apparaître en fondu quand un filtre la change.
  const carte = premiere ? (
    <CarteGardeProche
      key={premiere.id}
      testID="bloc-garde-plus-proche"
      nom={premiere.nom}
      libelleStatut={libelleStatut(premiere, fuseau, 'garde')}
      ocre={detailGarde(premiere, fuseau).restreinte}
      commune={premiere.commune}
      distanceM={premiere.distance_m}
      marcheMin={premiere.distance_m !== null && premiere.distance_m < MARCHE_UTILE_M ? premiere.marche_min : null}
      assurance={premiere.accepte_mes_assurances === true}
      positionAConfirmer={premiere.latitude === null}
      onPress={() => ouvrir(premiere)}
      onAppeler={premiere.telephone ? () => tel(premiere) : undefined}
      onItineraire={
        premiere.latitude === null
          ? undefined
          : () => router.push({ pathname: '/pharmacie/[id]/itineraire', params: { id: premiere.id } })
      }
    />
  ) : chargement ? (
    <SqueletteCarteGarde />
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
        reserverResume={chargement}
        chevauche={carte !== null}
      />
      {carte ? (
        <>
          <View style={[styles.gouttiere, styles.chevauchement]}>{carte}</View>
          <ConseilGarde style={styles.conseil} />
        </>
      ) : null}
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
  enTete.forEach((p, rang) => elements.push({ type: 'ligne', p, rang }));
  if (reste.length > 0 && !toutAfficher) elements.push({ type: 'plus', nombre: reste.length });
  if (reste.length > 0 && toutAfficher) {
    const groupes = regrouperParCommune(reste, zone?.zoneId ?? null);
    if (groupes.length === 1) {
      // Une seule commune (filtre « Ma commune ») : pas de titre de groupe.
      reste.forEach((p, rang) => elements.push({ type: 'ligne', p, rang }));
    } else {
      for (const groupe of groupes) {
        const ouvert = basculees.has(groupe.cle) !== (groupe.cle !== '' && groupe.cle === zone?.zoneId);
        elements.push({ type: 'groupe', groupe, ouvert });
        if (ouvert) groupe.pharmacies.forEach((p, rang) => elements.push({ type: 'ligne', p, rang }));
      }
    }
  }
  if (tour?.confirme_le && !tri.visible) elements.push({ type: 'pied' });

  // Premier chargement, croix du tri, liste vide, hors connexion sans liste, erreur.
  const etat = (): ReactNode => {
    if (chargement) {
      // Cartes grises qui respirent à la place des lignes (la carte du haut a son propre squelette).
      return (
        <View testID="chargement-gardes">
          <SqueletteListe nombre={5} ecart={8} />
        </View>
      );
    }
    if (horsLigneSansListe) {
      return (
        <EtatVide
          titre={t('garde.erreurTitre')}
          texte={t('garde.horsConnexionTexte')}
          illustration={
            <View style={[styles.picto, { backgroundColor: c.surface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <IconeSansReseau size={44} color={c.texteSecondaire} />
            </View>
          }
          testID="garde-hors-connexion"
        />
      );
    }
    if (enErreur) {
      const aucunTour = estErreurAppel(error) && error.code === 'NOT_FOUND';
      return (
        <EtatVide
          titre={t('garde.erreurTitre')}
          texte={aucunTour ? t('garde.aucunTour') : t('garde.erreurTexte')}
          dessin="gardeVide"
          suggestions={[
            {
              libelle: t('commun.reessayer'),
              icone: <IconeActualiser size={20} color={c.vertTexte} />,
              onPress: () => void refetch(),
              accent: true,
              testID: 'garde-reessayer',
            },
          ]}
          testID="garde-erreur"
        />
      );
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
      case 'ligne':
        return <View style={[styles.gouttiere, styles.cellule]}>{ligne(item.p, item.rang)}</View>;
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
      case 'pied':
        return tour?.confirme_le ? (
          <View style={[styles.gouttiere, styles.confirmee]} testID="garde-confirmee">
            <IconeBouclier size={14} color={c.vertTexte} />
            <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.flex}>
              {t('garde.confirmee', { date: dateCourte(tour.confirme_le, fuseau) })}
            </Texte>
          </View>
        ) : null;
    }
  };

  return (
    // La barre d'état prend la couleur du bandeau : il passe dessous au défilement sans laisser de trou.
    <Ecran fond={c.bandeauGarde} barreClaire testID="ecran-garde">
      {/* Sans aucune liste enregistrée, l'état « hors connexion » de la liste le dit déjà. */}
      <BandeauHorsConnexion dateGarde={dateEnregistree} visible={horsLigneSansListe ? false : undefined} />
      <FlatList
        ref={refListe}
        testID="liste-gardes"
        data={elements}
        keyExtractor={cleElement}
        renderItem={rendreElement}
        ListHeaderComponent={tete}
        // 0 = l'en-tête (bandeau, plus proche, conseil), 1 = les filtres, qui restent collés en haut.
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
  conseil: { marginTop: 14, marginHorizontal: espacements.gouttiere },
  filtres: { paddingTop: 14, paddingBottom: 6 },
  etat: { marginTop: 8 },
  etatDessin: { paddingVertical: 16 },
  chargementFiltre: { height: 220 },
  // Pas de gap sur la liste virtualisée : chaque élément porte son propre écart.
  cellule: { marginTop: 8 },
  celluleGroupe: { marginTop: 12 },
  plus: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: rayons.pilule,
  },
  confirmee: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  picto: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
});

export default avecErrorBoundary(ListeGardes, 'ListeGardes');
