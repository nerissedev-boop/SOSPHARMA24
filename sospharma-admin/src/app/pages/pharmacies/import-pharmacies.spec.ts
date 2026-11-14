import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TerritoireService } from '../../noyau/territoire.service';
import { BilanImportPharmacies, LigneImportPharmacie } from '../../noyau/types';
import { ImportPharmacies } from './import-pharmacies';

function ligne(autres: Partial<LigneImportPharmacie>): LigneImportPharmacie {
  return {
    ligne: 2,
    nom: 'Pharmacie de l’Étoile',
    action: 'creer',
    pharmacie: null,
    methode: null,
    changements: [],
    messages: [],
    valeurs: {
      adresse: 'Boulevard Latrille',
      quartier: null,
      commune: 'Cocody',
      telephone: '+2252723228502',
      telephones: ['+2252723228502', '+2250556004354', '+2250720603560'],
      whatsapp: null,
      position: null,
      h24: null,
      services: [],
      assurances: [],
    },
    ...autres,
  };
}

describe('ImportPharmacies, aperçu des numéros', () => {
  let fixture: ComponentFixture<ImportPharmacies>;

  async function afficher(lignes: LigneImportPharmacie[]): Promise<HTMLElement> {
    const bilan: BilanImportPharmacies = {
      simulation: true,
      creees: 1,
      mises_a_jour: 0,
      inchangees: 0,
      ambigues: 0,
      erreurs: 0,
      lignes,
    };
    fixture.componentInstance['bilan'].set(bilan);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  /** Cellule « Numéros » de la première ligne : 7e colonne. */
  const celluleNumeros = (racine: HTMLElement) =>
    racine.querySelectorAll('tbody tr')[0].querySelectorAll('td')[6];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ImportPharmacies],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: TerritoireService,
          useValue: { villes: signal([]), charger: () => Promise.resolve() },
        },
      ],
    });
    fixture = TestBed.createComponent(ImportPharmacies);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('affiche tous les numéros lus, lisibles et en chiffres tabulaires', async () => {
    const racine = await afficher([ligne({})]);

    const cellule = celluleNumeros(racine);
    expect(cellule.classList).toContain('tabular-nums');
    expect([...cellule.querySelectorAll('div')].map((d) => d.textContent?.trim())).toEqual([
      '27 23 22 85 02',
      '05 56 00 43 54',
      '07 20 60 35 60',
    ]);
  });

  it('marque les numéros que la fiche n’a pas encore, pour une mise à jour', async () => {
    const racine = await afficher([
      ligne({
        action: 'mettre_a_jour',
        pharmacie: { id: 'ph_etoile', nom: 'Pharmacie de l’Étoile' },
        methode: 'telephone',
        changements: ['telephones'],
        avant: { telephones: ['+2252723228502'] },
      }),
    ]);

    const numeros = [...celluleNumeros(racine).querySelectorAll('div')].map((d) =>
      d.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(numeros).toEqual(['27 23 22 85 02', '05 56 00 43 54 ajouté', '07 20 60 35 60 ajouté']);
    expect(racine.textContent).toContain('Change aussi : numéros ajoutés');
  });

  it('met les avertissements de numéros en ocre et laisse les autres messages en gris', async () => {
    const racine = await afficher([
      ligne({
        messages: [
          'Numéro corrigé, à vérifier : « 27 / 23 22 85 02 » lu 27 23 22 85 02.',
          'Sans position : « Position à confirmer » dans l’app.',
        ],
      }),
    ]);

    const [corrige, position] = [...racine.querySelectorAll('tbody tr td:last-child div')].slice(
      -2,
    );
    expect(corrige.className).toContain('text-ocre');
    expect(position.className).toContain('text-texte-2');
  });

  it('se contente du premier numéro avec une API qui ne renvoie pas encore la liste', async () => {
    const ancienne = ligne({});
    delete ancienne.valeurs!.telephones;
    const racine = await afficher([ancienne]);

    expect(celluleNumeros(racine).textContent?.trim()).toBe('27 23 22 85 02');
  });
});
