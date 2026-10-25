import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { de, t, usePreferences } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  ChampRecherche,
  Ecran,
  EnTete,
  HiGeoLocation,
  IconeChevronBas,
  IconeChevronDroite,
  Texte,
  useRetour,
  useRevenirAccueil,
  useMargeBas,
} from '@/commun/ui';

import { LigneCommune } from '../composants/LigneCommune';
import { usePays, usePaysCourant, useVilles } from '../hooks/usePays';
import { usePosition } from '../hooks/usePosition';
import { useCommunes, useZoneCourante, useZoneDetectee, versZoneChoisie } from '../hooks/useZone';

function ChangerZone() {
  const margeBas = useMargeBas(32);
  const router = useRouter();
  const retour = useRetour();
  const revenirAccueil = useRevenirAccueil();
  const { couleurs: c } = useTheme();
  const [recherche, setRecherche] = useState('');
  const paysCode = usePreferences((e) => e.paysCode);
  const definirZone = usePreferences((e) => e.definirZone);
  const { pays } = usePaysCourant();
  usePays();
  const villes = useVilles(paysCode);
  const { zone } = useZoneCourante();
  const { position, actualiser, enCours } = usePosition();
  const detection = useZoneDetectee(position);

  const villeOuverte = villes.data?.find((v) => v.id === zone?.villeId) ?? villes.data?.find((v) => v.statut === 'ouverte');
  const communes = useCommunes(villeOuverte?.id ?? null, recherche);
  const autresVilles = useMemo(
    () =>
      (villes.data ?? []).filter(
        (v) => v.statut === 'bientot' && (!recherche || v.nom.toLocaleLowerCase('fr').includes(recherche.toLocaleLowerCase('fr'))),
      ),
    [villes.data, recherche],
  );
  const proches = useMemo(
    () => [...(communes.data ?? [])].sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0)).slice(0, recherche ? 13 : 5),
    [communes.data, recherche],
  );

  const utiliserPosition = async () => {
    const p = position ?? (await actualiser(true));
    if (!p) return;
    const d = detection.data;
    if (d) definirZone(versZoneChoisie(d, 'position'));
    else definirZone(null);
    revenirAccueil();
  };

  const choisirCommune = (id: string) => {
    const commune = communes.data?.find((z) => z.id === id);
    if (!commune || !villeOuverte) return;
    definirZone({
      zoneId: commune.id,
      nom: commune.nom,
      villeId: villeOuverte.id,
      villeNom: villeOuverte.nom,
      latitude: commune.latitude,
      longitude: commune.longitude,
      source: detection.data?.zone.id === commune.id ? 'position' : 'manuelle',
    });
    revenirAccueil();
  };

  const detecte = detection.data
    ? t('zone.detecte', { zone: detection.data.zone.nom, ville: detection.data.ville.nom })
    : t('zone.positionInconnue');

  return (
    <Ecran testID="ecran-zone">
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: margeBas }]} keyboardShouldPersistTaps="handled">
        <EnTete
          titre={t('zone.titre')}
          icone="fermer"
          onRetour={retour}
          droite={
            <Pressable
              onPress={() => router.push('/zone/pays')}
              accessibilityRole="button"
              accessibilityLabel={t('zone.pays', { pays: pays?.nom ?? paysCode })}
              hitSlop={4}
              style={[styles.pays, { backgroundColor: c.surface }]}
              testID="bouton-pays"
            >
              <Texte variante="boutonPetit" style={styles.texte13}>
                {paysCode}
              </Texte>
              <IconeChevronBas size={14} color={c.texte} />
            </Pressable>
          }
        />

        <Pressable
          onPress={utiliserPosition}
          disabled={enCours}
          accessibilityRole="button"
          accessibilityLabel={`${t('zone.utiliserPosition')}, ${detecte}`}
          style={({ pressed }) => [styles.position, { backgroundColor: c.vert, opacity: pressed ? 0.85 : 1 }]}
          testID="bouton-utiliser-position"
        >
          <View style={[styles.rondBlanc, { backgroundColor: c.blanc }]}>
            <HiGeoLocation size={24} color={c.vertTexte} />
          </View>
          <View style={styles.flexTexte}>
            <Texte variante="nom" couleur={c.blanc}>
              {t('zone.utiliserPosition')}
            </Texte>
            <Texte variante="petit" couleur={c.blanc}>
              {detecte}
            </Texte>
          </View>
        </Pressable>

        <ChampRecherche
          libelle={t('zone.rechercheA11y')}
          placeholder={t('zone.recherche')}
          value={recherche}
          onChangeText={setRecherche}
          hauteur={50}
          taillePolice={15}
          testID="champ-recherche-zone"
        />

        <View>
          <View style={styles.titreSection}>
            <Texte variante="sectionMoyenne" titre>
              {t('zone.proches')}
            </Texte>
            {villeOuverte ? (
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {villeOuverte.nom}
              </Texte>
            ) : null}
          </View>
          {proches.map((commune) => (
            <LigneCommune key={commune.id} zone={commune} ici={zone?.zoneId === commune.id} onPress={() => choisirCommune(commune.id)} />
          ))}
          {recherche && proches.length === 0 && autresVilles.length === 0 ? (
            <Texte variante="petit" couleur={c.texteSecondaire} style={styles.aucune}>
              {t('zone.aucune')}
            </Texte>
          ) : null}
          {villeOuverte && !recherche ? (
            <Pressable
              onPress={() => router.push('/zone/communes')}
              accessibilityRole="button"
              style={styles.toutes}
              testID="lien-toutes-communes"
            >
              <Texte variante="boutonPetit" couleur={c.vertTexte}>
                {/* L'API ne donne pas le nombre de communes : à défaut, celles chargées pour la ville. */}
                {t('zone.toutes', { deVille: de(villeOuverte.nom), count: villeOuverte.nombre_communes || communes.data?.length || 0 })}
              </Texte>
              <IconeChevronDroite size={18} color={c.vertTexte} />
            </Pressable>
          ) : null}
        </View>

        {autresVilles.length > 0 ? (
          <View>
            <Texte variante="sectionMoyenne" titre style={styles.titreAutres}>
              {t('zone.autresVilles')}
            </Texte>
            {autresVilles.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => router.push({ pathname: '/zone/non-couverte', params: { ville: v.nom } })}
                accessibilityRole="button"
                accessibilityLabel={`${v.nom}, ${t('zone.bientot')}`}
                style={styles.ville}
              >
                <Texte variante="corpsFort" style={styles.flexTexte}>
                  {v.nom}
                </Texte>
                <View style={[styles.bientot, { backgroundColor: c.surface }]}>
                  <Texte variante="libelleMoyen" couleur={c.texteSecondaire}>
                    {t('zone.bientot')}
                  </Texte>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  pays: { height: 36, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 44, justifyContent: 'center' },
  texte13: { fontSize: 13 },
  position: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rondBlanc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flexTexte: { flex: 1, gap: 2 },
  titreSection: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  toutes: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aucune: { paddingVertical: 12 },
  titreAutres: { marginBottom: 6 },
  ville: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bientot: { paddingHorizontal: 8, paddingVertical: 4 },
});

export default avecErrorBoundary(ChangerZone, 'ChangerZone');
