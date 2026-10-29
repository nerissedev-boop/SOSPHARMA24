import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { alerte, distanceMetres, isoUtc, signalerErreur, t, type Coordonnees, ouvrirReglages } from '@/commun/lib';
import { ombres, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  ChampSaisie,
  Ecran,
  EnTete,
  IconeAppareilPhoto,
  IconeBouclier,
  IconeCoche,
  IconeHorloge,
  IconeLieu,
  PiedFixe,
  Texte,
  useRetour,
} from '@/commun/ui';
import { CarteBase, carteDisponible, PointPosition, Repere, type RefCarte } from '@/commun/ui/carte';
import { usePaysCourant, useZoneDetectee } from '@/modules/territoire';

import { PRECISION_MAX_M, usePositionPrecise } from '@/modules/releves/hooks/usePositionPrecise';
import { nouvelIdentifiantReleve } from '@/modules/releves/identifiant';
import { prendrePhoto } from '@/modules/releves/photos';
import type { PhotoLocale } from '@/modules/releves/types';
import { FeuilleVerification } from '../composants/FeuilleVerification';
import { numeroInternational } from '../telephone';
import { useEnvoyerProposition, useVerificationAutour } from '../usePropositions';

const ZOOM = 18;
const HAUTEUR_CARTE = 150;
const HAUTEUR_CARTE_AJUSTEE = 340;

/** Repère vert de la porte (pin + rond blanc), pointe en bas, au centre de la carte. */
function RepereEntree({ taille }: { taille: number }) {
  const { couleurs: c } = useTheme();
  return (
    <Svg width={taille} height={taille * 1.2} viewBox="0 0 100 120">
      <Path d="M50 4C25.7 4 6 23.7 6 48c0 29 44 68 44 68s44-39 44-68C94 23.7 74.3 4 50 4z" fill={c.vert} />
      <Circle cx="50" cy="46" r="16" fill={c.blanc} />
    </Svg>
  );
}

/**
 * 28 Proposer une pharmacie (usager sans compte) : position sur place, façade obligatoire, nom,
 * téléphone facultatif. Rien n'est publié avant la vérification de l'équipe.
 */
