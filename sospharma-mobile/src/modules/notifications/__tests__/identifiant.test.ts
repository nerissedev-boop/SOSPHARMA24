import { stockage } from '@/commun/lib';

import { identifiantAnonyme } from '../identifiant';

describe('identifiant anonyme de l’appareil', () => {
  beforeEach(() => stockage().remove('appareil.identifiant'));

  it('respecte le format de l’API (lettres, chiffres, tirets ; 16 caractères au moins) et reste stable', () => {
    const id = identifiantAnonyme();
    expect(id).toMatch(/^[A-Za-z0-9-]{16,100}$/);
    expect(identifiantAnonyme()).toBe(id);
  });

  it('corrige un ancien identifiant « app_… » refusé par l’API', () => {
    stockage().set('appareil.identifiant', 'app_mh3k2x9q1a7b2c3d4e');
    expect(identifiantAnonyme()).toBe('app-mh3k2x9q1a7b2c3d4e');
  });
});
