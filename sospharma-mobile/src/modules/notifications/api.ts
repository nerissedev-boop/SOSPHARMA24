import { appeler, type ApiResult, type Appareil } from '@/commun/api';

export type EnregistrementAppareil = {
  identifiant: string;
  jeton_expo: string | null;
  ville_suivie: string | null;
  plateforme: string;
};

/** POST /appareils : enregistre l'appareil (sans compte) et renvoie son jeton. */
export function enregistrerAppareil(corps: EnregistrementAppareil): Promise<ApiResult<Appareil>> {
  return appeler<Appareil>('/appareils', { methode: 'POST', corps });
}

export type ModificationAppareil = Partial<{
  ville_suivie: string | null;
  commune_defaut: string | null;
  notification_garde: boolean;
  jeton_expo: string | null;
}>;

/** PATCH /appareils/moi : ville suivie, commune par défaut, notification garde. */
export function modifierAppareil(corps: ModificationAppareil): Promise<ApiResult<Appareil>> {
  return appeler<Appareil>('/appareils/moi', { methode: 'PATCH', corps });
}
