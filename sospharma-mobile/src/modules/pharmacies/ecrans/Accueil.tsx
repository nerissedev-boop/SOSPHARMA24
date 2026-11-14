import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { bornesCourtes, comparerDistance, heure, marquerSortieVolontaire, t, useEnLigne, usePreferences } from '@/commun/lib';
import { rayons, useMaintenant, useTheme } from '@/commun/theme';
import { estInactive } from '@/commun/regles';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  BlocPlusProche,
  BoutonIcone,
  Ecran,
  EtatVide,
  Filtre,
  ChampRecherche,
  IconeChevronDroite,
  HiMedicalSearchOutline,
  IconeLune,
  LignePharmacie,
  ChargementCroix,
  SqueletteBlocProche,
  SqueletteListe,
  Texte,
  useChargementVisible,
} from '@/commun/ui';
import { useTourEnCours } from '@/modules/gardes';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { clesPharmacies } from '../api';
import { AucunResultat } from '../composants/AucunResultat';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmaciesProches, useTonStatut } from '../hooks/usePharmacies';

/** Hauteur dont la grande carte « La plus proche » remonte sur le bandeau. */
const CHEVAUCHEMENT = 44;
/** Bouton rond posé sur le bandeau foncé (même voile que la barre de zone `surFonce`). */
const FOND_TRANSLUCIDE = 'rgba(255,255,255,0.18)';

