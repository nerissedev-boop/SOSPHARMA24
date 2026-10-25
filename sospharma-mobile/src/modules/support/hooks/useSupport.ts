import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { donneesOuErreur, useReactionErreur } from '@/commun/api';
import { signalerErreur, usePreferences } from '@/commun/lib';

import { clePays, envoyerMessage, joindreCapture, lirePays, type NouveauMessage } from '../api';

export function useCoordonneesSupport() {
  const paysCode = usePreferences((e) => e.paysCode);
  const requete = useQuery({
    queryKey: clePays,
    queryFn: async () => donneesOuErreur(await lirePays()),
    staleTime: 24 * 3600 * 1000,
  });
  const pays = requete.data?.find((p) => p.code === paysCode);
  return { support: pays?.support ?? null, indicatif: pays?.indicatif };
}

/** Envoi d'un message, puis de la capture d'écran éventuelle. */
export function useEnvoyerMessage() {
  const reagir = useReactionErreur();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: async ({ corps, capture }: { corps: NouveauMessage; capture: string | null }) => {
      const message = donneesOuErreur(await envoyerMessage(corps));
      if (capture) {
        const r = await joindreCapture(message.id, capture);
        // Le message est parti : un échec de la capture ne doit pas le faire renvoyer.
        if (!r.success) signalerErreur(new Error(r.error.message), { code: r.error.code, etape: 'capture' });
      }
      return message;
    },
    onMutate: () => setErreurs({}),
    onError: (erreur) => {
      const reaction = reagir(erreur);
      if (reaction.type === 'formulaire') setErreurs(reaction.champs);
    },
  });
  return { ...mutation, erreurs };
}
