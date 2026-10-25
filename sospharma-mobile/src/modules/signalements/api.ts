import { appeler, type ApiResult, type MotifSignalement, type Signalement } from '@/commun/api';

export type NouveauSignalement = { motif: MotifSignalement | null; precisions: string };

/** POST /pharmacies/{id}/signalements (limité à 5 par jour et par appareil côté API). */
export function envoyerSignalement(pharmacieId: string, corps: NouveauSignalement): Promise<ApiResult<Signalement>> {
  return appeler<Signalement>(`/pharmacies/${encodeURIComponent(pharmacieId)}/signalements`, {
    methode: 'POST',
    corps: { motif: corps.motif, precisions: corps.precisions.trim() || null },
  });
}
