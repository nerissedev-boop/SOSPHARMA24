import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme/Theme';
import type { Variante } from '../theme/typographie';

export type PropsTexte = TextProps & {
  variante?: Variante;
  couleur?: string;
  aligne?: TextStyle['textAlign'];
  /** Titre d'écran ou de section : annoncé comme en-tête par les lecteurs d'écran. */
  titre?: boolean;
};

export function Texte({ variante = 'texte', couleur, aligne, titre, style, ...props }: PropsTexte) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole={titre ? 'header' : props.accessibilityRole}
      maxFontSizeMultiplier={1.6}
      style={[theme.typo[variante], { color: couleur ?? theme.couleurs.texte, textAlign: aligne }, style]}
      {...props}
    />
  );
}
