import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { distanceMetres, t, type Coordonnees, ouvrirReglages } from '@/commun/lib';
import { ombres, rayons, useTheme } from '@/commun/theme';
import { useMargeBas, avecErrorBoundary, Bouton, BoutonIcone, Ecran, IconeCoche, IconeHorloge, IconeViseur, Texte, useRetour } from '@/commun/ui';
import { CarteBase, carteDisponible, PointPosition, Repere, type RefCarte } from '@/commun/ui/carte';
import { usePharmacie } from '@/modules/pharmacies';
import { useZoneDetectee } from '@/modules/territoire';

import { useBrouillonReleve } from '../brouillon';
import { EnTeteReleve } from '../composants/EnTeteReleve';
import { PRECISION_MAX_M, usePositionPrecise } from '../hooks/usePositionPrecise';

const ZOOM = 18;

/** Repère vert de la porte (pin + rond blanc), pointe en bas, fixé au centre de la carte. */
function RepereEntree() {
  const { couleurs: c } = useTheme();
  return (
    <Svg width={48} height={58} viewBox="0 0 100 120">
      <Path d="M50 4C25.7 4 6 23.7 6 48c0 29 44 68 44 68s44-39 44-68C94 23.7 74.3 4 50 4z" fill={c.vert} />
      <Circle cx="50" cy="46" r="16" fill={c.blanc} />
    </Svg>
  );
}

