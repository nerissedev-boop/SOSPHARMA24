import { fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

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
    // Pas encore de photo validée : bandeau dessiné avec l’étiquette, comme la maquette B.
    expect(screen.getByText('La plus proche')).toBeTruthy();
    expect(screen.getByTestId('bloc-garde-plus-proche-facade')).toBeTruthy();
    expect(screen.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(screen.getByText('Pharmacie des Nations')).toBeTruthy();
    expect(screen.getByText('La nuit, appelez avant de vous déplacer.')).toBeTruthy();
  });

  it('filtre « Toute la nuit » : retire les gardes qui ferment à 02:00', async () => {
    await rendre(<ListeGardes />);
    await screen.findByText('Pharmacie des Nations');
    await fireEvent.press(screen.getByTestId('filtre-garde-nuit'));
    // La croix bat un court instant à la place de la liste, puis la liste filtrée revient.
    expect(screen.getByTestId('chargement-filtre')).toBeTruthy();
    expect(await screen.findByText('Pharmacie des Oliviers', {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.queryByTestId('chargement-filtre')).toBeNull();
    expect(screen.queryByText('Pharmacie des Nations')).toBeNull();
  });

  it('commune en pastille : toute la pilule ouvre le choix de zone, « Changer » reste lu', async () => {
    await rendre(<ListeGardes />);
    await screen.findByText('6 pharmacies ouvertes cette nuit');
    const pastille = screen.getByTestId('pastille-zone-garde');
    expect(pastille.props.accessibilityLabel).toMatch(/\. Changer$/);
    expect(screen.queryByText('Changer')).toBeNull();
    await fireEvent.press(pastille);
    expect(mockRouteur.push).toHaveBeenCalledWith('/zone');
  });

  it('« Partager » envoie la liste affichée : titre, période et une ligne par pharmacie', async () => {
    const partage = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await rendre(<ListeGardes />);
    await screen.findByText('Pharmacie des Nations');
    await fireEvent.press(screen.getByTestId('filtre-garde-nuit'));
    await fireEvent.press(screen.getByRole('button', { name: 'Partager la liste des pharmacies de garde' }));
    const message = (partage.mock.calls[0]?.[0] as { message: string }).message;
    expect(message).toMatch(/^Pharmacies de garde · /);
    expect(message).toMatch(/\nTour de garde du sam\. \d+ au sam\. \d+ \w+\.\n/);
    expect(message).toMatch(/• Pharmacie de la Paix \(Cocody\) : \+225 01 23 45 67 89/);
    // Le filtre « Toute la nuit » s'applique aussi au partage.
    expect(message).not.toMatch(/Pharmacie des Nations/);
    partage.mockRestore();
  });

  it('nuit : bannière, liste confirmée, pas de bloc « plus proche »', async () => {
    await rendre(<ListeGardes />, { theme: 'nuit' });
    expect(await screen.findByText(/^Liste confirmée le /)).toBeTruthy();
    expect(screen.queryByText('La plus proche de garde')).toBeNull();
    // Même principe que le jour : commune en pastille et « Partager », plus de bandeau.
    expect(screen.getByTestId('pastille-zone-garde')).toBeTruthy();
    expect(screen.getByTestId('bouton-partager-gardes')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Pharmacie de la Paix, Ouverte toute la nuit/ }));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/pharmacie/[id]', params: { id: 'ph_0142' } });
  });
});
