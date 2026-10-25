import { appeler, type ApiResult, type CompteurCommune, type Pays, type Ville, type Zone, type ZoneDetectee } from '@/commun/api';
import type { Coordonnees } from '@/commun/lib';

/** Appels du module Territoire (pays, villes, communes, détection de zone). */

export const clesTerritoire = {
  pays: ['pays'] as const,
  villes: (code: string) => ['pays', code, 'villes'] as const,
  zones: (villeId: string, q: string, point: Coordonnees | null) =>
    ['villes', villeId, 'zones', q, point ? `${point.latitude.toFixed(3)},${point.longitude.toFixed(3)}` : ''] as const,
  detection: (p: Coordonnees) => ['zones', 'depuis-position', p.latitude.toFixed(3), p.longitude.toFixed(3)] as const,
  compteurs: (villeId: string) => ['villes', villeId, 'compteurs'] as const,
};

export function lirePays(): Promise<ApiResult<Pays[]>> {
  return appeler<Pays[]>('/pays');
}

export function lireVilles(codePays: string): Promise<ApiResult<Ville[]>> {
  return appeler<Ville[]>(`/pays/${encodeURIComponent(codePays)}/villes`);
}

export function lireZones(villeId: string, q: string, point: Coordonnees | null): Promise<ApiResult<Zone[]>> {
  return appeler<Zone[]>(`/villes/${encodeURIComponent(villeId)}/zones`, {
    params: { q, lat: point?.latitude, lng: point?.longitude },
  });
}

export function detecterZone(p: Coordonnees): Promise<ApiResult<ZoneDetectee>> {
  return appeler<ZoneDetectee>('/zones/depuis-position', { params: { lat: p.latitude, lng: p.longitude } });
}

export function lireCompteurs(villeId: string): Promise<ApiResult<CompteurCommune[]>> {
  return appeler<CompteurCommune[]>(`/villes/${encodeURIComponent(villeId)}/compteurs`);
}
