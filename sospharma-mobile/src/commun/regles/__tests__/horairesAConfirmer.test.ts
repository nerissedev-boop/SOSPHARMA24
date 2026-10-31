import { libelleStatut, tonAffiche } from '../libelles';
import { calculerStatut, estInactive } from '../statut';

const ABIDJAN = 'Africa/Abidjan';
const MARDI = new Date('2026-10-20T10:00:00Z');

describe('« Horaires à confirmer » (fiches importées sans horaires, 31 oct.)', () => {
  it('sans horaire, ni garde, ni 24h/24 : inconnue, pas fermée', () => {
    expect(calculerStatut({ h24: false, horaires: [], gardes: [] }, MARDI, ABIDJAN)).toEqual({
      statut: 'inconnue',
      prochaine_ouverture: null,
      ferme_a: null,
    });
  });

  it('une garde ou le 24h/24 restent prioritaires', () => {
    expect(calculerStatut({ h24: true, horaires: [], gardes: [] }, MARDI, ABIDJAN).statut).toBe('ouverte');
    const garde = { debut: '2026-10-19T08:00:00Z', fin: '2026-10-26T08:00:00Z' };
    expect(calculerStatut({ h24: false, horaires: [], gardes: [garde] }, MARDI, ABIDJAN).statut).toBe('garde');
  });

  it('libellé neutre, jamais en ocre, et compté comme inactive', () => {
    const p = { statut: 'inconnue' as const, h24: false, ferme_a: null, prochaine_ouverture: null, garde: null };
    expect(libelleStatut(p, ABIDJAN, 'liste', MARDI)).toBe('Horaires à confirmer');
    expect(tonAffiche(p, ABIDJAN, MARDI)).not.toBe('ocre');
    expect(estInactive('inconnue')).toBe(true);
    expect(estInactive('fermee')).toBe(true);
    expect(estInactive('ouverte')).toBe(false);
  });
});
