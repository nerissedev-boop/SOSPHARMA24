import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { CIBLE_TACTILE } from '../theme/espacements';
import { rayons } from '../theme/rayons';

type Props = {
  /** Obligatoire : un bouton-icône n'a pas de texte visible. */
  accessibilityLabel: string;
  onPress?: () => void;
  children: ReactNode;
  taille?: number;
  fond?: string;
  /** Bouton rond (actions) ; sinon carré arrondi de 14 (charte « cartes »). */
  rond?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean };
};

export function BoutonIcone({
  accessibilityLabel,
  onPress,
  children,
  taille = CIBLE_TACTILE,
  fond = 'transparent',
  rond = false,
  style,
  testID,
  accessibilityState,
}: Props) {
  const cote = Math.max(taille, CIBLE_TACTILE);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={taille < CIBLE_TACTILE ? (CIBLE_TACTILE - taille) / 2 : undefined}
      style={({ pressed }) => [
        {
          width: cote,
          height: cote,
          borderRadius: rond ? cote / 2 : rayons.moyen,
          backgroundColor: fond,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
