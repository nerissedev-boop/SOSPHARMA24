import type { PharmacieResume, StatutPharmacie } from '../api/schema';
import { heure, jourSemaine } from '../lib/format';
import { t } from '../lib/i18n';
import { heureLocale, minutesDepuisMinuit } from '../lib/temps';
import { calculerStatut } from './statut';

/**
 * Libellés de statut de la charte : « Ouverte 24h/24 », « Ouverte jusqu'à 22:00 »,
 * « Fermée, ouvre à 07:00 », « De garde cette nuit », « Ouverte toute la nuit ».
 * Le contexte change la formulation (liste générale, liste de garde, fiche sur la carte).
 */
export type ContexteLibelle = 'liste' | 'garde' | 'carte';
export type TonStatut = 'vert' | 'rouge' | 'gris' | 'ocre';

/** En deçà, une pharmacie ouverte ou de garde « ferme bientôt » (ton ocre). */
export const SEUIL_FERME_BIENTOT_MIN = 30;

export type DonneesLibelle = Pick<PharmacieResume, 'statut' | 'h24' | 'ferme_a' | 'prochaine_ouverture' | 'garde'>;

export function tonDuStatut(statut: StatutPharmacie): TonStatut {
  return statut === 'garde' ? 'rouge' : statut === 'ouverte' ? 'vert' : 'gris';
}

/**
 * Minutes avant la fermeture si elle arrive dans moins de 30 min (ouverte non 24h/24, ou garde avec heure de fin),
 * sinon null. Heures « HH:MM » dans le fuseau du pays ; une fermeture après minuit est gérée.
 */
export function minutesAvantFermeture(p: DonneesLibelle, fuseau: string, maintenant: Date = new Date()): number | null {
  const fin = p.statut === 'ouverte' && !p.h24 ? p.ferme_a : p.statut === 'garde' ? (p.garde?.jusqua ?? null) : null;
  if (!fin || !/^\d{1,2}:\d{2}$/.test(fin)) return null;
  const ici = heureLocale(maintenant, fuseau);
  const ecart = (minutesDepuisMinuit(fin) - (ici.heures * 60 + ici.minutes) + 1440) % 1440;
  return ecart > 0 && ecart <= SEUIL_FERME_BIENTOT_MIN ? ecart : null;
}

/** Ton affiché : celui du statut, ou ocre si la pharmacie ferme dans moins de 30 min. */
export function tonAffiche(p: DonneesLibelle, fuseau: string, maintenant: Date = new Date()): TonStatut {
  return minutesAvantFermeture(p, fuseau, maintenant) !== null ? 'ocre' : tonDuStatut(p.statut);
}

export function libelleStatut(
  p: DonneesLibelle,
  fuseau: string,
  contexte: ContexteLibelle = 'liste',
  maintenant: Date = new Date(),
): string {
  const bientot = minutesAvantFermeture(p, fuseau, maintenant);
  if (bientot !== null) {
    const fin = p.statut === 'garde' ? p.garde?.jusqua : p.ferme_a;
    return contexte === 'liste' && p.statut === 'ouverte'
      ? t('statut.fermeDans', { minutes: bientot })
      : t('statut.fermeDansHeure', { minutes: bientot, heure: fin });
  }
  switch (p.statut) {
    case 'garde': {
      const jusqua = p.garde?.jusqua ?? null;
      if (contexte === 'garde') return jusqua ? t('statut.gardeJusqua', { heure: jusqua }) : t('statut.gardeTouteNuit');
      if (contexte === 'carte') return jusqua ? t('statut.gardeCarteJusqua', { heure: jusqua }) : t('statut.gardeCarte');
      return t('statut.garde');
    }
    case 'ouverte':
      if (p.h24) return t('statut.h24');
      if (p.ferme_a) return t('statut.ouverteJusqua', { heure: p.ferme_a });
      return t('statut.ouverte');
    case 'inconnue':
      return t('statut.inconnue');
    case 'fermee':
    default: {
      if (!p.prochaine_ouverture) return t('statut.fermee');
      const h = heure(p.prochaine_ouverture, fuseau);
      const dansMoinsDe24h = Date.parse(p.prochaine_ouverture) - maintenant.getTime() < 24 * 3600 * 1000;
      return dansMoinsDe24h
        ? t('statut.fermeeOuvre', { heure: h })
        : t('statut.fermeeOuvreJour', { jour: jourSemaine(p.prochaine_ouverture, fuseau), heure: h });
    }
  }
}

/**
 * Hors connexion : recalcule le statut sur le téléphone avec les horaires et gardes
 * en cache, avec la même règle que l'API.
 */
export function avecStatutLocal<T extends PharmacieResume>(p: T, fuseau: string, maintenant: Date = new Date()): T {
  const r = calculerStatut({ h24: p.h24, horaires: p.horaires, gardes: p.gardes }, maintenant, fuseau);
  return { ...p, statut: r.statut, prochaine_ouverture: r.prochaine_ouverture, ferme_a: r.ferme_a };
}
