import { useCompteurAnime } from './animations';
import { Texte, type PropsTexte } from './Texte';

type Props = Omit<PropsTexte, 'children'> & {
  valeur: number;
  /** Mise en forme du nombre affiché, ex. `(n) => t('garde.compte', { count: n })`. */
  rendu?: (n: number) => string;
  duree?: number;
};

/**
 * Texte dont le nombre défile jusqu'à `valeur` (« 12 pharmacies »). Seul ce petit texte est
 * rendu à chaque pas, pas l'écran. Les lecteurs d'écran entendent directement la valeur finale.
 */
export function NombreAnime({ valeur, rendu = String, duree, accessibilityLabel, ...props }: Props) {
  const affiche = useCompteurAnime(valeur, duree);
  return (
    <Texte accessibilityLabel={accessibilityLabel ?? rendu(valeur)} {...props}>
      {rendu(affiche)}
    </Texte>
  );
}
