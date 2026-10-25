import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ApiResult, NouveauReleve, Releve } from '@/commun/api';
import { signalerErreur, stockageSynchrone } from '@/commun/lib';

import { creerReleve, envoyerPhoto } from './api';
import type { PhotoLocale, TypePhotoReleve } from './types';

/**
 * File d'attente hors connexion des relevés (MMKV) : un relevé validé par l'agent y entre
 * tout de suite, puis part dès que le réseau le permet. Chaque relevé garde l'identifiant
 * généré par le téléphone : un renvoi (réponse perdue, coupure) ne crée pas de doublon.
 */
export type PhotoEnFile = PhotoLocale & { type: TypePhotoReleve; envoyee: boolean };

export type ReleveEnFile = {
  releve: NouveauReleve;
  /** Commune affichée dans « Mes relevés » avant l'envoi. */
  commune: string | null;
  photos: PhotoEnFile[];
  /** Vrai dès que l'API a accepté le relevé (il ne reste que des photos à envoyer). */
  cree: boolean;
  /** Identifiant donné par l'API à la création (re_…) : les photos sont envoyées sur celui-ci. */
  idServeur?: string | null;
  tentatives: number;
  erreur: string | null;
  /** Refusé par l'API (champ invalide, droits) : n'est plus renvoyé automatiquement. */
  bloque: boolean;
  misEnFileLe: string;
};

type EtatFile = {
  elements: ReleveEnFile[];
  ajouter: (element: ReleveEnFile) => void;
  modifier: (id: string, partiel: Partial<ReleveEnFile>) => void;
  retirer: (id: string) => void;
  vider: () => void;
};

export const useFileReleves = create<EtatFile>()(
  persist(
    (set) => ({
      elements: [],
      ajouter: (element) =>
        set((e) => ({ elements: [...e.elements.filter((x) => x.releve.id !== element.releve.id), element] })),
      modifier: (id, partiel) =>
        set((e) => ({ elements: e.elements.map((x) => (x.releve.id === id ? { ...x, ...partiel } : x)) })),
      retirer: (id) => set((e) => ({ elements: e.elements.filter((x) => x.releve.id !== id) })),
      vider: () => set({ elements: [] }),
    }),
    { name: 'releves.file', version: 1, storage: createJSONStorage(() => stockageSynchrone) },
  ),
);

/** Met un relevé en file (avant tout envoi). */
export function mettreEnFile(
  releve: NouveauReleve,
  photos: Partial<Record<TypePhotoReleve, PhotoLocale>>,
  commune: string | null,
): ReleveEnFile {
  const element: ReleveEnFile = {
    releve,
    commune,
    photos: (Object.entries(photos) as [TypePhotoReleve, PhotoLocale | undefined][])
      .filter((x): x is [TypePhotoReleve, PhotoLocale] => Boolean(x[1]))
      .map(([type, p]) => ({ ...p, type, envoyee: false })),
    cree: false,
    tentatives: 0,
    erreur: null,
    bloque: false,
    misEnFileLe: new Date().toISOString(),
  };
  useFileReleves.getState().ajouter(element);
  return element;
}

export type Envoyeurs = {
  creer: (r: NouveauReleve) => Promise<ApiResult<Releve>>;
  photo: (releveId: string, type: TypePhotoReleve, p: PhotoLocale) => Promise<ApiResult<unknown>>;
};

const ENVOYEURS_API: Envoyeurs = { creer: creerReleve, photo: envoyerPhoto };

export type BilanEnvoi = { envoyes: number; restants: number; horsLigne: boolean; sessionExpiree: boolean };

/** Codes qui laissent le relevé en file pour un nouvel essai plus tard. */
const CODES_REESSAI = new Set(['NETWORK_ERROR', 'SERVER_ERROR', 'MAINTENANCE', 'INVALID_RESPONSE', 'TOO_MANY_REQUESTS']);

let envoiEnCours: Promise<BilanEnvoi> | null = null;

/**
 * Envoie la file dans l'ordre : création du relevé (même identifiant à chaque essai), puis
 * ses photos une par une. Arrêt au premier problème de réseau. Un seul envoi à la fois.
 */
export function envoyerFile(envoyeurs: Envoyeurs = ENVOYEURS_API): Promise<BilanEnvoi> {
  if (envoiEnCours) return envoiEnCours;
  const envoi = (async (): Promise<BilanEnvoi> => {
    const bilan: BilanEnvoi = { envoyes: 0, restants: 0, horsLigne: false, sessionExpiree: false };
    const { modifier, retirer } = useFileReleves.getState();
    try {
      for (const depart of [...useFileReleves.getState().elements]) {
        if (depart.bloque) continue;
        const id = depart.releve.id;
        let element = depart;

        // Sans identifiant de l'API (ancienne file), le relevé est renvoyé : l'API répond avec l'existant.
        if (!element.cree || !element.idServeur) {
          const r = await envoyeurs.creer(element.releve);
          if (!r.success) {
            if (r.error.code === 'UNAUTHENTICATED') {
              bilan.sessionExpiree = true;
              break;
            }
            const reessai = CODES_REESSAI.has(r.error.code);
            modifier(id, { tentatives: element.tentatives + 1, erreur: r.error.message, bloque: !reessai });
            if (r.error.code === 'NETWORK_ERROR') {
              bilan.horsLigne = true;
              break;
            }
            continue;
          }
          element = { ...element, cree: true, idServeur: r.data.id, erreur: null };
          modifier(id, { cree: true, idServeur: r.data.id, erreur: null });
        }

        let interrompu = false;
        for (const photo of element.photos) {
          if (photo.envoyee) continue;
          const r = await envoyeurs.photo(element.idServeur as string, photo.type, photo);
          if (r.success) {
            const photos = (useFileReleves.getState().elements.find((x) => x.releve.id === id)?.photos ?? element.photos).map((p) =>
              p.type === photo.type ? { ...p, envoyee: true } : p,
            );
            element = { ...element, photos };
            modifier(id, { photos });
            continue;
          }
          interrompu = true;
          if (r.error.code === 'NOT_FOUND') {
            // Le relevé n'existe plus côté API : il sera recréé (même identifiant) au prochain essai.
            modifier(id, { cree: false, idServeur: null, tentatives: element.tentatives + 1, erreur: r.error.message });
          } else {
            modifier(id, { tentatives: element.tentatives + 1, erreur: r.error.message });
          }
          if (r.error.code === 'NETWORK_ERROR') bilan.horsLigne = true;
          if (r.error.code === 'UNAUTHENTICATED') bilan.sessionExpiree = true;
          break;
        }
        if (interrompu) {
          if (bilan.horsLigne || bilan.sessionExpiree) break;
          continue;
        }
        retirer(id);
        bilan.envoyes += 1;
      }
    } catch (e) {
      signalerErreur(e, { etape: 'file-releves' });
    }
    bilan.restants = useFileReleves.getState().elements.length;
    return bilan;
  })();
  envoiEnCours = envoi;
  // Libéré après coup (et non dans l'envoi) : un envoi sans attente ne doit pas rester mémorisé.
  void envoi.then(() => {
    if (envoiEnCours === envoi) envoiEnCours = null;
  });
  return envoi;
}