/** 03 Accueil (jour) et 19 Accueil nuit : la nuit, les pharmacies de garde passent en premier. */
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
  const { fuseau } = usePaysCourant();
  const profil = usePreferences((e) => e.profil);
  const filtreRapide = usePreferences((e) => e.filtreRapide);
  const definirFiltreRapide = usePreferences((e) => e.definirFiltreRapide);
  const definirModeNuit = usePreferences((e) => e.definirModeNuit);
  const proches = usePharmaciesProches();
  const toutes = usePharmaciesProches({ rapide: 'toutes', actif: true });
  const { tour, dateEnregistree } = useTourEnCours();
  const client = useQueryClient();
  const enLigne = useEnLigne();
  const [actualisation, setActualisation] = useState(false);
  // Glisser pour actualiser : pharmacies proches (liste et compteur) et tour de garde. Hors connexion,
  // rien n'est relancé (la requête attendrait le réseau et la roue tournerait sans fin) : le cache reste
  // affiché et le bandeau hors connexion dit de quand il date.
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
  const prenom = profil.prenom.trim();
  const [saisie, setSaisie] = useState('');

  const ligne = (p: PharmacieResume, contexte: 'liste' | 'garde' = 'liste', rang?: number) => (
    <LignePharmacie
      key={p.id}
      rang={rang}
      testID={`ligne-${p.id}`}
      nom={p.nom}
      statut={p.statut}
      libelleStatut={libelleStatut(p, contexte)}
      ton={tonStatut(p)}
      // Photo de façade validée, sinon devanture dessinée (null).
      photoUrl={p.photo_url ?? null}
      positionAConfirmer={p.latitude === null}
      distanceM={p.distance_m}
      marcheMin={p.marche_min}
      iconeMarche={!estNuit}
      onPress={() => actions.ouvrir(p)}
      onAppeler={p.telephone ? () => actions.appeler(p) : undefined}
    />
  );

  /**
   * Piste A (maquette validée le 2026-11-11) : bandeau foncé aux coins bas arrondis (zone, mode,
   * salutation, résumé en une phrase), puis la plus proche en grande carte qui chevauche le bandeau.
   */
  const bandeau = (titre: string, resume: string | null, chevauche: boolean) => (
    <View style={[styles.bandeau, chevauche && styles.bandeauChevauche, { backgroundColor: c.vertProfond }]} testID="bandeau-accueil">
      <View style={styles.entete}>
        <BarreZone libelle={libelle} onChanger={() => router.push('/zone')} surFonce testID="barre-zone" />
        <BoutonIcone
          accessibilityLabel={estNuit ? t('accueil.modeJour') : t('accueil.modeNuit')}
          rond
          fond={FOND_TRANSLUCIDE}
          onPress={() => definirModeNuit(estNuit ? 'jour' : 'nuit')}
          testID="bouton-mode"
        >
          <IconeLune size={20} color={c.blanc} plein={estNuit} />
        </BoutonIcone>
      </View>
      <Texte variante="titreEcran" titre couleur={c.blanc} style={styles.salutation}>
        {titre}
      </Texte>
      {resume ? (
        <Texte variante="petit" couleur={c.vertTendre} testID="resume-accueil">
          {resume}
        </Texte>
      ) : null}
    </View>
  );

  // ----------------------------- Nuit -----------------------------
  if (estNuit) {
    const [premiere, ...autres] = gardes;
    const fermees = (toutes.liste ?? []).filter((p) => p.statut === 'fermee').length;
    const chevauche = premiere !== undefined || !tour;
    return (
      <Ecran testID="ecran-accueil" fond={c.vertProfond} barreClaire>
        <BandeauHorsConnexion dateGarde={dateEnregistree} />
        <ScrollView
          contentContainerStyle={[styles.contenu, styles.contenuBandeau]}
          style={{ backgroundColor: c.fond }}
          refreshControl={controleActualiser}
          testID="defilement-accueil"
        >
          {bandeau(
            prenom ? t('accueil.bonsoir', { prenom }) : t('accueil.bonsoirSeul'),
            t('accueil.heureNuit', { heure: heure(maintenant, fuseau) }),
            chevauche,
          )}
          {premiere ? (
            <View style={styles.chevauchement}>
              <BlocPlusProche
                testID="bloc-plus-proche"
                garde
                titre={t('accueil.plusProcheGarde')}
                photoUrl={premiere.photo_url ?? null}
                positionAConfirmer={premiere.latitude === null}
                nom={premiere.nom}
                statut={premiere.statut}
                ton={tonStatut(premiere)}
                libelleStatut={libelleStatut(premiere, 'garde')}
                distanceM={premiere.distance_m}
                marcheMin={premiere.marche_min}
                onPress={() => actions.ouvrir(premiere)}
                onAppeler={() => actions.appeler(premiere)}
                onItineraire={() => actions.itineraire(premiere)}
              />
            </View>
          ) : tour ? (
            // Tour chargé mais aucune garde : dessin plutôt qu'un squelette qui attendrait sans fin.
            <EtatVide titre={t('garde.aucuneTitre')} dessin="gardeVide" testID="accueil-aucune-garde" />
          ) : (
            <SqueletteBlocProche style={styles.chevauchement} />
          )}
          <View style={styles.titreSection}>
            <Texte variante="section" titre>
              {t('accueil.autresGarde')}
            </Texte>
            <Pressable onPress={() => router.navigate('/garde')} accessibilityRole="link" hitSlop={10} style={styles.lien}>
              <Texte variante="boutonPetit" couleur={c.vertTexte} style={styles.texte13}>
                {t('accueil.toutVoir')}
              </Texte>
            </Pressable>
          </View>
          <View style={styles.liste}>
            {autres.slice(0, 5).map((p, i) => ligne(p, 'garde', i))}
            {fermees > 0 ? (
              <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.fermees}>
                {t('accueil.fermeesNuit', { count: fermees })}
              </Texte>
            ) : null}
          </View>
        </ScrollView>
      </Ecran>
    );
  }

  // ----------------------------- Jour -----------------------------
  const liste = filtreEnCours ? [] : (proches.liste ?? []);
  // La plus proche ouverte ou de garde : ni fermée, ni « horaires à confirmer ».
  const premiere = liste.find((p) => !estInactive(p.statut));
  // L'Accueil sert à trouver vite : 5 lignes, la suite est sur la carte (« Voir la carte »).
  const reste = liste.filter((p) => p.id !== premiere?.id).slice(0, 5);
  const bornes = tour ? bornesCourtes(tour.debut, tour.fin, fuseau) : null;
  const premierChargement = proches.isPending && !proches.liste;
  const chevauche = premiere !== undefined || premierChargement;
  const ouvertes = (toutes.liste ?? []).filter((p) => p.statut === 'ouverte' || p.statut === 'garde').length;

  return (
    <Ecran testID="ecran-accueil" fond={c.vertProfond} barreClaire>
      <BandeauHorsConnexion dateGarde={dateEnregistree} />
      <ScrollView
        contentContainerStyle={[styles.contenu, styles.contenuBandeau]}
        style={{ backgroundColor: c.fond }}
        refreshControl={controleActualiser}
        testID="defilement-accueil"
      >
        {bandeau(
          prenom ? t('accueil.bonjour', { prenom }) : t('accueil.bonjourSeul'),
          toutes.liste ? t('accueil.resume', { heure: heure(maintenant, fuseau), count: ouvertes }) : null,
          chevauche,
        )}

        {/* La plus proche chevauche le bandeau : visible et joignable sans faire défiler. */}
        {premiere ? (
          <View style={styles.chevauchement}>
            <BlocPlusProche
              testID="bloc-plus-proche"
              garde={premiere.statut === 'garde'}
              titre={premiere.statut === 'garde' ? t('accueil.plusProcheGarde') : t('accueil.plusProcheOuverte')}
              photoUrl={premiere.photo_url ?? null}
              positionAConfirmer={premiere.latitude === null}
              nom={premiere.nom}
              statut={premiere.statut}
              ton={tonStatut(premiere)}
              libelleStatut={libelleStatut(premiere)}
              distanceM={premiere.distance_m}
              marcheMin={premiere.marche_min}
              onPress={() => actions.ouvrir(premiere)}
              onAppeler={() => actions.appeler(premiere)}
              onItineraire={() => actions.itineraire(premiere)}
            />
          </View>
        ) : premierChargement ? (
          <SqueletteBlocProche style={styles.chevauchement} />
        ) : null}

        {/* Recherche par nom : les résultats s'ouvrent sur la carte. */}
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

        {/* Tour de garde en une ligne : l'accès à l'écran Garde reste à un appui depuis l'accueil. */}
        <Pressable
          testID="carte-gardes"
          onPress={() => router.navigate('/garde')}
          accessibilityRole="button"
          accessibilityLabel={[t('accueil.garde'), t('accueil.gardeOuvertes', { count: gardes.length }), bornes ? t('accueil.periodeGarde', bornes) : null]
            .filter(Boolean)
            .join(', ')}
          style={({ pressed }) => [styles.lienGarde, { backgroundColor: c.rougeClair, opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={[styles.rond, { backgroundColor: c.rouge }]}>
            <IconeLune size={18} color={c.blanc} plein />
          </View>
          <View style={styles.textesGarde}>
            <Texte variante="petitFort" couleur={c.rougeTexteFort} numberOfLines={2}>
              {t('accueil.garde')} · {t('accueil.gardeOuvertes', { count: gardes.length })}
            </Texte>
            {bornes ? (
              <Texte variante="libelle" couleur={c.rougeTexteFort} numberOfLines={2}>
                {t('accueil.periodeGarde', bornes)}
              </Texte>
            ) : null}
          </View>
          <IconeChevronDroite size={16} color={c.rougeTexteFort} strokeWidth={2.6} />
        </Pressable>

        <View style={styles.titreSection}>
          <Texte variante="section" titre>
            {t('accueil.autour')}
          </Texte>
          <Pressable onPress={() => router.navigate('/carte')} accessibilityRole="link" hitSlop={10} style={styles.lien}>
            <Texte variante="petitFort" couleur={c.vertTexte}>
              {t('accueil.voirCarte')}
            </Texte>
          </Pressable>
        </View>

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

        {filtreEnCours ? (
          // Après un appui sur un filtre : la croix de la marque bat le temps que la liste arrive.
          <ChargementCroix style={styles.chargementFiltre} testID="chargement-filtre" />
        ) : premierChargement ? (
          // Lignes grises qui respirent pendant le premier chargement (la grande carte a la sienne en haut).
          <View style={styles.chargement} testID="chargement-proches">
            <SqueletteListe nombre={4} ecart={8} />
          </View>
        ) : null}
        <View style={styles.liste}>{reste.map((p, i) => ligne(p, 'liste', i))}</View>
        {proches.isSuccess && !filtreEnCours && liste.length === 0 ? <AucunResultat onActualiser={() => void proches.refetch()} /> : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  contenuBandeau: { paddingTop: 0 },
  bandeau: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    gap: 6,
    borderBottomLeftRadius: rayons.feuille,
    borderBottomRightRadius: rayons.feuille,
  },
  // Place laissée sous le résumé pour la grande carte qui chevauche le bandeau.
  bandeauChevauche: { paddingBottom: 22 + CHEVAUCHEMENT },
  salutation: { marginTop: 10 },
  // Le gap de 16 du contenu s'ajoute : on remonte d'autant pour poser la carte sur le bandeau.
  chevauchement: { marginTop: -(CHEVAUCHEMENT + 16) },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lienGarde: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 12, borderRadius: rayons.carte },
  rond: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textesGarde: { flex: 1, gap: 2, minWidth: 0 },
  titreSection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, marginTop: 4, marginBottom: -4 },
  lien: { minHeight: 44, justifyContent: 'center' },
  texte13: { fontSize: 13 },
  filtres: { flexDirection: 'row', gap: 8, marginBottom: -4 },
  chargement: { marginTop: 4, gap: 12 },
  chargementFiltre: { height: 220 },
  liste: { gap: 8 },
  fermees: { marginTop: 8 },
});

export default avecErrorBoundary(Accueil, 'Accueil');
