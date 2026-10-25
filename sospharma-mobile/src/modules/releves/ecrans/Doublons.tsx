import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { donneesOuErreur } from '@/commun/api';
import { jourMois, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { avecErrorBoundary, Bouton, Ecran, IconeAppareilPhoto, PiedFixe, Texte, useRetour } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { clesReleves, lireDoublons, RAYON_DOUBLONS_M } from '../api';
import { useBrouillonReleve } from '../brouillon';
import { EnTeteReleve } from '../composants/EnTeteReleve';
import type { PharmacieProche } from '../types';

/** 25 Relevé, étape 2 : pharmacies déjà connues autour du repère (doublons possibles). */
function Doublons() {
  const router = useRouter();
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const { fuseau } = usePaysCourant();
  const position = useBrouillonReleve((e) => e.position);
  const type = useBrouillonReleve((e) => e.type);
  const choisirExistante = useBrouillonReleve((e) => e.choisirExistante);
  const choisirNouvelle = useBrouillonReleve((e) => e.choisirNouvelle);
  const requete = useQuery({
    queryKey: position ? clesReleves.doublons(position) : ['agent', 'doublons', 'aucun'],
    queryFn: async () => donneesOuErreur(await lireDoublons(position as NonNullable<typeof position>)),
    enabled: position !== null,
    retry: false,
  });
  const liste = requete.data ?? [];

  const memePharmacie = (p: PharmacieProche) => {
    choisirExistante(p);
    router.push('/releve/photos');
  };
  const nouvelle = () => {
    choisirNouvelle();
    router.push('/releve/photos');
  };

  const sousTitre = requete.isPending
    ? t('releve.doublonsRecherche')
    : requete.error
      ? t('releve.doublonsHorsLigne')
      : liste.length === 0
        ? t('releve.doublonsAucun', { rayon: RAYON_DOUBLONS_M })
        : t('releve.doublonsNombre', { count: liste.length, rayon: RAYON_DOUBLONS_M });

  return (
    <Ecran testID="ecran-releve-doublons">
      <ScrollView contentContainerStyle={styles.contenu}>
        <EnTeteReleve etape={2} titre={t(type === 'mise_a_jour' ? 'releve.titreMiseAJour' : 'releve.titre')} onRetour={retour} />
        <View style={styles.intro}>
          <Texte variante="titre" titre>
            {t('releve.doublonsTitre')}
          </Texte>
          <Texte variante="texte" couleur={c.texteSecondaire} style={styles.interligne}>
            {sousTitre}
          </Texte>
        </View>
        {requete.isPending ? <ActivityIndicator color={c.vert} /> : null}
        <View style={styles.liste}>
          {liste.map((p) => (
            <View key={p.id} style={[styles.carte, { backgroundColor: c.surface }]} testID={`doublon-${p.id}`}>
              <View style={styles.ligne}>
                <View style={[styles.photo, { backgroundColor: c.photoFond }]}>
                  <IconeAppareilPhoto size={22} color={c.photoTexte} />
                </View>
                <View style={styles.textes}>
                  <Texte variante="nom" numberOfLines={1}>
                    {p.nom}
                  </Texte>
                  <Texte variante="libelle" couleur={c.texteSecondaire} numberOfLines={1}>
                    {p.adresse}
                  </Texte>
                  <Texte variante="libelle" couleur={c.texteSecondaire}>
                    {p.verifiee_le ? t('releve.verifieeLe', { date: jourMois(p.verifiee_le, fuseau) }) : t('releve.jamaisVerifiee')}
                  </Texte>
                </View>
                <Texte variante="nomPetit" style={styles.distance}>
                  {p.distance_m !== null ? t('releve.metres', { metres: p.distance_m }) : ''}
                </Texte>
              </View>
              <Bouton
                libelle={t('releve.memePharmacie')}
                icone="actualiser"
                variante="blanc"
                hauteur={46}
                onPress={() => memePharmacie(p)}
                testID={`bouton-meme-${p.id}`}
              />
            </View>
          ))}
        </View>
      </ScrollView>
      <PiedFixe>
        <Bouton
          libelle={t('releve.nouvellePharmacie')}
          icone="ajouter"
          hauteur={54}
          typo="boutonGrand"
          onPress={nouvelle}
          testID="bouton-nouvelle-pharmacie"
        />
      </PiedFixe>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  intro: { gap: 6, marginTop: 8 },
  interligne: { lineHeight: 21 },
  liste: { paddingTop: 4, gap: 10 },
  carte: { padding: 14, gap: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  textes: { flex: 1, gap: 2, minWidth: 0 },
  distance: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
});

export default avecErrorBoundary(Doublons, 'ReleveDoublons');
