import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { bornesCourtes, heure, marquerSortieVolontaire, t, usePreferences } from '@/commun/lib';
import { useMaintenant, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  BlocPlusProche,
  BoutonIcone,
  Ecran,
  Filtre,
  HiPharmacy,
  IconeCloche,
  IconeHorloge,
  IconeLune,
  LignePharmacie,
  Logo,
  Texte,
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
  const notificationsVues = usePreferences((e) => e.notificationsVues);
  const marquerNotificationsVues = usePreferences((e) => e.marquerNotificationsVues);
  const proches = usePharmaciesProches();
  const toutes = usePharmaciesProches({ rapide: 'toutes', actif: true });
  const { tour, dateEnregistree } = useTourEnCours();
  const libelleStatut = useLibelleStatut();
  const tonStatut = useTonStatut();
  const actions = useActionsPharmacie();

  const gardes = useMemo(
    () => [...(tour?.pharmacies ?? [])].filter((p) => p.statut === 'garde').sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0)),
    [tour],
  );
  const cleTour = tour ? `${tour.id}:${tour.debut}` : null;
  const nouveauTour = cleTour !== null && cleTour !== notificationsVues;
  const prenom = profil.prenom.trim();

  const ligne = (p: PharmacieResume, contexte: 'liste' | 'garde' = 'liste', rang?: number) => (
    <LignePharmacie
      key={p.id}
      rang={rang}
      testID={`ligne-${p.id}`}
      nom={p.nom}
      statut={p.statut}
      libelleStatut={libelleStatut(p, contexte)}
      ton={tonStatut(p)}
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
            <ActivityIndicator color={c.rouge} />
          )}
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
  const liste = proches.liste ?? [];
  const premiere = liste.find((p) => p.statut !== 'fermee');
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
            <Logo largeur={28} variante="inverse" />
            <BoutonIcone
              accessibilityLabel={nouveauTour ? t('accueil.notificationsNouvelles') : t('accueil.notifications')}
              rond
              onPress={() => {
                if (cleTour) marquerNotificationsVues(cleTour);
                router.navigate('/garde');
              }}
            >
              <IconeCloche size={24} color={c.blanc} />
              {nouveauTour ? <View style={[styles.pointNotif, { backgroundColor: c.rougeVif }]} /> : null}
            </BoutonIcone>
          </View>

          <View>
            <Texte variante="titreEcran" titre couleur={c.blanc}>
              {prenom ? t('accueil.bonjour', { prenom }) : t('accueil.bonjourSeul')}
            </Texte>
            <Texte variante="corps" couleur={c.vertTendre} style={styles.sousTitre}>
              {t('accueil.aide')}
            </Texte>
          </View>

          <View style={styles.cartes}>
            <Pressable
              testID="carte-proches"
              onPress={() => router.navigate('/carte')}
              accessibilityRole="button"
              accessibilityLabel={`${t('accueil.proches')}, ${t('accueil.trouvees', { count: toutes.nombre })}`}
              style={({ pressed }) => [styles.carte, { backgroundColor: c.vert, opacity: pressed ? 0.9 : 1 }]}
            >
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

        {proches.isPending && !proches.liste ? <ActivityIndicator color={c.vert} style={styles.chargement} /> : null}
        {premiere ? (
          <BlocPlusProche
            testID="bloc-plus-proche"
            garde={premiere.statut === 'garde'}
            titre={premiere.statut === 'garde' ? t('accueil.plusProcheGarde') : t('accueil.plusProcheOuverte')}
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
        <View style={styles.liste}>{reste.map((p, i) => ligne(p, 'liste', i))}</View>
        {proches.isSuccess && liste.length === 0 ? <AucunResultat onActualiser={() => void proches.refetch()} /> : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  contenuJour: { paddingTop: 0 },
  bandeau: { marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 16 },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pointNotif: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5 },
  sousTitre: { marginTop: 4 },
  cartes: { flexDirection: 'row', gap: 10 },
  carte: { flex: 1, padding: 14, gap: 14 },
  rond: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  textesCarte: { gap: 3 },
  etiquetteGarde: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  titreSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: -4 },
  lien: { minHeight: 44, justifyContent: 'center' },
  texte13: { fontSize: 13 },
  filtres: { flexDirection: 'row', gap: 8, marginBottom: -4 },
  chargement: { marginTop: 16 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  liste: { marginTop: -4 },
  fermees: { marginTop: 8 },
});

export default avecErrorBoundary(Accueil, 'Accueil');
