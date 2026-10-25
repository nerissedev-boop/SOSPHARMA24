import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { CIBLE_TACTILE } from '../theme/espacements';
import { useTheme } from '../theme/Theme';
import type { Variante } from '../theme/typographie';
import { useAppui } from './animations';
import { ICONES_A_DROITE, IconeNommee, type NomIcone } from './icones/actions';
import { Texte } from './Texte';

const PressableAnime = Animated.createAnimatedComponent(Pressable);

export type VarianteBouton = 'principal' | 'secondaire' | 'clair' | 'blanc' | 'lien' | 'danger';

type Props = {
  libelle: string;
  onPress?: () => void;
  variante?: VarianteBouton;
  hauteur?: number;
  /**
   * Icône d'action : un nom du jeu commun (`'envoyer'`, `'valider'`…) donne l'icône au trait
   * de la charte (20 px, couleur du texte, écart 10 px). Un élément React reste possible pour
   * les petits boutons colorés des maquettes (Appeler, Itinéraire), avec un écart de 8 px.
   */
  icone?: NomIcone | ReactNode;
  /** Icône à droite du libellé (par défaut pour « continuer » et « se connecter »). */
  iconeADroite?: boolean;
  /**
   * Icône au-dessus du libellé : pour plusieurs boutons étroits côte à côte (Appeler,
   * Itinéraire, WhatsApp sur la carte), où le libellé ne tient pas à côté de l'icône.
   */
  empile?: boolean;
  tailleIcone?: number;
  epaisseurIcone?: number;
  desactive?: boolean;
  chargement?: boolean;
  typo?: Variante;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Bouton de la charte : rectangle sans arrondi ni bordure.
 * principal = vert plein (actions) ; secondaire = gris ; clair = vert clair ;
 * blanc = fond blanc et texte vert (dans les blocs « la plus proche ») ; lien = texte vert.
 * Tout bouton d'action porte une icône au trait à gauche du libellé (charte, 21 oct.) ;
 * les liens texte (« Mot de passe oublié », « Modifier », « Quitter ») restent sans icône.
 */
export function Bouton({
  libelle,
  onPress,
  variante = 'principal',
  hauteur,
  icone,
  iconeADroite,
  empile = false,
  tailleIcone = 20,
  epaisseurIcone,
  desactive,
  chargement,
  typo,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: Props) {
  const { couleurs: c, estNuit } = useTheme();
  const palette: Record<VarianteBouton, { fond: string; texte: string; typo: Variante }> = {
    principal: { fond: c.vert, texte: c.texteSurCouleur, typo: 'bouton' },
    secondaire: { fond: c.boutonSecondaire, texte: c.boutonSecondaireTexte, typo: 'corpsFort' },
    clair: { fond: c.pastilleAction, texte: c.vertTexte, typo: 'petitFort' },
    blanc: { fond: c.boutonBlocSecondaire, texte: estNuit ? c.texte : c.vertTexte, typo: 'boutonPetit' },
    lien: { fond: 'transparent', texte: c.vertTexte, typo: 'boutonPetit' },
    // Action qui détruit ou abandonne quelque chose (dialogues) : rouge de la charte.
    danger: { fond: c.rouge, texte: c.texteSurCouleur, typo: 'bouton' },
  };
  const p = palette[variante];
  const inactif = desactive || chargement;
  const nomme = typeof icone === 'string';
  const aDroite = !empile && (iconeADroite ?? (nomme && ICONES_A_DROITE.includes(icone as NomIcone)));
  // Retour au toucher : léger rétrécissement (0,97) et opacité 0,85 pendant l'appui.
  const { progression, style: styleAppui, onPressIn, onPressOut } = useAppui();
  const styleOpacite = useAnimatedStyle(() => ({
    opacity: inactif ? 0.55 : interpolate(progression.get(), [0, 1], [1, 0.85]),
  }));
  const rendIcone = icone ? (
    <View style={styles.icone} testID={nomme ? `icone-${icone as string}` : undefined}>
      {nomme ? <IconeNommee nom={icone as NomIcone} size={tailleIcone} color={p.texte} strokeWidth={epaisseurIcone} /> : icone}
    </View>
  ) : null;
  return (
    <PressableAnime
      testID={testID}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? libelle}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(inactif), busy: Boolean(chargement) }}
      style={[
        styles.base,
        {
          backgroundColor: p.fond,
          minHeight: Math.max(hauteur ?? (variante === 'lien' ? CIBLE_TACTILE : 52), CIBLE_TACTILE),
          justifyContent: variante === 'lien' ? 'flex-start' : 'center',
          paddingHorizontal: variante === 'lien' ? 0 : empile ? 4 : 12,
          gap: empile ? 4 : nomme ? 10 : 8,
        },
        empile && styles.empile,
        style,
        styleOpacite,
        // Les liens texte ne rétrécissent pas : seule leur opacité change.
        variante === 'lien' ? null : styleAppui,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={p.texte} />
      ) : (
        <>
          {aDroite ? null : rendIcone}
          <Texte variante={typo ?? p.typo} couleur={p.texte} numberOfLines={1} style={styles.libelle}>
            {libelle}
          </Texte>
          {aDroite ? rendIcone : null}
        </>
      )}
    </PressableAnime>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', borderRadius: 0 },
  empile: { flexDirection: 'column', paddingVertical: 8 },
  icone: { alignItems: 'center', justifyContent: 'center' },
  libelle: { flexShrink: 1 },
});
