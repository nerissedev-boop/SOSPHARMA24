import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  alerte,
  commencerVisite,
  distanceKm,
  estimerTrajet,
  marquerSortieVersAutreApp,
  ouvrirNavigation,
  signalerErreur,
  t,
  type AppNavigation,
  type ModeTrajet,
} from '@/commun/lib';
import { ombres, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  BoutonIcone,
  Ecran,
  EnTete,
  HiPharmacy,
  HiPhone,
  HiVespaMotorcycle,
  HiWalking,
  IconeInverser,
  IconeVoiture,
  PastilleStatut,
  Texte,
  useRetour,
} from '@/commun/ui';
import { CarteBase, PointPosition, Repere, Trace } from '@/commun/ui/carte';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { messageChauffeur } from '../chauffeur';
import { useActionsPharmacie } from '../hooks/useActions';
import { useLibelleStatut, usePharmacie, useTrajetVoiture } from '../hooks/usePharmacies';

const MODES: ModeTrajet[] = ['voiture', 'moto', 'pied'];

/** 07 Itinéraire : estimation des trajets, puis ouverture de l'app de navigation choisie. */
function Itineraire() {
  const retour = useRetour();
  const insets = useSafeAreaInsets();
  const { couleurs: c, estNuit } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fiche } = usePharmacie(id ?? '');
  const trajet = useTrajetVoiture(id ?? '');
  const { point } = useZoneCourante();
  const { pays } = usePaysCourant();
  const libelleStatut = useLibelleStatut();
  const actions = useActionsPharmacie();
  const [mode, setMode] = useState<ModeTrajet>('voiture');
  const [inverse, setInverse] = useState(false);
  const [hauteurEnTete, setHauteurEnTete] = useState(150);

  if (!fiche) {
    return (
      <Ecran>
        <ActivityIndicator color={c.vert} style={styles.chargement} />
      </Ecran>
    );
  }

  const destination = { latitude: fiche.latitude, longitude: fiche.longitude };
  const distance = fiche.distance_m ?? 0;
  // Voiture : la durée Google avec le trafic quand le serveur l'a, sinon l'estimation par la distance.
  const voitureGoogle = trajet.data?.voiture ?? null;
  const estimation = (m: ModeTrajet) =>
    m === 'voiture' && voitureGoogle ? { minutes: voitureGoogle.minutes, distanceM: voitureGoogle.distance_m } : estimerTrajet(distance, m);
  const choisi = estimation(mode);
  const milieu = point
    ? { latitude: (point.latitude + destination.latitude) / 2, longitude: (point.longitude + destination.longitude) / 2 }
    : destination;

  const demarrer = () => {
    const origine = inverse ? destination : (point ?? undefined);
    const cible = inverse && point ? point : destination;
    const ouvrir = (app: AppNavigation) => {
      if (!inverse) commencerVisite({ id: fiche.id, nom: fiche.nom });
      void ouvrirNavigation(app, cible, mode, origine, fiche.nom);
    };
    alerte(t('itineraire.ouvrirAvec'), t('itineraire.ouvrirAvecTexte'), [
      { text: t('itineraire.googleMaps'), onPress: () => ouvrir('google') },
      ...(Platform.OS === 'ios' ? [{ text: t('itineraire.plans'), onPress: () => ouvrir('plans') }] : []),
      { text: t('itineraire.yango'), onPress: () => ouvrir('yango') },
      { text: t('itineraire.autreApp'), onPress: () => ouvrir('systeme') },
      { text: t('commun.annuler'), style: 'cancel' },
    ]);
  };

  // Taxi ou proche qui conduit : adresse, commune et lien de position, par WhatsApp ou SMS.
  const envoyerAuChauffeur = async () => {
    try {
      commencerVisite({ id: fiche.id, nom: fiche.nom });
      marquerSortieVersAutreApp();
      await Share.share({ message: messageChauffeur(fiche, pays?.indicatif) });
    } catch (e) {
      signalerErreur(e, { etape: 'envoi-chauffeur' });
    }
  };

  const ligneDepart = (
    <View style={styles.ligneTrajet} key="depart">
      <View style={[styles.pointBleu, { backgroundColor: c.bleuPosition, shadowColor: c.bleuPosition }]} />
      <Texte variante="texte">{t('itineraire.maPosition')}</Texte>
    </View>
  );
  const ligneArrivee = (
    <View style={styles.ligneTrajet} key="arrivee">
      <HiPharmacy size={20} color={c.vert} />
      <Texte variante="corpsFort" style={styles.texte14} numberOfLines={1}>
        {fiche.nom}
      </Texte>
    </View>
  );

  const icone = (m: ModeTrajet, actif: boolean): ReactNode => {
    const couleur = actif ? c.vert : c.fermeIcone;
    if (m === 'voiture') return <IconeVoiture size={24} color={couleur} />;
    if (m === 'moto') return <HiVespaMotorcycle size={24} color={couleur} />;
    return <HiWalking size={24} color={couleur} />;
  };

  return (
    <Ecran hautSur={false} fond={c.carteFond} testID="ecran-itineraire">
      <CarteBase nuit={estNuit} centreInitial={milieu} zoomInitial={15} marges={{ top: hauteurEnTete, bottom: 280 }}>
        {point ? <Trace id="trajet" points={[point, destination]} couleur={c.vert} contour={c.carteRoute} /> : null}
        {point ? (
          <Repere id="depart" coordonnees={point}>
            <PointPosition taille={24} />
          </Repere>
        ) : null}
        <Repere id="arrivee" coordonnees={destination}>
          <View style={[ombres.marqueurSelection, { borderRadius: 25 }]}>
            <PastilleStatut statut={fiche.statut} taille={50} tailleIcone={30} />
          </View>
        </Repere>
        <Repere id="duree" coordonnees={milieu}>
          <View style={[styles.etiquetteDuree, { backgroundColor: c.etiquetteSelection }]}>
            <Texte variante="petitFort" couleur={c.etiquetteSelectionTexte} style={styles.gras}>
              {t('commun.min', { valeur: choisi.minutes })}
            </Texte>
            <Texte variante="petit" couleur={c.etiquetteSelectionTexte} style={styles.opaque}>
              {distanceKm(choisi.distanceM)}
            </Texte>
          </View>
        </Repere>
      </CarteBase>

      <View
        onLayout={(e) => setHauteurEnTete(e.nativeEvent.layout.height)}
        style={[styles.enTete, { backgroundColor: c.enTeteCarte, paddingTop: insets.top + 16 }, !estNuit && ombres.enTete]}
      >
        <EnTete titre={t('itineraire.titre')} onRetour={retour} varianteTitre="titreBarre" />
        <View style={styles.trajet}>
          <View style={[styles.boiteTrajet, { backgroundColor: c.surface }]}>{inverse ? [ligneArrivee, ligneDepart] : [ligneDepart, ligneArrivee]}</View>
          <BoutonIcone accessibilityLabel={t('itineraire.inverser')} rond fond={c.surface} onPress={() => setInverse((v) => !v)}>
            <IconeInverser size={20} color={c.texte} />
          </BoutonIcone>
        </View>
      </View>

      <View style={[styles.fiche, { backgroundColor: c.feuille, bottom: 20 + insets.bottom }, ombres.fiche]}>
        <View style={styles.ligneNom}>
          <View style={styles.flex}>
            <Texte variante="nom">{fiche.nom}</Texte>
            <Texte variante="petitFort" couleur={fiche.statut === 'garde' ? c.rougeTexteFort : fiche.statut === 'ouverte' ? c.vertTexte : c.texteTertiaire}>
              {libelleStatut(fiche)}
            </Texte>
          </View>
          <BoutonIcone accessibilityLabel={t('itineraire.appelerPharmacie')} rond fond={c.pastilleAction} onPress={() => actions.appeler(fiche)}>
            <HiPhone size={20} color={c.pastilleActionIcone} />
          </BoutonIcone>
        </View>
        <View style={styles.modes} accessibilityRole="radiogroup">
          {MODES.map((m) => {
            const e = estimation(m);
            const actif = m === mode;
            const libelle = t(`itineraire.${m}`);
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ checked: actif }}
                accessibilityLabel={t('itineraire.estimation', { mode: libelle, minutes: e.minutes, distance: distanceKm(e.distanceM) })}
                style={[styles.mode, { backgroundColor: actif ? c.vertClair : c.surface }]}
              >
                {icone(m, actif)}
                <Texte variante="libelleMoyen" couleur={c.texteSecondaire}>
                  {libelle}
                </Texte>
                <Texte variante="distanceGrande" couleur={actif ? c.vertTexte : c.texte}>
                  {t('commun.min', { valeur: e.minutes })}
                </Texte>
                <Texte variante="libelle" couleur={c.texteSecondaire}>
                  {distanceKm(e.distanceM)}
                </Texte>
                {m === 'voiture' && voitureGoogle ? (
                  <Texte variante="libelleFort" couleur={c.vertTexte} testID="trajet-trafic">
                    {t('itineraire.avecTrafic')}
                  </Texte>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Bouton libelle={t('itineraire.demarrer')} icone="naviguer" onPress={demarrer} testID="bouton-demarrer" />
        <Bouton
          libelle={t('itineraire.envoyerChauffeur')}
          variante="clair"
          typo="boutonPetit"
          hauteur={46}
          onPress={() => void envoyerAuChauffeur()}
          testID="bouton-chauffeur"
        />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  chargement: { marginTop: 80 },
  enTete: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  trajet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  boiteTrajet: { flex: 1, borderRadius: rayons.moyen },
  ligneTrajet: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  pointBleu: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 3, shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } },
  texte14: { fontSize: 14, flex: 1 },
  etiquetteDuree: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  gras: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  opaque: { opacity: 0.85 },
  fiche: { position: 'absolute', left: 12, right: 12, padding: 16, gap: 14, borderRadius: rayons.grandeCarte },
  ligneNom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, padding: 10, gap: 4 },
});

export default avecErrorBoundary(Itineraire, 'Itineraire');
