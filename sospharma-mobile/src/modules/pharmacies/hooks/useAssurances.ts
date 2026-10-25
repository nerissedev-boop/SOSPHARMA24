import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { donneesOuErreur, type Assurance, type AssurancePharmacie, type TypeAssurance } from '@/commun/api';
import { useEnLigne, usePreferences, type AssuranceChoisie } from '@/commun/lib';
import { usePaysCourant } from '@/modules/territoire';

import { clesPharmacies, enregistrerMesAssurances, lireAssurances } from '../api';

export const ORDRE_TYPES: TypeAssurance[] = ['publique', 'mutuelle', 'privee'];

/** Référentiel d'assurances du pays courant (GET /pays/{code}/assurances), gardé 24 h. */
export function useAssurances() {
  const { pays } = usePaysCourant();
  const code = pays?.code ?? null;
  return useQuery({
    queryKey: clesPharmacies.assurances(code ?? 'aucun'),
    queryFn: async () => donneesOuErreur(await lireAssurances(code as string)),
    enabled: code !== null,
    staleTime: 24 * 3600 * 1000,
  });
}

/** Assurances groupées par type (Régimes publics, Mutuelles, Assureurs privés), triées par nom. */
export function grouperAssurances(liste: Assurance[]): { type: TypeAssurance; assurances: Assurance[] }[] {
  return ORDRE_TYPES.map((type) => ({
    type,
    assurances: liste.filter((a) => a.type === type).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  })).filter((g) => g.assurances.length > 0);
}

/**
 * Ordre d'affichage sur la fiche (maquette Detail) : celles de l'usager d'abord (avec tiers
 * payant en tête), puis les autres ; à égalité, l'ordre renvoyé par l'API est gardé.
 */
export function trierAssurancesFiche(liste: AssurancePharmacie[], miennes: string[]): AssurancePharmacie[] {
  const rang = (a: AssurancePharmacie) => (miennes.includes(a.slug) ? 0 : 2) + (a.tiers_payant ? 0 : 1);
  return liste
    .map((a, i) => ({ a, i }))
    .sort((x, y) => rang(x.a) - rang(y.a) || x.i - y.i)
    .map((x) => x.a);
}

/** Vrai si la pharmacie accepte au moins une des assurances de l'usager (API, sinon calcul local). */
export function accepteMesAssurances(
  p: { assurances: AssurancePharmacie[]; accepte_mes_assurances?: boolean | null },
  miennes: string[],
): boolean {
  if (miennes.length === 0) return false;
  if (typeof p.accepte_mes_assurances === 'boolean') return p.accepte_mes_assurances;
  return p.assurances.some((a) => miennes.includes(a.slug));
}

/**
 * « Mes assurances » : enregistrées sur le téléphone (préférences) puis synchronisées
 * avec l'API (PUT /appareils/moi/assurances). Sans réseau, l'envoi est retenté au retour.
 */
export function useMesAssurances() {
  const mesAssurances = usePreferences((e) => e.mesAssurances);
  const definirMesAssurances = usePreferences((e) => e.definirMesAssurances);
  const slugs = useMemo(() => mesAssurances.map((a) => a.slug), [mesAssurances]);
  const definir = useCallback((liste: AssuranceChoisie[]) => definirMesAssurances(liste), [definirMesAssurances]);
  return { mesAssurances, slugs, definir };
}

/** Synchronise « Mes assurances » quand elles ont changé et que le réseau est là (racine de l'app). */
export function useSynchroniserMesAssurances() {
  const enLigne = useEnLigne();
  const client = useQueryClient();
  const aSynchroniser = usePreferences((e) => !e.mesAssurancesSynchronisees);
  const mesAssurances = usePreferences((e) => e.mesAssurances);
  const marquer = usePreferences((e) => e.marquerMesAssurancesSynchronisees);
  // L'API attend les identifiants (as_…) ; l'app garde les slugs. Le référentiel du pays,
  // en cache (même hors connexion), fait la correspondance : on attend qu'il soit chargé.
  const { data: referentiel } = useAssurances();

  useEffect(() => {
    if (!aSynchroniser || !enLigne || !referentiel) return;
    const ids = mesAssurances.flatMap((a) => referentiel.find((r) => r.slug === a.slug)?.id ?? []);
    let annule = false;
    void enregistrerMesAssurances(ids).then((r) => {
      if (annule || !r.success) return;
      marquer();
      // accepte_mes_assurances dépend de l'appareil : les listes et fiches sont relues.
      void client.invalidateQueries({ queryKey: clesPharmacies.tout });
    });
    return () => {
      annule = true;
    };
  }, [aSynchroniser, enLigne, mesAssurances, marquer, client, referentiel]);
}
