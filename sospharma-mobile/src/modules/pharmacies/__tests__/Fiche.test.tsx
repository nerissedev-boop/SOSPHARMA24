import { fireEvent, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { appeler, reinitialiserDemoAgent, type Pharmacie } from '@/commun/api';
import { usePreferences, useSession } from '@/commun/lib';
import { creerClientTest, rendre } from '@/commun/lib/tests/rendu';

import { clesPharmacies } from '../api';
import Fiche from '../ecrans/Fiche';
import { messageChauffeur } from '../chauffeur';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => mockParams,
}));

const ASSURANCES_INITIALES = usePreferences.getState().mesAssurances;

/** Fiche de la démo, modifiée puis posée dans le cache : l'écran l'affiche sans requête. */
async function ficheEnCache(id: string, modifs: Partial<Pharmacie>) {
  const r = await appeler<Pharmacie>(`/pharmacies/${id}`, { params: { lat: 5.36, lng: -3.98 } });
  if (!r.success) throw new Error(r.error.message);
  const client = creerClientTest();
  client.setQueryData(clesPharmacies.fiche(id), { ...r.data, ...modifs });
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  reinitialiserDemoAgent();
  useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  usePreferences.setState({ mesAssurances: ASSURANCES_INITIALES });
});

describe('Fiche pharmacie', () => {
  it('pendant le chargement : squelette de fiche et bouton retour, puis la vraie fiche', async () => {
    mockParams = { id: 'ph_0155' };
    await rendre(<Fiche />);
    // Le squelette peut déjà avoir laissé place à la fiche selon la vitesse de la démo.
    if (screen.queryByTestId('fiche-chargement')) {
      expect(screen.getByTestId('bouton-retour')).toBeTruthy();
    }
    expect(await screen.findByTestId('fiche-horaires')).toBeTruthy();
    expect(screen.queryByTestId('fiche-chargement')).toBeNull();
  });

  it('horaires : ceux du jour, puis les 7 jours du lundi au dimanche en dépliant', async () => {
    mockParams = { id: 'ph_0155' };
    await rendre(<Fiche />);
    const bouton = await screen.findByTestId('bouton-horaires');
    expect(screen.getByTestId('horaires-aujourdhui')).toBeTruthy();
    expect(screen.queryByTestId('horaires-semaine')).toBeNull();
    expect(bouton).toBeCollapsed();

    await fireEvent.press(bouton);
    expect(screen.getByTestId('horaires-semaine')).toBeTruthy();
    expect(screen.getByText('Lun.')).toBeTruthy();
    expect(screen.getByText('Dim.')).toBeTruthy();
    expect(screen.getByTestId('bouton-horaires')).toBeExpanded();

    await fireEvent.press(screen.getByTestId('bouton-horaires'));
    expect(screen.queryByTestId('horaires-semaine')).toBeNull();
  });

  it('horaires pas encore relevés : conseil d’appeler, rien à déplier', async () => {
    mockParams = { id: 'ph_0155' };
    const client = await ficheEnCache('ph_0155', { horaires: [], h24: false });
    await rendre(<Fiche />, { client });
    expect(await screen.findByTestId('horaires-a-confirmer')).toBeTruthy();
    expect(screen.queryByTestId('bouton-horaires')).toBeNull();
  });

  it('sans numéro WhatsApp : pas de bouton WhatsApp ; sans photo : devanture dessinée', async () => {
    mockParams = { id: 'ph_0155' };
    await rendre(<Fiche />);
    await screen.findByTestId('fiche-horaires');
    expect(screen.queryByTestId('bouton-whatsapp')).toBeNull();
    expect(screen.getByTestId('fiche-facade')).toBeTruthy();
    expect(screen.getByTestId('bouton-appeler')).toBeTruthy();
    expect(screen.getByTestId('bouton-y-aller')).toBeTruthy();
  });

  it('avec un numéro WhatsApp : bouton carré, nommé pour le lecteur d’écran', async () => {
    mockParams = { id: 'ph_0142' };
    await rendre(<Fiche />);
    expect(await screen.findByRole('button', { name: 'Écrire sur WhatsApp' })).toBeTruthy();
  });

  it('photo qui ne charge pas : la devanture dessinée prend sa place, pas un cadre vide', async () => {
    mockParams = { id: 'ph_0155' };
    const client = await ficheEnCache('ph_0155', { photo_url: 'https://exemple.test/facade.jpg' });
    await rendre(<Fiche />, { client });
    const photo = await screen.findByTestId('fiche-photo');
    expect(screen.queryByTestId('fiche-facade')).toBeNull();

    await fireEvent(photo, 'error', { nativeEvent: { error: 'introuvable' } });
    expect(screen.getByTestId('fiche-facade')).toBeTruthy();
    expect(screen.queryByTestId('fiche-photo')).toBeNull();
  });

  it('position à confirmer : badge et conseil d’appeler, pas de « Y aller »', async () => {
    mockParams = { id: 'ph_0155' };
    const client = await ficheEnCache('ph_0155', { latitude: null, longitude: null, distance_m: null, marche_min: null });
    await rendre(<Fiche />, { client });
    expect(await screen.findByTestId('fiche-position-a-confirmer')).toBeTruthy();
    expect(screen.getByTestId('fiche-conseil-appeler')).toBeTruthy();
    expect(screen.queryByTestId('bouton-y-aller')).toBeNull();
    expect(screen.getByTestId('bouton-appeler')).toBeTruthy();
  });

  it('accepte votre assurance : puce en tête de fiche, la vôtre en premier dans la liste', async () => {
    usePreferences.setState({ mesAssurances: [{ slug: 'prive-b', nom: '[Assureur privé B]' }] });
    mockParams = { id: 'ph_0155' };
    await rendre(<Fiche />);
    expect(await screen.findByTestId('puce-accepte-assurance')).toBeTruthy();
    expect(screen.getAllByTestId(/^puce-fiche-/).map((p) => p.props.testID)).toEqual(['puce-fiche-prive-b', 'puce-fiche-prive-a']);
  });

  it('mode nuit : la fiche s’affiche ; favori ajouté : vibration de succès', async () => {
    mockParams = { id: 'ph_0142' };
    // L'ajout est une mutation : sans délai de nettoyage (5 min par défaut), aucune minuterie
    // ne survit au test et Jest se termine aussitôt.
    const client = creerClientTest();
    client.setDefaultOptions({ ...client.getDefaultOptions(), mutations: { retry: false, gcTime: Infinity } });
    await rendre(<Fiche />, { theme: 'nuit', client });
    await fireEvent.press(await screen.findByTestId('bouton-favori'));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});

describe('Message pour le chauffeur', () => {
  it('destination, adresse, commune, lien de position et téléphone', () => {
    const message = messageChauffeur(
      {
        nom: 'Pharmacie de la Paix',
        adresse: 'Rue des Jardins',
        commune: 'Cocody',
        ville: 'Abidjan',
        telephone: '0102030405',
        latitude: 5.36,
        longitude: -3.98,
      },
      '+225',
    );
    const lignes = message.split('\n');
    expect(lignes[0]).toBe('Destination : Pharmacie de la Paix');
    expect(lignes[1]).toBe('Rue des Jardins');
    expect(lignes[2]).toBe('Cocody, Abidjan');
    expect(lignes[3]).toMatch(/^Position : https?:\/\/.*5\.36/);
    expect(lignes[4]).toMatch(/^Tél\. de la pharmacie : /);
  });
});

describe('Message pour le chauffeur sans position', () => {
  it('garde l’adresse et le téléphone, sans lien de position', () => {
    const message = messageChauffeur(
      { nom: 'Pharmacie Nouvelle', adresse: 'Face grande gare', commune: 'Gagnoa', ville: 'Gagnoa', telephone: '2732772462', latitude: null, longitude: null },
      '+225',
    );
    expect(message).toContain('Face grande gare');
    expect(message).not.toContain('Position :');
  });
});
