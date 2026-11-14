import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { definirTransport, type Transport } from '@/commun/api/client';
import { transportDemo } from '@/commun/api/demo/adaptateur';
import type { TelephonePharmacie } from '@/commun/api';
import { useDialogues, useSessionAgent } from '@/commun/lib';
import { rendre } from '@/commun/lib/tests/rendu';

import NumerosPharmacie from '../ecrans/NumerosPharmacie';

const mockRouteur = { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouteur,
  useLocalSearchParams: () => ({ id: 'ph_0142' }),
}));

const META = { request_id: 'req_test', generated_at: '2026-11-14T10:00:00Z' };
const BASE = '/agent/pharmacies/ph_0142/telephones';

type Reponse = { status: number; corps?: unknown };
type Requete = { methode: string; chemin: string; corps: Record<string, unknown> | undefined };

let numeros: TelephonePharmacie[];
/** Réponse imposée par un test ; sans elle, le petit serveur ci-dessous applique les règles de l'API. */
let surcharge: ((r: Requete) => Reponse | Promise<Reponse> | undefined) | null;

const ok = (data: unknown, status = 200, meta: Record<string, unknown> = {}): Reponse => ({ status, corps: { success: true, data, meta: { ...META, ...meta } } });
const echec = (status: number, code: string, message: string, details?: Record<string, unknown>): Reponse => ({
  status,
  corps: { success: false, error: { code, message, ...(details ? { details } : {}) }, meta: META },
});

function serveur({ methode, chemin, corps }: Requete): Reponse {
  if (methode === 'GET' && chemin === BASE) return ok(numeros);
  const id = chemin.slice(BASE.length + 1);
  const cible = numeros.find((t) => t.id === id);
  if (methode === 'PATCH' && cible) {
    if (typeof corps?.whatsapp === 'boolean') Object.assign(cible, { whatsapp: corps.whatsapp, whatsapp_confirme_le: '2026-11-14T10:00:00Z' });
    if (corps?.principal === true) numeros = [cible, ...numeros.filter((t) => t !== cible)];
    numeros = numeros.map((t, i) => ({ ...t, rang: i + 1, principal: i === 0 }));
    return ok(numeros.find((t) => t.id === id));
  }
  return echec(404, 'NOT_FOUND', 'Ce numéro n’est plus sur la fiche.');
}

