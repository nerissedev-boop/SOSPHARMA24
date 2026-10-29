import type { StyleProp, ImageStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useApparitionImage } from './animations';

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

/**
 * Photo de façade venue du réseau : invisible jusqu'au chargement, puis fondu court.
 * Le fond gris du conteneur (ou du style) sert de place réservée en attendant.
 */
export function PhotoFondu({ uri, style, testID }: Props) {
  const { style: apparition, onLoad } = useApparitionImage();
  return (
    <Animated.Image source={{ uri }} onLoad={onLoad} style={[style, apparition]} resizeMode="cover" accessible={false} testID={testID} />
  );
}
