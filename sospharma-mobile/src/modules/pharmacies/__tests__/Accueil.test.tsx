import { act, screen, waitFor } from '@testing-library/react-native';

import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';
import { jetonsJour, jetonsNuit } from '@/commun/theme/jetons';

import Accueil from '../ecrans/Accueil';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
}));

describe('Accueil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  });

  it('jour : la plus proche sous le bandeau, la recherche juste dessous, puis 5 lignes au plus', async () => {
    await rendre(<Accueil />);
    expect(await screen.findByTestId('bloc-plus-proche')).toBeTruthy();
    expect(screen.getAllByTestId('bloc-plus-proche')).toHaveLength(1);
    expect(screen.getByTestId('champ-recherche-accueil')).toBeTruthy();
    expect(screen.getAllByTestId(/^ligne-ph_[a-z0-9]+$/)).toHaveLength(5);
  });

  it('jour : le titre donne l’état du moment, sans salutation ni raccourci vers la garde', async () => {
    await rendre(<Accueil />);
    expect(await screen.findByText(/pharmacies? ouvertes? autour de vous/)).toBeTruthy();
    expect(screen.queryByText(/Bonjour|Bonsoir/)).toBeNull();
    expect(screen.queryByTestId('carte-gardes')).toBeNull();
    expect(screen.getByText('Y aller')).toBeTruthy();
    expect(screen.queryByText('Itinéraire')).toBeNull();
  });

  it.each([
    ['jour', jetonsJour.vert],
    ['nuit', jetonsNuit.vert],
  ] as const)('%s : glisser pour actualiser (roue verte), la roue s’arrête une fois rechargé', async (theme, vert) => {
    await rendre(<Accueil />, { theme });
    expect(await screen.findByTestId('bloc-plus-proche')).toBeTruthy();
    const controle = () => screen.getByTestId('defilement-accueil').props.refreshControl;
    expect(controle().props.tintColor).toBe(vert);
    await act(async () => controle().props.onRefresh());
    await waitFor(() => expect(controle().props.refreshing).toBe(false));
    expect(screen.getByTestId('bloc-plus-proche')).toBeTruthy();
  });

  it('nuit : l’heure en titre, une seule carte « la plus proche » de garde, le conseil au-dessus d’Appeler', async () => {
    await rendre(<Accueil />, { theme: 'nuit' });
    expect(await screen.findByTestId('bloc-plus-proche-statut-24', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByTestId('bloc-plus-proche')).toHaveLength(1);
    expect(screen.getByText(/^Il est .*Les pharmacies de garde passent en premier/)).toBeTruthy();
    expect(screen.getByTestId('conseil-garde')).toBeTruthy();
    expect(screen.queryByTestId('champ-recherche-accueil')).toBeNull();
  });
});
