import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { donneesOuErreur, useReactionErreur, type NouvelleProposition, type PharmacieResume, type Proposition } from '@/commun/api';
import type { Coordonnees } from '@/commun/lib';

import type { PhotoLocale } from '../types';
import { clesPropositions, creerProposition, envoyerFacade, lirePharmaciesAutour, lirePropositions } from './api';

/** « Mes propositions » de cet appareil. */
export function useMesPropositions() {
  return useQuery({
    queryKey: clesPropositions.mes,
    queryFn: async () => donneesOuErreur(await lirePropositions()),
  });
}

/**
 * Envoi en deux temps : la proposition, puis la façade. L'identifiant vient du téléphone :
 * après une coupure, un nouvel appui renvoie la même proposition (pas de doublon) et réessaie la photo.
 * Les erreurs de validation reviennent par champ.
 */
export function useEnvoyerProposition() {
  const reagir = useReactionErreur();
  const client = useQueryClient();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: async ({ corps, facade }: { corps: NouvelleProposition; facade: PhotoLocale }): Promise<Proposition> => {
      const proposition = donneesOuErreur(await creerProposition(corps));
      if (!proposition.photo_facade_recue) donneesOuErreur(await envoyerFacade(proposition.id, facade));
      return proposition;
    },
    onMutate: () => setErreurs({}),
    onSuccess: () => void client.invalidateQueries({ queryKey: clesPropositions.mes }),
    onError: (erreur) => {
      const reaction = reagir(erreur);
      if (reaction.type === 'formulaire') setErreurs(reaction.champs);
    },
  });
  return { ...mutation, erreurs };
}

/**
 * Vérification avant envoi : pharmacies déjà connues à 100 m du repère.
 * Sans réseau ou en cas d'erreur, la liste est vide et l'envoi reste possible (l'équipe vérifiera).
 */
export function useVerificationAutour() {
  return useMutation({
    mutationFn: async (p: Coordonnees): Promise<{ proches: PharmacieResume[]; verifiee: boolean }> => {
      const r = await lirePharmaciesAutour(p);
      return r.success ? { proches: r.data, verifiee: true } : { proches: [], verifiee: false };
    },
  });
}
