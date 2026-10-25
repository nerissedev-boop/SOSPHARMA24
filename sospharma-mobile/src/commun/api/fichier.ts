import { File } from 'expo-file-system';

/**
 * Ajoute un fichier local (photo, capture) à un envoi multipart.
 *
 * Depuis le SDK 58, Expo remplace `fetch` par le sien (expo/fetch), qui ne comprend pas
 * le format React Native `{ uri, name, type }` : la photo ne partait jamais et l'envoi
 * échouait en erreur réseau. On joint donc un `File` d'expo-file-system, que expo/fetch lit.
 * Sans module natif (tests Jest, démo dans le navigateur), on garde l'ancien format, que
 * l'adaptateur de démonstration accepte.
 */
export function joindreFichier(corps: FormData, champ: string, uri: string, nom: string, type: string): void {
  try {
    const fichier = new File(uri);
    corps.append(champ, fichier as unknown as Blob, nom);
    return;
  } catch {
    // Module natif absent : format React Native.
  }
  corps.append(champ, { uri, name: nom, type } as unknown as Blob);
}
