import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { heure, t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { useMargeBas, avecErrorBoundary, Bouton, Ecran, EnTete, HiHomeOutline, HiPharmacy, IconeChevronDroite, IconeCoche, Texte, useRevenirAccueil } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { useMesPropositions } from '../usePropositions';

type Etape = { titre: string; texte: string; etat: 'fait' | 'en_cours' | 'a_venir' };

/** Point de la frise de suivi : coche verte (fait), point vert (en cours), cercle blanc (à venir). */
function Point({ etat }: { etat: Etape['etat'] }) {
  const { couleurs: c } = useTheme();
  if (etat === 'fait') {
    return (
      <View style={[styles.point, { backgroundColor: c.vert }]}>
        <IconeCoche size={12} color={c.blanc} strokeWidth={3.4} />
      </View>
    );
  }
  return <View style={[styles.point, { backgroundColor: c.feuille }]}>{etat === 'en_cours' ? <View style={[styles.pointInterieur, { backgroundColor: c.vert }]} /> : null}</View>;
}

/** 29 Proposition envoyée : merci, suivi en trois étapes, accès à « Mes propositions ». */
function PropositionEnvoyee() {
  const margeBas = useMargeBas(20);
  const router = useRouter();
  const accueil = useRevenirAccueil();
  const { couleurs: c } = useTheme();
  const { fuseau } = usePaysCourant();
  const { nom } = useLocalSearchParams<{ nom?: string }>();
  const [envoyeeA] = useState(() => heure(new Date(), fuseau));
  const mes = useMesPropositions();
  const liste = mes.data ?? [];
  const enLigne = liste.filter((p) => p.statut === 'en_ligne').length;
  const verification = liste.filter((p) => p.statut === 'en_verification').length;

  const etapes: Etape[] = [
    { titre: t('proposer.etapes.envoyee'), texte: t('proposer.etapes.envoyeeTexte', { heure: envoyeeA }), etat: 'fait' },
    { titre: t('proposer.etapes.verification'), texte: t('proposer.etapes.verificationTexte'), etat: 'en_cours' },
    { titre: t('proposer.etapes.enLigne'), texte: t('proposer.etapes.enLigneTexte'), etat: 'a_venir' },
  ];

  return (
    <Ecran testID="ecran-proposition-envoyee">
      <ScrollView contentContainerStyle={styles.contenu}>
        <EnTete titre="" icone="fermer" onRetour={accueil} />
        <View style={styles.merci}>
          <View style={[styles.cercle, { backgroundColor: c.vertClair }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.disque, { backgroundColor: c.vert }]}>
              <IconeCoche size={40} color={c.blanc} strokeWidth={2.6} />
            </View>
          </View>
          <Texte variante="titreEcran" titre aligne="center" style={styles.titre} accessibilityRole="header">
            {t('proposer.merciTitre')}
          </Texte>
          <Texte variante="texte" couleur={c.texteSecondaire} aligne="center" style={styles.texte}>
            {t('proposer.merciTexte', { nom: nom || t('proposer.titre') })}
          </Texte>
        </View>

        <View style={[styles.frise, { backgroundColor: c.surface }]} accessibilityLabel={t('proposer.suivi')}>
          {etapes.map((e, i) => (
            <View key={e.titre} style={styles.etape}>
              <View style={styles.colonne}>
                <Point etat={e.etat} />
                {i < etapes.length - 1 ? <View style={[styles.trait, { backgroundColor: e.etat === 'fait' ? c.vert : c.etapeInactive }]} /> : null}
              </View>
              <View style={[styles.textesEtape, i < etapes.length - 1 && styles.espaceEtape]}>
                <Texte variante="nomPetit" couleur={e.etat === 'en_cours' ? c.vertTexte : e.etat === 'a_venir' ? c.texteSecondaire : c.texte}>
                  {e.titre}
                </Texte>
                <Texte variante="libelle" couleur={c.texteSecondaire}>
                  {e.texte}
                </Texte>
              </View>
            </View>
          ))}
        </View>

        {liste.length > 0 ? (
          <Pressable
            onPress={() => router.push('/propositions')}
            accessibilityRole="button"
            style={[styles.mes, { backgroundColor: c.vertClair }]}
            testID="lien-mes-propositions"
          >
            <View style={[styles.pastille, { backgroundColor: c.vert }]}>
              <HiPharmacy size={24} color={c.blanc} />
            </View>
            <View style={styles.flex}>
              <Texte variante="nomPetit">{t('proposer.mesPropositions', { count: liste.length })}</Texte>
              <Texte variante="libelleMoyen" couleur={c.vertTexte}>
                {t('proposer.resume', { enLigne, verification })}
              </Texte>
            </View>
            <IconeChevronDroite size={16} color={c.vertTexte} />
          </Pressable>
        ) : null}
      </ScrollView>
      <View style={[styles.pied, { paddingBottom: margeBas }]}>
        <Bouton libelle={t('proposer.retourAccueil')} icone={<HiHomeOutline size={20} color={c.blanc} />} hauteur={54} typo="boutonGrand" onPress={accueil} testID="bouton-retour-accueil" />
        <Bouton libelle={t('proposer.autre')} icone="ajouter" variante="secondaire" onPress={() => router.replace('/proposer')} testID="bouton-autre-proposition" />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  merci: { alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  cercle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  disque: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  titre: { marginTop: 8 },
  texte: { maxWidth: 310, lineHeight: 21 },
  frise: { marginTop: 16, padding: 16, borderRadius: rayons.carte },
  etape: { flexDirection: 'row', gap: 12 },
  colonne: { width: 22, alignItems: 'center' },
  point: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pointInterieur: { width: 10, height: 10, borderRadius: 5 },
  trait: { width: 2, flex: 1, minHeight: 18 },
  textesEtape: { flex: 1, gap: 2 },
  espaceEtape: { paddingBottom: 12 },
  mes: { minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: rayons.moyen },
  pastille: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pied: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 10 },
});

export default avecErrorBoundary(PropositionEnvoyee, 'PropositionEnvoyee');
