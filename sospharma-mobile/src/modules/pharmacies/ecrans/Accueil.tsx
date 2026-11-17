import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import {
  bornesCourtes,
  comparerDistance,
  heure,
  marquerSortieVolontaire,
  repereEtCommune,
  t,
  telephoneAffiche,
  useEnLigne,
  usePreferences,
} from '@/commun/lib';
import { CIBLE_TACTILE, espacements, rayons, useMaintenant, useTheme } from '@/commun/theme';
import { estInactive } from '@/commun/regles';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  CartePlusProche,
  ChampRecherche,
  ChargementCroix,
  Ecran,
  EtatVide,
  Filtre,
  HiMedicalSearchOutline,
  IconeChevronDroite,
  LignePharmacie,
  Squelette,
  SqueletteBlocProche,
  SqueletteListe,
  Texte,
  useChargementVisible,
  ZoneSquelette,
} from '@/commun/ui';
import { detailGarde, useTourEnCours } from '@/modules/gardes';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { clesPharmacies } from '../api';
import { AucunResultat } from '../composants/AucunResultat';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmaciesProches, useTonStatut } from '../hooks/usePharmacies';

/** Hauteur dont la grande carte « La plus proche » remonte sur le bandeau. */
const CHEVAUCHEMENT = 52;
/** L'Accueil sert à trouver vite : quelques lignes, la suite dans la liste complète, sur la carte ou dans l'onglet Garde. */
const LIGNES_ACCUEIL = 5;

/**
 * 03 Accueil (jour) et 19 Accueil nuit, refonte v2 : le bandeau donne l'état du moment (pas de
 * salutation), la plus proche le chevauche, puis la recherche (le jour) et une liste imprimée.
 * La nuit, les pharmacies de garde passent en premier, avec leur numéro.
 */
