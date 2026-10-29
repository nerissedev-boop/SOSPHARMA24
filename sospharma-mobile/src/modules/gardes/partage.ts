import type { PharmacieResume } from '@/commun/api';
import { minusculeInitiale, t, telephoneAffiche } from '@/commun/lib';
import { libelleStatut } from '@/commun/regles';

type DonneesDetail = Pick<PharmacieResume, 'commune' | 'statut' | 'h24' | 'ferme_a' | 'prochaine_ouverture' | 'garde'>;

/**
 * 2e ligne d'une pharmacie de garde (maquette « cartes arrondies ») : sa commune, et son statut
 * seulement s'il diffère de « Ouverte toute la nuit » (« Cocody · ouverte jusqu'à 02:00 »).
 * `restreinte` : la garde s'arrête avant le matin (ligne en ocre).
 */
export function detailGarde(p: DonneesDetail, fuseau: string, maintenant: Date = new Date()): { texte: string; restreinte: boolean } {
  const statut = libelleStatut(p, fuseau, 'garde', maintenant);
  const restreinte = statut !== t('statut.gardeTouteNuit');
  if (!p.commune) return { texte: statut, restreinte };
  return { texte: restreinte ? `${p.commune} · ${minusculeInitiale(statut)}` : p.commune, restreinte };
}

type DonneesPartage = {
  /** Zone affichée dans l'en-tête (« Cocody, Abidjan »). */
  zone: string;
  /** Bornes du tour, déjà formatées (bornesLongues), ou null si le tour n'est pas chargé. */
  bornes: { debut: string; fin: string } | null;
  /** Pharmacies de la liste affichée, dans l'ordre affiché. */
  pharmacies: Pick<PharmacieResume, 'nom' | 'commune' | 'telephone'>[];
  /** Indicatif du pays, pour écrire les numéros par groupes (« +225 01 23 45 67 89 »). */
  indicatif?: string;
};

/**
 * Texte envoyé par « Partager » sur l'écran Garde : titre et zone, période du tour,
 * une ligne par pharmacie de la liste affichée (nom, commune, téléphone), puis la signature.
 */
export function texteListeGardes({ zone, bornes, pharmacies, indicatif }: DonneesPartage): string {
  const lignes = pharmacies.map((p) => {
    const pharmacie = p.commune ? `${p.nom} (${p.commune})` : p.nom;
    return p.telephone
      ? t('garde.partageLigne', { pharmacie, telephone: telephoneAffiche(p.telephone, indicatif) })
      : t('garde.partageLigneSansTelephone', { pharmacie });
  });
  return [
    t('garde.partageTitre', { zone }),
    bornes ? t('garde.tour', bornes) : null,
    '',
    ...(lignes.length > 0 ? lignes : [t('garde.aucune')]),
    '',
    t('garde.partageSignature'),
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}
