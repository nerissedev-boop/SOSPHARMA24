import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { donneesOuErreur, type TourGarde } from '@/commun/api';
import { jourMois, useEnLigne, usePreferences, type Coordonnees } from '@/commun/lib';
import { avecStatutLocal } from '@/commun/regles';
import { useMaintenant } from '@/commun/theme';
import { usePaysCourant, useVilles, useZoneCourante } from '@/modules/territoire';

import { clesGardes, lireTourEnCours } from '../api';

/** Ville suivie : celle de la zone, sinon la première ville ouverte du pays. */
export function useVilleSuivie(): string | null {
  const paysCode = usePreferences((e) => e.paysCode);
  const { villeId } = useZoneCourante();
  const villes = useVilles(paysCode);
  return villeId ?? villes.data?.find((v) => v.statut === 'ouverte')?.id ?? null;
}

function optionsTour(villeId: string, point: Coordonnees | null) {
  return {
    queryKey: clesGardes.enCours(villeId, point),
    queryFn: async () => donneesOuErreur(await lireTourEnCours(villeId, point)),
    staleTime: 10 * 60 * 1000,
  };
}

/**
 * Tour de garde en cours de la ville suivie. Gardé en cache (MMKV) pour rester
 * consultable hors connexion ; le statut est alors recalculé sur le téléphone.
 */
export function useTourEnCours() {
  const villeId = useVilleSuivie();
  const { point } = useZoneCourante();
  const { fuseau } = usePaysCourant();
  const enLigne = useEnLigne();
  const maintenant = useMaintenant();
  const requete = useQuery({
    ...optionsTour(villeId ?? 'aucune', point),
    enabled: villeId !== null,
  });

  const tour = useMemo<TourGarde | undefined>(() => {
    if (!requete.data) return undefined;
    if (enLigne && !requete.isStale) return requete.data;
    return { ...requete.data, pharmacies: requete.data.pharmacies.map((p) => avecStatutLocal(p, fuseau, maintenant)) };
  }, [requete.data, requete.isStale, enLigne, fuseau, maintenant]);

  return {
    ...requete,
    tour,
    fuseau,
    /** « 17 oct. » pour le bandeau hors connexion. */
    dateEnregistree: requete.data ? jourMois(requete.data.debut, fuseau) : null,
  };
}

/** Précharge le tour (écran de démarrage « Mise à jour du tour de garde de la semaine »). */
export function usePrechargerTour() {
  const client = useQueryClient();
  return useCallback(
    (villeId: string, point: Coordonnees | null) => {
      const options = optionsTour(villeId, point);
      // Tour déjà enregistré : le démarrage n'attend pas le réseau, la mise à jour se fait en fond.
      const enCache = client.getQueryData(options.queryKey) !== undefined;
      return { enCache, mise: client.prefetchQuery(options) };
    },
    [client],
  );
}
