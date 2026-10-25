import { appeler, definirTransport, nombreRelevesDemo, reinitialiserDemoAgent, type NouveauReleve, type Releve, type Transport } from '@/commun/api';
import { transportDemo } from '@/commun/api/demo/adaptateur';

import { depuisApi, lireReleves, versCorpsApi } from '../api';
import { envoyerFile, mettreEnFile, useFileReleves } from '../file';
import { HORAIRES_DEFAUT, resumeHoraires } from '../horaires';
import { nouvelIdentifiantReleve } from '../identifiant';
import { effacerJeton, enregistrerJeton } from '../jeton';

jest.mock('expo-router', () => ({ useRouter: () => ({}), useLocalSearchParams: () => ({}) }));

function releve(nom = 'Pharmacie Bel Air', partiel: Partial<NouveauReleve> = {}): NouveauReleve {
  return {
    id: nouvelIdentifiantReleve(),
    type: 'creation',
    pharmacie_id: null,
    latitude: 5.3601,
    longitude: -3.9801,
    precision_m: 8,
    ajustement_m: 4,
    zone_id: 'abj-cocody',
    champs: {
      nom,
      adresse: 'Face au marché (fictif)',
      telephone: '+2250100000000',
      whatsapp: null,
      horaires: HORAIRES_DEFAUT,
      h24: false,
      services: [],
      assurances: ['as_0002', 'as_0001'],
      assurances_proposees: [],
    },
    releve_le: '2026-10-21T10:42:00Z',
    ...partiel,
  };
}

const PHOTOS = {
  facade: { uri: 'file:///cache/facade.jpg', largeur: 1600, hauteur: 1200 },
  enseigne: { uri: 'file:///cache/enseigne.jpg', largeur: 1600, hauteur: 900 },
};

const horsLigne: Transport = async () => {
  throw new Error('Network request failed');
};

beforeEach(async () => {
  reinitialiserDemoAgent();
  useFileReleves.getState().vider();
  definirTransport(transportDemo);
  await enregistrerJeton('demo_sanctum_test', true);
});

afterAll(() => definirTransport(transportDemo));

describe('File d’attente des relevés : mise en file', () => {
  it('met le relevé en file avec ses photos, avant tout envoi, avec un identifiant généré sur le téléphone', () => {
    const a = releve();
    const b = releve('Pharmacie des Lagunes');
    mettreEnFile(a, PHOTOS, 'Cocody');
    mettreEnFile(b, { facade: PHOTOS.facade }, 'Marcory');
    const { elements } = useFileReleves.getState();
    expect(elements).toHaveLength(2);
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.id).not.toBe(b.id);
    expect(elements[0]?.photos.map((p) => [p.type, p.envoyee])).toEqual([
      ['facade', false],
      ['enseigne', false],
    ]);
    expect(elements[0]?.cree).toBe(false);
  });

  it('remettre le même relevé en file ne le duplique pas', () => {
    const a = releve();
    mettreEnFile(a, PHOTOS, 'Cocody');
    mettreEnFile(a, PHOTOS, 'Cocody');
    expect(useFileReleves.getState().elements).toHaveLength(1);
  });
});

