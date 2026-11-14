import { fireEvent, screen, within } from '@testing-library/react-native';
import { FlatList, Linking, Share } from 'react-native';

import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '@/commun/theme/jetons';

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

  it('jour : bandeau rouge foncé, nombre de gardes, la plus proche en grande carte', async () => {
    await rendre(<ListeGardes />);
    expect(await screen.findByText('6 pharmacies ouvertes cette nuit')).toBeTruthy();
    // Le mois du début n'apparaît que si le tour chevauche deux mois (« du sam. 31 oct. au sam. 7 nov. »).
    expect(screen.getByText(/^Tour de garde du sam\. \d+( \w+\.)? au sam\. \d+ \w+\.$/)).toBeTruthy();
    expect(screen.getByTestId('bandeau-garde')).toHaveStyle({ backgroundColor: jetonsJour.bandeauGarde });
    // Piste A : la carte de la plus proche (sans photo), avec son étiquette, son statut et sa distance.
    const carte = within(screen.getByTestId('bloc-garde-plus-proche'));
    expect(carte.getByText('La plus proche de garde')).toBeTruthy();
    expect(carte.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(carte.getByText('Ouverte toute la nuit')).toBeTruthy();
    expect(carte.getByText(/^Cocody · 0,7 km · \d+ min à pied$/)).toBeTruthy();
    expect(screen.queryByTestId('bloc-garde-plus-proche-facade')).toBeNull();
    // Le conseil suit la carte, puis la liste ; la date de confirmation clôt la liste.
    expect(screen.getByText('La nuit, appelez avant de vous déplacer.')).toBeTruthy();
    expect(screen.getByText('Pharmacie des Nations')).toBeTruthy();
    expect(screen.getByText(/^Liste confirmée le /)).toBeTruthy();
  });

  it('la carte : « Appeler » lance l’appel, « Itinéraire » ouvre l’itinéraire, le reste ouvre la fiche', async () => {
    const ouvrirLien = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await rendre(<ListeGardes />);
    await screen.findByTestId('bloc-garde-plus-proche');
    await fireEvent.press(screen.getByRole('button', { name: 'Appeler Pharmacie de la Paix' }));
    expect(ouvrirLien).toHaveBeenCalledWith('tel:+2250123456789');
    await fireEvent.press(screen.getByRole('button', { name: 'Itinéraire vers Pharmacie de la Paix' }));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/pharmacie/[id]/itineraire', params: { id: 'ph_0142' } });
    await fireEvent.press(screen.getByRole('button', { name: /^La plus proche de garde : Pharmacie de la Paix, Ouverte toute la nuit, Cocody, 0,7 km/ }));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/pharmacie/[id]', params: { id: 'ph_0142' } });
    ouvrirLien.mockRestore();
  });

  it('filtre « Toute la nuit » : retire les gardes qui ferment à 02:00 et remonte en haut de la liste', async () => {
    const remonter = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
    await rendre(<ListeGardes />);
    await screen.findByText('Pharmacie des Nations');
    await fireEvent.press(screen.getByTestId('filtre-garde-nuit'));
    // Filtres collés en haut : la liste remonte là où s'affiche la plus proche du nouveau choix.
    expect(remonter).toHaveBeenCalledWith({ offset: 0, animated: true });
    // La croix bat un court instant à la place des lignes ; la carte et les filtres ne bougent pas.
    expect(screen.getByTestId('chargement-filtre')).toBeTruthy();
    expect(screen.getByTestId('bloc-garde-plus-proche')).toBeTruthy();
    expect(await screen.findByText('Pharmacie des Oliviers', {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.queryByTestId('chargement-filtre')).toBeNull();
    expect(screen.queryByText('Pharmacie des Nations')).toBeNull();
    remonter.mockRestore();
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

  it('« Partager » (bouton rond du bandeau) envoie la liste affichée : titre, période et une ligne par pharmacie', async () => {
    const partage = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await rendre(<ListeGardes />);
    await screen.findByText('Pharmacie des Nations');
    await fireEvent.press(screen.getByTestId('filtre-garde-nuit'));
    await fireEvent.press(screen.getByRole('button', { name: 'Partager la liste des pharmacies de garde' }));
    const message = (partage.mock.calls[0]?.[0] as { message: string }).message;
    expect(message).toMatch(/^Pharmacies de garde · /);
    expect(message).toMatch(/\nTour de garde du sam\. \d+( \w+\.)? au sam\. \d+ \w+\.\n/);
    expect(message).toMatch(/• Pharmacie de la Paix \(Cocody\) : \+225 01 23 45 67 89/);
    // Le filtre « Toute la nuit » s'applique aussi au partage.
    expect(message).not.toMatch(/Pharmacie des Nations/);
    partage.mockRestore();
  });

  it('glisser pour actualiser : roue verte sur la liste', async () => {
    await rendre(<ListeGardes />);
    expect(await screen.findByText('6 pharmacies ouvertes cette nuit')).toBeTruthy();
    const controle = screen.getByTestId('liste-gardes').props.refreshControl;
    expect(controle.props.tintColor).toBe(jetonsJour.vert);
    expect(controle.props.refreshing).toBe(false);
  });

  it('nuit : même mise en page que le jour, bandeau plus sombre', async () => {
    await rendre(<ListeGardes />, { theme: 'nuit' });
    expect(await screen.findByText(/^Liste confirmée le /)).toBeTruthy();
    expect(screen.getByTestId('bandeau-garde')).toHaveStyle({ backgroundColor: jetonsNuit.bandeauGarde });
    expect(screen.getByText('La plus proche de garde')).toBeTruthy();
    expect(screen.getByTestId('pastille-zone-garde')).toBeTruthy();
    expect(screen.getByTestId('bouton-partager-gardes')).toBeTruthy();
    expect(screen.getByTestId('conseil-garde')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Pharmacie des Oliviers, Ouverte toute la nuit/ }));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/pharmacie/[id]', params: { id: 'ph_0163' } });
  });
});
