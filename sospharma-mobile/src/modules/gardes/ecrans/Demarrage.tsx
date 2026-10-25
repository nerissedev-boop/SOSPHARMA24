import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signalerErreur, t, usePreferences, useSession } from '@/commun/lib';
import { jetonsJour } from '@/commun/theme';
import { avecErrorBoundary, Ecran, HiPharmacy, Logo, Logotype, Texte } from '@/commun/ui';
import { usePays, usePosition, useZoneCourante } from '@/modules/territoire';

import { usePrechargerTour, useVilleSuivie } from '../hooks/useTourEnCours';

const DUREE_MINIMALE = 1400;
/** Halo extérieur du logo (maquette 01). */
const HALO = '#F6FBF8';
const PISTE = '#E3EEE7';

/** 01 Splash : logo, slogan, mise à jour du tour de garde de la semaine. */
function Demarrage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = jetonsJour;
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
      useNativeDriver: false,
    }).start();
  }, [progression]);

  useEffect(() => {
    if (fait.current) return;
    const debut = Date.now();
    const minuterie = setTimeout(async () => {
      if (fait.current) return;
      fait.current = true;
      try {
        if (villeId) await precharger(villeId, point);
      } catch (e) {
        signalerErreur(e, { etape: 'demarrage' });
      }
      Animated.timing(progression, { toValue: 1, duration: 250, useNativeDriver: false }).start(() => {
        terminer();
        router.replace(!localisationDemandee && !zone ? '/localisation' : '/');
      });
    }, Math.max(0, DUREE_MINIMALE - (Date.now() - debut)));
    return () => clearTimeout(minuterie);
    // Lancé une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const largeur = progression.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Ecran fond={c.fond} barreClaire={false} testID="ecran-demarrage">
      <View style={styles.centre}>
        <View style={[styles.halo, { backgroundColor: HALO }]}>
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
        <View style={[styles.piste, { backgroundColor: PISTE }]}>
          <Animated.View style={[styles.barre, { width: largeur, backgroundColor: c.vert }]} />
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
  barre: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default avecErrorBoundary(Demarrage, 'Demarrage');
