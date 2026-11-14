import { fireEvent, screen } from '@testing-library/react-native';
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

describe('Écran Urgence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
    usePreferences.setState({ zone: null });
  });

  it('affiche les numéros d\'urgence venant de la configuration pays (pas en dur)', async () => {
    await rendre(<Urgence />);
    expect(await screen.findByText('185')).toBeTruthy();
    expect(screen.getByText('SAMU')).toBeTruthy();
    // Bouton compact : nom court affiché, nom complet lu par le lecteur d'écran.
    expect(screen.getByText('Pompiers')).toBeTruthy();
    expect(screen.getByText('180')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Appeler Sapeurs-pompiers, 180' })).toBeTruthy();
  });

  it('numéros en gros boutons blancs posés sur le fond rouge (jetons jour et nuit)', async () => {
    const { unmount } = await rendre(<Urgence />);
    expect(await screen.findByTestId('urgence-samu')).toHaveStyle({ backgroundColor: jetonsJour.sosNumero, minHeight: 64 });
    await unmount();
    await rendre(<Urgence />, { theme: 'nuit' });
    expect(await screen.findByTestId('urgence-samu')).toHaveStyle({ backgroundColor: jetonsNuit.sosNumero });
  });

  it('affiche la zone sous le titre, et rien quand aucune zone n’est choisie', async () => {
    const { unmount } = await rendre(<Urgence />);
    await screen.findByTestId('bouton-sos');
    expect(screen.queryByTestId('urgence-zone')).toBeNull();
    await unmount();
    usePreferences.setState({
      zone: { zoneId: 'zn_koumassi', nom: 'Koumassi', villeId: 'vl_abidjan', villeNom: 'Abidjan', latitude: 5.29, longitude: -3.95, source: 'manuelle' },
    });
    await rendre(<Urgence />);
    expect(await screen.findByText('Koumassi, Abidjan')).toBeTruthy();
    expect(screen.getByText('Urgence')).toBeTruthy();
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

  it('prend ses couleurs dans les jetons du thème (fond plus sombre la nuit)', async () => {
    const { unmount } = await rendre(<Urgence />);
    expect(await screen.findByTestId('ecran-urgence')).toHaveStyle({ backgroundColor: jetonsJour.sosFond });
    await unmount();
    await rendre(<Urgence />, { theme: 'nuit' });
    expect(await screen.findByTestId('ecran-urgence')).toHaveStyle({ backgroundColor: jetonsNuit.sosFond });
    expect(jetonsNuit.sosFond).not.toBe(jetonsJour.sosFond);
  });

  it('garde la ligne « plus proche » lisible en grandes polices (nom sur deux lignes au plus)', async () => {
    await rendre(<Urgence />);
    const nom = await screen.findByText('Pharmacie de la Paix');
    expect(nom.props.numberOfLines).toBe(2);
    expect(nom.props.maxFontSizeMultiplier).toBe(1.6);
    expect(screen.getByText('9 min à pied').props.numberOfLines).toBe(2);
  });

  it('pulse un halo autour du bouton SOS', async () => {
    await rendre(<Urgence />);
    expect(await screen.findByTestId('halo-sos')).toBeTruthy();
  });

  // En dernier : modifie le simulacre de Reanimated (restauré ensuite).
  it('pas de halo si le téléphone demande de supprimer les animations', async () => {
    const reanimated = jest.requireMock('react-native-reanimated') as { useReducedMotion: () => boolean };
    const reduitAvant = reanimated.useReducedMotion;
    reanimated.useReducedMotion = () => true;
    try {
      await rendre(<Urgence />);
      expect(await screen.findByTestId('bouton-sos')).toBeTruthy();
      expect(screen.queryByTestId('halo-sos')).toBeNull();
    } finally {
      reanimated.useReducedMotion = reduitAvant;
    }
  });
});
