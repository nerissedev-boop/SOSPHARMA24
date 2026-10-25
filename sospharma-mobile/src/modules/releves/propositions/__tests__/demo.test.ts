import { appeler, definirJetonAppareil, definirTransport } from '@/commun/api/client';
import type { Proposition } from '@/commun/api/schema';
import { reinitialiserDemoAgent, transportDemo } from '@/commun/api/demo/adaptateur';

const corps = (surcharges: Record<string, unknown> = {}) => ({
  identifiant: '9a1c2d3e-0000-4000-8000-000000000001',
  latitude: 5.36,
  longitude: -3.96,
  gps_latitude: 5.36005,
  gps_longitude: -3.96002,
  precision_m: 12,
  releve_le: '2026-10-20T09:58:00Z',
  nom: 'Pharmacie proposée (test)',
  telephone: '+2250000000123',
  ...surcharges,
});

describe('Propositions (adaptateur de démonstration, mêmes règles que l\'API)', () => {
  beforeAll(() => definirTransport(transportDemo));
  beforeEach(() => {
    reinitialiserDemoAgent();
    definirJetonAppareil('dev_demo_test');
  });

  it('crée une proposition en vérification, idempotente', async () => {
    const r = await appeler<Proposition>('/propositions', { methode: 'POST', corps: corps() });
    expect(r.success && r.status).toBe(201);
    if (!r.success) return;
    expect(r.data.statut).toBe('en_verification');

    const renvoi = await appeler<Proposition>('/propositions', { methode: 'POST', corps: corps({ nom: 'Autre' }) });
    expect(renvoi.success && renvoi.data.id).toBe(r.data.id);
    expect(renvoi.success && renvoi.meta.deja_recu).toBe(true);

    const liste = await appeler<Proposition[]>('/propositions');
    expect(liste.success && liste.data.map((p) => p.statut)).toEqual(['en_verification', 'en_ligne', 'en_ligne']);
  });

  it('refuse un repère à plus de 100 m du téléphone et une position imprécise', async () => {
    const loin = await appeler('/propositions', { methode: 'POST', corps: corps({ gps_latitude: 5.362 }) });
    expect(!loin.success && loin.error.details).toHaveProperty('latitude');
    const flou = await appeler('/propositions', { methode: 'POST', corps: corps({ precision_m: 45 }) });
    expect(!flou.success && flou.error.code).toBe('VALIDATION_FAILED');
  });

  it('limite à 3 propositions par jour', async () => {
    for (const n of [1, 2, 3]) {
      const r = await appeler('/propositions', { methode: 'POST', corps: corps({ identifiant: `limite-00000000${n}` }) });
      expect(r.success).toBe(true);
    }
    const r = await appeler('/propositions', { methode: 'POST', corps: corps({ identifiant: 'limite-000000004' }) });
    expect(!r.success && r.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('Vérification avant envoi (démo)', () => {
  beforeAll(() => definirTransport(transportDemo));

  it('renvoie les pharmacies fictives à moins de 100 m du repère', async () => {
    const r = await appeler<{ id: string; distance_m: number }[]>('/pharmacies/proches', { params: { lat: 5.36, lng: -3.96, rayon: 100, limite: 5 } });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.length).toBeGreaterThan(0);
    expect(r.data.every((p) => p.distance_m <= 100)).toBe(true);
  });
});
