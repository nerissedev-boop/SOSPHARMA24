import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import type { PharmacieResume } from '@/commun/api';
import { t } from '@/commun/lib';
import { rayons, useTheme } from '@/commun/theme';
import { Bouton, Feuille, IconeAppareilPhoto, IconeLieu, PastilleStatut, Texte } from '@/commun/ui';
import type { PhotoLocale } from '@/modules/releves/types';

import { RAYON_VERIFICATION_M } from '../api';

type Props = {
  visible: boolean;
  /** Récapitulatif de la proposition. */
  facade: PhotoLocale | null;
  nom: string;
  telephone: string | null;
  lieu: string;
  /** null : recherche en cours. */
  verification: { proches: PharmacieResume[]; verifiee: boolean } | null;
  envoiEnCours: boolean;
  onModifier: () => void;
  onCestCelleCi: (pharmacieId: string) => void;
  onEnvoyer: (doublonsEcartes: string[]) => void;
};

/**
 * 28b Vérification avant envoi : récapitulatif de la proposition, puis les pharmacies déjà connues à 100 m.
 * « Oui, c'est celle-ci » ouvre sa fiche (rien n'est envoyé) ; sinon l'envoi part avec les pharmacies écartées.
 */
export function FeuilleVerification({
  visible,
  facade,
  nom,
  telephone,
  lieu,
  verification,
  envoiEnCours,
  onModifier,
  onCestCelleCi,
  onEnvoyer,
}: Props) {
  const { couleurs: c } = useTheme();
  const proches = verification?.proches ?? [];
  const nombre = proches.length;

  return (
    <Feuille
      visible={visible}
      onFermer={onModifier}
      titre={t('proposer.verification.titre')}
      defilement
      testID="feuille-verification"
      pied={
        <Bouton
          libelle={nombre > 0 ? t('proposer.verification.envoyerAutre') : t('proposer.verification.envoyer')}
          icone="envoyer"
          hauteur={54}
          typo="boutonGrand"
          desactive={verification === null}
          chargement={envoiEnCours}
          onPress={() => onEnvoyer(proches.map((p) => p.id))}
          testID="bouton-confirmer-envoi"
        />
      }
    >
            <View style={styles.bloc}>
              <View style={styles.ligneTitre}>
                <Texte variante="boutonPetit">{t('proposer.verification.votre')}</Texte>
                <Bouton libelle={t('proposer.verification.modifier')} variante="lien" onPress={onModifier} testID="bouton-modifier-proposition" />
              </View>
              <View style={[styles.recap, { backgroundColor: c.vertClair }]}>
                <View style={[styles.vignette, { backgroundColor: c.photoFond }]}>
                  {facade ? (
                    <Image source={{ uri: facade.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <IconeAppareilPhoto size={22} color={c.photoTexte} />
                  )}
                </View>
                <View style={styles.flex}>
                  <Texte variante="nom" numberOfLines={2}>
                    {nom}
                  </Texte>
                  {telephone ? (
                    <Texte variante="libelle" couleur={c.texteSecondaire}>
                      {telephone}
                    </Texte>
                  ) : null}
                  <View style={styles.lieu}>
                    <IconeLieu size={13} color={c.vertTexte} strokeWidth={2.4} />
                    <Texte variante="libelleMoyen" couleur={c.vertTexte} numberOfLines={1} style={styles.flex}>
                      {lieu}
                    </Texte>
                  </View>
                </View>
              </View>
            </View>

            {verification === null ? (
              <View style={styles.attente} accessibilityLiveRegion="polite">
                <ActivityIndicator color={c.vert} />
                <Texte variante="petit" couleur={c.texteSecondaire} style={styles.flex}>
                  {t('proposer.verification.recherche')}
                </Texte>
              </View>
            ) : !verification.verifiee ? (
              <Texte variante="petit" couleur={c.texteSecondaire} style={styles.interligne}>
                {t('proposer.verification.horsLigne')}
              </Texte>
            ) : nombre === 0 ? (
              <Texte variante="petit" couleur={c.vertTexte} style={styles.interligne} testID="verification-aucune">
                {t('proposer.verification.aucune', { rayon: RAYON_VERIFICATION_M })}
              </Texte>
            ) : (
              <View style={styles.bloc}>
                <Texte variante="sectionMoyenne" titre>
                  {t('proposer.verification.question')}
                </Texte>
                <Texte variante="petit" couleur={c.texteSecondaire} style={styles.interligne}>
                  {t('proposer.verification.connues', { count: nombre, rayon: RAYON_VERIFICATION_M })}
                </Texte>
                {proches.map((p) => (
                  <View key={p.id} style={[styles.proche, { backgroundColor: c.surface }]} testID={`proche-${p.id}`}>
                    <View style={styles.ligneProche}>
                      <PastilleStatut statut={p.statut} taille={44} tailleIcone={26} />
                      <View style={styles.flex}>
                        <Texte variante="nomPetit" numberOfLines={1}>
                          {p.nom}
                        </Texte>
                        <Texte variante="libelle" couleur={c.texteSecondaire} numberOfLines={1}>
                          {p.adresse}
                        </Texte>
                      </View>
                      {p.distance_m !== null ? (
                        <Texte variante="nomPetit" style={styles.distance}>
                          {t('proposer.verification.distance', { metres: p.distance_m })}
                        </Texte>
                      ) : null}
                    </View>
                    <Bouton
                      libelle={t('proposer.verification.oui')}
                      icone="voir"
                      variante="blanc"
                      hauteur={44}
                      onPress={() => onCestCelleCi(p.id)}
                      accessibilityLabel={`${t('proposer.verification.oui')} : ${p.nom}`}
                      testID={`bouton-cest-celle-ci-${p.id}`}
                    />
                  </View>
                ))}
              </View>
            )}
    </Feuille>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bloc: { gap: 8 },
  ligneTitre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recap: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: rayons.moyen },
  vignette: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: rayons.vignette },
  lieu: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  attente: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  interligne: { lineHeight: 19 },
  proche: { padding: 12, gap: 10, borderRadius: rayons.moyen },
  ligneProche: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  distance: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
