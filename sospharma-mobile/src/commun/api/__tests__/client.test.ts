import { appeler, construireUrl, definirJetonAppareil, definirTransport, donneesOuErreur, type Transport } from '../client';
import { transportDemo } from '../demo/adaptateur';
import { reactionPour } from '../reactions';
import type { PharmacieResume } from '../schema';
import { ErreurAppel } from '../types';

const META = { request_id: 'req_test', generated_at: '2026-10-20T23:40:12Z' };

function transportFixe(status: number, corps: unknown, espion?: (url: string, init: RequestInit) => void): Transport {
  return async (url, init) => {
    espion?.(url, init);
    return { status, json: async () => corps };
  };
}

afterAll(() => definirTransport(transportDemo));

describe('Client API : enveloppe standard', () => {
  it('renvoie data et meta en succès', async () => {
    definirTransport(transportFixe(200, { success: true, data: { id: 'ph_0142', nom: 'Pharmacie de la Paix' }, meta: META }));
    const r = await appeler<{ id: string }>('/pharmacies/ph_0142');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe('ph_0142');
      expect(r.meta.request_id).toBe('req_test');
      expect(r.status).toBe(200);
    }
  });

  it('convertit une erreur métier en ApiResult avec code, message et détails', async () => {
    definirTransport(
      transportFixe(422, {
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Certaines informations sont invalides.', details: { motif: ['Choisissez un motif de signalement.'] } },
        meta: META,
      }),
    );
    const r = await appeler('/pharmacies/ph_0142/signalements', { methode: 'POST', corps: {} });
    expect(r).toEqual({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Certaines informations sont invalides.', details: { motif: ['Choisissez un motif de signalement.'] } },
      meta: META,
      status: 422,
    });
  });

  it('signale une erreur réseau sans lever d\'exception', async () => {
    definirTransport(async () => {
      throw new TypeError('Network request failed');
    });
    const r = await appeler('/pays');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.code).toBe('NETWORK_ERROR');
      expect(r.meta).toBeNull();
    }
  });

  it('refuse une réponse hors enveloppe (erreur de format)', async () => {
    definirTransport(transportFixe(200, { id: 'ph_0142' }));
    const r = await appeler('/pharmacies/ph_0142');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_RESPONSE');
  });

  it('refuse une enveloppe sans meta.request_id', async () => {
    definirTransport(transportFixe(200, { success: true, data: [] }));
    const r = await appeler('/pays');
    expect(!r.success && r.error.code).toBe('INVALID_RESPONSE');
  });

  it('ramène un code inconnu à SERVER_ERROR', async () => {
    definirTransport(transportFixe(500, { success: false, error: { code: 'OUPS', message: 'Panne' }, meta: META }));
    const r = await appeler('/pays');
    expect(!r.success && r.error.code).toBe('SERVER_ERROR');
  });

  it('envoie le jeton d\'appareil dans X-Device-Token et les filtres en paramètres', async () => {
    let url = '';
    let entetes: Record<string, string> = {};
    definirJetonAppareil('dev_123');
    definirTransport(
      transportFixe(200, { success: true, data: [], meta: META }, (u, init) => {
        url = u;
        entetes = init.headers as Record<string, string>;
      }),
    );
    await appeler('/pharmacies/proches', { params: { lat: 5.36, lng: -3.98, 'filter[statut]': ['ouverte', 'garde'], 'filter[h24]': false } });
    expect(entetes['X-Device-Token']).toBe('dev_123');
    expect(url).toContain('/api/v1/pharmacies/proches?lat=5.36&lng=-3.98&filter[statut]=ouverte%2Cgarde');
    expect(url).not.toContain('h24');
    definirJetonAppareil(null);
  });

  it('donneesOuErreur lève une ErreurAppel portant le code et le request_id', async () => {
    definirTransport(transportFixe(429, { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Trop.' }, meta: META }));
    const r = await appeler('/support/messages', { methode: 'POST', corps: { message: 'x' } });
    expect(() => donneesOuErreur(r)).toThrow(ErreurAppel);
    try {
      donneesOuErreur(r);
    } catch (e) {
      expect((e as ErreurAppel).code).toBe('TOO_MANY_REQUESTS');
      expect((e as ErreurAppel).requestId).toBe('req_test');
      expect(reactionPour(e)).toEqual({ type: 'message', message: expect.stringContaining('Réessayez demain') });
    }
  });

  it('construit les URL sous /api/v1', () => {
    expect(construireUrl('/pays')).toMatch(/\/api\/v1\/pays$/);
  });
});

describe('Réactions aux codes d\'erreur (un seul endroit)', () => {
  it('ZONE_NOT_COVERED ouvre l\'écran « zone pas encore couverte » avec la ville', () => {
    const e = new ErreurAppel({ code: 'ZONE_NOT_COVERED', message: '', details: { ville: 'Korhogo' } }, META, 422);
    expect(reactionPour(e)).toEqual({ type: 'ecran', route: '/zone/non-couverte', params: { ville: 'Korhogo' } });
  });
  it('VALIDATION_FAILED renvoie les erreurs par champ', () => {
    const e = new ErreurAppel({ code: 'VALIDATION_FAILED', message: 'Invalide', details: { motif: ['Choisissez un motif.'] } }, META, 422);
    expect(reactionPour(e)).toEqual({ type: 'formulaire', message: 'Invalide', champs: { motif: 'Choisissez un motif.' } });
  });
  it('NETWORK_ERROR garde le cache (bandeau hors connexion)', () => {
    const e = new ErreurAppel({ code: 'NETWORK_ERROR', message: '' }, null, null);
    expect(reactionPour(e).type).toBe('cache');
  });
});

describe('Adaptateur de démonstration', () => {
  beforeAll(() => definirTransport(transportDemo));

  it('sert /pharmacies/proches au format de l\'API (données fictives)', async () => {
    const r = await appeler<PharmacieResume[]>('/pharmacies/proches', { params: { lat: 5.36, lng: -3.98, rayon: 5000 } });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.meta.nombre).toBe(r.data.length);
    const [premiere] = r.data;
    expect(premiere?.nom).toBe('Pharmacie du Centre');
    expect(premiere?.distance_m).toBeGreaterThan(400);
    expect(premiere?.distance_m).toBeLessThan(450);
    expect(premiere?.marche_min).toBe(6);
  });

  it('répond ZONE_NOT_COVERED hors d\'Abidjan', async () => {
    const r = await appeler('/zones/depuis-position', { params: { lat: 9.45, lng: -5.62 } });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.status).toBe(422);
      expect(r.error.code).toBe('ZONE_NOT_COVERED');
      expect(r.error.details).toEqual({ ville: 'Korhogo' });
    }
  });

  it('valide les signalements', async () => {
    const r = await appeler('/pharmacies/ph_0142/signalements', { methode: 'POST', corps: {} });
    expect(!r.success && r.error.code).toBe('VALIDATION_FAILED');
  });
});
