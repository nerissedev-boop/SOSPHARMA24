import { useQuery } from '@tanstack/react-query';

import { donneesOuErreur, type Pays } from '@/commun/api';
import { fuseauAppareil, usePreferences } from '@/commun/lib';

import { clesTerritoire, lirePays, lireVilles } from '../api';

const JOUR = 24 * 3600 * 1000;

/** Pays et leur configuration (urgences, indicatif, fuseau, couverture), gardés en cache. */
export function usePays() {
  return useQuery({
    queryKey: clesTerritoire.pays,
    queryFn: async () => donneesOuErreur(await lirePays()),
    staleTime: JOUR,
  });
}

/** Configuration du pays choisi. Jamais de constante de pays dans le code : tout vient d'ici. */
export function usePaysCourant(): { pays: Pays | undefined; fuseau: string; chargement: boolean } {
  const code = usePreferences((e) => e.paysCode);
  const requete = usePays();
  const pays = requete.data?.find((p) => p.code === code);
  return { pays, fuseau: pays?.fuseau ?? fuseauAppareil(), chargement: requete.isPending };
}

export function useVilles(codePays: string) {
  return useQuery({
    queryKey: clesTerritoire.villes(codePays),
    queryFn: async () => donneesOuErreur(await lireVilles(codePays)),
    staleTime: JOUR,
  });
}
