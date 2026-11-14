import { fireEvent, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { usePreferences, useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '@/commun/theme/jetons';

import Urgence from '../ecrans/Urgence';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
}));

describe('Écran Urgence (refonte v2 : trois appels, un appui chacun)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
    usePreferences.setState({ zone: null });
  });

  it('affiche les numéros d\'urgence venant de la configuration pays (pas en dur), en un seul bloc', async () => {
    await rendre(<Urgence />);
    expect(await screen.findByText('185')).toBeTruthy();
    expect(screen.getByText('SAMU')).toBeTruthy();
    // Nom court affiché, nom complet lu par le lecteur d'écran.
    expect(screen.getByText('Pompiers')).toBeTruthy();
    expect(screen.getByText('180')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Appeler Sapeurs-pompiers, 180' })).toBeTruthy();
    expect(screen.getByTestId('numeros-urgence')).toHaveStyle({ backgroundColor: jetonsJour.rougeClair });
  });

  it('appelle le SAMU avec un lien tel:', async () => {
    const ouvrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await rendre(<Urgence />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Appeler SAMU, 185' }));
    expect(ouvrir).toHaveBeenCalledWith('tel:185');
  });

  it('la garde la plus proche dans la même carte que l’Accueil : Appeler et Y aller, sans détour', async () => {
    await rendre(<Urgence />);
    const carte = within(await screen.findByTestId('urgence-plus-proche'));
    expect(carte.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(carte.getByText('La plus proche')).toBeTruthy();
    expect(carte.getByText('Appeler')).toBeTruthy();
    await fireEvent.press(carte.getByText('Y aller'));
    expect(mockRouteur.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/pharmacie/[id]/itineraire' }));
  });

  it('ni disque SOS, ni halo, ni feuille : rien ne bouge à l’écran', async () => {
    await rendre(<Urgence />);
    await screen.findByTestId('urgence-plus-proche');
    expect(screen.queryByTestId('bouton-sos')).toBeNull();
    expect(screen.queryByTestId('halo-sos')).toBeNull();
    expect(screen.queryByTestId('feuille-sos')).toBeNull();
  });

  it('« Toutes les pharmacies de garde » mène à la liste', async () => {
    await rendre(<Urgence />);
    await fireEvent.press(await screen.findByTestId('urgence-autres-gardes'));
    expect(mockRouteur.navigate).toHaveBeenCalledWith('/garde');
  });

  it('affiche la zone sous le titre, et rien quand aucune zone n’est choisie', async () => {
    const { unmount } = await rendre(<Urgence />);
    await screen.findByTestId('bandeau-urgence');
    expect(screen.queryByTestId('urgence-zone')).toBeNull();
    await unmount();
    usePreferences.setState({
      zone: { zoneId: 'zn_koumassi', nom: 'Koumassi', villeId: 'vl_abidjan', villeNom: 'Abidjan', latitude: 5.29, longitude: -3.95, source: 'manuelle' },
    });
    await rendre(<Urgence />);
    expect(await screen.findByText('Koumassi, Abidjan')).toBeTruthy();
    expect(screen.getByText('Urgence')).toBeTruthy();
  });

  it('la nuit, le rouge reste dans le bandeau : le reste de l’écran garde le fond sombre du thème', async () => {
    const { unmount } = await rendre(<Urgence />);
    expect(await screen.findByTestId('bandeau-urgence')).toHaveStyle({ backgroundColor: jetonsJour.sosFond });
    await unmount();
    await rendre(<Urgence />, { theme: 'nuit' });
    expect(await screen.findByTestId('bandeau-urgence')).toHaveStyle({ backgroundColor: jetonsNuit.sosFond });
    expect(screen.getByTestId('numeros-urgence')).toHaveStyle({ backgroundColor: jetonsNuit.rougeClair });
    expect(await screen.findByTestId('conseil-garde')).toBeTruthy();
  });
});
