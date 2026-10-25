import { fireEvent, screen } from '@testing-library/react-native';

import { appeler, reinitialiserDemoAgent, type Assurance, type PharmacieResume } from '@/commun/api';
import { ASSURANCES_CI } from '@/commun/api/demo/donnees';
import { FILTRES_PAR_DEFAUT, usePreferences, useSelectionAssurances, useSession } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import { paramsFiltres } from '../api';
import Fiche from '../ecrans/Fiche';
import Filtres from '../ecrans/Filtres';
import { accepteMesAssurances, grouperAssurances, trierAssurancesFiche } from '../hooks/useAssurances';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => mockParams,
}));

const ICI = { lat: 5.36, lng: -3.98 };

async function proches(assurances: string[]): Promise<PharmacieResume[]> {
  const r = await appeler<PharmacieResume[]>('/pharmacies/proches', {
    params: { ...ICI, limite: 50, ...paramsFiltres({ ...FILTRES_PAR_DEFAUT, rayonKm: 5, assurances }) },
  });
  if (!r.success) throw new Error(r.error.message);
  return r.data;
}

beforeEach(() => {
  jest.clearAllMocks();
  reinitialiserDemoAgent();
  mockParams = {};
  useSession.setState({ position: { latitude: 5.36, longitude: -3.98 } });
  usePreferences.setState({
    filtres: FILTRES_PAR_DEFAUT,
    assurancesFiltreChoisies: false,
    mesAssurances: [
      { slug: 'mugef-ci', nom: 'MUGEF-CI' },
      { slug: 'cmu', nom: 'CMU' },
    ],
  });
});

describe('Filtre assurances : « au moins une »', () => {
  it('envoie filter[assurances] avec les slugs choisis', () => {
    expect(paramsFiltres({ ...FILTRES_PAR_DEFAUT, assurances: ['mugef-ci', 'cmu'] })['filter[assurances]']).toEqual(['mugef-ci', 'cmu']);
  });

  it('renvoie les pharmacies qui acceptent au moins une des assurances (union, pas intersection)', async () => {
    const toutes = await proches([]);
    const priveC = await proches(['prive-c']);
    expect(priveC.map((p) => p.nom)).toEqual(['Pharmacie du Centre']);
    const cmu = await proches(['cmu']);
    const priveB = await proches(['prive-b']);
    const lesDeux = await proches(['prive-b', 'cmu']);
    const attendues = toutes.filter((p) => p.assurances.some((a) => a.slug === 'prive-b' || a.slug === 'cmu')).map((p) => p.id);
    expect(lesDeux.map((p) => p.id).sort()).toEqual(attendues.sort());
    expect(lesDeux.length).toBeGreaterThan(cmu.length);
    expect(lesDeux.length).toBeGreaterThan(priveB.length);
    expect(lesDeux.every((p) => p.assurances.some((a) => ['prive-b', 'cmu'].includes(a.slug)))).toBe(true);
  });

  it('chaque pharmacie renvoie ses assurances et accepte_mes_assurances après PUT /appareils/moi/assurances', async () => {
    const avant = await proches([]);
    expect(avant.every((p) => p.accepte_mes_assurances === null)).toBe(true);
    // Comme l'API : des identifiants du référentiel (as_…), pas des slugs.
    const priveC = ASSURANCES_CI.find((a) => a.slug === 'prive-c')?.id ?? '';
    const put = await appeler<Assurance[]>('/appareils/moi/assurances', { methode: 'PUT', corps: { assurances: [priveC] } });
    expect(put.success).toBe(true);
    const apres = await proches([]);
    expect(apres.find((p) => p.id === 'ph_0101')?.accepte_mes_assurances).toBe(true);
    expect(apres.find((p) => p.id === 'ph_0142')?.accepte_mes_assurances).toBe(false);
  });
});

describe('Référentiel et affichage', () => {
  it('18 assurances groupées : régimes publics, mutuelles, assureurs privés', async () => {
    const r = await appeler<Assurance[]>('/pays/CI/assurances');
    if (!r.success) throw new Error();
    expect(r.data).toHaveLength(18);
    const groupes = grouperAssurances(r.data);
    expect(groupes.map((g) => g.type)).toEqual(['publique', 'mutuelle', 'privee']);
    expect(groupes[0]?.assurances.map((a) => a.nom)).toEqual(['CMU', 'MUGEF-CI']);
  });

  it('fiche : les miennes d’abord, tiers payant en tête ; acceptation calculée en local sans réponse de l’API', () => {
    const liste = [
      { id: '1', slug: 'prive-a', nom: '[Assureur privé A]', type: 'privee' as const, tiers_payant: false },
      { id: '2', slug: 'cmu', nom: 'CMU', type: 'publique' as const, tiers_payant: false },
      { id: '3', slug: 'mugef-ci', nom: 'MUGEF-CI', type: 'publique' as const, tiers_payant: true },
    ];
    expect(trierAssurancesFiche(liste, ['cmu', 'mugef-ci']).map((a) => a.nom)).toEqual(['MUGEF-CI', 'CMU', '[Assureur privé A]']);
    expect(accepteMesAssurances({ assurances: liste, accepte_mes_assurances: null }, ['cmu'])).toBe(true);
    expect(accepteMesAssurances({ assurances: liste, accepte_mes_assurances: null }, ['prive-z'])).toBe(false);
    expect(accepteMesAssurances({ assurances: liste, accepte_mes_assurances: true }, [])).toBe(false);
  });
});

describe('Écran Filtres', () => {
  it('pré-rempli avec « Mes assurances », croix pour retirer, « Ajouter (18 au total) », filtre appliqué en validant', async () => {
    await rendre(<Filtres />);
    expect(await screen.findByText('MUGEF-CI')).toBeTruthy();
    expect(screen.getByText('CMU')).toBeTruthy();
    expect(screen.getByText('Pré-rempli avec vos assurances du Profil.')).toBeTruthy();
    expect(screen.getByText('accepte au moins une')).toBeTruthy();
    expect(await screen.findByText('Ajouter (18 au total)')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Retirer MUGEF-CI' }));
    expect(screen.queryByText('MUGEF-CI')).toBeNull();
    expect(useSelectionAssurances.getState().selections.filtres).toEqual(['cmu']);

    await fireEvent.press(screen.getByTestId('bouton-ajouter-assurance'));
    expect(mockRouteur.push).toHaveBeenCalledWith({ pathname: '/assurances', params: { contexte: 'filtres' } });

    await fireEvent.press(screen.getByTestId('bouton-appliquer-filtres'));
    expect(usePreferences.getState().filtres.assurances).toEqual(['cmu']);
    expect(screen.getByTestId('icone-liste')).toBeTruthy();
  });
});

describe('Fiche : assurances acceptées', () => {
  it('3 puces puis « + 4 autres » qui déplie, puce « Accepte votre assurance »', async () => {
    mockParams = { id: 'ph_0101' };
    await rendre(<Fiche />);
    expect(await screen.findByText('Assurances acceptées (7)')).toBeTruthy();
    expect(screen.getByTestId('puce-accepte-assurance')).toBeTruthy();
    expect(screen.getByText('Accepte votre assurance')).toBeTruthy();
    expect(screen.getByText('tiers payant')).toBeTruthy();
    expect(screen.getAllByTestId(/^puce-fiche-/)).toHaveLength(3);
    await fireEvent.press(screen.getByText('+ 4 autres'));
    expect(screen.getAllByTestId(/^puce-fiche-/)).toHaveLength(7);
    expect(screen.queryByText('+ 4 autres')).toBeNull();
  });
});
