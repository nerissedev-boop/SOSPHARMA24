import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Pharmacie } from '../../noyau/types';
import { PhotoFacade } from './photo-facade';

const chemin = `${environment.apiUrl}/admin/pharmacies/ph_etoile/photo`;
const URL_PHOTO = 'https://api.exemple.ci/storage/pharmacies/facades/ph_etoile-abc.jpg';

describe('PhotoFacade', () => {
  let fixture: ComponentFixture<PhotoFacade>;
  let http: HttpTestingController;
  let recues: Pharmacie[];

  async function stable(): Promise<void> {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
  }

  async function afficher(photo: string | null): Promise<void> {
    fixture = TestBed.createComponent(PhotoFacade);
    fixture.componentRef.setInput('pharmacie', 'ph_etoile');
    fixture.componentRef.setInput('nom', 'Pharmacie Étoile');
    fixture.componentRef.setInput('photo', photo);
    recues = [];
    fixture.componentInstance.modifiee.subscribe((p) => recues.push(p));
    await stable();
  }

  const racine = () => fixture.nativeElement as HTMLElement;
  const bouton = (texte: string) =>
    [...racine().querySelectorAll('button')].find((b) => b.textContent?.trim() === texte);

  /** Simule le choix d'un fichier dans la boîte de dialogue du navigateur. */
  async function choisir(fichier: File): Promise<void> {
    const champ = racine().querySelector('[data-test="champ-photo"]') as HTMLInputElement;
    Object.defineProperty(champ, 'files', { value: [fichier], configurable: true });
    champ.dispatchEvent(new Event('change'));
    await stable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PhotoFacade],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('sans photo : explique la devanture dessinée, propose « Choisir une photo », pas de retrait', async () => {
    await afficher(null);

    expect(racine().textContent).toContain('l’app montre la devanture dessinée');
    expect(racine().textContent).toContain('Choisir une photo');
    expect(racine().querySelector('img')).toBeNull();
    expect(bouton('Retirer la photo')).toBeUndefined();
  });

  it('avec photo : l’image, « Remplacer la photo » et « Retirer la photo »', async () => {
    await afficher(URL_PHOTO);

    const image = racine().querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe(URL_PHOTO);
    expect(image.getAttribute('alt')).toBe('Façade de Pharmacie Étoile');
    expect(racine().textContent).toContain('Remplacer la photo');
    expect(bouton('Retirer la photo')).toBeDefined();
  });

  it('envoie la photo choisie en multipart et transmet la fiche renvoyée', async () => {
    await afficher(null);
    await choisir(new File(['jpeg'], 'facade.jpg', { type: 'image/jpeg' }));

    const requete = http.expectOne(chemin);
    expect(requete.request.method).toBe('POST');
    expect((requete.request.body as FormData).get('photo')).toBeInstanceOf(File);
    requete.flush({ success: true, data: { id: 'ph_etoile', photo_facade: URL_PHOTO } });
    await stable();

    expect(recues.map((p) => p.photo_facade)).toEqual([URL_PHOTO]);
    expect(racine().textContent).toContain('Photo enregistrée. Elle apparaît dans l’app.');
  });

  it('refuse sans appeler l’API un fichier trop lourd ou qui n’est pas une image', async () => {
    await afficher(null);

    await choisir(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'lourde.jpg', { type: 'image/jpeg' }),
    );
    expect(racine().querySelector('[role="alert"]')?.textContent).toContain('dépasse 5 Mo');

    await choisir(new File(['%PDF'], 'liste.pdf', { type: 'application/pdf' }));
    expect(racine().querySelector('[role="alert"]')?.textContent).toContain('JPEG, PNG ou WebP');

    http.expectNone(chemin);
  });

  it('affiche le message de l’API quand l’envoi est refusé', async () => {
    await afficher(null);
    await choisir(new File(['jpeg'], 'facade.jpg', { type: 'image/jpeg' }));

    http
      .expectOne(chemin)
      .flush(
        {
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'Cette image est illisible ou corrompue.' },
        },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await stable();

    expect(racine().querySelector('[role="alert"]')?.textContent).toContain(
      'illisible ou corrompue',
    );
    expect(recues).toEqual([]);
  });

  it('« Retirer la photo » demande confirmation, puis appelle DELETE', async () => {
    await afficher(URL_PHOTO);
    const confirmation = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    bouton('Retirer la photo')!.click();
    await stable();
    http.expectNone(chemin);

    bouton('Retirer la photo')!.click();
    await stable();
    const requete = http.expectOne(chemin);
    expect(requete.request.method).toBe('DELETE');
    requete.flush({ success: true, data: { id: 'ph_etoile', photo_facade: null } });
    await stable();

    expect(confirmation).toHaveBeenCalledTimes(2);
    expect(recues.map((p) => p.photo_facade)).toEqual([null]);
    expect(racine().textContent).toContain('Photo retirée.');
  });
});
