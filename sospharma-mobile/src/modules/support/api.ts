import { appeler, type ApiResult, type MessageSupport, type Pays, type SujetSupport } from '@/commun/api';

export type NouveauMessage = { sujet: SujetSupport; message: string; contact: string | null };

/** POST /support/messages (limité par appareil côté API). */
export function envoyerMessage(corps: NouveauMessage): Promise<ApiResult<MessageSupport>> {
  return appeler<MessageSupport>('/support/messages', { methode: 'POST', corps });
}

/** POST /support/messages/{id}/capture : image jointe (5 Mo au plus). */
export function joindreCapture(messageId: string, uri: string, type = 'image/jpeg'): Promise<ApiResult<unknown>> {
  const donnees = new FormData();
  // Format attendu par React Native pour un fichier dans un FormData.
  donnees.append('capture', { uri, name: 'capture.jpg', type } as unknown as Blob);
  return appeler(`/support/messages/${encodeURIComponent(messageId)}/capture`, { methode: 'POST', corps: donnees, delaiMs: 60_000 });
}

/**
 * Coordonnées du support (WhatsApp, téléphone, e-mail) : elles font partie de la
 * configuration pays. Même clé de cache que le module Territoire (['pays']) ;
 * l'appel est refait ici pour que Support ne dépende d'aucun autre module.
 */
export const clePays = ['pays'] as const;
export function lirePays(): Promise<ApiResult<Pays[]>> {
  return appeler<Pays[]>('/pays');
}
