import { appeler } from '@/commun/api/client';
import { reinitialiserDemoAgent } from '@/commun/api/demo/adaptateur';
import type { TelephonePharmacie } from '@/commun/api/schema';

/** Faux serveur du mode démo : mêmes règles que l'API pour les numéros d'une fiche. */
const entetes = { Authorization: 'Bearer demo_sanctum_test' };
const BASE = '/agent/pharmacies/ph_0142/telephones';

describe('Démo : numéros d’une fiche', () => {
  beforeEach(() => reinitialiserDemoAgent());

  it('liste, ajout au format national, doublon signalé, retrait', async () => {
    const liste = await appeler<TelephonePharmacie[]>(BASE, { entetes });
    expect(liste.success && liste.data.map((t) => t.rang)).toEqual([1, 2]);

    const ajout = await appeler<TelephonePharmacie>(BASE, { methode: 'POST', corps: { numero: '07 07 12 34 56', whatsapp: true }, entetes });
    expect(ajout.status).toBe(201);
    expect(ajout.success && ajout.data).toMatchObject({ numero: '+2250707123456', rang: 3, whatsapp: true, origine: 'agent' });

    const encore = await appeler<TelephonePharmacie>(BASE, { methode: 'POST', corps: { numero: '+2250707123456' }, entetes });
    expect(encore.status).toBe(200);
    expect(encore.success && encore.meta.deja_present).toBe(true);

    const illisible = await appeler(BASE, { methode: 'POST', corps: { numero: '07 07' }, entetes });
    expect(illisible.success === false && illisible.error.details).toHaveProperty('numero');

    const id = ajout.success ? ajout.data.id : '';
    const retrait = await appeler(`${BASE}/${id}`, { methode: 'DELETE', entetes });
    expect(retrait).toMatchObject({ success: true, status: 204 });
    const second = await appeler(`${BASE}/${id}`, { methode: 'DELETE', entetes });
    expect(second.status).toBe(404);
  });

  it('principal : passe en tête ; ne se retire pas tant qu’il en reste d’autres', async () => {
    const r = await appeler<TelephonePharmacie>(`${BASE}/tl_0142_2`, { methode: 'PATCH', corps: { principal: true }, entetes });
    expect(r.success && r.data).toMatchObject({ rang: 1, principal: true });
    const refus = await appeler(`${BASE}/tl_0142_2`, { methode: 'DELETE', entetes });
    expect(refus.status).toBe(422);
    const faux = await appeler(`${BASE}/tl_0142_2`, { methode: 'PATCH', corps: { principal: false }, entetes });
    expect(faux.status).toBe(422);
  });
});
