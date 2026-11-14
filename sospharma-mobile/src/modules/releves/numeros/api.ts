import { appeler, type ApiResult, type TelephonePharmacie } from '@/commun/api';

import { entetesAgent } from '../api';

/** Numéros d'une fiche, gérés sur place par l'agent (routes agent/pharmacies/{id}/telephones). */

export const clesNumeros = {
  pharmacie: (pharmacieId: string) => ['agent', 'telephones', pharmacieId] as const,
};

const chemin = (pharmacieId: string, telephoneId?: string) =>
  `/agent/pharmacies/${encodeURIComponent(pharmacieId)}/telephones${telephoneId ? `/${encodeURIComponent(telephoneId)}` : ''}`;

export async function lireNumeros(pharmacieId: string): Promise<ApiResult<TelephonePharmacie[]>> {
  return appeler<TelephonePharmacie[]>(chemin(pharmacieId), { entetes: await entetesAgent() });
}

/** Numéro tapé comme sur la devanture (« 07 07 12 34 56 ») : l'API le remet au format international. */
export async function ajouterNumero(
  pharmacieId: string,
  corps: { numero: string; whatsapp?: boolean; principal?: boolean },
): Promise<ApiResult<TelephonePharmacie>> {
  return appeler<TelephonePharmacie>(chemin(pharmacieId), { methode: 'POST', corps, entetes: await entetesAgent() });
}

export async function modifierNumero(
  pharmacieId: string,
  telephoneId: string,
  corps: { whatsapp?: boolean; principal?: true },
): Promise<ApiResult<TelephonePharmacie>> {
  return appeler<TelephonePharmacie>(chemin(pharmacieId, telephoneId), { methode: 'PATCH', corps, entetes: await entetesAgent() });
}

/** 204 ; le principal ne se retire qu'en dernier (422). */
export async function retirerNumero(pharmacieId: string, telephoneId: string): Promise<ApiResult<null>> {
  return appeler<null>(chemin(pharmacieId, telephoneId), { methode: 'DELETE', entetes: await entetesAgent() });
}
