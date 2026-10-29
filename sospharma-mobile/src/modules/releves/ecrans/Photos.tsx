import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { alerte, signalerErreur, t, ouvrirReglages } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { avecErrorBoundary, Bouton, Ecran, IconeAppareilPhoto, IconeBouclier, IconeCoche, PiedFixe, Texte, useRetour } from '@/commun/ui';

import { useBrouillonReleve } from '../brouillon';
import { EnTeteReleve } from '../composants/EnTeteReleve';
import { prendrePhoto } from '../photos';
import type { TypePhotoReleve } from '../types';

/** 26 Relevé, étape 3 : façade (obligatoire), enseigne et horaires affichés (facultatifs). */
function Photos() {
  const router = useRouter();
  const retour = useRetour();
  const { couleurs: c } = useTheme();
  const photos = useBrouillonReleve((e) => e.photos);
  const type = useBrouillonReleve((e) => e.type);
  const definirPhoto = useBrouillonReleve((e) => e.definirPhoto);
  const [enCours, setEnCours] = useState<TypePhotoReleve | null>(null);

  const prendre = async (cible: TypePhotoReleve) => {
    setEnCours(cible);
    try {
      const r = await prendrePhoto();
      if (r.statut === 'ok') definirPhoto(cible, r.photo);
      else if (r.statut === 'refusee') {
        alerte(t('releve.photos'), t('releve.cameraRefusee'), [
          { text: t('commun.annuler'), style: 'cancel' },
          { text: t('releve.ouvrirReglages'), onPress: () => void ouvrirReglages() },
        ]);
      }
    } catch (e) {
      signalerErreur(e, { etape: 'photo-releve' });
      alerte(t('releve.photos'), t('releve.photoImpossible'));
    } finally {
      setEnCours(null);
    }
  };

  const facade = photos.facade;

  return (
    <Ecran testID="ecran-releve-photos">
      <ScrollView contentContainerStyle={styles.contenu}>
        <EnTeteReleve etape={3} titre={t(type === 'mise_a_jour' ? 'releve.titreMiseAJour' : 'releve.titre')} onRetour={retour} />
        <View style={styles.intro}>
          <Texte variante="titre" titre>
            {t('releve.photosTitre')}
          </Texte>
          <Texte variante="texte" couleur={c.texteSecondaire} style={styles.interligne}>
            {t('releve.photosTexte')}
          </Texte>
        </View>

        {facade ? (
          <View style={[styles.facade, { backgroundColor: c.photoFond }]} testID="photo-facade">
            <Image source={{ uri: facade.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={t('releve.facadePrise')} />
            <View style={[styles.badge, { backgroundColor: c.vert }]}>
              <IconeCoche size={14} color={c.blanc} strokeWidth={3} />
              <Texte variante="libelleFort" couleur={c.blanc}>
                {t('releve.facade')}
              </Texte>
            </View>
            <Pressable
              onPress={() => void prendre('facade')}
              accessibilityRole="button"
              accessibilityLabel={t('releve.reprendreFacade')}
              style={[styles.reprendre, { backgroundColor: c.blanc }]}
            >
              <Texte variante="petitFort" couleur="#1A1A1A" style={styles.gras}>
                {t('releve.reprendre')}
              </Texte>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => void prendre('facade')}
            accessibilityRole="button"
            accessibilityLabel={t('releve.prendreFacade')}
            style={[styles.facade, { backgroundColor: c.photoFond }]}
            testID="bouton-photo-facade"
          >
            {enCours === 'facade' ? (
              <ActivityIndicator color={c.photoTexte} />
            ) : (
              <>
                <IconeAppareilPhoto size={40} color={c.photoTexte} />
                <Texte variante="petitFort" couleur={c.photoTexte}>
                  {t('releve.prendreFacade')}
                </Texte>
                <Texte variante="libelle" couleur={c.photoTexte}>
                  {t('releve.obligatoire')}
                </Texte>
              </>
            )}
          </Pressable>
        )}

        <View style={styles.deux}>
          {(['enseigne', 'horaires'] as const).map((cible) => {
            const photo = photos[cible];
            return (
              <Pressable
                key={cible}
                onPress={() => void prendre(cible)}
                accessibilityRole="button"
                accessibilityLabel={`${t(`releve.typesPhoto.${cible}`)}, ${photo ? t('releve.reprendre') : t('releve.facultatif')}`}
                style={[styles.tuile, { backgroundColor: c.surface }]}
                testID={`bouton-photo-${cible}`}
              >
                {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                {enCours === cible ? (
                  <ActivityIndicator color={c.vert} />
                ) : photo ? (
                  <View style={[styles.badge, { backgroundColor: c.vert }]}>
                    <IconeCoche size={14} color={c.blanc} strokeWidth={3} />
                    <Texte variante="libelleFort" couleur={c.blanc}>
                      {t(`releve.typesPhoto.${cible}`)}
                    </Texte>
                  </View>
                ) : (
                  <>
                    <View style={[styles.rond, { backgroundColor: c.vertClair }]}>
                      <IconeAppareilPhoto size={24} color={c.vert} strokeWidth={2} />
                    </View>
                    <Texte variante="nomPetit">{t(`releve.typesPhoto.${cible}`)}</Texte>
                    <Texte variante="libelle" couleur={c.texteSecondaire}>
                      {t('releve.facultatif')}
                    </Texte>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.note}>
          <IconeBouclier size={16} color={c.vert} />
          <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.flex}>
            {t('releve.photosPrivees')}
          </Texte>
        </View>
      </ScrollView>
      <PiedFixe>
        <Bouton
          libelle={t('releve.continuer')}
          icone="continuer"
          hauteur={54}
          typo="boutonGrand"
          desactive={!facade}
          accessibilityHint={facade ? undefined : t('releve.facadeObligatoire')}
          onPress={() => router.push('/releve/fiche')}
          testID="bouton-continuer-photos"
        />
      </PiedFixe>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, lineHeight: 18 },
  contenu: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  intro: { gap: 6, marginTop: 8, marginBottom: 4 },
  interligne: { lineHeight: 21 },
  facade: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', borderRadius: rayons.carte },
  badge: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  reprendre: { position: 'absolute', right: 10, bottom: 10, minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: rayons.moyen },
  gras: { fontFamily: 'PlusJakartaSans_700Bold' },
  deux: { flexDirection: 'row', gap: 10 },
  tuile: { flex: 1, height: 130, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', borderRadius: rayons.carte },
  rond: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});

export default avecErrorBoundary(Photos, 'RelevePhotos');
