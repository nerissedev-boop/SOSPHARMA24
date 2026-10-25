import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { donneesOuErreur, useReactionErreur } from '@/commun/api';

import { envoyerSignalement, type NouveauSignalement } from '../api';

/** Envoi d'un signalement ; les erreurs de validation reviennent par champ. */
export function useEnvoyerSignalement(pharmacieId: string) {
  const reagir = useReactionErreur();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: async (corps: NouveauSignalement) => donneesOuErreur(await envoyerSignalement(pharmacieId, corps)),
    onMutate: () => setErreurs({}),
    onError: (erreur) => {
      const reaction = reagir(erreur);
      if (reaction.type === 'formulaire') setErreurs(reaction.champs);
    },
  });
  return { ...mutation, erreurs };
}
