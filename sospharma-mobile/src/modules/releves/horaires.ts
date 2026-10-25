import type { PlageHoraire } from '@/commun/api';

/** Lundi d'abord, dimanche en dernier (jour : 0 = dimanche, comme l'API). */
export const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];
const ABREGES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** Horaires par défaut d'un relevé : lundi au samedi 08:00 à 21:00, dimanche fermée. */
export const HORAIRES_DEFAUT: PlageHoraire[] = [1, 2, 3, 4, 5, 6].map((jour) => ({ jour, ouverture: '08:00', fermeture: '21:00' }));

export function abregeJour(jour: number): string {
  return ABREGES[jour] ?? '';
}

function plagesDuJour(plages: PlageHoraire[], jour: number): string {
  const liste = plages.filter((p) => p.jour === jour).sort((a, b) => a.ouverture.localeCompare(b.ouverture));
  if (liste.length === 0) return 'fermée';
  return liste.map((p) => `${p.ouverture} à ${p.fermeture}`).join(' et ');
}

/** « Lun. au sam. 08:00 à 21:00, dim. fermée » (maquette 27). */
export function resumeHoraires(plages: PlageHoraire[], h24 = false): string {
  if (h24) return 'Ouverte 24h/24, 7j/7';
  const groupes: { debut: number; fin: number; texte: string }[] = [];
  for (const jour of ORDRE_JOURS) {
    const texte = plagesDuJour(plages, jour);
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.texte === texte) dernier.fin = jour;
    else groupes.push({ debut: jour, fin: jour, texte });
  }
  const phrase = groupes
    .map((g) => (g.debut === g.fin ? `${abregeJour(g.debut)} ${g.texte}` : `${abregeJour(g.debut)} au ${abregeJour(g.fin)} ${g.texte}`))
    .join(', ');
  return phrase.charAt(0).toLocaleUpperCase('fr') + phrase.slice(1);
}

/** « 08:00 », « 8:00 » ou « 0800 » -> « 08:00 » ; null si l'heure est invalide. */
export function normaliserHeure(saisie: string): string | null {
  const m = saisie.trim().match(/^(\d{1,2})[:h]?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
