import { useIsRestoring } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bornesCourtes, t, usePreferences, useSession } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { avecErrorBoundary, ChargementCroix, Ecran, Logo, Logotype, Texte } from '@/commun/ui';
import { usePays, usePosition, useZoneCourante } from '@/modules/territoire';

import { usePrechargerTour, useTourEnCours, useVilleSuivie } from '../hooks/useTourEnCours';

/** La croix ne bat que si la lecture du cache dépasse ce délai : sinon, rien ne bouge. */
const DELAI_CROIX_MS = 300;

/**
 * 01 Démarrage (refonte v2) : le logo, le nom, ce que fait l'app et la ville, puis l'état réel du
 * tour enregistré. Ni slogan ni fausse barre de progression : l'écran n'attend jamais le réseau,
 * seulement la lecture du cache du téléphone. La mise à jour du tour se fait en arrière-plan.
 * Suit le thème (nuit : fond sombre, rien d'éblouissant).
 */
function Demarrage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs: c } = useTheme();
  const restauration = useIsRestoring();
  const terminer = useSession((e) => e.terminerDemarrage);
  const localisationDemandee = usePreferences((e) => e.localisationDemandee);
  const { zone, point } = useZoneCourante();
  const villeId = useVilleSuivie();
  const precharger = usePrechargerTour();
  const { tour, fuseau } = useTourEnCours();
  usePays();
  usePosition();
  const fait = useRef(false);
  const [lent, setLent] = useState(false);

  useEffect(() => {
    const minuteur = setTimeout(() => setLent(true), DELAI_CROIX_MS);
    return () => clearTimeout(minuteur);
  }, []);

  useEffect(() => {
    if (restauration || fait.current) return;
    fait.current = true;
    // Mise à jour en fond : l'Accueil affiche le tour enregistré, ou son squelette au premier lancement.
    if (villeId) void precharger(villeId, point).mise;
    terminer();
    router.replace(!localisationDemandee && !zone ? '/localisation' : '/');
    // Lancé une seule fois, dès que le cache du téléphone est lu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restauration]);

  const bornes = tour ? bornesCourtes(tour.debut, tour.fin, fuseau) : null;

  return (
    <Ecran fond={c.fond} testID="ecran-demarrage">
      <View style={styles.centre}>
        <Logo largeur={92} variante="degrade" decoratif />
        <Logotype />
        <Texte variante="corps" couleur={c.texteSecondaire} aligne="center">
          {t('demarrage.role')}
          {zone?.villeNom ? `\n${zone.villeNom}` : null}
        </Texte>
      </View>
      <View style={[styles.pied, { bottom: 56 + insets.bottom }]} accessibilityLiveRegion="polite">
        {lent && restauration ? <ChargementCroix taille={18} halo={false} testID="demarrage-croix" /> : null}
        <Texte variante="petit" couleur={c.texteSecondaire} aligne="center" style={styles.message}>
          {bornes ? `${t('demarrage.tourEnregistre', bornes)}\n${t('demarrage.arrierePlan')}` : t('demarrage.miseAJour')}
        </Texte>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 28 },
  pied: { position: 'absolute', left: 28, right: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  message: { flexShrink: 1 },
});

export default avecErrorBoundary(Demarrage, 'Demarrage');
