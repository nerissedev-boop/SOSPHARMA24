import { appeler, type ApiResult, type TourGarde } from '@/commun/api';
import type { Coordonnees } from '@/commun/lib';

export const clesGardes = {
  enCours: (villeId: string, point: Coordonnees | null) =>
    ['gardes', 'en-cours', villeId, point ? `${point.latitude.toFixed(3)},${point.longitude.toFixed(3)}` : ''] as const,
};

/** GET /gardes/en-cours?ville= : tour en cours et ses pharmacies (distance si lat/lng). */
export function lireTourEnCours(villeId: string, point: Coordonnees | null): Promise<ApiResult<TourGarde>> {
  return appeler<TourGarde>('/gardes/en-cours', {
    params: { ville: villeId, lat: point?.latitude, lng: point?.longitude },
  });
}
