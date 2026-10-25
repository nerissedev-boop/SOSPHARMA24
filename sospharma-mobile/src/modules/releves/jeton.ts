import * as SecureStore from 'expo-secure-store';

import { signalerErreur } from '@/commun/lib';

/**
 * Jeton Sanctum de l'agent : gardé dans expo-secure-store (trousseau iOS, Keystore Android),
 * jamais dans MMKV. Sans « Rester connecté », il ne vit qu'en mémoire jusqu'à la fermeture.
 */
const CLE = 'sospharma.agent.jeton';
let enMemoire: string | null = null;

export async function lireJeton(): Promise<string | null> {
  if (enMemoire) return enMemoire;
  try {
    enMemoire = await SecureStore.getItemAsync(CLE);
  } catch (e) {
    signalerErreur(e, { etape: 'jeton-agent' });
    enMemoire = null;
  }
  return enMemoire;
}

export async function enregistrerJeton(jeton: string, persister: boolean): Promise<void> {
  enMemoire = jeton;
  try {
    if (persister) await SecureStore.setItemAsync(CLE, jeton);
    else await SecureStore.deleteItemAsync(CLE);
  } catch (e) {
    signalerErreur(e, { etape: 'jeton-agent' });
  }
}

export async function effacerJeton(): Promise<void> {
  enMemoire = null;
  try {
    await SecureStore.deleteItemAsync(CLE);
  } catch (e) {
    signalerErreur(e, { etape: 'jeton-agent' });
  }
}
