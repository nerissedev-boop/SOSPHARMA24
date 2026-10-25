/**
 * Outils de fuseau horaire basés sur Intl (Hermes et Node le prennent en charge).
 * Toutes les dates de l'API sont en UTC ; l'heure locale se calcule avec le fuseau du pays.
 */

export type HeureLocale = {
  annee: number;
  mois: number; // 1-12
  jourDuMois: number;
  jourSemaine: number; // 0 = dimanche ... 6 = samedi
  heures: number;
  minutes: number;
};

const JOURS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formateurs = new Map<string, Intl.DateTimeFormat>();

function formateur(fuseau: string): Intl.DateTimeFormat {
  let f = formateurs.get(fuseau);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: fuseau,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    formateurs.set(fuseau, f);
  }
  return f;
}

/** Heure locale d'un instant dans un fuseau IANA (ex. Africa/Abidjan). */
export function heureLocale(instant: Date, fuseau: string): HeureLocale {
  const parts = formateur(fuseau).formatToParts(instant);
  const val = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const heures = Number(val('hour')) % 24;
  return {
    annee: Number(val('year')),
    mois: Number(val('month')),
    jourDuMois: Number(val('day')),
    jourSemaine: JOURS[val('weekday')] ?? 0,
    heures,
    minutes: Number(val('minute')),
  };
}

/** Décalage du fuseau par rapport à UTC, en millisecondes, à un instant donné. */
export function decalageFuseau(instant: Date, fuseau: string): number {
  const h = heureLocale(instant, fuseau);
  const commeUtc = Date.UTC(h.annee, h.mois - 1, h.jourDuMois, h.heures, h.minutes);
  const instantArrondi = Math.floor(instant.getTime() / 60000) * 60000;
  return commeUtc - instantArrondi;
}

/** Convertit une date/heure locale (dans le fuseau) en instant UTC. */
export function localVersUtc(
  annee: number,
  mois: number,
  jour: number,
  heures: number,
  minutes: number,
  fuseau: string,
): Date {
  const commeUtc = Date.UTC(annee, mois - 1, jour, heures, minutes);
  let instant = new Date(commeUtc - decalageFuseau(new Date(commeUtc), fuseau));
  // Second passage pour les changements d'heure éventuels.
  instant = new Date(commeUtc - decalageFuseau(instant, fuseau));
  return instant;
}

/** "07:00" -> 420 */
export function minutesDepuisMinuit(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** ISO 8601 UTC sans millisecondes, comme l'API (2026-10-20T23:40:12Z). */
export function isoUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Vrai entre 19:00 et 06:00 heure locale du pays (mode nuit automatique). */
export function estHeureDeNuit(instant: Date, fuseau: string, debut = 19, fin = 6): boolean {
  const { heures } = heureLocale(instant, fuseau);
  return heures >= debut || heures < fin;
}

/** Fuseau de l'appareil, utilisé tant que la configuration du pays n'est pas chargée. */
export function fuseauAppareil(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
