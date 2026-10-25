import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PharmacieResume } from '@/commun/api';
import { appeler, bornesLongues, dateCourte, t } from '@/commun/lib';
import { libelleStatut, tonAffiche } from '@/commun/regles';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  BarreZone,
  BlocPlusProche,
  Ecran,
  EnTete,
  Filtre,
  HiPhone,
  IconeBouclier,
  IconeLune,
  LignePharmacie,
  Logo,
  Texte,
  useNavigationOnglets,
} from '@/commun/ui';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { useTourEnCours } from '../hooks/useTourEnCours';

type Choix = 'proches' | 'nuit' | 'commune';

/** 05 Pharmacies de garde (jour) et 20 (nuit) : même écran, thème différent. */
function ListeGardes() {
  const router = useRouter();
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c, estNuit } = useTheme();
  const [choix, setChoix] = useState<Choix>('proches');
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

  const filtres = (
    <View style={styles.filtres}>
      {(
        [
          ['proches', t('garde.plusProches')],
          ['nuit', t('garde.touteNuit')],
          ['commune', t('garde.maCommune')],
        ] as const
      ).map(([cle, texte]) => (
        <Filtre key={cle} libelle={texte} ton="garde" selectionne={choix === cle} onPress={() => setChoix(cle)} testID={`filtre-garde-${cle}`} />
      ))}
    </View>
  );

  const resume = (
    <>
      <Texte variante="distanceGrande" couleur={c.blanc}>
        {t('garde.ouvertesNuit', { count: nombre })}
      </Texte>
      {bornes ? (
        <Texte variante="petit" couleur={c.blanc}>
          {t('garde.tour', bornes)}
        </Texte>
      ) : null}
    </>
  );

  return (
    <Ecran fond={c.fond} barreClaire hautSur={estNuit} testID="ecran-garde">
      {estNuit ? (
        <View style={styles.enteteNuit}>
          <EnTete titre={t('garde.titre')} centre varianteTitre="titreBarre" onRetour={() => allerOnglet('accueil')} />
          <BarreZone variante="bandeau" libelle={libelle} onChanger={() => router.push('/zone')} />
          <View style={[styles.banniereNuit, { backgroundColor: c.enTeteGarde }]}>
            <View style={styles.flex}>{resume}</View>
            <View style={styles.luneNuit}>
              <IconeLune size={26} color={c.blanc} plein />
            </View>
          </View>
          {filtres}
        </View>
      ) : (
        <EnTeteRouge resume={resume} libelle={libelle} onChanger={() => router.push('/zone')} />
      )}

      <BandeauHorsConnexion dateGarde={dateEnregistree} />

      <ScrollView contentContainerStyle={styles.contenu}>
        {!estNuit ? filtres : null}
        {isPending && !tour ? <ActivityIndicator color={c.rouge} style={styles.chargement} /> : null}
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
        {premiere && !estNuit ? (
          <BlocPlusProche
            testID="bloc-garde-plus-proche"
            garde
            titre={t('accueil.plusProcheGarde')}
            nom={premiere.nom}
            statut={premiere.statut}
            libelleStatut={libelleStatut(premiere, fuseau, 'garde')}
            distanceM={premiere.distance_m}
            marcheMin={premiere.marche_min}
            onPress={() => ouvrir(premiere)}
            onAppeler={() => tel(premiere)}
            onItineraire={() => router.push({ pathname: '/pharmacie/[id]/itineraire', params: { id: premiere.id } })}
          />
        ) : null}
        <View>
          {(estNuit ? liste : autres).map((p, i) => (
            <LignePharmacie
              key={p.id}
              rang={i}
              testID={`garde-${p.id}`}
              nom={p.nom}
              statut={p.statut}
              libelleStatut={libelleStatut(p, fuseau, 'garde')}
              ton={tonAffiche(p, fuseau)}
              distanceM={p.distance_m}
              marcheMin={p.marche_min}
              onPress={() => ouvrir(p)}
              onAppeler={p.telephone ? () => tel(p) : undefined}
            />
          ))}
        </View>
        {!estNuit ? (
          // Conseil en ocre (palette enrichie) : une précaution, pas une urgence.
          <View style={[styles.conseil, { backgroundColor: c.ocreClair }]} testID="conseil-garde">
            <HiPhone size={18} color={c.ocreTexte} />
            <Texte variante="libelleMoyen" couleur={c.ocreTexte} style={styles.flex}>
              {t('garde.conseil')}
            </Texte>
          </View>
        ) : null}
      </ScrollView>
    </Ecran>
  );
}

function EnTeteRouge({ resume, libelle, onChanger }: { resume: ReactNode; libelle: string; onChanger: () => void }) {
  const { couleurs: c } = useTheme();
  // L'en-tête rouge passe sous la barre d'état : on y reporte la zone sûre.
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.enteteRouge, { backgroundColor: c.enTeteGarde, paddingTop: 16 + top }]}>
      <View style={styles.ligneTitre}>
        <Logo largeur={28} variante="inverse" />
        <Texte variante="titre" couleur={c.blanc} titre style={styles.flex}>
          {t('garde.titre')}
        </Texte>
        <IconeLune size={26} color={c.blanc} plein />
      </View>
      <BarreZone variante="garde" libelle={libelle} onChanger={onChanger} />
      <View style={styles.resume}>{resume}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  enteteRouge: { paddingHorizontal: 20, paddingBottom: 18, gap: 12 },
  ligneTitre: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resume: { gap: 4 },
  enteteNuit: { paddingTop: 16, paddingHorizontal: 20, gap: 14 },
  banniereNuit: { paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  luneNuit: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtres: { flexDirection: 'row', gap: 8 },
  contenu: { paddingTop: 14, paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  chargement: { marginTop: 24 },
  confirmee: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -8 },
  aucune: { paddingVertical: 16 },
  conseil: { marginTop: -4, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
});

export default avecErrorBoundary(ListeGardes, 'ListeGardes');
