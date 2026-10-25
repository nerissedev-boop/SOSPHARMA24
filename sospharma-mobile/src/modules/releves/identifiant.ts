import * as Crypto from 'expo-crypto';

/**
 * Identifiant de relevé généré sur le téléphone (UUID v4) : il accompagne chaque envoi,
 * pour qu'un renvoi après une coupure ne crée pas de second relevé (idempotence).
 */
export function nouvelIdentifiantReleve(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    const hex = (n: number) =>
      Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `${hex(8)}-${hex(4)}-4${hex(3)}-${((Math.random() * 4) | 8).toString(16)}${hex(3)}-${hex(12)}`;
  }
}
