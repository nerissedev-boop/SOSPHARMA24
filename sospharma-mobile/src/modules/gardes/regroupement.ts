import type { PharmacieResume } from '@/commun/api';

/** Nombre de pharmacies montrées d'office : la nuit, personne ne va à la 40e. */
export const LIMITE_PREMIERES = 10;

export type GroupeCommune = {
  cle: string;
  nom: string;
  pharmacies: PharmacieResume[];
  /** Distance de la plus proche du groupe, null sans position. */
  plusProcheM: number | null;
};

/** Clé du groupe : la commune, sinon son nom (fiche sans commune rattachée). */
export function cleCommune(p: PharmacieResume): string {
  return p.commune_id || p.commune || '';
}

/**
 * Regroupe une liste déjà triée par distance, par commune : la commune de l'usager d'abord,
 * puis les autres de la plus proche à la plus lointaine. L'ordre dans un groupe est conservé.
 */
export function regrouperParCommune(liste: PharmacieResume[], communeCourante: string | null): GroupeCommune[] {
  const groupes = new Map<string, GroupeCommune>();
  for (const p of liste) {
    const cle = cleCommune(p);
    const groupe = groupes.get(cle) ?? {
      cle,
      nom: p.commune || '',
      pharmacies: [],
      plusProcheM: null,
    };
    groupe.pharmacies.push(p);
    if (p.distance_m !== null && (groupe.plusProcheM === null || p.distance_m < groupe.plusProcheM)) groupe.plusProcheM = p.distance_m;
    groupes.set(cle, groupe);
  }
  const rang = (g: GroupeCommune) => (g.cle !== '' && g.cle === communeCourante ? 0 : g.nom === '' ? 2 : 1);
  return [...groupes.values()].sort((a, b) => rang(a) - rang(b) || (a.plusProcheM ?? Infinity) - (b.plusProcheM ?? Infinity) || a.nom.localeCompare(b.nom));
}