/** 24 Relevé, étape 1 : position haute précision, repère ajustable, refus au-delà de 30 m. */
function Position() {
  const margeBas = useMargeBas(16);
  const router = useRouter();
  const fermer = useRetour();
  const insets = useSafeAreaInsets();
  const { couleurs: c, estNuit } = useTheme();
  const { pharmacie } = useLocalSearchParams<{ pharmacie?: string }>();
  const brouillon = useBrouillonReleve();
  const { fiche } = usePharmacie(pharmacie ?? '', Boolean(pharmacie));
  const { etat, relancer } = usePositionPrecise();
  const carte = useRef<RefCarte>(null);
  const [centre, setCentre] = useState<Coordonnees | null>(null);
  const [hauteurs, setHauteurs] = useState({ ecran: 0, haut: 0, bas: 0 });

  // Mise à jour depuis une fiche : le brouillon part des informations connues.
  const demarrer = brouillon.demarrer;
  const dejaDemarre = brouillon.depuisFiche && brouillon.pharmacieId === pharmacie;
  useEffect(() => {
    if (pharmacie && fiche && !dejaDemarre) demarrer(fiche);
  }, [pharmacie, fiche, dejaDemarre, demarrer]);

  const gps = etat.statut === 'ok' ? { latitude: etat.latitude, longitude: etat.longitude } : null;
  const repere = carteDisponible ? (centre ?? gps) : gps;
  const ajustement = gps && repere ? distanceMetres(gps, repere) : 0;
  const precision = etat.statut === 'ok' ? etat.precision : null;
  const precisionOk = precision !== null && precision <= PRECISION_MAX_M;
  const zone = useZoneDetectee(repere ? { latitude: Number(repere.latitude.toFixed(4)), longitude: Number(repere.longitude.toFixed(4)) } : null);
  const commune = zone.data ? t('commun.zoneVille', { zone: zone.data.zone.nom, ville: zone.data.ville.nom }) : zone.isFetching ? '…' : t('releve.communeInconnue');

  const valider = () => {
    if (!repere || precision === null || !precisionOk) return;
    brouillon.definirPosition(
      { latitude: repere.latitude, longitude: repere.longitude, precision_m: precision, ajustement_m: ajustement },
      zone.data ? { id: zone.data.zone.id, nom: zone.data.zone.nom, ville: zone.data.ville.nom } : null,
    );
    router.push(brouillon.depuisFiche ? '/releve/photos' : '/releve/doublons');
  };

  const zoneVisible = hauteurs.ecran - hauteurs.haut - hauteurs.bas;
  const hautRepere = hauteurs.haut + zoneVisible / 2 - 58;

  return (
    <Ecran hautSur={false} fond={c.carteFond} testID="ecran-releve-position">
      <View style={StyleSheet.absoluteFill} onLayout={(e) => setHauteurs((h) => ({ ...h, ecran: e.nativeEvent.layout.height }))}>
        {gps ? (
          <CarteBase
            nuit={estNuit}
            centreInitial={gps}
            zoomInitial={ZOOM}
            refCarte={carte}
            marges={{ top: hauteurs.haut, bottom: hauteurs.bas }}
            onVueChange={(v) => setCentre(v.centre)}
          >
            <Repere id="gps" coordonnees={gps}>
              <PointPosition taille={22} />
            </Repere>
          </CarteBase>
        ) : null}
      </View>

      {gps && hauteurs.ecran > 0 ? (
        <View pointerEvents="none" style={[styles.repere, { top: hautRepere }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <RepereEntree />
        </View>
      ) : null}

      <View
        style={[styles.haut, { paddingTop: insets.top + 16, backgroundColor: c.fond }, !estNuit && ombres.enTete]}
        onLayout={(e) => setHauteurs((h) => ({ ...h, haut: e.nativeEvent.layout.height }))}
      >
        <EnTeteReleve etape={1} titre={t(brouillon.type === 'mise_a_jour' ? 'releve.titreMiseAJour' : 'releve.titre')} icone="fermer" onRetour={fermer} />
        <View style={styles.consigne}>
          <Texte variante="section" titre>
            {t('releve.positionTitre')}
          </Texte>
          <Texte variante="petit" couleur={c.texteSecondaire} style={styles.interligne}>
            {t('releve.positionTexte')}
          </Texte>
        </View>
      </View>

      {gps ? (
        <BoutonIcone
          accessibilityLabel={t('releve.recentrer')}
          rond
          taille={48}
          fond={c.feuille}
          onPress={() => carte.current?.recentrer(gps, ZOOM)}
          style={[styles.recentrer, { bottom: hauteurs.bas + 16 }, ombres.boutonRond]}
        >
          <IconeViseur size={22} color={c.bleuPosition} />
        </BoutonIcone>
      ) : null}

      <View
        style={[styles.bas, { paddingBottom: margeBas, backgroundColor: c.fond }, !estNuit && ombres.barre]}
        onLayout={(e) => setHauteurs((h) => ({ ...h, bas: e.nativeEvent.layout.height }))}
      >
        {etat.statut === 'refusee' || etat.statut === 'erreur' ? (
          <>
            <Texte variante="corpsFort">{t(etat.statut === 'refusee' ? 'releve.positionRefusee' : 'releve.positionErreur')}</Texte>
            <Bouton
              libelle={t(etat.statut === 'refusee' ? 'releve.ouvrirReglages' : 'releve.reessayer')}
              icone={etat.statut === 'refusee' ? 'localisation' : 'actualiser'}
              hauteur={54}
              typo="boutonGrand"
              onPress={() => (etat.statut === 'refusee' ? void ouvrirReglages() : void relancer())}
            />
          </>
        ) : (
          <>
            <View style={styles.statut} accessibilityLiveRegion="polite">
              <View style={[styles.rondStatut, { backgroundColor: precision === null ? c.surface : precisionOk ? c.vertClair : c.rougeClair }]}>
                {precision === null ? (
                  <ActivityIndicator color={c.vert} />
                ) : precisionOk ? (
                  <IconeCoche size={22} color={c.vert} strokeWidth={2.4} />
                ) : (
                  <IconeHorloge size={22} color={c.rougeTexte} strokeWidth={2.2} />
                )}
              </View>
              <View style={styles.flex}>
                <Texte variante="nomGrand" testID="precision-releve">
                  {precision === null ? t('releve.recherchePosition') : t('releve.precision', { precision })}
                </Texte>
                <Texte variante="petitFort" couleur={precision === null ? c.texteSecondaire : precisionOk ? c.vertTexte : c.rougeTexte}>
                  {precision === null ? t('releve.patientez') : precisionOk ? t('releve.precisionBonne') : t('releve.precisionInsuffisante')}
                </Texte>
              </View>
            </View>
            <View style={styles.tuiles}>
              <View style={[styles.tuile, { backgroundColor: c.surface }]}>
                <Texte variante="libelle" couleur={c.texteSecondaire}>
                  {t('releve.communeDetectee')}
                </Texte>
                <Texte variante="nomPetit" numberOfLines={1}>
                  {repere ? commune : '…'}
                </Texte>
              </View>
              <View style={[styles.tuile, { backgroundColor: c.surface }]}>
                <Texte variante="libelle" couleur={c.texteSecondaire}>
                  {t('releve.repereDeplace')}
                </Texte>
                <Texte variante="nomPetit">{t('releve.deplacement', { metres: ajustement })}</Texte>
              </View>
            </View>
            <Bouton
              libelle={t('releve.validerPosition')}
              icone="valider"
              hauteur={54}
              typo="boutonGrand"
              desactive={!precisionOk || !repere}
              onPress={valider}
              testID="bouton-valider-position"
            />
            <Texte variante="libelle" couleur={c.texteSecondaire} aligne="center">
              {t('releve.conseilPrecision', { max: PRECISION_MAX_M })}
            </Texte>
          </>
        )}
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  interligne: { lineHeight: 19 },
  haut: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  consigne: { gap: 4 },
  repere: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  recentrer: { position: 'absolute', right: 16 },
  bas: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 20, gap: 14 },
  statut: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rondStatut: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tuiles: { flexDirection: 'row', gap: 8 },
  tuile: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 2, borderRadius: rayons.moyen },
});

export default avecErrorBoundary(Position, 'RelevePosition');
