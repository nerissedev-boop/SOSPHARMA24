import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signalerErreur, t, usePreferences, useSession } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { avecErrorBoundary, Ecran, HiPharmacy, Logo, Logotype, Texte } from '@/commun/ui';
import { usePays, usePosition, useZoneCourante } from '@/modules/territoire';

import { usePrechargerTour, useVilleSuivie } from '../hooks/useTourEnCours';

/**
 * 01 Splash : logo, slogan, mise à jour du tour de garde de la semaine.
 * Aucune attente imposée, même au premier lancement : quelqu'un peut ouvrir l'app en urgence.
 * Suit le thème (nuit : fond sombre, rien d'éblouissant). La barre avance par `scaleX`, sur le fil natif.
 */
function Demarrage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs: c } = useTheme();
  const [progression] = useState(() => new Animated.Value(0));
  const terminer = useSession((e) => e.terminerDemarrage);
  const localisationDemandee = usePreferences((e) => e.localisationDemandee);
  const { zone, point } = useZoneCourante();
  const villeId = useVilleSuivie();
  const precharger = usePrechargerTour();
  usePays();
  usePosition();
  const fait = useRef(false);

  useEffect(() => {
    Animated.timing(progression, {
      toValue: 0.62,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progression]);

  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    (async () => {
      try {
        if (villeId) {
          const { enCache, mise } = precharger(villeId, point);
          if (!enCache) await mise;
        }
      } catch (e) {
        signalerErreur(e, { etape: 'demarrage' });
      }
      Animated.timing(progression, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => {
        terminer();
        router.replace(!localisationDemandee && !zone ? '/localisation' : '/');
      });
    })();
    // Lancé une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ecran fond={c.fond} testID="ecran-demarrage">
      <View style={styles.centre}>
        <View style={[styles.halo, { backgroundColor: c.surface2 }]}>
          <View style={[styles.cercle, { backgroundColor: c.vertClair }]}>
            <Logo largeur={150} variante="degrade" decoratif />
          </View>
        </View>
        <View style={styles.logotype}>
          <Logotype />
        </View>
        <View style={styles.slogan}>
          <Texte variante="corps" couleur={c.texteSecondaire} style={styles.texte16}>
            {t('demarrage.slogan')}
          </Texte>
          <Texte variante="nomGrand" couleur={c.rouge}>
            {t('demarrage.disponibilite')}
          </Texte>
        </View>
      </View>
      <View style={[styles.pied, { bottom: 44 + insets.bottom }]} accessibilityRole="progressbar" accessibilityLabel={t('demarrage.miseAJour')}>
        <View style={[styles.piste, { backgroundColor: c.etapeInactive }]}>
          <Animated.View style={[styles.barre, { backgroundColor: c.vert, transform: [{ scaleX: progression }] }]} />
        </View>
        <View style={styles.message}>
          <HiPharmacy size={20} color={c.vert} />
          <Texte variante="petit" couleur={c.texteSecondaire}>
            {t('demarrage.miseAJour')}
          </Texte>
        </View>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  halo: { width: 316, height: 316, borderRadius: 158, alignItems: 'center', justifyContent: 'center' },
  cercle: { width: 260, height: 260, borderRadius: 130, alignItems: 'center', justifyContent: 'center' },
  logotype: { marginTop: 0 },
  slogan: { alignItems: 'center', gap: 6 },
  texte16: { fontSize: 16 },
  pied: { position: 'absolute', left: 40, right: 40, alignItems: 'center', gap: 12, paddingVertical: 8 },
  piste: { alignSelf: 'stretch', height: 4, overflow: 'hidden' },
  barre: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transformOrigin: 'left' },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default avecErrorBoundary(Demarrage, 'Demarrage');
