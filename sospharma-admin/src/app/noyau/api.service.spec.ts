import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService, ErreurApi } from './api.service';
import { intercepteurApi } from './intercepteur';
import { SessionService } from './session.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'connexion', children: [] }]), provideHttpClient(withInterceptors([intercepteurApi])), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("déballe l'enveloppe et retire les paramètres vides", async () => {
    const promesse = firstValueFrom(api.page('admin/pharmacies', { q: '', 'filter[ville]': 'vi_abj', page: 2, x: null }));
    const req = http.expectOne((r) => r.url === `${base}/admin/pharmacies`);
    expect(req.request.params.keys().sort()).toEqual(['filter[ville]', 'page']);
    req.flush({ success: true, data: [{ id: 'ph_1' }], meta: { pagination: { page: 2, per_page: 20, total: 21, last_page: 2 } } });
    const page = await promesse;
    expect(page.donnees).toEqual([{ id: 'ph_1' }]);
    expect(page.pagination.total).toBe(21);
  });

  it("transforme l'erreur de l'API en ErreurApi avec les messages par champ", async () => {
    const promesse = firstValueFrom(api.post('admin/comptes', {}));
    http.expectOne(`${base}/admin/comptes`).flush(
      { success: false, error: { code: 'VALIDATION_FAILED', message: 'Certaines informations sont invalides.', details: { email: ['E-mail requis.'] } } },
      { status: 422, statusText: 'Unprocessable' },
    );
    const erreur = (await promesse.catch((e: unknown) => e)) as ErreurApi;
    expect(erreur).toBeInstanceOf(ErreurApi);
    expect(erreur.code).toBe('VALIDATION_FAILED');
    expect(erreur.messages).toEqual(['E-mail requis.']);
  });

  it('ajoute le jeton et oublie la session si l’API répond 401', async () => {
    const session = TestBed.inject(SessionService);
    session.jeton.set('sp_test');
    const promesse = firstValueFrom(api.get('auth/moi'));
    const req = http.expectOne(`${base}/auth/moi`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer sp_test');
    req.flush({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Non connecté.' } }, { status: 401, statusText: 'Unauthorized' });
    await promesse.catch(() => undefined);
    expect(session.jeton()).toBeNull();
  });
});