describe('File d’attente des relevés : envoi', () => {
  it('envoie le relevé puis ses photos, vide la file, et le relevé apparaît « en vérification »', async () => {
    const a = releve();
    mettreEnFile(a, PHOTOS, 'Cocody');
    const bilan = await envoyerFile();
    expect(bilan).toEqual({ envoyes: 1, restants: 0, horsLigne: false, sessionExpiree: false });
    expect(useFileReleves.getState().elements).toHaveLength(0);
    expect(nombreRelevesDemo()).toBe(1);
    const liste = await lireReleves();
    if (!liste.success) throw new Error(liste.error.message);
    const recu = liste.data.find((r: Releve) => r.identifiant === a.id);
    expect(recu?.statut).toBe('envoye');
    expect(recu?.photos.map((p) => p.type).sort()).toEqual(['enseigne', 'facade']);
  });

  it('sans réseau : le relevé reste en file, puis part au retour du réseau', async () => {
    mettreEnFile(releve(), PHOTOS, 'Cocody');
    definirTransport(horsLigne);
    const bilan = await envoyerFile();
    expect(bilan.horsLigne).toBe(true);
    expect(bilan.restants).toBe(1);
    const enAttente = useFileReleves.getState().elements[0];
    expect(enAttente?.tentatives).toBe(1);
    expect(enAttente?.bloque).toBe(false);

    definirTransport(transportDemo);
    const reprise = await envoyerFile();
    expect(reprise.envoyes).toBe(1);
    expect(useFileReleves.getState().elements).toHaveLength(0);
    expect(nombreRelevesDemo()).toBe(1);
  });

  it('idempotence : réponse perdue après la création, le renvoi (même identifiant) ne crée pas de doublon', async () => {
    const a = releve();
    mettreEnFile(a, PHOTOS, 'Cocody');
    let creationsVues = 0;
    // L'API reçoit et enregistre le relevé, mais la réponse se perd (coupure).
    definirTransport(async (url, init) => {
      const reponse = await transportDemo(url, init);
      if (init.method === 'POST' && /\/agent\/releves$/.test(url.split('?')[0] ?? '')) {
        creationsVues += 1;
        if (creationsVues === 1) throw new Error('Connexion interrompue');
      }
      return reponse;
    });
    const premier = await envoyerFile();
    expect(premier.horsLigne).toBe(true);
    expect(useFileReleves.getState().elements[0]?.cree).toBe(false);
    expect(nombreRelevesDemo()).toBe(1);

    const second = await envoyerFile();
    expect(second.envoyes).toBe(1);
    expect(creationsVues).toBe(2);
    expect(nombreRelevesDemo()).toBe(1);
    expect(useFileReleves.getState().elements).toHaveLength(0);
  });

  it('photo interrompue : seule la photo manquante est renvoyée, sans recréer le relevé', async () => {
    mettreEnFile(releve(), PHOTOS, 'Cocody');
    let photos = 0;
    definirTransport(async (url, init) => {
      if (/\/photos$/.test(url.split('?')[0] ?? '')) {
        photos += 1;
        if (photos === 2) throw new Error('Connexion interrompue');
      }
      return transportDemo(url, init);
    });
    await envoyerFile();
    const element = useFileReleves.getState().elements[0];
    expect(element?.cree).toBe(true);
    expect(element?.photos.map((p) => p.envoyee)).toEqual([true, false]);
    await envoyerFile();
    expect(photos).toBe(3);
    expect(useFileReleves.getState().elements).toHaveLength(0);
    expect(nombreRelevesDemo()).toBe(1);
  });

  it('relevé refusé par l’API (validation) : bloqué, les suivants partent quand même', async () => {
    mettreEnFile(releve('X'), PHOTOS, 'Cocody');
    mettreEnFile(releve('Pharmacie Riviera 3'), { facade: PHOTOS.facade }, 'Riviera');
    const bilan = await envoyerFile();
    expect(bilan.envoyes).toBe(1);
    const restant = useFileReleves.getState().elements;
    expect(restant).toHaveLength(1);
    expect(restant[0]?.bloque).toBe(true);
    expect(restant[0]?.erreur).toBeTruthy();
    // Un relevé bloqué n'est pas renvoyé automatiquement.
    const encore = await envoyerFile();
    expect(encore.envoyes).toBe(0);
    expect(useFileReleves.getState().elements[0]?.tentatives).toBe(1);
  });

  it('session expirée (jeton absent) : la file est gardée', async () => {
    await effacerJeton();
    mettreEnFile(releve(), PHOTOS, 'Cocody');
    const bilan = await envoyerFile();
    expect(bilan.sessionExpiree).toBe(true);
    expect(useFileReleves.getState().elements).toHaveLength(1);
    expect(nombreRelevesDemo()).toBe(0);
  });

  it('deux envois simultanés n’en font qu’un', async () => {
    mettreEnFile(releve(), PHOTOS, 'Cocody');
    const [a, b] = await Promise.all([envoyerFile(), envoyerFile()]);
    expect(a).toBe(b);
    expect(nombreRelevesDemo()).toBe(1);
  });
});

