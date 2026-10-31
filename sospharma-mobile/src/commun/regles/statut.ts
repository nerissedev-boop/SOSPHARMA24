import { heureLocale, isoUtc, localVersUtc, minutesDepuisMinuit } from '../lib/temps';

/**
 * Règle de statut d'une pharmacie, recopiée de l'API (une seule règle, mêmes cas de test :
 * src/commun/regles/__tests__/cas-statut.json, partagé avec l'API Laravel).
 *
 * Priorité : garde > ouverte > fermée.
 * - garde : une garde dont la période [debut, fin[ couvre l'instant ;
 * - ouverte : h24, ou l'heure locale tombe dans une plage du jour (une plage dont la
 *   fermeture est avant l'ouverture passe minuit) ;
 * - inconnue : aucune plage connue (horaires à confirmer : on ne dit pas « fermée ») ;
 * - fermée : sinon, avec la prochaine ouverture (ISO UTC).
 *
 * L'app ne s'en sert que hors connexion (ou sur des données en cache) : en ligne,
 * le statut vient de l'API.
 */

export type Statut = 'garde' | 'ouverte' | 'fermee' | 'inconnue';

/** Ni de garde ni ouverte : fermée ou horaires à confirmer (pastille grise, pas « la plus proche ouverte »). */
export function estInactive(statut: Statut): boolean {
  return statut === 'fermee' || statut === 'inconnue';
}

export type Plage = { jour: number; ouverture: string; fermeture: string };
export type PeriodeGarde = { debut: string; fin: string };

export type DonneesStatut = {
  h24: boolean;
  horaires: Plage[];
  gardes: PeriodeGarde[];
};

export type ResultatStatut = {
  statut: Statut;
  /** ISO UTC de la prochaine ouverture si fermée, sinon null. */
  prochaine_ouverture: string | null;
  /** Heure locale de fin de la plage en cours ("22:00") si ouverte selon ses horaires. */
  ferme_a: string | null;
};

const MINUTES_JOUR = 24 * 60;

function passeMinuit(p: Plage): boolean {
  return minutesDepuisMinuit(p.fermeture) <= minutesDepuisMinuit(p.ouverture);
}

export function calculerStatut(p: DonneesStatut, maintenant: Date, fuseau: string): ResultatStatut {
  const t = maintenant.getTime();
  const enGarde = p.gardes.some((g) => Date.parse(g.debut) <= t && t < Date.parse(g.fin));
  if (enGarde) return { statut: 'garde', prochaine_ouverture: null, ferme_a: null };
  if (p.h24) return { statut: 'ouverte', prochaine_ouverture: null, ferme_a: null };
  if (p.horaires.length === 0) return { statut: 'inconnue', prochaine_ouverture: null, ferme_a: null };

  const local = heureLocale(maintenant, fuseau);
  const m = local.heures * 60 + local.minutes;
  const veille = (local.jourSemaine + 6) % 7;

  for (const plage of p.horaires) {
    const ouv = minutesDepuisMinuit(plage.ouverture);
    const ferm = minutesDepuisMinuit(plage.fermeture);
    if (plage.jour === local.jourSemaine) {
      if (!passeMinuit(plage) && ouv <= m && m < ferm) {
        return { statut: 'ouverte', prochaine_ouverture: null, ferme_a: plage.fermeture };
      }
      if (passeMinuit(plage) && m >= ouv) {
        return { statut: 'ouverte', prochaine_ouverture: null, ferme_a: plage.fermeture };
      }
    }
    if (plage.jour === veille && passeMinuit(plage) && m < ferm) {
      return { statut: 'ouverte', prochaine_ouverture: null, ferme_a: plage.fermeture };
    }
  }

  return { statut: 'fermee', prochaine_ouverture: prochaineOuverture(p.horaires, maintenant, fuseau), ferme_a: null };
}

function prochaineOuverture(horaires: Plage[], maintenant: Date, fuseau: string): string | null {
  if (horaires.length === 0) return null;
  const local = heureLocale(maintenant, fuseau);
  const m = local.heures * 60 + local.minutes;
  for (let k = 0; k <= 7; k++) {
    const jour = (local.jourSemaine + k) % 7;
    const candidates = horaires
      .filter((h) => h.jour === jour)
      .map((h) => minutesDepuisMinuit(h.ouverture))
      .filter((ouv) => k > 0 || ouv > m)
      .sort((a, b) => a - b);
    const premiere = candidates[0];
    if (premiere !== undefined) {
      // Date locale du jour k (le calcul en UTC évite les surprises de l'appareil).
      const base = new Date(Date.UTC(local.annee, local.mois - 1, local.jourDuMois + k));
      const instant = localVersUtc(
        base.getUTCFullYear(),
        base.getUTCMonth() + 1,
        base.getUTCDate(),
        Math.floor(premiere / 60) % 24,
        premiere % 60,
        fuseau,
      );
      return isoUtc(instant);
    }
  }
  return null;
}

export { MINUTES_JOUR };
