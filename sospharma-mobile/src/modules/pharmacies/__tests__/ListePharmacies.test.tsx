import { fireEvent, screen } from '@testing-library/react-native';

import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import ListePharmacies from '../ecrans/ListePharmacies';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
}));

const lignes = () => screen.queryAllByTestId(/^ligne-ph_[a-z0-9]+$/);

describe('Liste complète des pharmacies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  });

  it('les pharmacies chargées, chacune avec son chevron, et leur nombre dans l’en-tête', async () => {
    await rendre(<ListePharmacies />);
    await screen.findAllByTestId(/^ligne-ph_[a-z0-9]+$/);
    // La liste est virtualisée : seules les premières lignes sont rendues d'emblée.
    const rendues = lignes().length;
    const total = Number(screen.getByText(/^\d+ pharmacies$/).props.children.split(' ')[0]);
    expect(rendues).toBeGreaterThan(6);
    expect(total).toBeGreaterThanOrEqual(rendues);
    expect(screen.getAllByTestId(/^ligne-ph_[a-z0-9]+-chevron$/, { includeHiddenElements: true })).toHaveLength(rendues);
  });

  it('la saisie filtre à chaque lettre, sans tenir compte des accents ni de la casse', async () => {
    await rendre(<ListePharmacies />);
    await screen.findAllByTestId(/^ligne-ph_[a-z0-9]+$/);
    await fireEvent.changeText(screen.getByTestId('champ-recherche-pharmacies'), 'LYCEE');
    expect(lignes()).toHaveLength(1);
    expect(screen.getByText('Pharmacie du Lycée')).toBeTruthy();
    expect(screen.getByTestId('nombre-resultats')).toHaveTextContent('1 pharmacie correspond');
  });

  it('cherche aussi dans le repère', async () => {
    await rendre(<ListePharmacies />);
    await screen.findAllByTestId(/^ligne-ph_[a-z0-9]+$/);
    await fireEvent.changeText(screen.getByTestId('champ-recherche-pharmacies'), 'jardins');
    expect(screen.getByText('Pharmacie de la Paix')).toBeTruthy();
    expect(lignes()).toHaveLength(1);
  });

  it('aucun résultat : la saisie est rappelée, on peut l’effacer ou chercher sur la carte', async () => {
    await rendre(<ListePharmacies />);
    await screen.findAllByTestId(/^ligne-ph_[a-z0-9]+$/);
    const toutes = lignes().length;
    await fireEvent.changeText(screen.getByTestId('champ-recherche-pharmacies'), 'Zzyzx');
    expect(lignes()).toHaveLength(0);
    expect(screen.getByText('Aucune pharmacie ne correspond à « Zzyzx ».')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chercher-carte'));
    expect(mockRouteur.navigate).toHaveBeenCalledWith({ pathname: '/carte', params: expect.objectContaining({ q: 'Zzyzx' }) });
    await fireEvent.press(screen.getByTestId('effacer-recherche'));
    expect(lignes()).toHaveLength(toutes);
    expect(screen.getByTestId('champ-recherche-pharmacies').props.value).toBe('');
  });

  it('une ligne ouvre la fiche', async () => {
    await rendre(<ListePharmacies />);
    await screen.findAllByTestId(/^ligne-ph_[a-z0-9]+$/);
    await fireEvent.changeText(screen.getByTestId('champ-recherche-pharmacies'), 'lycée');
    await fireEvent.press(screen.getByRole('button', { name: /^Pharmacie du Lycée/ }));
    expect(mockRouteur.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/pharmacie/[id]' }));
  });
});