const transport: Transport = async (url, init) => {
  const chemin = url.replace(/^.*\/api\/v1/, '').split('?')[0] ?? '';
  // Le reste (pays, fiche publique) vient de la démo.
  if (!chemin.startsWith(BASE)) return transportDemo(url, init);
  const requete = { methode: init.method ?? 'GET', chemin, corps: typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined };
  const r = (await surcharge?.(requete)) ?? serveur(requete);
  return {
    status: r.status,
    json: async () => {
      if (r.corps === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return r.corps;
    },
  };
};

const ligne = (id: string) => within(screen.getByTestId(`numero-${id}`));
const selectionne = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.selected === true;

describe('Numéros d’une fiche (espace agent)', () => {
  beforeAll(() => definirTransport(transport));
  afterAll(() => definirTransport(transportDemo));
  beforeEach(() => {
    jest.clearAllMocks();
    surcharge = null;
    useDialogues.setState({ courant: null, ouvert: false });
    useSessionAgent.setState({ agent: { id: 'cp_1', prenom: 'Koffi', nom: 'Yao', ville: 'Abidjan', villes: [{ id: 'abj', nom: 'Abidjan' }] } });
    numeros = [
      { id: 'tl_1', numero: '+2250707000001', rang: 1, principal: true, whatsapp: true, whatsapp_confirme_le: '2026-11-14T09:00:00Z', origine: 'import' },
      { id: 'tl_2', numero: '+2250505000002', rang: 2, principal: false, whatsapp: false, whatsapp_confirme_le: null, origine: 'liste_garde' },
    ];
  });

  it('tous les numéros, au format local, avec le principal et la date de vérification WhatsApp', async () => {
    await rendre(<NumerosPharmacie />);
    expect(await screen.findByText('07 07 00 00 01')).toBeTruthy();
    expect(screen.getByText('05 05 00 00 02')).toBeTruthy();
    expect(screen.getByTestId('numero-tl_1-principal')).toBeTruthy();
    expect(screen.getByTestId('numero-tl_1-verification')).toHaveTextContent('Vérifié le 14 nov.');
    expect(screen.getByTestId('numero-tl_2-verification')).toHaveTextContent('Pas encore vérifié');
    // Jamais vérifié : ni « Oui » ni « Non » d'office.
    expect(selectionne('numero-tl_2-whatsapp-oui')).toBe(false);
    expect(selectionne('numero-tl_2-whatsapp-non')).toBe(false);
    expect(screen.getByRole('button', { name: 'Appeler le 05 05 00 00 02' })).toBeTruthy();
  });

  it('WhatsApp : la réponse s’affiche tout de suite, puis revient en arrière si l’API refuse', async () => {
    let refuser: (r: Reponse) => void = () => undefined;
    surcharge = ({ methode }) => (methode === 'PATCH' ? new Promise<Reponse>((resoudre) => (refuser = resoudre)) : undefined);
    await rendre(<NumerosPharmacie />);
    await screen.findByText('07 07 00 00 01');
    expect(selectionne('numero-tl_1-whatsapp-oui')).toBe(true);

    await fireEvent.press(screen.getByTestId('numero-tl_1-whatsapp-non'));
    await waitFor(() => expect(selectionne('numero-tl_1-whatsapp-non')).toBe(true));

    refuser(echec(403, 'FORBIDDEN', 'Cette pharmacie n’est pas dans vos villes.'));
    await waitFor(() => expect(selectionne('numero-tl_1-whatsapp-oui')).toBe(true));
    expect(useDialogues.getState().courant?.message).toBe('Cette pharmacie n’est pas dans vos villes.');
  });

  it('choisir le principal le met en tête, les autres gardent leur ordre', async () => {
    numeros.push({ id: 'tl_3', numero: '+2250101000003', rang: 3, principal: false, whatsapp: false, whatsapp_confirme_le: null, origine: 'agent' });
    await rendre(<NumerosPharmacie />);
    await screen.findByText('07 07 00 00 01');
    await fireEvent.press(screen.getByTestId('numero-tl_3-choisir-principal'));
    await waitFor(() => expect(screen.getByTestId('numero-tl_3-principal')).toBeTruthy());
    const ordre = within(screen.getByTestId('liste-numeros'))
      .getAllByTestId(/^numero-tl_\d$/)
      .map((n) => n.props.testID);
    expect(ordre).toEqual(['numero-tl_3', 'numero-tl_1', 'numero-tl_2']);
    expect(screen.getByTestId('numero-tl_1-choisir-principal')).toBeTruthy();
  });

  it('ajout : l’erreur de l’API s’affiche sous le champ', async () => {
    surcharge = ({ methode }) =>
      methode === 'POST'
        ? echec(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', {
            numero: ['Ce numéro n’est pas reconnu. Saisissez-le en entier, par exemple 07 07 12 34 56.'],
          })
        : undefined;
    await rendre(<NumerosPharmacie />);
    await screen.findByText('07 07 00 00 01');
    await fireEvent.changeText(screen.getByTestId('champ-nouveau-numero'), '07 07');
    await fireEvent.press(screen.getByTestId('bouton-ajouter-numero'));
    expect(await screen.findByText('Ce numéro n’est pas reconnu. Saisissez-le en entier, par exemple 07 07 12 34 56.')).toBeTruthy();
    expect(useDialogues.getState().courant).toBeNull();
  });

  it('ajout réussi : le numéro rejoint la liste, le champ se vide', async () => {
    surcharge = ({ methode, corps }) => {
      if (methode !== 'POST') return undefined;
      const nouveau: TelephonePharmacie = { id: 'tl_4', numero: '+2250707123456', rang: 3, principal: false, whatsapp: corps?.whatsapp === true, whatsapp_confirme_le: '2026-11-14T10:00:00Z', origine: 'agent' };
      numeros = [...numeros, nouveau];
      return ok(nouveau, 201);
    };
    await rendre(<NumerosPharmacie />);
    await screen.findByText('07 07 00 00 01');
    await fireEvent.changeText(screen.getByTestId('champ-nouveau-numero'), '07 07 12 34 56');
    await fireEvent.press(screen.getByTestId('case-nouveau-whatsapp'));
    await fireEvent.press(screen.getByTestId('bouton-ajouter-numero'));
    expect(await screen.findByText('07 07 12 34 56')).toBeTruthy();
    expect(screen.getByTestId('numero-ajoute')).toHaveTextContent('Numéro ajouté à la fiche.');
    expect(screen.getByTestId('champ-nouveau-numero').props.value).toBe('');
  });

  it('pas de « Retirer » sur le principal tant qu’il en reste d’autres ; il revient après le choix d’un autre principal', async () => {
    await rendre(<NumerosPharmacie />);
    await screen.findByText('07 07 00 00 01');
    expect(ligne('tl_1').queryByText('Retirer ce numéro')).toBeNull();
    expect(ligne('tl_2').getByText('Retirer ce numéro')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('numero-tl_2-choisir-principal'));
    await waitFor(() => expect(screen.getByTestId('numero-tl_2-principal')).toBeTruthy());
    expect(ligne('tl_1').getByText('Retirer ce numéro')).toBeTruthy();
    expect(ligne('tl_2').queryByText('Retirer ce numéro')).toBeNull();
  });

  it('retrait refusé par l’API : le numéro revient avec le message', async () => {
    const message = 'Ce numéro ne peut pas être retiré.';
    surcharge = ({ methode }) => (methode === 'DELETE' ? echec(422, 'VALIDATION_FAILED', message) : undefined);
    await rendre(<NumerosPharmacie />);
    await screen.findByText('05 05 00 00 02');
    await fireEvent.press(ligne('tl_2').getByText('Retirer ce numéro'));
    const confirmation = useDialogues.getState().courant;
    expect(confirmation?.titre).toBe('Retirer le 05 05 00 00 02 ?');
    // Bouton neutre, au libellé exact.
    const bouton = confirmation?.boutons.find((b) => b.text === 'Retirer ce numéro');
    expect(bouton?.style).toBeUndefined();
    bouton?.onPress?.();
    await waitFor(() => expect(useDialogues.getState().courant?.message).toBe(message));
    expect(screen.getByText('05 05 00 00 02')).toBeTruthy();
  });

  it('retrait déjà fait ailleurs (404) : traité comme un succès, le numéro disparaît', async () => {
    surcharge = ({ methode }) => {
      if (methode !== 'DELETE') return undefined;
      numeros = numeros.filter((t) => t.id !== 'tl_2');
      return echec(404, 'NOT_FOUND', 'Ce numéro n’est plus sur la fiche.');
    };
    await rendre(<NumerosPharmacie />);
    await screen.findByText('05 05 00 00 02');
    await fireEvent.press(ligne('tl_2').getByText('Retirer ce numéro'));
    useDialogues.getState().courant?.boutons.find((b) => b.text === 'Retirer ce numéro')?.onPress?.();
    await waitFor(() => expect(screen.queryByText('05 05 00 00 02')).toBeNull());
    expect(useDialogues.getState().courant?.titre).toBe('Retirer le 05 05 00 00 02 ?');
  });

  it('session expirée (401) : retour à la connexion de l’agent', async () => {
    surcharge = () => echec(401, 'UNAUTHENTICATED', 'Votre session a expiré. Reconnectez-vous.');
    await rendre(<NumerosPharmacie />);
    await waitFor(() => expect(mockRouteur.navigate).toHaveBeenCalledWith('/agent/connexion'));
    expect(useSessionAgent.getState().agent).toBeNull();
  });
});
