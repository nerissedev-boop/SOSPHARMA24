import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { alerte } from '../lib/dialogues';
import { t } from '../lib/i18n';
import { reactionPour, type Reaction } from './reactions';

/**
 * Applique la réaction décidée par reactionPour() : navigation vers l'écran
 * « zone non couverte », message, ou erreurs de formulaire renvoyées à l'appelant.
 */
export function useReactionErreur() {
  const router = useRouter();
  return useCallback(
    (erreur: unknown): Reaction => {
      const reaction = reactionPour(erreur);
      switch (reaction.type) {
        case 'ecran':
          router.push({ pathname: reaction.route, params: reaction.params });
          break;
        case 'message':
        case 'introuvable':
        case 'connexion':
          alerte(t('erreurs.titre'), reaction.message);
          break;
        case 'formulaire':
        case 'cache':
          // Le formulaire affiche les champs ; le bandeau hors connexion couvre le cache.
          break;
      }
      return reaction;
    },
    [router],
  );
}
