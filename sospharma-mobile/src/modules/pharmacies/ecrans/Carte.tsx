import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PharmacieResume } from '@/commun/api';
import { distanceKm, distanceNombre, positionDe, t, useEnLigne, usePreferences } from '@/commun/lib';
import { estInactive } from '@/commun/regles';
import { CIBLE_TACTILE, espacements, ombres, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  Bouton,
  BoutonIcone,
  ChampRecherche,
  Ecran,
  Filtre,
  HiMedicalSearchOutline,
  IconeCarteDepliee,
  IconeFermer,
  IconeFiltres,
  IconeViseur,
  LignePharmacie,
  ChargementCroix,
  Texte,
  useNavigationOnglets,
  useChargementVisible,
} from '@/commun/ui';
import {
  CarteBase,
  carteDisponible,
  MarqueurCommune,
  MarqueurPharmacie,
  PointPosition,
  Repere,
  type RefCarte,
  type VueCarte,
} from '@/commun/ui/carte';
import { useCompteurs, usePaysCourant, useVilles, useZoneCourante } from '@/modules/territoire';

import { AucunResultat } from '../composants/AucunResultat';
import { FeuillePharmacieCarte } from '../composants/FeuillePharmacieCarte';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmaciesCadre, usePharmaciesProches, useRecherche, useTonStatut } from '../hooks/usePharmacies';

/** En dessous de ce zoom, la carte bascule sur les compteurs par commune (maquette 11). */
const ZOOM_COMMUNES = 12.5;

/**
 * 04 Carte, 11 Carte dézoomée, 21 Carte nuit (refonte v2) : l'en-tête se réduit à la recherche et
 * aux filtres, et la plus proche est choisie dès l'ouverture. La carte donne le même signal que
 * l'Accueil sans qu'on cherche un marqueur ; toucher un autre marqueur la remplace.
 */
