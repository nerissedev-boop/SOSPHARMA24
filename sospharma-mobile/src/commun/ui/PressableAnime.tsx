import type { ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { vibrationLegere } from '../lib/haptique';
import { useAppui } from './animations';

const PressableReanime = Animated.createAnimatedComponent(Pressable);

export type PropsPressableAnime = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Compression sous le doigt (0,97 par défaut ; 0,98 pour une grande carte). */
  echelle?: number;
  /** Petit « tic » haptique au toucher (cartes, lignes de liste). */
  vibration?: boolean;
};

/**
 * Zone touchable qui se comprime légèrement sous le doigt puis revient (fil UI, respecte
 * « Supprimer les animations »). Mêmes props que `Pressable`, sauf `style` qui n'accepte pas
 * de fonction : le retour au toucher est déjà fourni par la compression.
 */
export function PressableAnime({
  style,
  children,
  echelle,
  vibration = false,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: PropsPressableAnime) {
  const appui = useAppui(echelle);
  return (
    <PressableReanime
      {...props}
      onPress={
        onPress
          ? (e: GestureResponderEvent) => {
              if (vibration) vibrationLegere();
              onPress(e);
            }
          : undefined
      }
      onPressIn={(e: GestureResponderEvent) => {
        appui.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        appui.onPressOut();
        onPressOut?.(e);
      }}
      style={[style, props.disabled ? null : appui.style]}
    >
      {children}
    </PressableReanime>
  );
}
