import { calculerStatut, type DonneesStatut, type Statut } from '../statut';
import cas from './cas-statut.json';

type Cas = {
  nom: string;
  maintenant: string;
  fuseau: string;
  pharmacie: DonneesStatut;
  attendu: { statut: Statut; prochaine_ouverture: string | null };
};

describe('Règle de statut (cas partagés avec l\'API)', () => {
  it.each((cas.cas as Cas[]).map((c) => [c.nom, c] as const))('%s', (_nom, c) => {
    const resultat = calculerStatut(c.pharmacie, new Date(c.maintenant), c.fuseau);
    expect({ statut: resultat.statut, prochaine_ouverture: resultat.prochaine_ouverture }).toEqual(c.attendu);
  });

  it('renvoie l\'heure de fermeture de la plage en cours', () => {
    const r = calculerStatut(
      { h24: false, horaires: [{ jour: 2, ouverture: '08:00', fermeture: '22:00' }], gardes: [] },
      new Date('2026-10-20T10:00:00Z'),
      'Africa/Abidjan',
    );
    expect(r.ferme_a).toBe('22:00');
  });
});