function Carte() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c, estNuit } = useTheme();
  const enLigne = useEnLigne();
  const refCarte = useRef<RefCarte>(null);
  const [vue, setVue] = useState<VueCarte | null>(null);
  const [selection, setSelection] = useState<PharmacieResume | null>(null);
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  // Recherche lancée depuis l'Accueil (?q=…&n=…) : reprise ici une fois par envoi.
  const { q, n } = useLocalSearchParams<{ q?: string; n?: string }>();
  const [envoiVu, setEnvoiVu] = useState<string | undefined>(undefined);
  if (q && n && n !== envoiVu) {
    setEnvoiVu(n);
    setSaisie(q);
    setRecherche(q);
  }
  const [hauteurEnTete, setHauteurEnTete] = useState(180);
  const [hauteurFiche, setHauteurFiche] = useState(200);

  const filtreRapide = usePreferences((e) => e.filtreRapide);
  const definirFiltreRapide = usePreferences((e) => e.definirFiltreRapide);
  const paysCode = usePreferences((e) => e.paysCode);
  const { zone, point, villeId } = useZoneCourante();
  const { fuseau } = usePaysCourant();
  const villes = useVilles(paysCode);
  const ville = villes.data?.find((v) => v.id === villeId);
  const libelleStatut = useLibelleStatut();
  const tonStatut = useTonStatut();
  const actions = useActionsPharmacie();
  // L'aperçu fermé à la main (appui sur le fond de carte) ne revient pas tout seul sur la plus proche.
  const [apercuFerme, setApercuFerme] = useState(false);

  const modeCommunes = vue !== null && vue.zoom < ZOOM_COMMUNES;
  const proches = usePharmaciesProches();
  const toutes = usePharmaciesProches({ rapide: 'toutes' });
  const cadre = usePharmaciesCadre(vue && !modeCommunes ? vue.bornes : null);
  const compteurs = useCompteurs(modeCommunes ? villeId : null);
  const resultats = useRecherche(recherche);

  // Seules les pharmacies situées ont un point sur la carte (les autres sont « position à confirmer »).
  const points = useMemo(
    () => (cadre.liste ?? proches.liste ?? []).flatMap((p) => {
      const position = positionDe(p);
      return position ? [{ ...p, ...position }] : [];
    }),
    [cadre.liste, proches.liste],
  );
  // La plus proche ouverte ou de garde, située : choisie d'office à l'ouverture.
  const plusProche = useMemo(() => (proches.liste ?? []).find((p) => !estInactive(p.statut) && positionDe(p) !== null), [proches.liste]);
  // Pharmacie touchée : rafraîchie depuis les points chargés, gardée si la carte bouge et qu'elle sort du cadre.
  const choisie = useMemo<PharmacieResume | undefined>(
    () => (selection ? (points.find((p) => p.id === selection.id) ?? selection) : apercuFerme ? undefined : plusProche),
    [points, selection, apercuFerme, plusProche],
  );
  // Sur certains téléphones, toucher un marqueur déclenche aussi l'appui sur le fond de carte.
  // On ignore donc l'appui sur le fond qui suit de près un toucher de marqueur.
  const marqueurVientDEtreTouche = useRef(false);
  const choisir = (p: PharmacieResume) => {
    marqueurVientDEtreTouche.current = true;
    setTimeout(() => {
      marqueurVientDEtreTouche.current = false;
    }, 400);
    setSelection(p);
  };
  const fermer = useCallback(() => {
    setSelection(null);
    setApercuFerme(true);
  }, []);
  const fermerApercu = () => {
    if (!marqueurVientDEtreTouche.current) fermer();
  };
  const communeResumee = compteurs.data?.find((x) => x.zone_id === zone?.zoneId) ?? compteurs.data?.[0];
  const sansCarte = !carteDisponible || !enLigne;
  // Filtre changé ou carte déplacée : les anciens points restent affichés le temps de la requête.
  const procheEnCours = useChargementVisible(proches.isPlaceholderData && proches.isFetching);
  const chargementPoints = useChargementVisible(procheEnCours || (cadre.isPlaceholderData && cadre.isFetching));

  const chipsOrdre = estNuit ? (['toutes', 'garde', 'ouvertes'] as const) : (['toutes', 'ouvertes', 'garde'] as const);
  const chips = (
    <View style={styles.filtres}>
      {chipsOrdre.map((cle) =>
        cle === 'garde' ? (
          <Filtre
            key={cle}
            paddingHorizontal={12}
            libelle={t('accueil.deGarde')}
            ton="garde"
            badge24={filtreRapide !== 'garde'}
            selectionne={filtreRapide === 'garde'}
            onPress={() => definirFiltreRapide('garde')}
          />
        ) : (
          <Filtre
            key={cle}
            paddingHorizontal={12}
            libelle={cle === 'ouvertes' ? t('accueil.ouvertes') : modeCommunes ? t('accueil.toutes') : t('carte.toutesN', { count: toutes.nombre })}
            selectionne={filtreRapide === cle}
            onPress={() => definirFiltreRapide(cle)}
          />
        ),
      )}
    </View>
  );

  // En-tête posé sur le plan : la recherche suffit (ni titre ni zone), puis les filtres.
  const enTete = (
    <View
      onLayout={(e) => setHauteurEnTete(e.nativeEvent.layout.height)}
      style={[styles.enTete, { backgroundColor: c.enTeteCarte, paddingTop: insets.top + 12 }, !estNuit && ombres.enTete]}
    >
      {modeCommunes ? (
        <BarreZone
          variante="bandeau"
          libelle={t('carte.toutesCommunes', { ville: ville?.nom ?? zone?.villeNom ?? '' })}
          onChanger={() => router.push('/zone')}
        />
      ) : (
        <View style={styles.ligneRecherche}>
          <View style={styles.flex}>
            <ChampRecherche
              libelle={t('carte.rechercheA11y')}
              placeholder={t('carte.recherche')}
              value={saisie}
              onChangeText={(v) => {
                setSaisie(v);
                if (!v) setRecherche('');
              }}
              onSubmitEditing={() => setRecherche(saisie.trim())}
              rendreIcone={(couleur) => <HiMedicalSearchOutline size={22} color={couleur} />}
              testID="champ-recherche-pharmacie"
            />
          </View>
          {recherche ? (
            <BoutonIcone
              accessibilityLabel={t('commun.fermer')}
              fond={c.surface}
              style={styles.boutonCarre}
              onPress={() => {
                setSaisie('');
                setRecherche('');
              }}
            >
              <IconeFermer size={20} color={c.texte} />
            </BoutonIcone>
          ) : (
            <BoutonIcone accessibilityLabel={t('carte.filtres')} fond={c.surface} style={styles.boutonCarre} onPress={() => router.push('/filtres')} testID="bouton-filtres">
              <IconeFiltres size={20} color={c.texte} />
            </BoutonIcone>
          )}
        </View>
      )}
      {chips}
      {chargementPoints && !sansCarte ? (
        <View
          style={[styles.chargement, { backgroundColor: c.feuille }, ombres.boutonRond]}
          accessibilityRole="progressbar"
          accessibilityLabel={t('commun.chargement')}
          testID="chargement-carte"
        >
          <ChargementCroix taille={16} halo={false} />
          <Texte variante="petitFort">{t('commun.chargement')}</Texte>
        </View>
      ) : null}
    </View>
  );

  /** Résultats ou liste de remplacement : une liste imprimée, comme sur l'Accueil. */
  const listePlate = (pharmacies: PharmacieResume[]) =>
    pharmacies.map((p, i) => (
      <LignePharmacie
        key={p.id}
        testID={`ligne-${p.id}`}
        premiere={i === 0}
        derniere={i === pharmacies.length - 1}
        nom={p.nom}
        statut={p.statut}
        libelleStatut={libelleStatut(p)}
        ton={tonStatut(p)}
        commune={p.commune}
        positionAConfirmer={p.latitude === null}
        distanceM={p.distance_m}
        marcheMin={p.marche_min}
        onPress={() => actions.ouvrir(p)}
        onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
      />
    ));

  // Liste à la place de la carte (web ou hors connexion : pas de fonds de carte hors ligne en V1).
  if (sansCarte) {
    return (
      <Ecran hautSur={false} testID="ecran-carte">
        <ScrollView contentContainerStyle={[styles.listeRemplacement, { paddingTop: hauteurEnTete + 12 }]}>
          <BandeauHorsConnexion misAJourLe={proches.dataUpdatedAt} fuseau={fuseau} />
          <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.remplacement}>
            {enLigne ? t('carte.nonDisponible') : t('carte.horsLigne')}
          </Texte>
          {!recherche && procheEnCours ? <ChargementCroix style={styles.chargementListe} testID="chargement-filtre" /> : null}
          {listePlate(recherche ? (resultats.liste ?? []) : procheEnCours ? [] : (proches.liste ?? []))}
        </ScrollView>
        {enTete}
      </Ecran>
    );
  }

  return (
    <Ecran hautSur={false} fond={c.carteFond} testID="ecran-carte">
      <CarteBase
        refCarte={refCarte}
        nuit={estNuit}
        centreInitial={point ?? { latitude: ville?.latitude ?? 5.33, longitude: ville?.longitude ?? -4.02 }}
        zoomInitial={14}
        onVueChange={setVue}
        onPress={fermerApercu}
        marges={{ top: hauteurEnTete, bottom: hauteurFiche + 20 }}
      >
        {point ? (
          <Repere id="ma-position" coordonnees={point}>
            <PointPosition />
          </Repere>
        ) : null}
        {modeCommunes
          ? (compteurs.data ?? []).map((commune) => (
              <Repere
                key={commune.zone_id}
                id={commune.zone_id}
                coordonnees={commune}
                onPress={() => refCarte.current?.recentrer(commune, 14)}
              >
                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={t('carte.commune', { nom: commune.nom, count: commune.nombre_pharmacies, gardes: commune.nombre_gardes })}
                >
                  <MarqueurCommune nombre={commune.nombre_pharmacies} gardes={commune.nombre_gardes} />
                </View>
              </Repere>
            ))
          : points.map((p) => {
              const choisi = p.id === choisie?.id;
              const libelle = t('carte.marqueur', { nom: p.nom, statut: libelleStatut(p), distance: distanceKm(p.distance_m) });
              return (
                <Repere key={p.id} id={p.id} coordonnees={p} ancre="left" onPress={() => choisir(p)}>
                  <View accessible accessibilityRole="button" accessibilityLabel={choisi ? t('carte.selectionnee', { libelle }) : libelle}>
                    <MarqueurPharmacie
                      statut={p.statut}
                      selectionne={choisi}
                      etiquette={p.distance_m === null ? '' : choisi ? distanceKm(p.distance_m) : distanceNombre(p.distance_m)}
                    />
                  </View>
                </Repere>
              );
            })}
      </CarteBase>

      {enTete}

      <View style={[styles.boutonsCarte, { top: hauteurEnTete + 16 }]}>
        <BoutonIcone
          accessibilityLabel={t('carte.meLocaliser')}
          rond
          fond={c.feuille}
          style={ombres.boutonRond}
          onPress={() => point && refCarte.current?.recentrer(point, 14)}
        >
          <IconeViseur size={20} color={c.bleuPosition} />
        </BoutonIcone>
        {/* Dézoome sur la ville (communes et leurs gardes). Déjà à ce niveau, le viseur ramène à l'usager. */}
        {!modeCommunes && ville ? (
          <BoutonIcone
            accessibilityLabel={t('carte.toutLaVille')}
            rond
            fond={c.feuille}
            style={ombres.boutonRond}
            onPress={() => refCarte.current?.recentrer({ latitude: ville.latitude, longitude: ville.longitude }, 11)}
            testID="bouton-toute-la-ville"
          >
            <IconeCarteDepliee size={20} color={c.texte} />
          </BoutonIcone>
        ) : null}
      </View>

      {recherche ? (
        <View style={[styles.resultats, { top: hauteurEnTete, backgroundColor: c.fond }]}>
          <ScrollView contentContainerStyle={styles.listeResultats} keyboardShouldPersistTaps="handled">
            {listePlate(resultats.liste ?? [])}
            {resultats.isSuccess && (resultats.liste ?? []).length === 0 ? (
              <AucunResultat onActualiser={() => void resultats.refetch()} />
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {!recherche && modeCommunes ? (
        <View
          onLayout={(e) => setHauteurFiche(e.nativeEvent.layout.height)}
          style={[styles.fiche, { backgroundColor: c.feuille }, ombres.fiche]}
          testID="fiche-carte"
        >
          <View style={styles.legende}>
            <View style={styles.elementLegende}>
              <View style={[styles.pointLegende, { backgroundColor: c.vert, borderRadius: 8 }]} />
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {t('carte.legendePharmacies')}
              </Texte>
            </View>
            <View style={styles.elementLegende}>
              <View style={[styles.pointLegende, { backgroundColor: c.rouge }]} />
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {t('carte.legendeGarde')}
              </Texte>
            </View>
          </View>
          {communeResumee ? (
            <Texte variante="titreModal" titre style={styles.titreCommune}>
              {t('carte.resumeCommune', {
                commune: communeResumee.nom,
                count: communeResumee.nombre_pharmacies,
                gardes: communeResumee.nombre_gardes,
              })}
            </Texte>
          ) : null}
          <Texte variante="petit" couleur={c.texteSecondaire}>
            {t('carte.zoomez')}
          </Texte>
          <Bouton libelle={t('carte.voirGardes')} icone="lune" onPress={() => allerOnglet('garde')} />
        </View>
      ) : null}

      <FeuillePharmacieCarte
        pharmacie={!recherche && !modeCommunes ? (choisie ?? null) : null}
        plusProche={choisie !== undefined && choisie.id === plusProche?.id}
        libelleStatut={(p) => libelleStatut(p, 'carte')}
        tonStatut={tonStatut}
        onOuvrir={actions.ouvrir}
        onAppeler={actions.appeler}
        onYAller={actions.itineraire}
        onFermer={fermer}
        onHauteur={setHauteurFiche}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  enTete: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: espacements.gouttiere,
    paddingBottom: 12,
    gap: 10,
    zIndex: 2,
    borderBottomLeftRadius: rayons.surface,
    borderBottomRightRadius: rayons.surface,
  },
  ligneRecherche: { flexDirection: 'row', gap: 10 },
  boutonCarre: { width: CIBLE_TACTILE, height: CIBLE_TACTILE, borderRadius: rayons.touche },
  filtres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chargementListe: { height: 220 },
  chargement: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: rayons.rond,
  },
  boutonsCarte: { position: 'absolute', right: 16, gap: 10 },
  resultats: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  listeResultats: { paddingHorizontal: espacements.gouttiere, paddingTop: 12, paddingBottom: 24 },
  listeRemplacement: { paddingHorizontal: espacements.gouttiere, paddingBottom: 24 },
  remplacement: { marginTop: 12, marginBottom: 8, paddingHorizontal: 4 },
  fiche: { position: 'absolute', left: 12, right: 12, bottom: 20, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 18, gap: 14, borderRadius: rayons.surface },
  legende: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  elementLegende: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointLegende: { width: 16, height: 16 },
  titreCommune: { fontSize: 18 },
});

export default avecErrorBoundary(Carte, 'Carte');
