import { detailGarde, texteListeGardes } from '../partage';

const ABIDJAN = 'Africa/Abidjan'; // UTC+0
const garde = (jusqua: string | null) => ({
  commune: 'Cocody',
  statut: 'garde' as const,
  h24: false,
  ferme_a: null,
  prochaine_ouverture: null,
  garde: { debut: '2026-10-24T08:00:00Z', fin: '2026-10-31T08:00:00Z', jusqua, confirmee_le: null },
});

describe('Partage de la liste de garde', () => {
  it('compose titre, période, une ligne par pharmacie et la signature', () => {
    const texte = texteListeGardes({
      zone: 'Cocody, Abidjan',
      bornes: { debut: 'sam. 24', fin: 'sam. 31 oct.' },
      indicatif: '+225',
      pharmacies: [
        { nom: 'Pharmacie Alpha', commune: 'Cocody', telephone: '+2250123456789' },
        { nom: 'Pharmacie Néré', commune: '', telephone: null },
      ],
    });
    expect(texte).toBe(
      [
        'Pharmacies de garde · Cocody, Abidjan',
        'Tour de garde du sam. 24 au sam. 31 oct.',
        '',
        '• Pharmacie Alpha (Cocody) : +225 01 23 45 67 89',
        '• Pharmacie Néré',
        '',
        'Liste envoyée avec SOS Pharma 24',
      ].join('\n'),
    );
  });

  it('sans tour ni pharmacie : pas de période, message « aucune »', () => {
    const texte = texteListeGardes({ zone: 'Plateau', bornes: null, pharmacies: [] });
    expect(texte.split('\n')).toEqual([
      'Pharmacies de garde · Plateau',
      '',
      'Aucune pharmacie de garde ne correspond à ce choix.',
      '',
      'Liste envoyée avec SOS Pharma 24',
    ]);
  });
});

describe('2e ligne d’une pharmacie de garde', () => {
  const soir = new Date('2026-10-24T20:00:00Z');

  it('toute la nuit : la commune seule', () => {
    expect(detailGarde(garde(null), ABIDJAN, soir)).toEqual({ texte: 'Cocody', restreinte: false });
  });

  it('garde qui s’arrête avant le matin : commune et statut, en ocre', () => {
    expect(detailGarde(garde('02:00'), ABIDJAN, soir)).toEqual({ texte: 'Cocody · ouverte jusqu’à 02:00', restreinte: true });
  });

  it('sans commune : le statut seul', () => {
    expect(detailGarde({ ...garde(null), commune: '' }, ABIDJAN, soir)).toEqual({ texte: 'Ouverte toute la nuit', restreinte: false });
  });
});
