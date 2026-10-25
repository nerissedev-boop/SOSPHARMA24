import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { donneesOuErreur, useReactionErreur, type PharmacieResume } from '@/commun/api';
import { useZoneCourante } from '@/modules/territoire';

import { ajouterFavori, clesProfil, lireFavoris, retirerFavori } from '../api';

/** Pharmacies favorites (liées à l'appareil, sans compte). */
export function useFavoris() {
  const { point } = useZoneCourante();
  return useQuery({
    queryKey: clesProfil.favoris,
    queryFn: async () => donneesOuErreur(await lireFavoris(point)),
  });
}

/** État et bascule « favori » d'une pharmacie (mise à jour optimiste). */
export function useFavori(pharmacieId: string, resume?: PharmacieResume) {
  const client = useQueryClient();
  const reagir = useReactionErreur();
  const favoris = useFavoris();
  const estFavori = Boolean(favoris.data?.some((p) => p.id === pharmacieId));

  const mutation = useMutation({
    mutationFn: async (ajouter: boolean) =>
      donneesOuErreur(ajouter ? await ajouterFavori(pharmacieId) : await retirerFavori(pharmacieId)),
    onMutate: async (ajouter) => {
      await client.cancelQueries({ queryKey: clesProfil.favoris });
      const avant = client.getQueryData<PharmacieResume[]>(clesProfil.favoris);
      client.setQueryData<PharmacieResume[]>(clesProfil.favoris, (liste = []) =>
        ajouter ? (resume ? [...liste, resume] : liste) : liste.filter((p) => p.id !== pharmacieId),
      );
      return { avant };
    },
    onError: (erreur, _v, contexte) => {
      client.setQueryData(clesProfil.favoris, contexte?.avant);
      reagir(erreur);
    },
    onSettled: () => client.invalidateQueries({ queryKey: clesProfil.favoris }),
  });

  const basculer = useCallback(() => mutation.mutate(!estFavori), [mutation, estFavori]);
  return { estFavori, basculer, enCours: mutation.isPending };
}
