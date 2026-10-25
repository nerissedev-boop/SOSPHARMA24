import { appeler, definirJetonAppareil, definirTransport, lireJetonAppareil, surJetonAppareilRefuse, type Transport } from '../client';
import { transportDemo } from '../demo/adaptateur';

const META = { request_id: 'req_test', generated_at: '2026-10-25T16:00:00Z' };
const refus: Transport = async () => ({
  status: 401,
  json: async () => ({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Appareil non reconnu.' }, meta: META }),
});

afterAll(() => definirTransport(transportDemo));

describe('jeton d’appareil refusé par l’API', () => {
  it('efface le jeton et prévient l’app pour qu’elle réenregistre l’appareil', async () => {
    definirJetonAppareil('dev_jeton_de_la_demo');
    const ecouteur = jest.fn();
    const desabonner = surJetonAppareilRefuse(ecouteur);
    definirTransport(refus);

    const r = await appeler('/appareils/moi/favoris', { methode: 'POST', corps: { pharmacie_id: 'ph_1' } });

    expect(r.success).toBe(false);
    expect(lireJetonAppareil()).toBeNull();
    expect(ecouteur).toHaveBeenCalledTimes(1);
    desabonner();
  });

  it('ne touche pas au jeton d’appareil quand c’est une route agent (jeton Sanctum) qui est refusée', async () => {
    definirJetonAppareil('dev_valide');
    const ecouteur = jest.fn();
    const desabonner = surJetonAppareilRefuse(ecouteur);
    definirTransport(refus);

    await appeler('/agent/releves', { entetes: { Authorization: 'Bearer expire' } });

    expect(lireJetonAppareil()).toBe('dev_valide');
    expect(ecouteur).not.toHaveBeenCalled();
    desabonner();
  });
});
