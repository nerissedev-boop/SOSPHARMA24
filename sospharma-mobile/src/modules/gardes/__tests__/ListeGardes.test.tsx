import { fireEvent, screen } from '@testing-library/react-native';

import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import ListeGardes from '../ecrans/ListeGardes';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
}));

describe('Écran Pharmacies de garde', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  });

  it('jour : en-tête rouge, nombre de gardes, la plus proche en premier', async () => {
    await rendre(<ListeGardes />);
    expect(await screen.findByText('6 pharmacies ouvertes cette nuit')).toBeTruthy();
    expect(screen.getByText(/^Tour de garde du sam\. \d+ au sam\. \d+ \w+\.$/)).toBeTruthy();
    expect(screen.getByText('La plus proche de garde')).toBeTruthy();
    expect(screen.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(screen.getByText('Pharmacie des Nations')).toBeTruthy();
    expect(screen.getByText('La nuit, appelez avant de vous déplacer.')).toBeTruthy();
  });

  it('filtre « Toute la nuit » : retire les gardes qui ferment à 02:00', async () => {
    await rendre(<ListeGardes />);
    await screen.findByText('Pharmacie des Nations');
    await fireEvent.press(screen.getByTestId('filtre-garde-nuit'));
    expect(screen.queryByText('Pharmacie des Nations')).toBeNull();
    expect(screen.getByText('Pharmacie des Oliviers')).toBeTruthy();
  });

  it('nuit : bannière, liste confirmée, pas de bloc « plus proche »', async () => {
    await rendre(<ListeGardes />, { theme: 'nuit' });
    expect(await screen.findByText(/^Liste confirmée le /)).toBeTruthy();
    expect(screen.queryByText('La plus proche de garde')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Pharmacie de la Paix, Ouverte toute la nuit/ }));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/pharmacie/[id]', params: { id: 'ph_0142' } });
  });
});
