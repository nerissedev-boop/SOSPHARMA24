import { screen } from '@testing-library/react-native';

import { rendre } from '@/commun/lib/tests/rendu';
import { jetonsJour } from '@/commun/theme/jetons';
import { HiAmbulance, HiOfficer, HiPhone, IconeFlamme } from '@/commun/ui';

import { IconeUrgence } from '../composants/NumerosUrgence';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }) }));

describe('Icône d’un numéro d’urgence', () => {
  it.each([
    ['ambulance', HiAmbulance],
    ['pompiers', IconeFlamme],
    ['police', HiOfficer],
    ['autre', HiPhone],
  ] as const)('%s : son icône à lui, jamais une croix médicale par défaut', async (icone, Attendue) => {
    await rendre(<Attendue size={30} color={jetonsJour.rougeTexteFort} />);
    const attendu = JSON.stringify(screen.toJSON());
    await rendre(<IconeUrgence icone={icone} taille={30} />);
    expect(JSON.stringify(screen.toJSON())).toBe(attendu);
  });
});
