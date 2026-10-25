import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { distanceKm, t } from '@/commun/lib';
import { ombres, useTheme } from '@/commun/theme';
import { avecErrorBoundary, DUREES, Ecran, EnTete, HiPharmacy, Texte, useAppui, useNavigationOnglets, usePulsation } from '@/commun/ui';
import { useTourEnCours } from '@/modules/gardes';
import { NumerosUrgence, usePaysCourant } from '@/modules/territoire';

const PressableAnime = Animated.createAnimatedComponent(Pressable);

/** 08 Urgence : gros bouton SOS, garde la plus proche, numéros d'urgence du pays. */
function Urgence() {
  const router = useRouter();
  const allerOnglet = useNavigationOnglets();
  const { couleurs: c } = useTheme();
  const { width } = useWindowDimensions();
  const { pays } = usePaysCourant();
  const { tour } = useTourEnCours();
  const plusProche = [...(tour?.pharmacies ?? [])]
    .filter((p) => p.statut === 'garde')
    .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))[0];
  const echelle = Math.min(1, (width - 40) / 300);
  // Les deux anneaux « respirent » autour du bouton SOS, l'intérieur avec un léger retard.
  const exterieur = usePulsation(true, { duree: DUREES.respiration, allerRetour: true });
  const interieur = usePulsation(true, { duree: DUREES.respiration, delai: 250, allerRetour: true });
  const styleExterieur = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(exterieur.valeur.get(), [0, 1], [1, 1.06]) }] }));
  const styleInterieur = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(interieur.valeur.get(), [0, 1], [1, 1.05]) }] }));
  const appuiSos = useAppui(0.95);

  return (
    <Ecran fond={c.rouge} barreClaire testID="ecran-urgence">
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.entete}>
          <EnTete titre={t('urgence.titre')} centre varianteTitre="titreBarre" couleur={c.blanc} onRetour={() => allerOnglet('accueil')} />
        </View>

        <View style={[styles.cercles, { transform: [{ scale: echelle }] }]}>
          <View style={styles.cercle}>
            {/* Anneaux en fond, animés à part : le bouton SOS lui-même ne bouge pas tant qu'on ne le touche pas. */}
            <Animated.View
              pointerEvents="none"
              style={[styles.anneau, { width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.08)' }, styleExterieur]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.anneau, { width: 248, height: 248, borderRadius: 124, backgroundColor: 'rgba(255,255,255,0.12)' }, styleInterieur]}
            />
            <View style={[styles.cercle, { width: 300, height: 300 }]}>
              <PressableAnime
                testID="bouton-sos"
                onPress={() => allerOnglet('garde')}
                onPressIn={appuiSos.onPressIn}
                onPressOut={appuiSos.onPressOut}
                accessibilityRole="button"
                accessibilityLabel={`${t('urgence.sos')}, ${t('urgence.sosTexte')}`}
                style={[styles.cercle, styles.sos, ombres.sos, { backgroundColor: '#FFFFFF' }, appuiSos.style]}
              >
                <HiPharmacy size={40} color={c.rouge} />
                <Texte style={styles.texteSos} couleur={c.rouge}>
                  {t('urgence.sos')}
                </Texte>
                <Texte variante="libelle" couleur="#1A1A1A" aligne="center" style={styles.texteSousSos}>
                  {t('urgence.sosTexte')}
                </Texte>
              </PressableAnime>
            </View>
          </View>
        </View>

        {plusProche ? (
          <Pressable
            testID="urgence-plus-proche"
            onPress={() => router.push({ pathname: '/pharmacie/[id]', params: { id: plusProche.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${t('urgence.plusProche')} : ${plusProche.nom}, ${distanceKm(plusProche.distance_m)}`}
            style={({ pressed }) => [styles.plusProche, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[styles.rond, { backgroundColor: '#FFFFFF' }]}>
              <HiPharmacy size={26} color={c.rouge} />
            </View>
            <View style={styles.flex}>
              <Texte variante="libelle" couleur={c.blanc}>
                {t('urgence.plusProche')}
              </Texte>
              <Texte variante="nom" couleur={c.blanc}>
                {plusProche.nom}
              </Texte>
            </View>
            <View style={styles.droite}>
              <Texte variante="nomGrand" couleur={c.blanc} style={styles.gras}>
                {distanceKm(plusProche.distance_m)}
              </Texte>
              {plusProche.marche_min !== null ? (
                <Texte variante="libelle" couleur={c.blanc}>
                  {t('urgence.aPied', { minutes: plusProche.marche_min })}
                </Texte>
              ) : null}
            </View>
          </Pressable>
        ) : null}

        {pays && pays.urgences.length > 0 ? (
          <View style={[styles.carte, { backgroundColor: c.feuille }]}>
            <Texte variante="sectionPetite" titre>
              {t('urgence.besoin')}
            </Texte>
            <NumerosUrgence urgences={pays.urgences} />
          </View>
        ) : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  contenu: { paddingBottom: 16, flexGrow: 1, gap: 18 },
  entete: { paddingTop: 16, paddingHorizontal: 20 },
  cercles: { alignItems: 'center', marginTop: 26, marginBottom: 18 },
  cercle: { alignItems: 'center', justifyContent: 'center' },
  anneau: { position: 'absolute' },
  sos: { width: 196, height: 196, borderRadius: 98, gap: 6 },
  texteSos: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 48, lineHeight: 50 },
  texteSousSos: { maxWidth: 140, lineHeight: 16 },
  plusProche: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rond: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  droite: { alignItems: 'flex-end', gap: 2 },
  gras: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  carte: { marginHorizontal: 16, marginTop: 'auto', padding: 16, gap: 12 },
});

export default avecErrorBoundary(Urgence, 'Urgence');
