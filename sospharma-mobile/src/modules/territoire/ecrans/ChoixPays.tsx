import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { t, usePreferences } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { useMargeBas, avecErrorBoundary, ChampRecherche, Ecran, EnTete, IconeCoche, Texte, useRetour } from '@/commun/ui';

import { usePays } from '../hooks/usePays';

function ChoixPays() {
  const margeBas = useMargeBas(32);
  const router = useRouter();
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const [recherche, setRecherche] = useState('');
  const paysCode = usePreferences((e) => e.paysCode);
  const definirPays = usePreferences((e) => e.definirPays);
  const prevenus = usePreferences((e) => e.paysPrevenus);
  const basculerPrevenu = usePreferences((e) => e.basculerPaysPrevenu);
  const pays = usePays();

  const filtres = useMemo(() => {
    const q = recherche.trim().toLocaleLowerCase('fr');
    return (pays.data ?? []).filter((p) => !q || p.nom.toLocaleLowerCase('fr').includes(q) || p.indicatif.includes(q));
  }, [pays.data, recherche]);
  const ouverts = filtres.filter((p) => p.statut === 'ouvert');
  const bientot = filtres.filter((p) => p.statut === 'bientot');

  return (
    <Ecran testID="ecran-pays">
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: margeBas }]} keyboardShouldPersistTaps="handled">
        <EnTete titre={t('pays.titre')} onRetour={retour} />
        <ChampRecherche
          libelle={t('pays.recherche')}
          placeholder={t('pays.recherche')}
          value={recherche}
          onChangeText={setRecherche}
          hauteur={50}
          taillePolice={15}
        />

        {ouverts.length > 0 ? (
          <View style={styles.groupe}>
            <Texte variante="sectionMoyenne" titre>
              {t('pays.disponible')}
            </Texte>
            {ouverts.map((p) => {
              const choisi = p.code === paysCode;
              return (
                <Pressable
                  key={p.code}
                  onPress={() => {
                    definirPays(p.code);
                    retour();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: choisi }}
                  accessibilityLabel={`${p.nom}, ${p.indicatif}${choisi ? `, ${t('pays.selectionne')}` : ''}`}
                  style={[styles.ouvert, { backgroundColor: choisi ? c.vertClair : c.surface }]}
                >
                  <View style={styles.flex}>
                    <Texte variante="nomGrand">{p.nom}</Texte>
                    {p.resume ? (
                      <Texte variante="libelle" couleur={c.texteSecondaire}>
                        {p.resume}
                      </Texte>
                    ) : null}
                  </View>
                  <Texte variante="petit" couleur={c.texteSecondaire}>
                    {p.indicatif}
                  </Texte>
                  {choisi ? <IconeCoche size={22} color={c.vert} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {bientot.length > 0 ? (
          <View>
            <Texte variante="sectionMoyenne" titre style={styles.titreBientot}>
              {t('pays.bientot')}
            </Texte>
            {bientot.map((p) => {
              const prevenu = prevenus.includes(p.code);
              return (
                <View key={p.code} style={styles.bientot}>
                  <Texte variante="corpsFort" style={styles.flex}>
                    {p.nom}
                  </Texte>
                  <Texte variante="petit" couleur={c.texteSecondaire} style={styles.indicatif}>
                    {p.indicatif}
                  </Texte>
                  <Pressable
                    onPress={() => basculerPrevenu(p.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: prevenu }}
                    accessibilityLabel={`${prevenu ? t('pays.prevenu') : t('pays.prevenir')}, ${p.nom}`}
                    hitSlop={4}
                    style={[styles.prevenir, { backgroundColor: prevenu ? c.vertClair : c.surface }]}
                  >
                    <Texte variante="libelleFort" couleur={c.vertTexte}>
                      {prevenu ? t('pays.prevenu') : t('pays.prevenir')}
                    </Texte>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <Texte variante="petit" couleur={c.texteSecondaire} style={styles.absent}>
          {t('pays.absent')}{' '}
          <Texte variante="petitFort" couleur={c.vertTexte} onPress={() => router.push('/contact')} accessibilityRole="link">
            {t('pays.dites')}
          </Texte>
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  flex: { flex: 1, gap: 2 },
  groupe: { gap: 6 },
  ouvert: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  titreBientot: { marginBottom: 4 },
  bientot: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  indicatif: { width: 44 },
  prevenir: { height: 36, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  absent: { lineHeight: 20 },
});

export default avecErrorBoundary(ChoixPays, 'ChoixPays');
