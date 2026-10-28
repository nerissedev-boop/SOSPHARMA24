import { router, useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { noterDepart, rejouerDemarrageAuRetour } from '../../lib/premierPlan';

/**
 * Repasse par l'écran du logo, qui ramène ensuite à l'accueil : tous les écrans sont reconstruits
 * (retour dans l'app, changement de langue).
 */
export function revenirAuLogo(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/demarrage');
}

/**
 * Rejoue l'écran du logo quand l'usager revient dans l'app après l'avoir vraiment quittée
 * (règle dans `commun/lib/premierPlan.ts`). Monté une seule fois, à la racine.
 *
 * Deux retours possibles :
 * - la fenêtre a été gardée (bouton d'accueil) : AppState repasse à « active » ;
 * - la fenêtre a été détruite (touche retour) : la racine est remontée, la décision est prise
 *   au montage, une fois la navigation prête.
 * On navigue vers l'écran du logo (qui ramène ensuite à l'accueil) sans toucher à l'état
 * « démarrage fait » : le retirer démontait la barre d'onglets en pleine navigation
 * (erreur « ROUTE_NAMES_CHANGED was not handled »).
 */
export function useRetourAuDemarrage(): void {
  const navigation = useNavigationContainerRef();

  useEffect(() => {
    const appliquer = () => {
      if (!rejouerDemarrageAuRetour()) return;
      if (navigation.isReady()) {
        revenirAuLogo();
        return;
      }
      // Fenêtre reconstruite : la navigation n'est pas encore montée.
      const desabonner = navigation.addListener('state', () => {
        desabonner();
        revenirAuLogo();
      });
    };
    appliquer();
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'background') noterDepart();
      else if (etat === 'active') appliquer();
    });
    return () => abonnement.remove();
  }, [navigation]);
}
