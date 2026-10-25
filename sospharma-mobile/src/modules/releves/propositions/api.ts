import { appeler, joindreFichier, type ApiResult, type NouvelleProposition, type PharmacieResume, type Proposition } from '@/commun/api';
import type { Coordonnees } from '@/commun/lib';

import type { PhotoLocale } from '../types';

/**
 * « Proposer une pharmacie » : usagers sans compte. L'en-tête X-Device-Token est ajouté par le client.
 * Rien n'est publié avant la validation de l'équipe (même file que les relevés des agents).
 */

export const clesPropositions = {
  mes: ['propositions'] as const,
};

/** Crée la proposition. Un renvoi avec le même identifiant renvoie la même (200, meta.deja_recu). */
export function creerProposition(corps: NouvelleProposition): Promise<ApiResult<Proposition>> {
  return appeler<Proposition>('/propositions', { methode: 'POST', corps });
}

/** Photo de la façade, obligatoire (image JPEG déjà réduite, sans EXIF). */
export function envoyerFacade(propositionId: string, photo: PhotoLocale): Promise<ApiResult<unknown>> {
  const corps = new FormData();
  joindreFichier(corps, 'photo', photo.uri, 'facade.jpg', 'image/jpeg');
  return appeler<unknown>(`/propositions/${encodeURIComponent(propositionId)}/photo`, { methode: 'POST', corps, delaiMs: 60_000 });
}

/** Rayon de la vérification avant envoi : pharmacies déjà connues autour du repère. */
export const RAYON_VERIFICATION_M = 100;

/** Pharmacies connues à 100 m du repère (route publique, triées par distance). */
export function lirePharmaciesAutour(p: Coordonnees): Promise<ApiResult<PharmacieResume[]>> {
  return appeler<PharmacieResume[]>('/pharmacies/proches', {
    params: { lat: p.latitude, lng: p.longitude, rayon: RAYON_VERIFICATION_M, limite: 5 },
  });
}

export function lirePropositions(): Promise<ApiResult<Proposition[]>> {
  return appeler<Proposition[]>('/propositions', { params: { per_page: 50 } });
}
