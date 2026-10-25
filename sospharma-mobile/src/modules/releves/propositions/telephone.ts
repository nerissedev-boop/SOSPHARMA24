/**
 * Numéro saisi par l'usager → format international attendu par l'API (+2250102030405).
 * « 01 02 03 04 05 » devient « +225 » + les chiffres ; « 00225… » devient « +225… ».
 * Renvoie null si le champ est vide, et la saisie telle quelle (sans espaces) si elle est inexploitable :
 * l'API répondra alors par une erreur de champ lisible.
 */
export function numeroInternational(saisie: string, indicatif: string | undefined): string | null {
  const brut = saisie.trim();
  if (brut === '') return null;
  const chiffres = brut.replace(/[^\d]/g, '');
  if (brut.startsWith('+')) return `+${chiffres}`;
  if (chiffres.startsWith('00')) return `+${chiffres.slice(2)}`;
  const prefixe = (indicatif ?? '').replace(/[^\d]/g, '');
  if (prefixe === '' || chiffres.length < 6) return brut.replace(/\s/g, '');
  return `+${prefixe}${chiffres}`;
}
