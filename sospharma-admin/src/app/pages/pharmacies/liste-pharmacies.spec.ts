import { formatDate } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../noyau/session.service';
import { TerritoireService } from '../../noyau/territoire.service';
import { ListePharmacies } from './liste-pharmacies';

const base = environment.apiUrl;
const csv = () => new Blob(['id;nom\nph_etoile;Pharmacie de l’Étoile\n'], { type: 'text/csv' });

describe('ListePharmacies, export CSV', () => {
  let fixture: ComponentFixture<ListePharmacies>;
  let http: HttpTestingController;
  let nomsTelecharges: string[];
  let liensRevoques: string[];

  /** Laisse la réponse simulée traverser firstValueFrom avant d'attendre le rendu. */
  async function stable(): Promise<void> {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
  }

  const racine = () => fixture.nativeElement as HTMLElement;
  const boutonExport = () =>
    [...racine().querySelectorAll('button')].find((b) => b.textContent?.includes('Export'))!;

  function repondreListe(): void {
    http
      .expectOne((r) => r.url === `${base}/admin/pharmacies`)
      .flush({
        success: true,
        data: [],
        meta: { pagination: { page: 1, per_page: 25, total: 0, last_page: 1 } },
      });
  }

  async function exporter() {
    boutonExport().click();
    await fixture.whenStable();
    return http.expectOne((r) => r.url === `${base}/admin/pharmacies/export`);
  }

  beforeEach(async () => {
    nomsTelecharges = [];
    liensRevoques = [];
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn((url: string) => void liensRevoques.push(url));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nomsTelecharges.push(this.download);
    });

    TestBed.configureTestingModule({
      imports: [ListePharmacies],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { estAdmin: () => true } },
        {
          provide: TerritoireService,
          useValue: { villes: signal([]), charger: () => Promise.resolve() },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListePharmacies);
    fixture.detectChanges();
    repondreListe();
    await stable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('exporte avec les filtres de la liste affichée, sans pagination ni recherche non lancée', async () => {
    const page = fixture.componentInstance;
    page['q'] = ' Latrille ';
    page['ville'] = 'vi_abj';
    page['h24'] = '1';
    page['chercher']();
    repondreListe();
    await stable();
    page['q'] = 'tapé sans valider';

    const req = await exporter();

    expect(req.request.responseType).toBe('blob');
    const params = req.request.params;
    expect(params.keys().sort()).toEqual(['filter[h24]', 'filter[ville]', 'q']);
    expect(params.get('q')).toBe('Latrille');
    expect(params.get('filter[ville]')).toBe('vi_abj');
    req.flush(csv());
    await stable();
  });

  it('nomme le fichier comme l’API le propose et révoque le lien', async () => {
    const req = await exporter();
    req.flush(csv(), {
      headers: { 'Content-Disposition': 'attachment; filename=pharmacies-abidjan-2026-11-14.csv' },
    });
    await stable();

    expect(nomsTelecharges).toEqual(['pharmacies-abidjan-2026-11-14.csv']);
    expect(liensRevoques).toEqual(['blob:export']);
  });

  it('se rabat sur pharmacies-<date>.csv quand l’en-tête n’est pas lisible', async () => {
    const req = await exporter();
    req.flush(csv());
    await stable();

    expect(nomsTelecharges).toEqual([
      `pharmacies-${formatDate(new Date(), 'yyyy-MM-dd', 'en-US')}.csv`,
    ]);
  });

  it('désactive le bouton pendant l’export', async () => {
    const req = await exporter();
    fixture.detectChanges();

    expect(boutonExport().disabled).toBe(true);
    expect(boutonExport().textContent?.trim()).toBe('Export en cours…');

    req.flush(csv());
    await stable();
    expect(boutonExport().disabled).toBe(false);
    expect(boutonExport().textContent?.trim()).toBe('Exporter (CSV)');
  });

  it('affiche le message de l’API relu dans le corps d’erreur', async () => {
    const req = await exporter();
    req.flush(
      new Blob(
        [
          JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Seuls les administrateurs peuvent exporter l’annuaire.',
            },
          }),
        ],
        { type: 'application/json' },
      ),
      { status: 403, statusText: 'Forbidden' },
    );
    await stable();
    await stable();

    expect(racine().querySelector('.erreur')?.textContent?.trim()).toBe(
      'Seuls les administrateurs peuvent exporter l’annuaire.',
    );
    expect(nomsTelecharges).toEqual([]);
    expect(boutonExport().disabled).toBe(false);
  });
});
