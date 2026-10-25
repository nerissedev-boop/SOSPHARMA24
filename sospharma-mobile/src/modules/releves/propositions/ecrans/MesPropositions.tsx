import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { Proposition } from '@/commun/api';
import { dateCourte, t } from '@/commun/lib';
import { useTheme, type Jetons } from '@/commun/theme';
import { useMargeBas, avecErrorBoundary, Bouton, Ecran, EnTete, EtatVide, HiPharmacy, Texte, useRetour } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { useMesPropositions } from '../usePropositions';

function couleurs(statut: Proposition['statut'], c: Jetons): { texte: string; fond: string; disque: string } {
  switch (statut) {
    case 'en_ligne':
      return { texte: c.vertTexte, fond: c.vertClair, disque: c.vert };
    case 'refusee':
      return { texte: c.texteSecondaire, fond: c.surface, disque: c.texteTertiaire };
    default:
      return { texte: c.attenteTexte, fond: c.attenteFond, disque: c.texteTertiaire };
  }
}

/** « Mes propositions » : ce que l'appareil a proposé et l'état de la vérification. */
function MesPropositions() {
  const margeBas = useMargeBas(20);
  const router = useRouter();
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const { fuseau } = usePaysCourant();
  const mes = useMesPropositions();
  const liste = mes.data ?? [];

  return (
    <Ecran testID="ecran-mes-propositions">
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={<RefreshControl refreshing={mes.isRefetching} onRefresh={() => void mes.refetch()} tintColor={c.vert} />}
      >
        <EnTete titre={t('proposer.listeTitre')} onRetour={retour} />
        {mes.isSuccess && liste.length === 0 ? (
          <EtatVide titre={t('proposer.listeTitre')} texte={t('proposer.listeVide')} />
        ) : null}
        {liste.map((p) => {
          const k = couleurs(p.statut, c);
          return (
            <View key={p.id} style={styles.ligne} testID={`proposition-${p.id}`}>
              <View style={[styles.disque, { backgroundColor: k.disque }]}>
                <HiPharmacy size={24} color={c.blanc} />
              </View>
              <View style={styles.textes}>
                <Texte variante="nom" numberOfLines={1}>
                  {p.nom}
                </Texte>
                <Texte variante="libelle" couleur={c.texteSecondaire} numberOfLines={1}>
                  {[p.ville?.nom, dateCourte(p.envoyee_le, fuseau)].filter(Boolean).join(', ')}
                </Texte>
                {p.motif_refus ? (
                  <Texte variante="libelle" couleur={c.texteSecondaire}>
                    {t('proposer.motif', { motif: p.motif_refus })}
                  </Texte>
                ) : null}
                {p.pharmacie_id ? (
                  <Bouton
                    libelle={t('proposer.voirFiche')}
                    icone="voir"
                    variante="lien"
                    onPress={() => router.push({ pathname: '/pharmacie/[id]', params: { id: p.pharmacie_id as string } })}
                    style={styles.lien}
                  />
                ) : null}
              </View>
              <View style={[styles.etat, { backgroundColor: k.fond }]}>
                <Texte variante="libelleFort" couleur={k.texte}>
                  {t(`proposer.statuts.${p.statut}`)}
                </Texte>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.pied, { paddingBottom: margeBas }]}>
        <Bouton libelle={t('proposer.autre')} icone="ajouter" onPress={() => router.push('/proposer')} testID="bouton-nouvelle-proposition" />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  ligne: { minHeight: 64, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  disque: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textes: { flex: 1, gap: 2 },
  lien: { alignSelf: 'flex-start', minHeight: 44 },
  etat: { paddingHorizontal: 8, paddingVertical: 4 },
  pied: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
});

export default avecErrorBoundary(MesPropositions, 'MesPropositions');
