import { act, fireEvent, screen } from '@testing-library/react-native';

import type { ApiResult, PharmacieResume, TourGarde } from '@/commun/api';
import { useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import ListeGardes from '../ecrans/ListeGardes';

const mockRouteur = {
  push: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: () => true,
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({}),
}));

// Tour de démo (6 gardes) complété de 14 gardes plus lointaines, réparties sur deux communes.
jest.mock('../api', () => {
  const vrai = jest.requireActual('../api');
  return {
    ...vrai,
    lireTourEnCours: async (...args: unknown[]): Promise<ApiResult<TourGarde>> => {
      const r: ApiResult<TourGarde> = await vrai.lireTourEnCours(...args);
      if (!r.success) return r;
      const modele = r.data.pharmacies.find((p: PharmacieResume) => p.statut === 'garde') as PharmacieResume;
      const ajout = Array.from({ length: 14 }, (_, i): PharmacieResume => {
        const commune = i < 8 ? { commune: 'Yopougon', commune_id: 'zo_yop' } : { commune: 'Abobo', commune_id: 'zo_abo' };
        return {
          ...modele,
          ...commune,
          id: `ph_loin_${i}`,
          nom: `Pharmacie Lointaine ${i}`,
          distance_m: 9000 + i * 500,
          marche_min: null,
        };
      });
      return {
        ...r,
        data: { ...r.data, pharmacies: [...r.data.pharmacies, ...ajout] },
      };
    },
  };
});

/**
 * Donne à la liste virtualisée sa taille d'écran (sans quoi elle ne dessine que le début), puis défile
 * jusqu'à y si on le lui demande.
 */
async function defiler(y?: number) {
  const liste = screen.getByTestId('liste-gardes');
  await act(async () => {
    fireEvent(liste, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } });
    fireEvent(liste, 'contentSizeChange', 390, 4000);
  });
  if (y === undefined) return;
  await fireEvent.scroll(liste, {
    nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 390, height: 4000 }, layoutMeasurement: { width: 390, height: 800 } },
  });
}

describe('Écran Pharmacies de garde, longue liste', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  });

  it('montre 10 pharmacies, puis les autres par commune, repliées', async () => {
    await rendre(<ListeGardes />);
    expect(await screen.findByText('20 pharmacies ouvertes cette nuit')).toBeTruthy();
    // La plus proche en bloc + 9 lignes : la 10e est la 4e lointaine (6 de démo + 4).
    expect(screen.getByText('Pharmacie Lointaine 3')).toBeTruthy();
    expect(screen.queryByText('Pharmacie Lointaine 4')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher les 10 autres' }));
    // Yopougon (4 restantes, plus proche) avant Abobo (6) ; les deux repliées.
    expect(
      screen.getByRole('button', {
        name: 'Yopougon, 4 de garde, la plus proche à 11 km',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Pharmacie Lointaine 4')).toBeNull();
    // Titres de commune en petites capitales : le lecteur d'écran entend l'état replié ou déplié.
    expect(screen.getByTestId('groupe-zo_yop').props.accessibilityState).toEqual({ expanded: false });

    await fireEvent.press(screen.getByTestId('groupe-zo_yop'));
    expect(screen.getByTestId('groupe-zo_yop').props.accessibilityState).toEqual({ expanded: true });
    await defiler();
    // La liste dessine ses lignes par lots : on attend leur arrivée.
    expect(await screen.findByText('Pharmacie Lointaine 4', {}, { timeout: 3000 })).toBeTruthy();
    expect(await screen.findByText('Pharmacie Lointaine 7', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText('Pharmacie Lointaine 8')).toBeNull();
  });

  it('changer de filtre replie de nouveau la liste', async () => {
    await rendre(<ListeGardes />);
    await screen.findByText('20 pharmacies ouvertes cette nuit');
    await fireEvent.press(screen.getByTestId('bouton-afficher-autres'));
    expect(screen.queryByTestId('bouton-afficher-autres')).toBeNull();
    await fireEvent.press(screen.getByTestId('filtre-garde-nuit'));
    expect(await screen.findByTestId('bouton-afficher-autres', {}, { timeout: 2000 })).toBeTruthy();
  });

  it('nuit : liste virtualisée, la commune suivante n’est dessinée qu’au défilement', async () => {
    await rendre(<ListeGardes />, { theme: 'nuit' });
    await screen.findByText('20 pharmacies ouvertes cette nuit');
    // Nuit : même mise en page que le jour, la plus proche en carte puis 9 lignes.
    expect(screen.getByTestId('bloc-garde-plus-proche')).toBeTruthy();
    expect(screen.getByText('Pharmacie Lointaine 3')).toBeTruthy();
    expect(screen.queryByText('Pharmacie Lointaine 4')).toBeNull();
    await fireEvent.press(screen.getByTestId('bouton-afficher-autres'));
    expect(screen.getByTestId('groupe-zo_yop')).toBeTruthy();
    expect(screen.queryByTestId('groupe-zo_abo')).toBeNull();
    await defiler(1500);
    expect(await screen.findByTestId('groupe-zo_abo', {}, { timeout: 3000 })).toBeTruthy();
  });
});
