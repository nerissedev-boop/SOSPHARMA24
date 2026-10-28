/**
 * Formats d'affichage via Intl (langue de l'interface, fuseau du pays).
 * Règle de rédaction : pas de séparateur « · » dans les méta.
 */
import { localeActive } from './i18n';

const unDecimale = () => new Intl.NumberFormat(localeActive(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const entier = () => new Intl.NumberFormat(localeActive(), { maximumFractionDigits: 0 });

/** 440 -> "0,4" ; 12500 -> "13" (au-delà de 10 km, sans décimale). */
export function distanceNombre(metres: number): string {
  const km = metres / 1000;
  return km >= 10 ? entier().format(km) : unDecimale().format(km);
}

/** 440 -> "0,4 km" */
export function distanceKm(metres: number | null | undefined): string {
  if (metres === null || metres === undefined) return '';
  return `${distanceNombre(metres)} km`;
}

/** Distance arrondie au kilomètre (listes de communes) : 4200 -> "4 km". */
export function distanceKmEntier(metres: number): string {
  return `${entier().format(Math.max(1, Math.round(metres / 1000)))} km`;
}

function partie(date: Date, fuseau: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(localeActive(), { timeZone: fuseau, ...options }).format(date);
}

/** "sam. 17 oct." */
export function dateCourte(iso: string, fuseau: string): string {
  return partie(new Date(iso), fuseau, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "17 oct." */
export function jourMois(iso: string, fuseau: string): string {
  return partie(new Date(iso), fuseau, { day: 'numeric', month: 'short' });
}

/** "sam. 17" */
export function jourSemaineEtNumero(iso: string, fuseau: string): string {
  return partie(new Date(iso), fuseau, { weekday: 'short', day: 'numeric' });
}

/** "17" */
export function numeroJour(iso: string, fuseau: string): string {
  return partie(new Date(iso), fuseau, { day: 'numeric' });
}

/** "lun." */
export function jourSemaine(iso: string, fuseau: string): string {
  return partie(new Date(iso), fuseau, { weekday: 'short' });
}

/** "07:00" */
export function heure(iso: string | Date, fuseau: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return partie(d, fuseau, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

function memeMois(a: string, b: string, fuseau: string): boolean {
  return partie(new Date(a), fuseau, { month: 'numeric', year: 'numeric' }) ===
    partie(new Date(b), fuseau, { month: 'numeric', year: 'numeric' });
}

/** Dates d'un tour de garde : { debut: "17", fin: "24 oct." } (bloc de l'accueil). */
export function bornesCourtes(debut: string, fin: string, fuseau: string): { debut: string; fin: string } {
  return {
    debut: memeMois(debut, fin, fuseau) ? numeroJour(debut, fuseau) : jourMois(debut, fuseau),
    fin: jourMois(fin, fuseau),
  };
}

/** Dates d'un tour de garde : { debut: "sam. 17", fin: "sam. 24 oct." } (écran Garde). */
export function bornesLongues(debut: string, fin: string, fuseau: string): { debut: string; fin: string } {
  return {
    debut: memeMois(debut, fin, fuseau) ? jourSemaineEtNumero(debut, fuseau) : dateCourte(debut, fuseau),
    fin: dateCourte(fin, fuseau),
  };
}

/** "+2250123456789" -> "+225 01 23 45 67 89" */
export function telephoneAffiche(numero: string, indicatif?: string): string {
  const propre = numero.replace(/[^\d+]/g, '');
  const ind = indicatif && propre.startsWith(indicatif) ? indicatif : (propre.match(/^\+\d{3}/)?.[0] ?? '');
  const reste = propre.slice(ind.length);
  const groupes = reste.match(/.{1,2}/g) ?? [];
  return [ind, ...groupes].filter(Boolean).join(' ');
}

/** "Abidjan" -> "d'Abidjan" ; "Bouaké" -> "de Bouaké" */
export function de(nom: string): string {
  return /^[aeiouyàâéèêîôûhAEIOUYÀÂÉÈÊÎÔÛH]/.test(nom) ? `d'${nom}` : `de ${nom}`;
}

/** Initiales pour l'avatar du profil : "Amani Kouadio" -> "AK" */
export function initiales(prenom: string, nom: string): string {
  return `${prenom.trim()[0] ?? ''}${nom.trim()[0] ?? ''}`.toUpperCase();
}

/** Première lettre en minuscule (« De garde cette nuit » -> « de garde cette nuit »). */
export function minusculeInitiale(texte: string): string {
  return texte.length ? texte[0]!.toLocaleLowerCase(localeActive()) + texte.slice(1) : texte;
}