describe('Relevé : route de création', () => {
  it('refuse une précision au-delà de 30 m', async () => {
    const r = await appeler('/agent/releves', {
      methode: 'POST',
      corps: versCorpsApi(releve('Pharmacie Bel Air', { precision_m: 45 })),
      entetes: { Authorization: 'Bearer demo_sanctum_test' },
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('Horaires du relevé', () => {
  it('résume les horaires comme la maquette', () => {
    expect(resumeHoraires(HORAIRES_DEFAUT)).toBe('Lun. au sam. 08:00 à 21:00, dim. fermée');
    expect(resumeHoraires([], true)).toBe('Ouverte 24h/24, 7j/7');
  });
});

describe('Contrat avec l’API Laravel (EnregistrerReleveRequest, ReleveResource)', () => {
  it('convertit le relevé de la file au format de l’API', () => {
    const r = releve('Pharmacie Bel Air', { type: 'mise_a_jour', pharmacie_id: 'ph_0101', ajustement_m: 4.4 });
    const corps = versCorpsApi(r);
    expect(corps.identifiant).toBe(r.id);
    expect(corps.pharmacie).toBe('ph_0101');
    expect(corps.ajustement_m).toBe(4);
    expect(corps.champs.adresse).toBe('Face au marché (fictif)');
    expect(corps.champs.assurances).toEqual([
      { id: 'as_0002', tiers_payant: false },
      { id: 'as_0001', tiers_payant: false },
    ]);
    expect(corps).not.toHaveProperty('zone_id');
    expect(corps).not.toHaveProperty('id');
    expect(versCorpsApi(releve()).pharmacie).toBeUndefined();
  });

  it('lit la réponse de l’API (nom et quartier dans les champs)', () => {
    const r = depuisApi({
      id: 're_abc123',
      identifiant: 'uuid-1',
      type: 'creation',
      statut: 'envoye',
      commentaire: null,
      ville: { id: 'vi_abj', nom: 'Abidjan' },
      position: { lat: 5.36, lng: -3.98 },
      precision_m: 8,
      ajustement_m: 3,
      champs: { nom: 'Pharmacie Bel Air', quartier: 'Cocody' },
      photos: [{ id: 'rp_1', type: 'facade' }],
      releve_le: '2026-10-21T10:42:00Z',
      recu_le: '2026-10-21T10:43:00Z',
      traite_le: null,
    });
    expect(r).toMatchObject({ id: 're_abc123', identifiant: 'uuid-1', nom: 'Pharmacie Bel Air', commune: 'Cocody', photos: [{ type: 'facade' }] });
  });

  it('envoie les photos sur l’identifiant donné par l’API, pas sur celui du téléphone', async () => {
    const a = releve();
    mettreEnFile(a, PHOTOS, 'Cocody');
    const urls: string[] = [];
    definirTransport(async (url, init) => {
      urls.push(url.split('?')[0] ?? '');
      return transportDemo(url, init);
    });
    await envoyerFile();
    const photos = urls.filter((u) => u.endsWith('/photos'));
    expect(photos).toHaveLength(2);
    expect(photos.every((u) => /\/agent\/releves\/re_demo_[a-z0-9]+\/photos$/.test(u))).toBe(true);
    expect(photos.some((u) => u.includes(a.id))).toBe(false);
  });

  it('refuse une nouvelle pharmacie sans adresse (règle de l’API)', async () => {
    const r = await appeler('/agent/releves', {
      methode: 'POST',
      corps: versCorpsApi(releve('Pharmacie Bel Air', { champs: { ...releve().champs, adresse: '' } })),
      entetes: { Authorization: 'Bearer demo_sanctum_test' },
    });
    expect(!r.success && r.error.details).toHaveProperty(['champs.adresse']);
  });
});
