import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { alerte, t, usePreferences } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import { useMargeBas, avecErrorBoundary, Bouton, Ecran, HiPharmacy, IconeBouclier, Texte } from '@/commun/ui';

import { usePosition } from '../hooks/usePosition';

/** Palette de l'illustration (maquette 02), propre à cet écran. */
const ILLUSTRATION = {
  fond: '#0E5A2C',
  routes: '#156B36',
  routesFines: '#12632F',
  trajet: '#FF5A52',
  quartiers: '#7FB592',
};

function Illustration({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  const { couleurs: c } = useTheme();
  const k = largeur / 390;
  const rond = (x: number, y: number, taille: number, icone: number, couleur: string, opacite = 1) => (
    <View
      style={[
        styles.rond,
        { left: x * k, top: y * k, width: taille, height: taille, borderRadius: taille / 2, backgroundColor: c.blanc, opacity: opacite },
      ]}
    >
      <HiPharmacy size={icone} color={couleur} />
    </View>
  );
  return (
    <View style={{ height: hauteur, backgroundColor: ILLUSTRATION.fond, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={largeur} height={hauteur} viewBox="0 0 390 420" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Path
          d="M-20 70 L410 30 M-20 160 L410 130 M-20 250 L410 230 M-20 340 L410 330 M50 -10 L80 430 M170 -10 L190 430 M290 -10 L310 430"
          stroke={ILLUSTRATION.routes}
          strokeWidth={12}
          fill="none"
        />
        <Path d="M-20 110 L410 90 M110 -10 L130 430 M240 -10 L245 430" stroke={ILLUSTRATION.routesFines} strokeWidth={5} fill="none" />
        <Path d="M196 262 C150 220 170 170 230 150 S320 110 300 50" stroke={ILLUSTRATION.trajet} strokeWidth={3} strokeDasharray="7 7" fill="none" />
      </Svg>
      {rond(282, 30, 40, 26, c.vert)}
      {rond(44, 96, 34, 22, c.rouge, 0.9)}
      {rond(300, 230, 34, 22, c.vert, 0.9)}
      <Texte variante="mini" couleur={ILLUSTRATION.quartiers} style={[styles.quartier, { left: 24 * k, top: 300 * k }]}>
        Cocody
      </Texte>
      <Texte variante="mini" couleur={ILLUSTRATION.quartiers} style={[styles.quartier, { left: 250 * k, top: 300 * k }]}>
        Riviera
      </Texte>
      <View style={[styles.repere, { left: 158 * k, top: 150 * k }]}>
        <Svg width={76} height={96} viewBox="0 0 100 120">
          <Path d="M50 4C25.7 4 6 23.7 6 48c0 29 44 68 44 68s44-39 44-68C94 23.7 74.3 4 50 4z" fill={c.blanc} />
          <Circle cx="50" cy="46" r="17" fill={ILLUSTRATION.fond} />
        </Svg>
        <View style={styles.ombreRepere} />
      </View>
    </View>
  );
}

function Localisation() {
  const margeBas = useMargeBas(8);
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const { width, height } = useWindowDimensions();
  const { actualiser, enCours } = usePosition();
  const marquer = usePreferences((e) => e.marquerLocalisationDemandee);
  const hauteurIllustration = Math.min(420, Math.round(height * 0.5));

  const activer = async () => {
    marquer();
    const p = await actualiser(true);
    if (p) {
      router.replace('/');
    } else {
      alerte(t('localisation.titre'), t('localisation.refusee'), [
        { text: t('commun.ok'), onPress: () => router.push('/zone') },
      ]);
    }
  };

  return (
    <Ecran hautSur={false} barreClaire testID="ecran-localisation">
      <ScrollView contentContainerStyle={[styles.defilement, { paddingBottom: margeBas }]} bounces={false}>
        <Illustration largeur={width} hauteur={hauteurIllustration} />
        <View style={[styles.feuille, { backgroundColor: c.fond, marginTop: -40 }]}>
          <Texte variante="titreEcran" aligne="center" titre style={styles.titre}>
            {t('localisation.titre')}
          </Texte>
          <Texte variante="corps" couleur={c.texteSecondaire} aligne="center">
            {t('localisation.texte')}
          </Texte>
          <View style={styles.boutons}>
            <Bouton
              libelle={t('localisation.activer')}
              icone="localisation"
              onPress={activer}
              chargement={enCours}
              hauteur={54}
              typo="boutonGrand"
              testID="bouton-activer-localisation"
            />
            <Bouton
              libelle={t('localisation.manuel')}
              icone="carte"
              variante="secondaire"
              hauteur={54}
              typo="boutonGrand"
              onPress={() => {
                marquer();
                router.push('/zone');
              }}
              testID="bouton-choisir-zone"
            />
          </View>
          <View style={styles.securite}>
            <IconeBouclier size={18} color={c.vert} strokeWidth={2} />
            <View style={styles.securiteTextes}>
              <Texte variante="petitFort">{t('localisation.securiteTitre')}</Texte>
              <Texte variante="petit" couleur={c.texteSecondaire}>
                {t('localisation.securiteTexte')}
              </Texte>
            </View>
          </View>
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  defilement: { flexGrow: 1 },
  rond: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  quartier: { position: 'absolute' },
  repere: { position: 'absolute', alignItems: 'center' },
  ombreRepere: { width: 30, height: 10, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.25)', marginTop: -4 },
  feuille: { flexGrow: 1, paddingTop: 40, paddingHorizontal: 24, paddingBottom: 32, alignItems: 'stretch', gap: 16 },
  titre: { fontSize: 26, lineHeight: 32 },
  boutons: { gap: 12, marginTop: 12 },
  securite: { marginTop: 'auto', paddingTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  securiteTextes: { gap: 2, flexShrink: 1 },
});

export default avecErrorBoundary(Localisation, 'Localisation');
