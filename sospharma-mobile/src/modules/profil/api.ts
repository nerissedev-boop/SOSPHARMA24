import { appeler, type ApiResult, type PharmacieResume } from '@/commun/api';
import type { Coordonnees } from '@/commun/lib';

export const clesProfil = {
  favoris: ['appareils', 'moi', 'favoris'] as const,
};

/** GET /appareils/moi/favoris : favoris de l'appareil, avec statut en direct. */
export function lireFavoris(point: Coordonnees | null): Promise<ApiResult<PharmacieResume[]>> {
  return appeler<PharmacieResume[]>('/appareils/moi/favoris', { params: { lat: point?.latitude, lng: point?.longitude } });
}

export function ajouterFavori(pharmacieId: string): Promise<ApiResult<{ pharmacie_id: string }>> {
  return appeler('/appareils/moi/favoris', { methode: 'POST', corps: { pharmacie_id: pharmacieId } });
}

export function retirerFavori(pharmacieId: string): Promise<ApiResult<null>> {
  return appeler(`/appareils/moi/favoris/${encodeURIComponent(pharmacieId)}`, { methode: 'DELETE' });
}
