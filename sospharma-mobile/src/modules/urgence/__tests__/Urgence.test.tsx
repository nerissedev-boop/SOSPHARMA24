import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import Urgence from '../ecrans/Urgence';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
}));

describe('Écran Urgence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  });

  it('affiche les numéros d\'urgence venant de la configuration pays (pas en dur)', async () => {
    await rendre(<Urgence />);
    expect(await screen.findByText('185')).toBeTruthy();
    expect(screen.getByText('SAMU')).toBeTruthy();
    expect(screen.getByText('Sapeurs-pompiers')).toBeTruthy();
    expect(screen.getByText('180')).toBeTruthy();
  });

  it('appelle le SAMU avec un lien tel:', async () => {
    const ouvrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await rendre(<Urgence />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Appeler SAMU, 185' }));
    expect(ouvrir).toHaveBeenCalledWith('tel:185');
  });

  it('SOS : propose d’appeler la garde la plus proche ou d’y aller', async () => {
    await rendre(<Urgence />);
    expect(await screen.findByText('Pharmacie de la Paix')).toBeTruthy();
    expect(screen.getByText('9 min à pied')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('bouton-sos'));
    expect(screen.getByTestId('sos-appeler')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sos-itineraire'));
    expect(mockRouteur.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/pharmacie/[id]/itineraire' }));
  });

  it('SOS : « Voir toutes les pharmacies de garde » mène à la liste', async () => {
    await rendre(<Urgence />);
    await screen.findByText('Pharmacie de la Paix');
    await fireEvent.press(screen.getByTestId('bouton-sos'));
    await fireEvent.press(screen.getByTestId('sos-autres'));
    expect(mockRouteur.navigate).toHaveBeenCalledWith('/garde');
  });
});
