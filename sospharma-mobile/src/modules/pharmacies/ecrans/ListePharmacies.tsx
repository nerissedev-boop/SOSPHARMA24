import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { normaliserRecherche, t, useEnLigne, usePreferences } from '@/commun/lib';
import { espacements, ombres, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  ChampRecherche,
  ChargementCroix,
  Ecran,
  EnTete,
  EtatVide,
  Filtre,
  HiMedicalSearchOutline,
  IconeActualiser,
  IconeCarteDepliee,
  IconeFermer,
  LignePharmacie,
  SqueletteListe,
  Texte,
  useChargementVisible,
  useMargeBas,
  useRetour,
} from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { AucunResultat } from '../composants/AucunResultat';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmaciesProches, useTonStatut } from '../hooks/usePharmacies';

/** Nom, commune ou repère (l'adresse s'écrit comme un repère), sans accents ni casse. */
function correspond(p: PharmacieResume, q: string): boolean {
  return [p.nom, p.commune, p.adresse].some((champ) => normaliserRecherche(champ ?? '').includes(q));
}

/**
 * Toutes les pharmacies chargées autour de l'usager, ouvert depuis « Voir les N pharmacies » de
 * l'Accueil. Même requête et même filtre rapide que l'Accueil : rien de plus à télécharger, et la
 * liste reste là hors connexion. La saisie filtre sur le téléphone, à chaque lettre ; pour chercher
 * au-delà des plus proches, la carte interroge l'API.
 */
function ListePharmacies() {
  const router = useRouter();
  const retour = useRetour();
  const margeBas = useMargeBas(24);
  const { couleurs: c, estNuit } = useTheme();
  const { fuseau } = usePaysCourant();
  const enLigne = useEnLigne();
  const filtreRapide = usePreferences((e) => e.filtreRapide);
  const definirFiltreRapide = usePreferences((e) => e.definirFiltreRapide);
  const proches = usePharmaciesProches();
  const libelleStatut = useLibelleStatut();
  const tonStatut = useTonStatut();
  const actions = useActionsPharmacie();
  const filtreEnCours = useChargementVisible(proches.isPlaceholderData && proches.isFetching);
  const [saisie, setSaisie] = useState('');

  const q = normaliserRecherche(saisie.trim());
  const liste = useMemo(() => {
    const toutes = proches.liste ?? [];
    return q ? toutes.filter((p) => correspond(p, q)) : toutes;
  }, [proches.liste, q]);

  const sansListe = !proches.liste;
  const horsLigneSansListe = sansListe && !enLigne;
  const enErreur = sansListe && enLigne && proches.isError;
  const chargement = sansListe && enLigne && !proches.isError;
  const masquee = sansListe || filtreEnCours;

  const chercherSurCarte = () => {
    const recherche = saisie.trim();
    router.navigate({ pathname: '/carte', params: { q: recherche, n: String(Date.now()) } });
  };

  const etat = () => {
    if (horsLigneSansListe) {
      return <EtatVide titre={t('pharmacies.horsConnexionTitre')} texte={t('pharmacies.horsConnexionTexte')} dessin="aucun" testID="pharmacies-hors-connexion" />;
    }
    if (enErreur) {
      return (
        <EtatVide
          titre={t('pharmacies.erreurTitre')}
          texte={t('pharmacies.erreurTexte')}
          dessin="aucun"
          suggestions={[
            {
              libelle: t('commun.reessayer'),
              icone: <IconeActualiser size={20} color={c.vertTexte} />,
              onPress: () => void proches.refetch(),
            },
          ]}
          testID="pharmacies-erreur"
        />
      );
    }
    if (chargement) {
      return (
        <View testID="chargement-pharmacies">
          <SqueletteListe nombre={6} />
        </View>
      );
    }
    if (filtreEnCours) return <ChargementCroix style={styles.chargementFiltre} testID="chargement-filtre" />;
    if (q) {
      return (
        <EtatVide
          titre={t('pharmacies.aucuneTitre', { saisie: saisie.trim() })}
          texte={t('pharmacies.aucuneTexte')}
          suggestions={[
            {
              libelle: t('pharmacies.effacer'),
              icone: <IconeFermer size={20} color={c.vertTexte} />,
              onPress: () => setSaisie(''),
              accent: true,
              testID: 'effacer-recherche',
            },
            {
              libelle: t('pharmacies.chercherCarte'),
              icone: <IconeCarteDepliee size={20} color={c.vertTexte} />,
              onPress: chercherSurCarte,
              testID: 'chercher-carte',
            },
          ]}
          testID="pharmacies-aucune"
        />
      );
    }
    return <AucunResultat onActualiser={() => void proches.refetch()} />;
  };

  const rendreLigne: ListRenderItem<PharmacieResume> = ({ item: p, index }) => (
    <LignePharmacie
      testID={`ligne-${p.id}`}
      premiere={index === 0}
      derniere={index === liste.length - 1}
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
  );

  return (
    <Ecran testID="ecran-pharmacies">
      {/* Hors de la liste : le champ garde le clavier pendant que la liste se recalcule. */}
      <View style={[styles.entete, { backgroundColor: c.fond }, !estNuit && ombres.enTete]}>
        <EnTete
          titre={t('pharmacies.titre')}
          onRetour={retour}
          apresTitre={
            proches.liste ? (
              <Texte variante="petit" couleur={c.texteSecondaire} style={styles.chiffres}>
                {t('pharmacies.nombre', { count: proches.liste.length })}
              </Texte>
            ) : null
          }
        />
        <BandeauHorsConnexion misAJourLe={proches.dataUpdatedAt} fuseau={fuseau} />
        <ChampRecherche
          libelle={t('pharmacies.rechercheA11y')}
          placeholder={t('pharmacies.recherche')}
          value={saisie}
          onChangeText={setSaisie}
          rendreIcone={(couleur) => <HiMedicalSearchOutline size={22} color={couleur} />}
          testID="champ-recherche-pharmacies"
        />
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
        {q && !masquee && liste.length > 0 ? (
          <Texte variante="petit" couleur={c.texteSecondaire} accessibilityLiveRegion="polite" testID="nombre-resultats">
            {t('pharmacies.resultats', { count: liste.length })}
          </Texte>
        ) : null}
      </View>
      <FlatList
        data={masquee ? [] : liste}
        keyExtractor={(p) => p.id}
        renderItem={rendreLigne}
        ListEmptyComponent={etat}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.liste, { paddingBottom: margeBas }]}
        testID="liste-pharmacies"
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: { paddingTop: espacements.s, paddingHorizontal: espacements.gouttiere, paddingBottom: espacements.m, gap: espacements.m, zIndex: 1 },
  filtres: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.s },
  chiffres: { fontVariant: ['tabular-nums'] },
  liste: { paddingTop: espacements.m, paddingHorizontal: espacements.gouttiere },
  chargementFiltre: { height: 220 },
});

export default avecErrorBoundary(ListePharmacies, 'ListePharmacies');
