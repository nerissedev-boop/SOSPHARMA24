import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Vrai tant que le clavier est affiché. Android n'annonce que l'affichage terminé
 * (« Did ») ; iOS annonce aussi le début (« Will »), plus tôt et plus fluide.
 */
export function useClavierVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const avant = Platform.OS === 'ios' ? 'Will' : 'Did';
    const montre = Keyboard.addListener(`keyboard${avant}Show`, () => setVisible(true));
    const cache = Keyboard.addListener(`keyboard${avant}Hide`, () => setVisible(false));
    return () => {
      montre.remove();
      cache.remove();
    };
  }, []);
  return visible;
}

/**
 * Hauteur de la barre de navigation d'Android (ou de la barre d'accueil d'iOS) à laisser
 * libre en bas d'un écran sans barre d'onglets. L'app est dessinée bord à bord : sans cette
 * marge, le dernier bouton passe sous la barre. Dans une fenêtre modale, Android peut annoncer
 * une barre nulle ; la mesure du lancement sert alors de secours.
 * Clavier ouvert : 0, car le clavier recouvre déjà la barre (sinon un vide s'ouvrirait au-dessus).
 */
export function useBarreBas(): number {
  const insets = useSafeAreaInsets();
  const clavier = useClavierVisible();
  if (clavier) return 0;
  return Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);
}

/** Marge du bas d'un contenu qui défile : sa marge propre, plus la barre de navigation. */
export function useMargeBas(marge = 20): number {
  return useBarreBas() + marge;
}