function Proposer() {
  const router = useRouter();
  const fermer = useRetour();
  const { couleurs: c, estNuit } = useTheme();
  const { pays } = usePaysCourant();
  const { etat, relancer } = usePositionPrecise();
  const carte = useRef<RefCarte>(null);
  const [identifiant] = useState(nouvelIdentifiantReleve);
  const [centre, setCentre] = useState<Coordonnees | null>(null);
  const [ajustement, setAjustement] = useState(false);
  const [facade, setFacade] = useState<PhotoLocale | null>(null);
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const envoi = useEnvoyerProposition();
  const verification = useVerificationAutour();
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);

  const gps = etat.statut === 'ok' ? { latitude: etat.latitude, longitude: etat.longitude } : null;
  const repere = carteDisponible ? (centre ?? gps) : gps;
  const precision = etat.statut === 'ok' ? etat.precision : null;
  const precisionOk = precision !== null && precision <= PRECISION_MAX_M;
  const zone = useZoneDetectee(repere ? { latitude: Number(repere.latitude.toFixed(4)), longitude: Number(repere.longitude.toFixed(4)) } : null);

  const manques = [
    !precisionOk || !repere ? t('proposer.manquePosition') : null,
    !facade ? t('proposer.manquePhoto') : null,
    nom.trim().length < 2 ? t('proposer.manqueNom') : null,
  ].filter((m): m is string => m !== null);

  const photographier = async () => {
    setPhotoEnCours(true);
    try {
      const r = await prendrePhoto();
      if (r.statut === 'ok') setFacade(r.photo);
      else if (r.statut === 'refusee') {
        alerte(t('proposer.photoTitre'), t('proposer.cameraRefusee'), [
          { text: t('commun.annuler'), style: 'cancel' },
          { text: t('proposer.ouvrirReglages'), onPress: () => void ouvrirReglages() },
        ]);
      }
    } catch (e) {
      signalerErreur(e, { etape: 'photo-proposition' });
      alerte(t('proposer.photoTitre'), t('proposer.photoImpossible'));
    } finally {
      setPhotoEnCours(false);
    }
  };

  /** « Envoyer » : d'abord la feuille de vérification (récapitulatif et pharmacies déjà connues à 100 m). */
  const verifier = () => {
    if (manques.length > 0 || !repere) return;
    setAjustement(false);
    setFeuilleOuverte(true);
    verification.mutate(repere);
  };

  const telephoneInternational = numeroInternational(telephone, pays?.indicatif);

  const envoyer = (doublonsEcartes: string[]) => {
    if (manques.length > 0 || !gps || !repere || precision === null || !facade) return;
    const nomPropre = nom.trim();
    envoi.mutate(
      {
        corps: {
          identifiant,
          latitude: repere.latitude,
          longitude: repere.longitude,
          gps_latitude: gps.latitude,
          gps_longitude: gps.longitude,
          precision_m: precision,
          releve_le: isoUtc(new Date()),
          nom: nomPropre,
          telephone: telephoneInternational,
          doublons_ecartes: doublonsEcartes,
        },
        facade,
      },
      {
        onSuccess: () => {
          setFeuilleOuverte(false);
          router.replace({ pathname: '/proposition/envoyee', params: { nom: nomPropre } });
        },
        // Erreur : la feuille se ferme pour montrer les champs en erreur (ou le message).
        onError: () => setFeuilleOuverte(false),
      },
    );
  };

  const cestCelleCi = (pharmacieId: string) => {
    setFeuilleOuverte(false);
    router.replace({ pathname: '/pharmacie/[id]', params: { id: pharmacieId } });
  };

  const lieu = [
    zone.data ? t('commun.zoneVille', { zone: zone.data.zone.nom, ville: zone.data.ville.nom }) : null,
    precision !== null ? t('releve.precisionCourte', { precision }) : null,
  ]
    .filter(Boolean)
    .join(', ');

  const deplacement = gps && repere ? distanceMetres(gps, repere) : 0;
  const erreurPosition = envoi.erreurs.latitude ?? envoi.erreurs.longitude;

  return (
    <Ecran testID="ecran-proposer">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled" scrollEnabled={!ajustement}>
          <View style={styles.marges}>
            <EnTete titre={t('proposer.titre')} icone="fermer" onRetour={fermer} varianteTitre="titre" />
            <Texte variante="petit" couleur={c.texteSecondaire} style={styles.interligne}>
              {t('proposer.intro')}
            </Texte>
          </View>

          <View style={[styles.carte, { height: ajustement ? HAUTEUR_CARTE_AJUSTEE : HAUTEUR_CARTE, backgroundColor: c.carteFond }]} testID="carte-proposition">
            {gps && carteDisponible ? (
              <CarteBase nuit={estNuit} centreInitial={gps} zoomInitial={ZOOM} refCarte={carte} onVueChange={(v) => setCentre(v.centre)}>
                <Repere id="gps" coordonnees={gps}>
                  <PointPosition taille={18} />
                </Repere>
              </CarteBase>
            ) : null}
            {gps ? (
              <View pointerEvents="none" style={styles.repere} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <RepereEntree taille={34} />
              </View>
            ) : null}

            <View
              style={[styles.pastille, { backgroundColor: c.feuille }, ombres.boutonRond]}
              accessibilityLiveRegion="polite"
              testID="precision-proposition"
            >
              {precision === null ? (
                <ActivityIndicator size="small" color={c.vert} />
              ) : precisionOk ? (
                <IconeCoche size={14} color={c.vert} strokeWidth={3} />
              ) : (
                <IconeHorloge size={14} color={c.rougeTexte} strokeWidth={2.4} />
              )}
              <Texte variante="libelleFort" couleur={precision === null ? c.texteSecondaire : precisionOk ? c.vertTexte : c.rougeTexte}>
                {precision === null
                  ? t('proposer.positionRecherche')
                  : precisionOk
                    ? t('proposer.positionOk', { precision })
                    : t('proposer.positionImprecise', { precision })}
              </Texte>
            </View>

            {gps && carteDisponible ? (
              <Pressable
                onPress={() => {
                  if (ajustement) setAjustement(false);
                  else {
                    setAjustement(true);
                    carte.current?.recentrer(repere ?? gps, ZOOM);
                  }
                }}
                accessibilityRole="button"
                accessibilityHint={ajustement ? undefined : t('proposer.ajusterAide')}
                style={[styles.ajuster, { backgroundColor: c.feuille }, ombres.boutonRond]}
                testID="bouton-ajuster"
              >
                {ajustement ? <IconeCoche size={16} color={c.texte} strokeWidth={2.4} /> : <IconeLieu size={16} color={c.texte} />}
                <Texte variante="libelleFort">{ajustement ? t('proposer.terminer') : t('proposer.ajuster')}</Texte>
              </Pressable>
            ) : null}
          </View>
          {ajustement ? (
            <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.marges}>
              {t('proposer.ajusterAide')}
              {deplacement > 0 ? ` ${t('releve.repereDeplace')} ${t('releve.deplacement', { metres: deplacement })}.` : ''}
            </Texte>
          ) : null}
          {etat.statut === 'refusee' || etat.statut === 'erreur' ? (
            <View style={[styles.marges, styles.alerte]}>
              <Texte variante="petitFort" couleur={c.rougeTexte}>
                {t(etat.statut === 'refusee' ? 'proposer.positionRefusee' : 'releve.positionErreur')}
              </Texte>
              <Bouton
                libelle={t(etat.statut === 'refusee' ? 'proposer.ouvrirReglages' : 'releve.reessayer')}
                icone={etat.statut === 'refusee' ? 'localisation' : 'actualiser'}
                variante="secondaire"
                onPress={() => (etat.statut === 'refusee' ? void ouvrirReglages() : void relancer())}
              />
            </View>
          ) : null}
          {erreurPosition ? (
            <Texte variante="libelleMoyen" couleur={c.rougeTexte} style={styles.marges}>
              {erreurPosition}
            </Texte>
          ) : null}

          <View style={[styles.marges, styles.photo]}>
            <Pressable
              onPress={() => void photographier()}
              accessibilityRole="button"
              accessibilityLabel={facade ? t('proposer.reprendre') : t('proposer.prendre')}
              style={[styles.vignette, { backgroundColor: c.photoFond }]}
              testID="bouton-photo-facade"
            >
              {facade ? <Image source={{ uri: facade.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              {photoEnCours ? (
                <ActivityIndicator color={c.photoTexte} />
              ) : facade ? (
                <View style={[styles.badge, { backgroundColor: c.vert }]}>
                  <IconeCoche size={12} color={c.blanc} strokeWidth={3} />
                  <Texte variante="mini" couleur={c.blanc}>
                    {t('proposer.facade')}
                  </Texte>
                </View>
              ) : (
                <IconeAppareilPhoto size={32} color={c.photoTexte} />
              )}
            </Pressable>
            <View style={styles.texteVignette}>
              <Texte variante="nomPetit">{t('proposer.photoTitre')}</Texte>
              <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.interligneCourt}>
                {t('proposer.photoTexte')}
              </Texte>
              <Bouton
                libelle={facade ? t('proposer.reprendre') : t('proposer.prendre')}
                icone="photo"
                variante="clair"
                hauteur={44}
                tailleIcone={16}
                typo="libelleFort"
                onPress={() => void photographier()}
                style={styles.boutonPhoto}
                testID="bouton-prendre-facade"
              />
            </View>
          </View>
          {envoi.erreurs.photo ? (
            <Texte variante="libelleMoyen" couleur={c.rougeTexte} style={styles.marges}>
              {envoi.erreurs.photo}
            </Texte>
          ) : null}

          <View style={[styles.marges, styles.champs]}>
            <ChampSaisie
              libelle={t('proposer.nom')}
              icone="pharmacie"
              hauteur={48}
              varianteLibelle="petitFort"
              placeholder={t('proposer.nomPlaceholder')}
              value={nom}
              onChangeText={setNom}
              autoCapitalize="words"
              maxLength={150}
              erreur={envoi.erreurs.nom}
              testID="champ-nom"
            />
            <View>
              <ChampSaisie
                libelle={`${t('proposer.telephone')} ${t('proposer.facultatif')}`}
                icone="telephone"
                hauteur={48}
                varianteLibelle="petitFort"
                placeholder={t('proposer.telephonePlaceholder')}
                value={telephone}
                onChangeText={setTelephone}
                keyboardType="phone-pad"
                maxLength={20}
                erreur={envoi.erreurs.telephone}
                testID="champ-telephone"
              />
            </View>
            <View style={styles.note}>
              <IconeBouclier size={16} color={c.vert} />
              <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.flexTexte}>
                {t('proposer.note')}
              </Texte>
            </View>
          </View>
        </ScrollView>
        <PiedFixe>
          <Bouton
            libelle={t('proposer.envoyer')}
            icone="envoyer"
            hauteur={54}
            typo="boutonGrand"
            desactive={manques.length > 0}
            accessibilityHint={manques.length > 0 ? t('proposer.manque', { elements: manques.join(', ') }) : undefined}
            chargement={envoi.isPending}
            onPress={verifier}
            testID="bouton-envoyer-proposition"
          />
          <Texte variante="libelle" couleur={c.texteSecondaire} aligne="center">
            {manques.length > 0 && (facade || nom.trim() !== '') ? t('proposer.manque', { elements: manques.join(', ') }) : t('proposer.surPlace')}
          </Texte>
        </PiedFixe>
      </KeyboardAvoidingView>
      <FeuilleVerification
        visible={feuilleOuverte}
        facade={facade}
        nom={nom.trim()}
        telephone={telephoneInternational}
        lieu={lieu}
        verification={verification.isSuccess ? verification.data : verification.isError ? { proches: [], verifiee: false } : null}
        envoiEnCours={envoi.isPending}
        onModifier={() => setFeuilleOuverte(false)}
        onCestCelleCi={cestCelleCi}
        onEnvoyer={envoyer}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexTexte: { flex: 1, lineHeight: 18 },
  contenu: { paddingTop: 16, paddingBottom: 24, gap: 14 },
  marges: { paddingHorizontal: 20, gap: 4 },
  interligne: { lineHeight: 19 },
  interligneCourt: { lineHeight: 17 },
  carte: { marginHorizontal: 20, overflow: 'hidden' },
  repere: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  pastille: { position: 'absolute', left: 10, top: 10, minHeight: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: rayons.pilule },
  ajuster: { position: 'absolute', right: 10, bottom: 10, minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: rayons.moyen },
  alerte: { gap: 10 },
  photo: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  vignette: { width: 118, height: 96, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: rayons.vignette },
  badge: { position: 'absolute', left: 6, top: 6, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3 },
  texteVignette: { flex: 1, justifyContent: 'center', gap: 4 },
  boutonPhoto: { alignSelf: 'flex-start', paddingHorizontal: 10, marginTop: 2 },
  champs: { gap: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});

export default avecErrorBoundary(Proposer, 'Proposer');
