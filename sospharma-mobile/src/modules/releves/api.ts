import {
  appeler,
  joindreFichier,
  type ApiResult,
  type Connexion,
  type CorpsReleveApi,
  type NouveauReleve,
  type PharmacieProche,
  type Releve,
  type ReleveApi,
} from '@/commun/api';
import type { Coordonnees } from '@/commun/lib';

import { lireJeton } from './jeton';
import type { PhotoLocale, TypePhotoReleve } from './types';

/** Appels du module Relevés (routes /auth et /agent, jeton Sanctum en en-tête). */

export const clesReleves = {
  tout: ['agent'] as const,
  releves: ['agent', 'releves'] as const,
  doublons: (p: Coordonnees) => ['agent', 'doublons', p.latitude.toFixed(5), p.longitude.toFixed(5)] as const,
};

/** Rayon de recherche des doublons possibles (architecture : « Rayon et limite (100 m) »). */
export const RAYON_DOUBLONS_M = 100;

async function entetesAgent(): Promise<Record<string, string>> {
  const jeton = await lireJeton();
  return jeton ? { Authorization: `Bearer ${jeton}` } : {};
}

export function connecter(email: string, motDePasse: string): Promise<ApiResult<Connexion>> {
  return appeler<Connexion>('/auth/connexion', {
    methode: 'POST',
    corps: { email: email.trim(), mot_de_passe: motDePasse, appareil: 'mobile' },
  });
}

export async function deconnecter(): Promise<ApiResult<null>> {
  return appeler<null>('/auth/deconnexion', { methode: 'POST', entetes: await entetesAgent() });
}

export function demanderReinitialisation(email: string): Promise<ApiResult<null>> {
  return appeler<null>('/auth/mot-de-passe/oubli', { methode: 'POST', corps: { email: email.trim() } });
}

export async function lireDoublons(p: Coordonnees): Promise<ApiResult<PharmacieProche[]>> {
  return appeler<PharmacieProche[]>('/agent/pharmacies/proches', {
    params: { lat: p.latitude, lng: p.longitude, rayon: RAYON_DOUBLONS_M },
    entetes: await entetesAgent(),
  });
}

/**
 * Relevé de la file du téléphone → corps attendu par l'API (EnregistrerReleveRequest) :
 * `identifiant`, `pharmacie` pour une mise à jour, assurances `{ id, tiers_payant }`, champs vides omis.
 * La ville n'est pas envoyée : l'API la déduit de la position.
 */
export function versCorpsApi(r: NouveauReleve): CorpsReleveApi {
  const c = r.champs;
  const adresse = (c.adresse ?? '').trim();
  return {
    identifiant: r.id,
    ...(r.type === 'mise_a_jour' && r.pharmacie_id ? { pharmacie: r.pharmacie_id } : {}),
    latitude: r.latitude,
    longitude: r.longitude,
    precision_m: r.precision_m,
    ajustement_m: Math.round(r.ajustement_m),
    releve_le: r.releve_le,
    champs: {
      nom: c.nom,
      ...(adresse ? { adresse } : {}),
      telephone: c.telephone,
      whatsapp: c.whatsapp,
      h24: c.h24,
      services: c.services,
      horaires: c.h24 ? [] : c.horaires,
      assurances: c.assurances.map((id) => ({ id, tiers_payant: false })),
      assurances_proposees: c.assurances_proposees,
    },
  };
}

/** Relevé de l'API → affichage (« Mes relevés ») : nom et quartier tirés des champs, commune sinon ville. */
export function depuisApi(r: ReleveApi): Releve {
  return {
    id: r.id,
    identifiant: r.identifiant,
    type: r.type,
    pharmacie_id: null,
    nom: typeof r.champs.nom === 'string' ? r.champs.nom : '',
    commune: (typeof r.champs.quartier === 'string' && r.champs.quartier) || r.ville?.nom || null,
    statut: r.statut,
    commentaire: r.commentaire,
    releve_le: r.releve_le,
    recu_le: r.recu_le,
    photos: r.photos.map((p) => ({ type: p.type })),
  };
}

function convertir<T, U>(r: ApiResult<T>, f: (x: T) => U): ApiResult<U> {
  return r.success ? { ...r, data: f(r.data) } : r;
}

/** Crée un relevé. L'identifiant vient du téléphone : un renvoi ne crée pas de doublon. */
export async function creerReleve(releve: NouveauReleve): Promise<ApiResult<Releve>> {
  const r = await appeler<ReleveApi>('/agent/releves', { methode: 'POST', corps: versCorpsApi(releve), entetes: await entetesAgent() });
  return convertir(r, depuisApi);
}

/** Ajoute une photo (image JPEG déjà réduite, 5 Mo au plus côté API). `releveId` : identifiant de l'API (re_…). */
export async function envoyerPhoto(releveId: string, type: TypePhotoReleve, photo: PhotoLocale): Promise<ApiResult<unknown>> {
  const corps = new FormData();
  corps.append('type', type);
  corps.append('largeur', String(photo.largeur));
  corps.append('hauteur', String(photo.hauteur));
  joindreFichier(corps, 'photo', photo.uri, `${type}.jpg`, 'image/jpeg');
  return appeler<unknown>(`/agent/releves/${encodeURIComponent(releveId)}/photos`, {
    methode: 'POST',
    corps,
    entetes: await entetesAgent(),
    delaiMs: 60_000,
  });
}

export async function lireReleves(): Promise<ApiResult<Releve[]>> {
  const r = await appeler<ReleveApi[]>('/agent/releves', { params: { per_page: 50 }, entetes: await entetesAgent() });
  return convertir(r, (liste) => liste.map(depuisApi));
}
