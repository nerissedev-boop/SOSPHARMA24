import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/Theme';

type Props = {
  children: ReactNode;
  /** Couleur de fond (par défaut : fond du thème). */
  fond?: string;
  /** Barre d'état claire (texte blanc) sur fond coloré ou en mode nuit. */
  barreClaire?: boolean;
  /** Ajoute la marge de la zone sûre en haut (par défaut oui). */
  hautSur?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Conteneur d'écran : fond du thème, zone sûre en haut, barre d'état adaptée. */
export function Ecran({ children, fond, barreClaire, hautSur = true, style, testID }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const clair = barreClaire ?? theme.estNuit;
  return (
    <View
      testID={testID}
      style={[{ flex: 1, backgroundColor: fond ?? theme.couleurs.fond, paddingTop: hautSur ? insets.top : 0 }, style]}
    >
      <StatusBar style={clair ? 'light' : 'dark'} />
      {children}
    </View>
  );
}
