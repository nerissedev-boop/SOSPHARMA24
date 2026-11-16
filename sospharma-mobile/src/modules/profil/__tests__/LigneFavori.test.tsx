import { fireEvent, screen } from '@testing-library/react-native';

import { rendre } from '@/commun/lib/tests/rendu';

import { LigneFavori } from '../composants/LigneFavori';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }) }));

const base = {
  testID: 'favori-ph_1',
  nom: 'Pharmacie Gazelle',
  statut: 'ouverte' as const,
  libelleStatut: 'Ouverte jusqu’à 21:00',
  ton: 'vert' as const,
  distanceM: 400,
  positionAConfirmer: false,
  onPress: jest.fn(),
};

describe('Ligne de « Mes pharmacies »', () => {
  it('photo de façade validée : vignette à gauche du nom', async () => {
    await rendre(<LigneFavori {...base} photoUrl="https://exemple.ci/facade.jpg" />);
    expect(screen.getByTestId('favori-ph_1-vignette')).toBeTruthy();
    expect(screen.getByText('Pharmacie Gazelle')).toBeTruthy();
    expect(screen.getByText('0,4 km')).toBeTruthy();
  });

  it('sans photo : ni vignette ni devanture dessinée', async () => {
    await rendre(<LigneFavori {...base} photoUrl={null} />);
    expect(screen.queryByTestId('favori-ph_1-vignette')).toBeNull();
  });

  it('toucher la ligne, vignette comprise, ouvre la fiche', async () => {
    const onPress = jest.fn();
    await rendre(<LigneFavori {...base} photoUrl="https://exemple.ci/facade.jpg" onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('favori-ph_1-vignette'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
