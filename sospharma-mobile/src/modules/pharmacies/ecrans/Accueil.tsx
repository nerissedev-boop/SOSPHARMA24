import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { bornesCourtes, comparerDistance, heure, marquerSortieVolontaire, t, usePreferences } from '@/commun/lib';
import { rayons, useMaintenant, useTheme } from '@/commun/theme';
import { estInactive } from '@/commun/regles';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  BlocPlusProche,
  BoutonIcone,
  Ecran,
  Filtre,
  HiPharmacy,
  ChampRecherche,
  IconeChevronDroite,
  HiMedicalSearchOutline,
  IconeHorloge,
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

import { AucunResultat } from '../composants/AucunResultat';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmaciesProches, useTonStatut } from '../hooks/usePharmacies';

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

  // ----------------------------- Nuit -----------------------------
  if (estNuit) {
    const [premiere, ...autres] = gardes;
    const fermees = (toutes.liste ?? []).filter((p) => p.statut === 'fermee').length;
    return (
      <Ecran testID="ecran-accueil">
        <BandeauHorsConnexion dateGarde={dateEnregistree} />
        <ScrollView contentContainerStyle={styles.contenu}>
          <View style={styles.entete}>
            <BarreZone libelle={libelle} onChanger={() => router.push('/zone')} testID="barre-zone" />
            <BoutonIcone accessibilityLabel={t('accueil.modeJour')} rond fond={c.surface} onPress={() => definirModeNuit('jour')}>
              <IconeLune size={20} color={c.texte} plein />
            </BoutonIcone>
          </View>
          <Texte variante="titreEcran" titre>
            {prenom ? t('accueil.bonsoir', { prenom }) : t('accueil.bonsoirSeul')}
          </Texte>
          <View style={[styles.info, { backgroundColor: c.bandeauInfo }]}>
            <IconeHorloge size={20} color={c.texteSecondaire} />
            <Texte variante="petit" couleur={c.bandeauInfoTexte} style={styles.flex}>
              {t('accueil.heureNuit', { heure: heure(maintenant, fuseau) })}
            </Texte>
          </View>
          {premiere ? (
            <BlocPlusProche
              testID="bloc-plus-proche"
              garde
              titre={t('accueil.plusProcheGarde')}
              photoUrl={premiere.photo_url ?? null}
            positionAConfirmer={premiere.latitude === null}
            nom={premiere.nom}
              statut={premiere.statut}
              libelleStatut={libelleStatut(premiere, 'garde')}
              distanceM={premiere.distance_m}
              marcheMin={premiere.marche_min}
              onPress={() => actions.ouvrir(premiere)}
              onAppeler={() => actions.appeler(premiere)}
              onItineraire={() => actions.itineraire(premiere)}
            />
          ) : (
            <SqueletteBlocProche />
          )}
          {/* La plus proche juste sous le bandeau : visible sans faire défiler. */}
        {premiere ? (
          <BlocPlusProche
            testID="bloc-plus-proche"
            garde={premiere.statut === 'garde'}
            titre={premiere.statut === 'garde' ? t('accueil.plusProcheGarde') : t('accueil.plusProcheOuverte')}
            photoUrl={premiere.photo_url ?? null}
            positionAConfirmer={premiere.latitude === null}
            nom={premiere.nom}
            statut={premiere.statut}
            libelleStatut={libelleStatut(premiere)}
            distanceM={premiere.distance_m}
            marcheMin={premiere.marche_min}
            onPress={() => actions.ouvrir(premiere)}
            onAppeler={() => actions.appeler(premiere)}
            onItineraire={() => actions.itineraire(premiere)}
          />
        ) : null}

        <View style={styles.titreSection}>
            <Texte variante="section" titre>
              {t('accueil.autresGarde')}
            </Texte>
            <Pressable onPress={() => router.navigate('/garde')} accessibilityRole="link" style={styles.lien}>
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
  const reste = liste.filter((p) => p.id !== premiere?.id).slice(0, 10);
  const bornes = tour ? bornesCourtes(tour.debut, tour.fin, fuseau) : null;

  return (
    <Ecran testID="ecran-accueil" fond={c.vertProfond} barreClaire>
      <BandeauHorsConnexion dateGarde={dateEnregistree} />
      <ScrollView contentContainerStyle={[styles.contenu, styles.contenuJour]} style={{ backgroundColor: c.fond }}>
        {/* Bandeau vert profond (palette enrichie) : zone, salutation et les deux accès principaux. */}
        <View style={[styles.bandeau, { backgroundColor: c.vertProfond }]} testID="bandeau-accueil">
          <View style={styles.entete}>
            <BarreZone libelle={libelle} onChanger={() => router.push('/zone')} surFonce testID="barre-zone" />
          </View>

          <View>
            <Texte variante="titreEcran" titre couleur={c.blanc}>
              {prenom ? t('accueil.bonjour', { prenom }) : t('accueil.bonjourSeul')}
            </Texte>
          </View>

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

          <View style={styles.cartes}>
            <Pressable
              testID="carte-proches"
              onPress={() => router.navigate('/carte')}
              accessibilityRole="button"
              accessibilityLabel={`${t('accueil.proches')}, ${t('accueil.trouvees', { count: toutes.nombre })}`}
              style={({ pressed }) => [styles.carte, { backgroundColor: c.vert, opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={styles.flecheCarte}>
                <IconeChevronDroite size={18} color={c.blanc} strokeWidth={2.6} />
              </View>
              <View style={[styles.rond, { backgroundColor: c.blanc }]}>
                <HiPharmacy size={28} color={c.vert} />
              </View>
              <View style={styles.textesCarte}>
                <Texte variante="nom" couleur={c.blanc}>
                  {t('accueil.proches')}
                </Texte>
                <Texte variante="petit" couleur={c.vertTendre}>
                  {t('accueil.trouvees', { count: toutes.nombre })}
                </Texte>
              </View>
            </Pressable>
            <Pressable
              testID="carte-gardes"
              onPress={() => router.navigate('/garde')}
              accessibilityRole="button"
              accessibilityLabel={`${t('accueil.garde')}, ${t('accueil.gardeOuvertes', { count: gardes.length })}`}
              style={({ pressed }) => [styles.carte, { backgroundColor: c.rouge, opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={styles.flecheCarte}>
                <IconeChevronDroite size={18} color={c.blanc} strokeWidth={2.6} />
              </View>
              <View style={[styles.rond, { backgroundColor: c.blanc }]}>
                <IconeLune size={22} color={c.rouge} plein />
              </View>
              <View style={styles.textesCarte}>
                <Texte variante="nom" couleur={c.blanc}>
                  {t('accueil.garde')}
                </Texte>
                <Texte variante="petit" couleur={c.blanc}>
                  {t('accueil.gardeOuvertes', { count: gardes.length })}
                </Texte>
                {bornes ? (
                  <View style={[styles.etiquetteGarde, { backgroundColor: c.rougeProfond }]}>
                    <Texte variante="libelleFort" couleur={c.blanc}>
                      {t('accueil.periodeGarde', bornes)}
                    </Texte>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.titreSection}>
          <Texte variante="section" titre>
            {t('accueil.autour')}
          </Texte>
          <Pressable onPress={() => router.navigate('/carte')} accessibilityRole="link" style={styles.lien}>
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
        ) : proches.isPending && !proches.liste ? (
          // Cartes grises qui respirent pendant le premier chargement, à la place d'une roue.
          <View style={styles.chargement} testID="chargement-proches">
            <SqueletteBlocProche />
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
  flex: { flex: 1 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  contenuJour: { paddingTop: 0 },
  bandeau: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 14,
    borderBottomLeftRadius: rayons.feuille,
    borderBottomRightRadius: rayons.feuille,
  },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cartes: { flexDirection: 'row', gap: 10 },
  carte: { flex: 1, padding: 12, gap: 10, borderRadius: rayons.carte },
  rond: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textesCarte: { gap: 3 },
  flecheCarte: { position: 'absolute', top: 12, right: 12 },
  etiquetteGarde: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderRadius: rayons.pilule },
  titreSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: -4 },
  lien: { minHeight: 44, justifyContent: 'center' },
  texte13: { fontSize: 13 },
  filtres: { flexDirection: 'row', gap: 8, marginBottom: -4 },
  chargement: { marginTop: 4, gap: 12 },
  chargementFiltre: { height: 220 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: rayons.moyen },
  liste: { gap: 8 },
  fermees: { marginTop: 8 },
});

export default avecErrorBoundary(Accueil, 'Accueil');
