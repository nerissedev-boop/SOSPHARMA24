import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { MotifSignalement } from '@/commun/api';
import { alerte, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { avecErrorBoundary, Bouton, Ecran, EnTete, PastilleStatut, PiedFixe, PointRadio, Texte, useRetour, ZoneTexte } from '@/commun/ui';
import { usePharmacie } from '@/modules/pharmacies';

import { useEnvoyerSignalement } from '../hooks/useSignalement';

const MOTIFS: MotifSignalement[] = ['fermee', 'tel', 'adresse', 'garde', 'autre'];

/** 17 Signaler une erreur. */
function Signaler() {
  const router = useRouter();
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fiche } = usePharmacie(id ?? '');
  const [motif, setMotif] = useState<MotifSignalement>('fermee');
  const [precisions, setPrecisions] = useState('');
  const envoi = useEnvoyerSignalement(id ?? '');

  const envoyer = () =>
    envoi.mutate(
      { motif, precisions },
      { onSuccess: () => alerte(t('signaler.merciTitre'), t('signaler.merci'), [{ text: t('commun.ok'), onPress: retour }]) },
    );

  return (
    <Ecran testID="ecran-signaler">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <EnTete titre={t('signaler.titre')} onRetour={retour} />
          {fiche ? (
            <View style={[styles.pharmacie, { backgroundColor: c.surface }]}>
              <PastilleStatut statut={fiche.statut} taille={38} tailleIcone={24} />
              <View style={styles.flex}>
                <Texte variante="nom">{fiche.nom}</Texte>
                <Texte variante="libelle" couleur={c.texteSecondaire}>
                  {fiche.adresse}
                </Texte>
              </View>
            </View>
          ) : null}

          <View accessibilityRole="radiogroup" accessibilityLabel={t('signaler.question')}>
            <Texte variante="sectionMoyenne" titre style={styles.titre}>
              {t('signaler.question')}
            </Texte>
            {MOTIFS.map((m) => {
              const actif = motif === m;
              return (
                <Pressable
                  key={m}
                  testID={`motif-${m}`}
                  onPress={() => setMotif(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: actif }}
                  style={[styles.motif, { backgroundColor: actif ? c.vertClair : 'transparent' }]}
                >
                  <PointRadio actif={actif} />
                  <Texte variante={actif ? 'nom' : 'corps'} style={styles.texteMotif}>
                    {t(`signaler.motifs.${m}`)}
                  </Texte>
                </Pressable>
              );
            })}
            {envoi.erreurs.motif ? (
              <Texte variante="libelleMoyen" couleur={c.rougeTexte}>
                {envoi.erreurs.motif}
              </Texte>
            ) : null}
          </View>

          <View style={styles.precisions}>
            <Texte variante="boutonPetit">
              {t('signaler.precisions')}{' '}
              <Texte variante="texte" couleur={c.texteSecondaire}>
                {t('signaler.facultatif')}
              </Texte>
            </Texte>
            <ZoneTexte
              libelle={t('signaler.precisions')}
              placeholder={t('signaler.placeholder')}
              value={precisions}
              onChangeText={setPrecisions}
              erreur={envoi.erreurs.precisions}
              maxLength={500}
            />
          </View>
        </ScrollView>
        <PiedFixe>
          <Bouton
            libelle={t('signaler.envoyer')}
            icone="envoyer"
            hauteur={54}
            typo="boutonGrand"
            chargement={envoi.isPending}
            onPress={envoyer}
            testID="bouton-envoyer-signalement"
          />
          <Texte variante="libelle" couleur={c.texteSecondaire} aligne="center">
            {t('signaler.verification')}{' '}
            <Texte variante="libelleFort" couleur={c.vertTexte} accessibilityRole="link" onPress={() => router.push('/contact')}>
              {t('signaler.contact')}
            </Texte>
          </Texte>
        </PiedFixe>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  pharmacie: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  titre: { marginBottom: 4 },
  motif: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginHorizontal: -12 },
  texteMotif: { flex: 1 },
  precisions: { gap: 8 },
});

export default avecErrorBoundary(Signaler, 'Signaler');
