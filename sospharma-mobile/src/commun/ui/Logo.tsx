import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { t } from '../lib/i18n';
import { jetonsJour } from '../theme/jetons';
import { policeTitre } from '../theme/typographie';
import { Texte } from './Texte';

const PIN = 'M50 4C25.7 4 6 23.7 6 48c0 29 44 68 44 68s44-39 44-68C94 23.7 74.3 4 50 4z';
const CROIX = 'M41 22h18v17h17v18H59v17H41V57H24V39h17z';

type Props = {
  /** Largeur en px (hauteur = largeur × 1,2). */
  largeur?: number;
  /**
   * standard : pin vert, croix blanche, badge rouge (en-têtes) ;
   * degrade : pin en dégradé vert (splash, charte) ;
   * inverse : pin blanc, croix verte (en-tête rouge de l'écran Garde, icône d'app).
   */
  variante?: 'standard' | 'degrade' | 'inverse';
  /** Couleur du badge 24 : #D32F2F dans les en-têtes, #E53935 sur le splash. */
  couleurBadge?: string;
  decoratif?: boolean;
};

/** Logo SOS Pharma 24 : pin + croix + pastille « 24 » (SVG des maquettes). */
export function Logo({ largeur = 28, variante = 'standard', couleurBadge, decoratif = false }: Props) {
  const c = jetonsJour;
  const pin = variante === 'inverse' ? c.blanc : variante === 'degrade' ? 'url(#pinDegrade)' : c.vert;
  const croix = variante === 'inverse' ? c.vert : c.blanc;
  const badge = couleurBadge ?? (variante === 'degrade' ? c.rougeVif : c.rouge);
  return (
    <Svg
      width={largeur}
      height={largeur * 1.2}
      viewBox="0 0 100 120"
      accessible={!decoratif}
      accessibilityRole={decoratif ? undefined : 'image'}
      accessibilityLabel={decoratif ? undefined : t('commun.marque')}
    >
      {variante === 'degrade' ? (
        <Defs>
          <LinearGradient id="pinDegrade" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.vertDegradeClair} />
            <Stop offset="1" stopColor={c.vertFonce} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Path d={PIN} fill={pin} />
      <Path d={CROIX} fill={croix} />
      <Circle cx="78" cy="76" r="19" fill={badge} stroke="#FFFFFF" strokeWidth={variante === 'degrade' ? 4 : 5} />
      <SvgText x="78" y="83" textAnchor="middle" fontFamily="PlusJakartaSans_800ExtraBold" fontWeight="800" fontSize="19" fill="#FFFFFF">
        24
      </SvgText>
    </Svg>
  );
}

/** Logotype empilé du splash : « SOS » rouge, « Pharma » vert + « 24 » rouge. */
export function Logotype({ tailleSos = 52, taillePharma = 44 }: { tailleSos?: number; taillePharma?: number }) {
  const c = jetonsJour;
  return (
    <View style={styles.logotype} accessible accessibilityRole="header" accessibilityLabel={t('commun.marque')}>
      <Texte style={{ fontFamily: policeTitre(800), fontSize: tailleSos, lineHeight: tailleSos * 1.05, letterSpacing: -1 }} couleur={c.rougeVif}>
        SOS
      </Texte>
      {/* Chaque morceau porte la même hauteur de ligne que le mot : sans elle, ils reprenaient
          celle du style de texte courant (≈ 22) et le haut des lettres était coupé sur Android. */}
      <Texte style={[styles.pharma, { fontSize: taillePharma, lineHeight: taillePharma * 1.3 }]}>
        <Texte style={[styles.pharma, { fontSize: taillePharma, lineHeight: taillePharma * 1.3 }]} couleur={c.vert}>
          Pharma
        </Texte>
        <Texte style={[styles.pharma, { fontSize: taillePharma, lineHeight: taillePharma * 1.3 }]} couleur={c.rougeVif}>
          24
        </Texte>
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  logotype: { alignItems: 'center', gap: 2 },
  pharma: { fontFamily: policeTitre(800), letterSpacing: -0.9 },
});
