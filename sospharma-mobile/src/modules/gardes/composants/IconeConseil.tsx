import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Cercle et point d'exclamation au trait (tracé de la maquette Garde, piste A) : une précaution.
 * Plutôt qu'un combiné, qui ressemblerait au bouton « Appeler » alors que le conseil ne se touche pas.
 * Décorative : le texte du conseil porte le message.
 */
export function IconeConseil({ size = 18, color, strokeWidth = 2.2 }: { size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 8v5M12 16v.5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