function Accueil() {
  // Touche retour sur l'accueil : l'usager quitte l'app ; au prochain appui sur l'icône,
  // l'écran du logo repasse (commun/lib/premierPlan.ts). false : Android garde son comportement.
  useFocusEffect(
    useCallback(() => {
      const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
        marquerSortieVolontaire();
        return false;
      });
      return () => abonnement.remove();
    }, []),
  );
  const router = useRouter();
  const { couleurs: c, estNuit } = useTheme();
  const maintenant = useMaintenant();
  const { libelle } = useZoneCourante();
  const { pays, fuseau } = usePaysCourant();
  const filtreRapide = usePreferences((e) => e.filtreRapide);
  const definirFiltreRapide = usePreferences((e) => e.definirFiltreRapide);
  const proches = usePharmaciesProches();
  const toutes = usePharmaciesProches({ rapide: 'toutes', actif: true });
  const { tour, dataUpdatedAt: tourMisAJourLe } = useTourEnCours();
  const client = useQueryClient();
  const enLigne = useEnLigne();
  const [actualisation, setActualisation] = useState(false);
  // Glisser pour actualiser : pharmacies proches (liste et compteur) et tour de garde. Hors connexion,
  // rien n'est relancé (la requête attendrait le réseau et la roue tournerait sans fin) : le cache reste
  // affiché et le bandeau dit de quand il date.
  const actualiser = async () => {
    if (!enLigne) return;
    setActualisation(true);
    try {
      await Promise.all([
        client.invalidateQueries({ queryKey: [...clesPharmacies.tout, 'proches'] }),
        client.invalidateQueries({ queryKey: ['gardes', 'en-cours'] }),
      ]);
    } finally {
      setActualisation(false);
    }
  };
  const controleActualiser = (
    <RefreshControl refreshing={actualisation} onRefresh={() => void actualiser()} tintColor={c.vert} colors={[c.vert]} testID="actualiser-accueil" />
  );
  const libelleStatut = useLibelleStatut();
  const tonStatut = useTonStatut();
  const actions = useActionsPharmacie();
  // Filtre changé : la liste précédente reste en cache le temps de la requête, la croix bat à sa place.
  const filtreEnCours = useChargementVisible(proches.isPlaceholderData && proches.isFetching);

  const gardes = useMemo(
    () => [...(tour?.pharmacies ?? [])].filter((p) => p.statut === 'garde').sort(comparerDistance),
    [tour],
  );
  const [saisie, setSaisie] = useState('');

  const carte = (p: PharmacieResume, libelleEtat: string) => (
    <CartePlusProche
      id={p.id}
      testID="bloc-plus-proche"
      nom={p.nom}
      statut={p.statut}
      ton={tonStatut(p)}
      libelleStatut={libelleEtat}
      distanceM={p.distance_m}
      marcheMin={p.marche_min}
      repere={repereEtCommune(p)}
      photoUrl={p.photo_url}
      assurance={p.accepte_mes_assurances === true}
      positionAConfirmer={p.latitude === null}
      conseil={estNuit}
      onPress={() => actions.ouvrir(p)}
      onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
      onYAller={() => actions.itineraire(p)}
      style={styles.chevauchement}
    />
  );

  /**
   * Bandeau foncé aux coins bas arrondis : la zone, l'état du moment en titre, puis la plus proche
   * en grande carte qui le chevauche. Hors connexion, l'heure de la dernière mise à jour.
   * Pas de bouton de mode nuit ici : la lune veut dire « garde » dans toute l'app, et le réglage
   * auto / jour / nuit reste dans Profil.
   */
  const bandeau = (titre: string | null, surtitre: string | null, misAJourLe: number, chevauche: boolean) => (
    <View style={[styles.bandeau, chevauche && styles.bandeauChevauche, { backgroundColor: c.vertProfond }]} testID="bandeau-accueil">
      <View style={styles.entete}>
        <BarreZone variante="pastille" libelle={libelle} onChanger={() => router.push('/zone')} surFonce testID="barre-zone" />
      </View>
      {surtitre ? (
        <Texte variante="petitFort" couleur={c.vertTendre} testID="surtitre-accueil">
          {surtitre}
        </Texte>
      ) : null}
      <BandeauHorsConnexion misAJourLe={misAJourLe} fuseau={fuseau} couleurTexte={c.vertTendre} />
      {titre ? (
        <Texte variante="titreEcran" titre couleur={c.blanc} testID="titre-accueil">
          {titre}
        </Texte>
      ) : (
        // Premier chargement : la place du titre est gardée, la carte ne saute pas à son arrivée.
        <ZoneSquelette style={styles.titreAttente} testID="titre-accueil-attente">
          <Squelette anime={false} largeur="88%" hauteur={24} style={{ backgroundColor: c.boutonSurFonce }} />
          <Squelette anime={false} largeur="52%" hauteur={24} style={{ backgroundColor: c.boutonSurFonce }} />
        </ZoneSquelette>
      )}
    </View>
  );

  const titreSection = (titre: string, lien: string, aller: () => void) => (
    <View style={styles.titreSection}>
      <Texte variante="section" titre style={styles.flexible}>
        {titre}
      </Texte>
      <Pressable onPress={aller} accessibilityRole="link" style={styles.lien}>
        <Texte variante="boutonPetit" couleur={c.vertTexte}>
          {lien}
        </Texte>
      </Pressable>
    </View>
  );

  // ----------------------------- Nuit -----------------------------
  if (estNuit) {
    const [premiere, ...autres] = gardes;
    const fermees = (toutes.liste ?? []).filter((p) => p.statut === 'fermee').length;
    const bornes = tour ? bornesCourtes(tour.debut, tour.fin, fuseau) : null;
    const lignes = autres.slice(0, LIGNES_ACCUEIL);
    return (
      <Ecran testID="ecran-accueil" fond={c.vertProfond} barreClaire>
        <ScrollView
          contentContainerStyle={styles.contenu}
          style={{ backgroundColor: c.fond }}
          refreshControl={controleActualiser}
          testID="defilement-accueil"
        >
          {bandeau(
            t('accueil.heureNuit', { heure: heure(maintenant, fuseau) }),
            bornes ? t('accueil.tourGarde', bornes) : null,
            tourMisAJourLe,
            premiere !== undefined || !tour,
          )}
          {premiere ? (
            carte(premiere, libelleStatut(premiere, 'carte'))
          ) : tour ? (
            // Tour chargé mais aucune garde : dessin plutôt qu'un squelette qui attendrait sans fin.
            <EtatVide titre={t('garde.aucuneTitre')} dessin="gardeVide" testID="accueil-aucune-garde" />
          ) : (
            <SqueletteBlocProche style={styles.chevauchement} />
          )}
          {lignes.length > 0 ? (
            <>
              {titreSection(t('accueil.autresGarde'), t('accueil.toutVoir'), () => router.navigate('/garde'))}
              <View>
                {lignes.map((p, i) => (
                  <LignePharmacie
                    key={p.id}
                    testID={`ligne-${p.id}`}
                    variante="garde"
                    premiere={i === 0}
                    derniere={i === lignes.length - 1}
                    nom={p.nom}
                    statut={p.statut}
                    libelleStatut={libelleStatut(p, 'garde')}
                    ton={tonStatut(p)}
                    commune={p.commune}
                    numero={p.telephone ? telephoneAffiche(p.telephone, pays?.indicatif) : null}
                    restriction={detailGarde(p, fuseau).restriction}
                    positionAConfirmer={p.latitude === null}
                    distanceM={p.distance_m}
                    marcheMin={p.marche_min}
                    onPress={() => actions.ouvrir(p)}
                    onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
                  />
                ))}
              </View>
            </>
          ) : null}
          {fermees > 0 ? (
            <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.fermees}>
              {t('accueil.fermeesNuit', { count: fermees })}
            </Texte>
          ) : null}
        </ScrollView>
      </Ecran>
    );
  }

  // ----------------------------- Jour -----------------------------
  const liste = filtreEnCours ? [] : (proches.liste ?? []);
  // La plus proche ouverte ou de garde : ni fermée, ni « horaires à confirmer ».
  const premiere = liste.find((p) => !estInactive(p.statut));
  const reste = liste.filter((p) => p.id !== premiere?.id).slice(0, LIGNES_ACCUEIL);
  const premierChargement = proches.isPending && !proches.liste;
  const ouvertes = (toutes.liste ?? []).filter((p) => p.statut === 'ouverte' || p.statut === 'garde').length;

  return (
    <Ecran testID="ecran-accueil" fond={c.vertProfond} barreClaire>
      <ScrollView
        contentContainerStyle={styles.contenu}
        style={{ backgroundColor: c.fond }}
        refreshControl={controleActualiser}
        keyboardShouldPersistTaps="handled"
        testID="defilement-accueil"
      >
        {bandeau(toutes.liste ? t('accueil.titreJour', { count: ouvertes }) : null, null, proches.dataUpdatedAt, premiere !== undefined || premierChargement)}

        {/* La plus proche chevauche le bandeau : visible et joignable sans faire défiler. */}
        {premiere ? carte(premiere, libelleStatut(premiere)) : premierChargement ? <SqueletteBlocProche style={styles.chevauchement} /> : null}

        {/* Recherche par nom, juste sous la grande carte : les résultats s'ouvrent sur la carte. */}
        <View style={styles.recherche}>
          <ChampRecherche
            libelle={t('carte.rechercheA11y')}
            placeholder={t('carte.recherche')}
            value={saisie}
            onChangeText={setSaisie}
            returnKeyType="search"
            onSubmitEditing={() => {
              const q = saisie.trim();
              if (!q) return;
              setSaisie('');
              router.navigate({ pathname: '/carte', params: { q, n: String(Date.now()) } });
            }}
            rendreIcone={(couleur) => <HiMedicalSearchOutline size={22} color={couleur} />}
            testID="champ-recherche-accueil"
          />
        </View>

        {titreSection(t('accueil.autour'), t('accueil.voirCarte'), () => router.navigate('/carte'))}

        <View style={styles.filtres}>
          <Filtre libelle={t('accueil.toutes')} selectionne={filtreRapide === 'toutes'} onPress={() => definirFiltreRapide('toutes')} />
          <Filtre libelle={t('accueil.ouvertes')} selectionne={filtreRapide === 'ouvertes'} onPress={() => definirFiltreRapide('ouvertes')} />
          <Filtre
            libelle={t('accueil.deGarde')}
            ton="garde"
            badge24={filtreRapide !== 'garde'}
            paddingHorizontal={12}
            selectionne={filtreRapide === 'garde'}
            onPress={() => definirFiltreRapide('garde')}
            testID="filtre-de-garde"
          />
        </View>

        <View style={styles.liste}>
          {filtreEnCours ? (
            // Après un appui sur un filtre : la croix de la marque bat le temps que la liste arrive.
            <ChargementCroix style={styles.chargementFiltre} testID="chargement-filtre" />
          ) : premierChargement ? (
            // Lignes grises qui respirent pendant le premier chargement (la grande carte a la sienne en haut).
            <View testID="chargement-proches">
              <SqueletteListe nombre={4} />
            </View>
          ) : null}
          {reste.map((p, i) => (
            <LignePharmacie
              key={p.id}
              testID={`ligne-${p.id}`}
              animee
              premiere={i === 0}
              derniere={i === reste.length - 1}
              nom={p.nom}
              statut={p.statut}
              libelleStatut={libelleStatut(p)}
              ton={tonStatut(p)}
              commune={p.commune}
              assurance={p.accepte_mes_assurances === true}
              positionAConfirmer={p.latitude === null}
              distanceM={p.distance_m}
              marcheMin={p.marche_min}
              onPress={() => actions.ouvrir(p)}
              onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
            />
          ))}
          {proches.isSuccess && !filtreEnCours && liste.length === 0 ? <AucunResultat onActualiser={() => void proches.refetch()} /> : null}
        </View>
        {liste.length > reste.length + (premiere ? 1 : 0) ? (
          <Pressable
            onPress={() => router.push('/pharmacies')}
            accessibilityRole="link"
            style={({ pressed }) => [styles.voirToutes, { opacity: pressed ? 0.7 : 1 }]}
            testID="voir-toutes"
          >
            <Texte variante="boutonPetit" couleur={c.vertTexte}>
              {t('accueil.voirToutes', { count: liste.length })}
            </Texte>
            <IconeChevronDroite size={16} color={c.vertTexte} strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: espacements.gouttiere, paddingBottom: 24 },
  bandeau: {
    marginHorizontal: -espacements.gouttiere,
    paddingHorizontal: espacements.gouttiere,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 6,
    borderBottomLeftRadius: rayons.surface,
    borderBottomRightRadius: rayons.surface,
  },
  // Place laissée sous le titre pour la grande carte qui chevauche le bandeau.
  bandeauChevauche: { paddingBottom: 20 + CHEVAUCHEMENT },
  chevauchement: { marginTop: -CHEVAUCHEMENT },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  titreAttente: { gap: 6, paddingTop: 3 },
  recherche: { marginTop: 16 },
  titreSection: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: CIBLE_TACTILE, marginTop: 8 },
  flexible: { flex: 1 },
  lien: { minHeight: CIBLE_TACTILE, justifyContent: 'center' },
  filtres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  liste: { marginTop: 12 },
  chargementFiltre: { height: 220 },
  voirToutes: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, minHeight: CIBLE_TACTILE, marginTop: 4, paddingHorizontal: 4 },
  fermees: { marginTop: 12, paddingHorizontal: 4 },
});

export default avecErrorBoundary(Accueil, 'Accueil');
