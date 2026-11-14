import type { PharmacieResume } from '@/commun/api';

import { regrouperParCommune } from '../regroupement';

const p = (id: string, commune: string, commune_id: string, distance_m: number | null) => ({ id, nom: id, commune, commune_id, distance_m }) as PharmacieResume;

describe('regrouperParCommune', () => {
  const liste = [
    p('a', 'Cocody', 'zo_coc', 500),
    p('b', 'Yopougon', 'zo_yop', 900),
    p('c', 'Cocody', 'zo_coc', 1200),
    p('d', '', '', 300),
    p('e', 'Abobo', 'zo_abo', null),
  ];

  it('met la commune de l’usager en premier, puis les autres par distance, les fiches sans commune à la fin', () => {
    const groupes = regrouperParCommune(liste, 'zo_yop');
    expect(groupes.map((g) => g.cle)).toEqual(['zo_yop', 'zo_coc', 'zo_abo', '']);
    expect(groupes[1]?.pharmacies.map((x) => x.id)).toEqual(['a', 'c']);
    expect(groupes[1]?.plusProcheM).toBe(500);
    expect(groupes[2]?.plusProcheM).toBeNull();
  });

  it('sans commune connue, trie seulement par distance', () => {
    expect(regrouperParCommune(liste, null).map((g) => g.cle)).toEqual(['zo_coc', 'zo_yop', 'zo_abo', '']);
  });
});
