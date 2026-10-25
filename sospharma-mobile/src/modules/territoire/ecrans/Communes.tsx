import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet, View } from 'react-native';

import type { Zone } from '@/commun/api';
import { t, usePreferences } from '@/commun/lib';
import { ombres, useTheme } from '@/commun/theme';
import { useMargeBas, avecErrorBoundary, ChampRecherche, Ecran, EnTete, Segments, Texte, useRetour, useRevenirAccueil } from '@/commun/ui';

import { LigneCommune } from '../composants/LigneCommune';
import { useVilles } from '../hooks/usePays';
import { useCommunes, useZoneCourante } from '../hooks/useZone';

type Tri = 'az' | 'distance';
type Section = { lettre: string; data: Zone[] };

function Communes() {
  const margeBas = useMargeBas(32);
  const retour = useRetour();
  const revenirAccueil = useRevenirAccueil();
  const { couleurs: c, estNuit } = useTheme();
  const [tri, setTri] = useState<Tri>('az');
  const [recherche, setRecherche] = useState('');
  const paysCode = usePreferences((e) => e.paysCode);
  const definirZone = usePreferences((e) => e.definirZone);
  const { zone } = useZoneCourante();
  const villes = useVilles(paysCode);
  const ville = villes.data?.find((v) => v.id === zone?.villeId) ?? villes.data?.find((v) => v.statut === 'ouverte');
  const communes = useCommunes(ville?.id ?? null, recherche);
  const liste = useRef<SectionList<Zone, Section>>(null);

  const sections = useMemo<Section[]>(() => {
    const groupes = new Map<string, Zone[]>();
    for (const z of [...(communes.data ?? [])].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))) {
      const lettre = z.nom[0]?.toLocaleUpperCase('fr') ?? '#';
      groupes.set(lettre, [...(groupes.get(lettre) ?? []), z]);
    }
    return [...groupes.entries()].map(([lettre, data]) => ({ lettre, data }));
  }, [communes.data]);

  const parDistance = useMemo(
    () => [...(communes.data ?? [])].sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0)),
    [communes.data],
  );

  const choisir = (z: Zone) => {
    if (!ville) return;
    definirZone({
      zoneId: z.id,
      nom: z.nom,
      villeId: ville.id,
      villeNom: ville.nom,
      latitude: z.latitude,
      longitude: z.longitude,
      source: 'manuelle',
    });
    revenirAccueil();
  };

  const rendreLigne = ({ item }: { item: Zone }) => (
    <LigneCommune zone={item} ici={zone?.zoneId === item.id} onPress={() => choisir(item)} hauteur={50} />
  );

  return (
    <Ecran testID="ecran-communes">
      <View style={[styles.entete, { backgroundColor: c.fond }, !estNuit && ombres.enTete]}>
        <EnTete
          titre={ville?.nom ?? ''}
          onRetour={retour}
          apresTitre={
            <Texte variante="petit" couleur={c.texteSecondaire}>
              {t('communes.nombre', { count: ville?.nombre_communes ?? communes.data?.length ?? 0 })}
            </Texte>
          }
        />
        <ChampRecherche
          libelle={t('communes.recherche')}
          placeholder={t('communes.recherche')}
          value={recherche}
          onChangeText={setRecherche}
          taillePolice={15}
        />
        <Segments<Tri>
          libelle={t('communes.tri')}
          valeur={tri}
          onChange={setTri}
          segments={[
            { valeur: 'az', libelle: t('communes.az') },
            { valeur: 'distance', libelle: t('communes.distance') },
          ]}
        />
      </View>

      {tri === 'az' ? (
        <View style={styles.flex}>
          <SectionList
            ref={liste}
            sections={sections}
            keyExtractor={(z) => z.id}
            renderItem={rendreLigne}
            renderSectionHeader={({ section }) => (
              <Texte variante="sectionPetite" couleur={c.vertTexte} style={styles.lettre} titre>
                {section.lettre}
              </Texte>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.listeAz, { paddingBottom: margeBas }]}
            onScrollToIndexFailed={() => undefined}
          />
          <View style={styles.index} accessibilityLabel={t('communes.lettres')}>
            {sections.map((s, i) => (
              <Pressable
                key={s.lettre}
                accessibilityRole="button"
                accessibilityLabel={t('communes.lettre', { lettre: s.lettre })}
                onPress={() => liste.current?.scrollToLocation({ sectionIndex: i, itemIndex: 0, viewOffset: 0, animated: true })}
                style={styles.lettreIndex}
                hitSlop={{ left: 8, right: 8 }}
              >
                <Texte variante="libelleFort" couleur={c.vertTexte} style={styles.texteIndex}>
                  {s.lettre}
                </Texte>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList data={parDistance} keyExtractor={(z) => z.id} renderItem={rendreLigne} contentContainerStyle={[styles.listeDistance, { paddingBottom: margeBas }]} />
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entete: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12, gap: 12, zIndex: 1 },
  listeAz: { paddingTop: 4, paddingLeft: 20, paddingRight: 44, paddingBottom: 32 },
  listeDistance: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 },
  lettre: { marginTop: 10, marginBottom: 2, fontSize: 13 },
  index: { position: 'absolute', right: 6, top: 0, bottom: 0, justifyContent: 'center', gap: 2 },
  lettreIndex: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  texteIndex: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
});

export default avecErrorBoundary(Communes, 'Communes');
