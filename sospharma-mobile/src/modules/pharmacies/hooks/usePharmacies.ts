import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { avecMetaOuErreur, donneesOuErreur, type Pharmacie, type PharmacieResume } from '@/commun/api';
import { useEnLigne, usePreferences, type Filtres, type FiltreRapide } from '@/commun/lib';
import { avecStatutLocal, libelleStatut, tonAffiche, type ContexteLibelle } from '@/commun/regles';
import { useMaintenant } from '@/commun/theme';
import { usePaysCourant, useZoneCourante } from '@/modules/territoire';

import { clesPharmacies, lireCadre, lireFiche, lireProches, lireTrajet, paramsFiltres, rechercher } from '../api';

/** Recalcule le statut sur le téléphone quand les données viennent du cache hors connexion. */
function useStatutsLocaux<T extends PharmacieResume>(liste: T[] | undefined, perime: boolean): T[] | undefined {
  const enLigne = useEnLigne();
  const { fuseau } = usePaysCourant();
  const maintenant = useMaintenant();
  return useMemo(() => {
    if (!liste) return undefined;
    if (enLigne && !perime) return liste;
    return liste.map((p) => avecStatutLocal(p, fuseau, maintenant));
  }, [liste, enLigne, perime, fuseau, maintenant]);
}

/** Libellé de statut dans le fuseau du pays (« Fermée, ouvre à 07:00 »). */
export function useLibelleStatut() {
  const { fuseau } = usePaysCourant();
  return useCallback(
    (p: Parameters<typeof libelleStatut>[0], contexte: ContexteLibelle = 'liste') => libelleStatut(p, fuseau, contexte),
    [fuseau],
  );
}

/** Ton affiché (ocre quand la pharmacie ferme dans moins de 30 min), recalculé à chaque minute. */
export function useTonStatut() {
  const { fuseau } = usePaysCourant();
  const maintenant = useMaintenant();
  return useCallback((p: Parameters<typeof tonAffiche>[0]) => tonAffiche(p, fuseau, maintenant), [fuseau, maintenant]);
}

type OptionsProches = { filtres?: Filtres; rapide?: FiltreRapide; actif?: boolean; limite?: number };

/** Pharmacies proches triées par distance (accueil, carte), avec les filtres de l'usager. */
export function usePharmaciesProches(options: OptionsProches = {}) {
  const filtresPrefs = usePreferences((e) => e.filtres);
  const rapidePrefs = usePreferences((e) => e.filtreRapide);
  const { point } = useZoneCourante();
  const params = paramsFiltres(options.filtres ?? filtresPrefs, options.rapide ?? rapidePrefs);
  const limite = options.limite ?? 20;
  const requete = useQuery({
    queryKey: clesPharmacies.proches(point, { ...params, limite }),
    queryFn: async () => avecMetaOuErreur(await lireProches(point!, params, limite)),
    enabled: point !== null && options.actif !== false,
    placeholderData: (precedent) => precedent,
  });
  const liste = useStatutsLocaux(requete.data?.data, requete.isStale);
  return { ...requete, liste, nombre: requete.data?.meta.nombre ?? liste?.length ?? 0 };
}

/** Points de la carte dans le cadre visible (plafond 300 côté API). */
export function usePharmaciesCadre(bornes: [number, number, number, number] | null, actif = true) {
  const filtres = usePreferences((e) => e.filtres);
  const rapide = usePreferences((e) => e.filtreRapide);
  const { point } = useZoneCourante();
  const params = paramsFiltres(filtres, rapide);
  const requete = useQuery({
    queryKey: bornes ? clesPharmacies.cadre(bornes, params) : ['pharmacies', 'cadre', 'aucun'],
    queryFn: async () => avecMetaOuErreur(await lireCadre(bornes!, params, point)),
    enabled: bornes !== null && actif,
    placeholderData: (precedent) => precedent,
  });
  const liste = useStatutsLocaux(requete.data?.data, requete.isStale);
  return { ...requete, liste };
}

export function useRecherche(q: string) {
  const { point, villeId } = useZoneCourante();
  const requete = useQuery({
    queryKey: clesPharmacies.recherche(q, villeId, point),
    queryFn: async () => donneesOuErreur(await rechercher(q, villeId, point)),
    enabled: q.trim().length >= 2,
  });
  const liste = useStatutsLocaux(requete.data, requete.isStale);
  return { ...requete, liste };
}

/**
 * Durée en voiture de Google (trafic compris) vers une pharmacie, gardée 10 min.
 * Hors connexion, sans position ou sans clé côté serveur : `voiture` est nul et l'écran garde son estimation.
 */
export function useTrajetVoiture(id: string) {
  const { point } = useZoneCourante();
  const enLigne = useEnLigne();
  return useQuery({
    queryKey: clesPharmacies.trajet(id, point),
    queryFn: async () => donneesOuErreur(await lireTrajet(id, point!)),
    enabled: Boolean(id) && point !== null && enLigne,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/** Fiche complète ; affiche tout de suite le résumé déjà en cache (listes), y compris hors connexion. */
export function usePharmacie(id: string, actif = true) {
  const client = useQueryClient();
  const { point } = useZoneCourante();
  const requete = useQuery({
    queryKey: clesPharmacies.fiche(id),
    queryFn: async () => donneesOuErreur(await lireFiche(id, point)),
    enabled: actif && id.length > 0,
    placeholderData: () => {
      for (const [, donnees] of client.getQueriesData<unknown>({ queryKey: clesPharmacies.tout })) {
        const liste = Array.isArray(donnees)
          ? (donnees as PharmacieResume[])
          : ((donnees as { data?: PharmacieResume[] } | undefined)?.data ?? []);
        const trouve = Array.isArray(liste) ? liste.find((p) => p.id === id) : undefined;
        // photo_url : absente des listes mises en cache par une version précédente de l'app.
        if (trouve) return { pays_code: '', services: [], verifiee_le: null, note: null, ...trouve, photo_url: trouve.photo_url ?? null } as Pharmacie;
      }
      return undefined;
    },
  });
  const [fiche] = useStatutsLocaux(requete.data ? [requete.data] : undefined, requete.isStale) ?? [];
  return { ...requete, fiche };
}
