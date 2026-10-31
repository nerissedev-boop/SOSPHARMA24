import { appeler, type ApiResult, type Assurance, type Pharmacie, type PharmacieResume } from '@/commun/api';
import type { Coordonnees, Filtres, FiltreRapide } from '@/commun/lib';

type Bornes = [number, number, number, number];

const cle = (p: Coordonnees | null) => (p ? `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}` : '');

export const clesPharmacies = {
  tout: ['pharmacies'] as const,
  proches: (point: Coordonnees | null, params: Record<string, unknown>) => ['pharmacies', 'proches', cle(point), params] as const,
  cadre: (bornes: Bornes, params: Record<string, unknown>) =>
    ['pharmacies', 'cadre', bornes.map((b) => b.toFixed(3)).join(','), params] as const,
  recherche: (q: string, villeId: string | null, point: Coordonnees | null) => ['pharmacies', 'recherche', q, villeId, cle(point)] as const,
  fiche: (id: string) => ['pharmacies', 'fiche', id] as const,
  trajet: (id: string, point: Coordonnees | null) => ['pharmacies', 'trajet', id, cle(point)] as const,
  assurances: (paysCode: string) => ['pays', paysCode, 'assurances'] as const,
};

/**
 * Filtres de l'app -> paramètres de l'API (filter[statut], filter[h24], filter[assurances], rayon).
 * « Ouvertes » inclut les pharmacies de garde (elles sont ouvertes).
 * filter[assurances]=mugef-ci,cmu : l'API renvoie les pharmacies qui acceptent AU MOINS UNE assurance.
 */
export function paramsFiltres(f: Filtres, rapide: FiltreRapide = 'toutes'): Record<string, string | number | boolean | string[]> {
  let statuts: string[] = [];
  if (rapide === 'garde') statuts = ['garde'];
  else if (rapide === 'ouvertes' || f.ouvertes) statuts = ['ouverte', 'garde'];
  else if (f.garde) statuts = ['garde'];
  return {
    'filter[statut]': statuts,
    'filter[h24]': f.h24,
    'filter[assurances]': f.assurances,
    rayon: f.rayonKm * 1000,
  };
}

export function lireProches(
  point: Coordonnees,
  params: Record<string, string | number | boolean | string[]>,
  limite = 20,
): Promise<ApiResult<PharmacieResume[]>> {
  return appeler<PharmacieResume[]>('/pharmacies/proches', {
    params: { lat: point.latitude, lng: point.longitude, limite, ...params },
  });
}

export function lireCadre(
  bornes: Bornes,
  params: Record<string, string | number | boolean | string[]>,
  point: Coordonnees | null,
): Promise<ApiResult<PharmacieResume[]>> {
  const { rayon: _rayon, ...sansRayon } = params;
  return appeler<PharmacieResume[]>('/pharmacies/cadre', {
    params: { bbox: bornes.join(','), lat: point?.latitude, lng: point?.longitude, ...sansRayon },
  });
}

export function rechercher(q: string, villeId: string | null, point: Coordonnees | null): Promise<ApiResult<PharmacieResume[]>> {
  return appeler<PharmacieResume[]>('/pharmacies/recherche', {
    params: { q, ville: villeId, lat: point?.latitude, lng: point?.longitude },
  });
}

export function lireFiche(id: string, point: Coordonnees | null): Promise<ApiResult<Pharmacie>> {
  return appeler<Pharmacie>(`/pharmacies/${encodeURIComponent(id)}`, {
    params: { lat: point?.latitude, lng: point?.longitude },
  });
}

/** Durée en voiture donnée par Google (trafic compris) ; `voiture` nul : garder l'estimation. */
export type TrajetApi = { voiture: { minutes: number; distance_m: number } | null; source: 'google' | null };

export function lireTrajet(id: string, point: Coordonnees): Promise<ApiResult<TrajetApi>> {
  return appeler<TrajetApi>(`/pharmacies/${encodeURIComponent(id)}/trajet`, {
    params: { lat: point.latitude, lng: point.longitude },
  });
}

// ---------------- Assurances (font partie du module Pharmacies) ----------------

/** Référentiel des assurances actives du pays (filtres, profil, relevés). */
export function lireAssurances(paysCode: string): Promise<ApiResult<Assurance[]>> {
  return appeler<Assurance[]>(`/pays/${encodeURIComponent(paysCode)}/assurances`);
}

/** « Mes assurances » de l'appareil (sans compte). */
export function lireMesAssurances(): Promise<ApiResult<Assurance[]>> {
  return appeler<Assurance[]>('/appareils/moi/assurances');
}

/** Remplace « Mes assurances » de l'appareil (identifiants as_… du référentiel, format de l'API). */
export function enregistrerMesAssurances(ids: string[]): Promise<ApiResult<Assurance[]>> {
  return appeler<Assurance[]>('/appareils/moi/assurances', { methode: 'PUT', corps: { assurances: ids } });
}
