import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react-native';

import type { ApiResult, PharmacieResume, TourGarde } from '@/commun/api';
import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import ListeGardes from '../ecrans/ListeGardes';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
}));

// Réponse du tour de garde choisie test par test ; le reste du module est le vrai.
const mockLire = jest.fn();
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  lireTourEnCours: (...args: unknown[]) => mockLire(...args),
}));

const { lireTourEnCours: lireVraiTour } = jest.requireActual('../api') as {
  lireTourEnCours: (...args: unknown[]) => Promise<ApiResult<TourGarde>>;
};

const META = { request_id: 'req_test', generated_at: '2026-11-11T20:00:00Z' };

/** Tour de démo dont on retouche les pharmacies de garde. */
function tourDemo(retoucher: (gardes: PharmacieResume[]) => PharmacieResume[]) {
  return async (...args: unknown[]): Promise<ApiResult<TourGarde>> => {
    const r = await lireVraiTour(...args);
    if (!r.success) return r;
    return { ...r, data: { ...r.data, pharmacies: retoucher(r.data.pharmacies.filter((p) => p.statut === 'garde')) } };
  };
}

function erreur(code: 'NOT_FOUND' | 'SERVER_ERROR', status: number): ApiResult<TourGarde> {
  return { success: false, error: { code, message: '' }, meta: META, status };
}

describe('Écran Pharmacies de garde, états', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  });
  afterEach(() => onlineManager.setOnline(true));

  it('premier chargement : squelettes fidèles (carte et lignes), conseil en place, partage inactif', async () => {
    mockLire.mockReturnValue(new Promise(() => undefined));
    await rendre(<ListeGardes />);
    expect(screen.getByTestId('squelette-carte-garde')).toBeTruthy();
    expect(screen.getByTestId('chargement-gardes')).toBeTruthy();
    expect(screen.getByTestId('conseil-garde')).toBeTruthy();
    expect(screen.queryByText(/ouvertes? cette nuit/)).toBeNull();
    expect(screen.getByTestId('bouton-partager-gardes').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('aucune liste publiée pour la ville : message clair et « Réessayer »', async () => {
    mockLire.mockResolvedValue(erreur('NOT_FOUND', 404));
    await rendre(<ListeGardes />);
    expect(await screen.findByText('Aucune liste de garde n’est encore publiée pour cette ville.')).toBeTruthy();
    expect(screen.getByText('Liste de garde indisponible')).toBeTruthy();
    // Sans liste, ni carte, ni conseil, ni filtres.
    expect(screen.queryByTestId('bloc-garde-plus-proche')).toBeNull();
    expect(screen.queryByTestId('conseil-garde')).toBeNull();
    expect(screen.queryByTestId('filtre-garde-proches')).toBeNull();
    await fireEvent.press(screen.getByTestId('garde-reessayer'));
    expect(mockLire).toHaveBeenCalledTimes(2);
  });

  it('erreur du serveur : invitation à vérifier la connexion et à réessayer', async () => {
    mockLire.mockResolvedValue(erreur('SERVER_ERROR', 500));
    await rendre(<ListeGardes />);
    expect(await screen.findByText('La liste n’a pas pu être chargée. Vérifiez votre connexion, puis réessayez.')).toBeTruthy();
    expect(screen.getByTestId('garde-erreur')).toBeTruthy();
  });

  it('hors connexion sans liste enregistrée : un seul message, pas de squelette sans fin', async () => {
    onlineManager.setOnline(false);
    mockLire.mockReturnValue(new Promise(() => undefined));
    await rendre(<ListeGardes />);
    expect(screen.getByTestId('garde-hors-connexion')).toBeTruthy();
    expect(screen.getByText('Pas de connexion internet. La liste s’affichera dès le retour du réseau.')).toBeTruthy();
    expect(screen.queryByTestId('bandeau-hors-connexion')).toBeNull();
    expect(screen.queryByTestId('squelette-carte-garde')).toBeNull();
  });

  it('aucune garde dans le tour : dessin de la devanture fermée, pas de carte', async () => {
    mockLire.mockImplementation(tourDemo(() => []));
    await rendre(<ListeGardes />);
    expect(await screen.findByTestId('garde-aucune')).toBeTruthy();
    expect(screen.getByText('0 pharmacie ouverte cette nuit')).toBeTruthy();
    expect(screen.queryByTestId('bloc-garde-plus-proche')).toBeNull();
    expect(screen.queryByTestId('conseil-garde')).toBeNull();
    // Les filtres restent : un autre choix peut ramener des pharmacies.
    expect(screen.getByTestId('filtre-garde-proches')).toBeTruthy();
  });

  it('plus proche sans numéro ni position : ni « Appeler » ni « Itinéraire », badge « Position à confirmer »', async () => {
    mockLire.mockImplementation(
      tourDemo((gardes) => gardes.map((p, i) => (i === 0 ? { ...p, telephone: null, latitude: null, longitude: null } : p))),
    );
    await rendre(<ListeGardes />);
    const carte = within(await screen.findByTestId('bloc-garde-plus-proche'));
    expect(carte.getByTestId('bloc-garde-plus-proche-position')).toBeTruthy();
    expect(carte.queryByTestId('bloc-garde-plus-proche-appeler')).toBeNull();
    expect(carte.queryByTestId('bloc-garde-plus-proche-itineraire')).toBeNull();
    expect(carte.queryByText(/ km/)).toBeNull();
  });
});
