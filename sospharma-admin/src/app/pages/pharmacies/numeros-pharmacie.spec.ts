import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TelephonePharmacie } from '../../noyau/types';
import { NumerosPharmacie } from './numeros-pharmacie';

registerLocaleData(localeFr);

const chemin = `${environment.apiUrl}/admin/pharmacies/ph_etoile/telephones`;

function numero(
  id: string,
  n: string,
  rang: number,
  autres: Partial<TelephonePharmacie> = {},
): TelephonePharmacie {
  return {
    id,
    numero: n,
    rang,
    principal: rang === 1,
    whatsapp: false,
    whatsapp_confirme_le: null,
    origine: 'import',
    ...autres,
  };
}

const principal = numero('tl_1', '+2252722445566', 1);
const second = numero('tl_2', '+2250707123456', 2, {
  whatsapp: true,
  whatsapp_confirme_le: '2026-11-12T09:30:00+00:00',
  origine: 'agent',
});

describe('NumerosPharmacie', () => {
  let fixture: ComponentFixture<NumerosPharmacie>;
  let http: HttpTestingController;

  /** Laisse la réponse simulée traverser firstValueFrom avant d'attendre le rendu. */
  async function stable(): Promise<void> {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
  }

  async function afficher(liste: TelephonePharmacie[]): Promise<void> {
    fixture = TestBed.createComponent(NumerosPharmacie);
    fixture.componentRef.setInput('pharmacie', 'ph_etoile');
    fixture.detectChanges();
    http.expectOne(chemin).flush({ success: true, data: liste });
    await stable();
  }

  const lignes = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')] as HTMLElement[];
  const boutons = (racine: HTMLElement, texte: string) =>
    [...racine.querySelectorAll('button')].filter((b) => b.textContent?.trim() === texte);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NumerosPharmacie],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('affiche les numéros, le principal sans « Retirer ce numéro » tant qu’il en reste d’autres', async () => {
    await afficher([principal, second]);

    const [ligne1, ligne2] = lignes();
    expect(ligne1.textContent).toContain('27 22 44 55 66');
    expect(ligne1.textContent).toContain('Principal');
    expect(boutons(ligne1, 'Retirer ce numéro')).toHaveLength(0);
    expect(boutons(ligne1, 'Choisir comme principal')).toHaveLength(0);
    expect(ligne1.textContent).toContain('Pas encore vérifié');

    expect(ligne2.textContent).toContain('07 07 12 34 56');
    expect(boutons(ligne2, 'Retirer ce numéro')).toHaveLength(1);
    expect(boutons(ligne2, 'Choisir comme principal')).toHaveLength(1);
    expect(ligne2.textContent).toContain('Vérifié le 12 nov. 2026');
    expect(boutons(ligne2, 'Oui')[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('laisse retirer le principal quand c’est le dernier numéro', async () => {
    await afficher([principal]);

    expect(boutons(lignes()[0], 'Retirer ce numéro')).toHaveLength(1);
  });

  it('n’enfonce ni « Oui » ni « Non » sur un numéro que personne n’a vérifié', async () => {
    await afficher([principal]);

    const ligne = lignes()[0];
    expect(boutons(ligne, 'Oui')[0].getAttribute('aria-pressed')).toBe('false');
    expect(boutons(ligne, 'Non')[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('affiche l’erreur 422 de l’API sous le champ du nouveau numéro', async () => {
    await afficher([principal]);
    const racine = fixture.nativeElement as HTMLElement;
    const champ = racine.querySelector<HTMLInputElement>('#nouveau-numero')!;
    champ.value = '07 07 12';
    champ.dispatchEvent(new Event('input'));
    await stable();

    racine.querySelector('form')!.dispatchEvent(new Event('submit'));
    const envoi = http.expectOne((r) => r.method === 'POST' && r.url === chemin);
    expect(envoi.request.body).toEqual({ numero: '07 07 12' });
    envoi.flush(
      {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Certaines informations sont invalides.',
          details: {
            numero: [
              'Ce numéro n’est pas reconnu. Saisissez-le en entier, par exemple 07 07 12 34 56.',
            ],
          },
        },
      },
      { status: 422, statusText: 'Unprocessable' },
    );
    await stable();

    const erreur = racine.querySelector('#erreur-nouveau-numero');
    expect(erreur?.textContent).toContain('Ce numéro n’est pas reconnu');
    expect(champ.getAttribute('aria-invalid')).toBe('true');
    expect(champ.getAttribute('aria-describedby')).toBe('erreur-nouveau-numero');
    expect(racine.querySelector('.erreur')).toBeNull();
  });

  it('prend un 404 au retrait pour un succès : le numéro était déjà retiré', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await afficher([principal, second]);

    boutons(lignes()[1], 'Retirer ce numéro')[0].click();
    http
      .expectOne((r) => r.method === 'DELETE' && r.url === `${chemin}/tl_2`)
      .flush(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } },
        { status: 404, statusText: 'Not Found' },
      );
    await stable();
    http
      .expectOne((r) => r.method === 'GET' && r.url === chemin)
      .flush({ success: true, data: [principal] });
    await stable();

    const racine = fixture.nativeElement as HTMLElement;
    expect(racine.querySelector('.erreur')).toBeNull();
    expect(racine.querySelector('.succes')?.textContent).toContain('07 07 12 34 56 retiré.');
    expect(lignes()).toHaveLength(1);
  });

  it('ne retire rien si la confirmation est refusée', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await afficher([principal, second]);

    boutons(lignes()[1], 'Retirer ce numéro')[0].click();
    http.expectNone((r) => r.method === 'DELETE');
  });

  it('choisit un autre principal puis relit la liste', async () => {
    await afficher([principal, second]);

    boutons(lignes()[1], 'Choisir comme principal')[0].click();
    const envoi = http.expectOne((r) => r.method === 'PATCH' && r.url === `${chemin}/tl_2`);
    expect(envoi.request.body).toEqual({ principal: true });
    envoi.flush({ success: true, data: { ...second, rang: 1, principal: true } });
    await stable();
    http.expectOne(chemin).flush({
      success: true,
      data: [
        { ...second, rang: 1, principal: true },
        { ...principal, rang: 2, principal: false },
      ],
    });
    await stable();

    expect(lignes()[0].textContent).toContain('07 07 12 34 56');
    expect(lignes()[0].textContent).toContain('Principal');
  });
});
