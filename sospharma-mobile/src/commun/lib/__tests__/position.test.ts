import { comparerDistance, positionDe } from '../geo';

describe('Pharmacies sans position (31 oct.)', () => {
  it('positionDe : null tant que la position est à confirmer', () => {
    expect(positionDe({ latitude: null, longitude: null })).toBeNull();
    expect(positionDe({ latitude: 5.36, longitude: -3.98 })).toEqual({ latitude: 5.36, longitude: -3.98 });
  });

  it('comparerDistance : les pharmacies sans distance passent après les autres', () => {
    const liste = [{ id: 'a', distance_m: null }, { id: 'b', distance_m: 900 }, { id: 'c', distance_m: 300 }, { id: 'd', distance_m: null }];
    expect([...liste].sort(comparerDistance).map((p) => p.id)).toEqual(['c', 'b', 'a', 'd']);
  });
});
