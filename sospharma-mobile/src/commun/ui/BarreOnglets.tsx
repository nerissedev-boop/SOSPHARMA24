import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../lib/i18n';
import { useSessionAgent } from '../lib/sessionAgent';
import { ombres } from '../theme/ombres';
import { useTheme } from '../theme/Theme';
import { HiGeoLocation, HiHome, HiUiUserProfile, HiUiUserProfileOutline } from './icones/healthicons';
import { IconeLune, IconePlus, IconeReleves } from './icones/trait';
import { Texte } from './Texte';

export type CleOnglet = 'accueil' | 'carte' | 'urgence' | 'garde' | 'profil' | 'releves';
export const ORDRE_ONGLETS: CleOnglet[] = ['accueil', 'carte', 'urgence', 'garde', 'profil'];
/** Agent terrain connecté : l'onglet « Relevés » (presse-papiers) remplace l'onglet Profil. */
export const ORDRE_ONGLETS_AGENT: CleOnglet[] = ['accueil', 'carte', 'urgence', 'garde', 'releves'];

type Props = {
  actif: CleOnglet | null;
  onSelection: (cle: CleOnglet) => void;
};

/**
 * Barre d'onglets personnalisée (5 onglets) : Urgence = cercle rouge avec +,
 * Garde actif en rouge, sinon actif vert. Fond blanc, ombre douce, sans bordure.
 * Utilisable par le navigateur d'onglets ou seule (écrans hors onglets des maquettes).
 */
export function BarreOnglets({ actif, onSelection }: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const insets = useSafeAreaInsets();
  const agentConnecte = useSessionAgent((e) => e.agent !== null);

  const rendu = (cle: CleOnglet) => {
    const estActif = actif === cle;
    const couleurActive = cle === 'garde' ? c.ongletGardeActif : cle === 'urgence' ? c.ongletUrgenceActif : c.ongletActif;
    const teinte = estActif ? couleurActive : c.ongletInactif;
    let icone;
    switch (cle) {
      case 'accueil':
        icone = <HiHome size={26} color={teinte} />;
        break;
      case 'carte':
        icone = <HiGeoLocation size={26} color={teinte} />;
        break;
      case 'urgence':
        icone = (
          <View style={[styles.urgence, { backgroundColor: c.rougeVif }]}>
            <IconePlus size={18} color={c.blanc} />
          </View>
        );
        break;
      case 'garde':
        icone = <IconeLune size={22} color={teinte} plein={estActif} />;
        break;
      case 'profil':
        icone = estActif ? <HiUiUserProfile size={26} color={teinte} /> : <HiUiUserProfileOutline size={26} color={teinte} />;
        break;
      case 'releves':
        icone = <IconeReleves size={22} color={teinte} />;
        break;
    }
    return (
      <Pressable
        key={cle}
        testID={`onglet-${cle}`}
        onPress={() => onSelection(cle)}
        accessibilityRole="tab"
        accessibilityLabel={t(`onglets.${cle}`)}
        accessibilityState={{ selected: estActif }}
        style={[styles.onglet, { paddingTop: cle === 'urgence' ? 0 : cle === 'garde' || cle === 'releves' ? 6 : 4, gap: cle === 'urgence' ? 3 : 4 }]}
      >
        {icone}
        <Texte variante={estActif ? 'miniFort' : 'mini'} couleur={teinte} style={estActif ? styles.libelleActif : undefined}>
          {t(`onglets.${cle}`)}
        </Texte>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('onglets.navigation')}
      style={[
        styles.barre,
        { backgroundColor: c.navigation, paddingBottom: Math.max(insets.bottom, 12), minHeight: 66 + Math.max(insets.bottom, 12) },
        !estNuit && ombres.barre,
      ]}
    >
      {(agentConnecte ? ORDRE_ONGLETS_AGENT : ORDRE_ONGLETS).map(rendu)}
    </View>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  onglet: { minWidth: 60, minHeight: 50, alignItems: 'center' },
  urgence: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  libelleActif: { fontFamily: 'PlusJakartaSans_700Bold' },
});
