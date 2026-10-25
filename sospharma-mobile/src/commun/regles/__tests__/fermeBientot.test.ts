import { libelleStatut, minutesAvantFermeture, tonAffiche } from '../libelles';

const ABIDJAN = 'Africa/Abidjan'; // UTC+0
const a = (iso: string) => new Date(iso);
const ouverte = { statut: 'ouverte' as const, h24: false, ferme_a: '22:00', prochaine_ouverture: null, garde: null };

describe('« Ferme bientôt » (ocre, palette enrichie)', () => {
  it('signale une fermeture dans moins de 30 min', () => {
    expect(minutesAvantFermeture(ouverte, ABIDJAN, a('2026-10-23T21:40:00Z'))).toBe(20);
    expect(tonAffiche(ouverte, ABIDJAN, a('2026-10-23T21:40:00Z'))).toBe('ocre');
    expect(libelleStatut(ouverte, ABIDJAN, 'liste', a('2026-10-23T21:40:00Z'))).toBe('Ferme dans 20 min');
  });

  it('reste vert au-delà de 30 min et pour une pharmacie 24h/24', () => {
    expect(tonAffiche(ouverte, ABIDJAN, a('2026-10-23T21:00:00Z'))).toBe('vert');
    expect(tonAffiche({ ...ouverte, h24: true }, ABIDJAN, a('2026-10-23T21:50:00Z'))).toBe('vert');
  });

  it('gère une garde qui finit après minuit', () => {
    const garde = { statut: 'garde' as const, h24: false, ferme_a: null, prochaine_ouverture: null, garde: { debut: '', fin: '', jusqua: '01:00', confirmee_le: null } };
    const maintenant = a('2026-10-24T00:40:00Z');
    expect(minutesAvantFermeture(garde, ABIDJAN, maintenant)).toBe(20);
    expect(libelleStatut(garde, ABIDJAN, 'garde', maintenant)).toBe('Ferme dans 20 min (01:00)');
    expect(tonAffiche(garde, ABIDJAN, a('2026-10-23T23:00:00Z'))).toBe('rouge');
  });
});
