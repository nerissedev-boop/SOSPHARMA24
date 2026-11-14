import { DatePipe, formatDate } from '@angular/common';
import { Component, LOCALE_ID, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Download, FileUp, LucideAngularModule, MapPinOff, Search } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, Parametres, messageErreur } from '../../noyau/api.service';
import { SessionService } from '../../noyau/session.service';
import { TerritoireService } from '../../noyau/territoire.service';
import { Pagination, Pharmacie } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';
import { PaginationListe } from '../../ui/pagination';

/** Annuaire : recherche, filtres (ville, actives, 24 h/24) et accès à la fiche. */
@Component({
  selector: 'app-liste-pharmacies',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    LucideAngularModule,
    PaginationListe,
    EtatChargement,
  ],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1>Pharmacies</h1>
        <p class="mt-1 text-sm text-texte-2">Annuaire affiché dans l'app.</p>
      </div>
      @if (session.estAdmin()) {
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="bouton-secondaire"
            [disabled]="exportEnCours()"
            (click)="exporter()"
          >
            <lucide-icon [img]="Download" [size]="16" />
            {{ exportEnCours() ? 'Export en cours…' : 'Exporter (CSV)' }}
          </button>
          <a routerLink="/pharmacies/import" class="bouton-principal">
            <lucide-icon [img]="FileUp" [size]="16" /> Importer un fichier
          </a>
        </div>
      }
    </div>
    <div aria-live="polite">
      @if (erreurExport()) {
        <p class="erreur mt-4">{{ erreurExport() }}</p>
      }
    </div>

    <form class="carte mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" (ngSubmit)="chercher()">
      <div class="relative lg:col-span-2">
        <lucide-icon [img]="Search" [size]="16" class="absolute top-2.5 left-3 text-texte-2" />
        <input name="q" class="champ pl-9" placeholder="Nom, quartier ou adresse" [(ngModel)]="q" />
      </div>
      @if (session.estAdmin()) {
        <select name="ville" class="champ" [(ngModel)]="ville" (change)="chercher()">
          <option value="">Toutes les villes</option>
          @for (v of territoire.villes(); track v.id) {
            <option [value]="v.id">{{ v.nom }}</option>
          }
        </select>
      }
      <select name="actif" class="champ" [(ngModel)]="actifFiltre" (change)="chercher()">
        <option value="">Actives et désactivées</option>
        <option value="1">Actives</option>
        <option value="0">Désactivées</option>
      </select>
      <select name="h24" class="champ" [(ngModel)]="h24" (change)="chercher()">
        <option value="">Tous horaires</option>
        <option value="1">24 h/24</option>
      </select>
    </form>

    <div class="carte mt-4 overflow-x-auto p-0">
      <table class="tableau">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Ville · commune</th>
            <th>Téléphone</th>
            <th>État</th>
            <th>Vérifiée le</th>
          </tr>
        </thead>
        <tbody>
          @for (p of pharmacies(); track p.id) {
            <tr class="cursor-pointer" (click)="ouvrir(p)">
              <td>
                <a
                  [routerLink]="['/pharmacies', p.id]"
                  class="font-medium text-marque-fonce hover:underline"
                  >{{ p.nom }}</a
                >
                <div class="text-xs text-texte-2">{{ p.adresse }}</div>
              </td>
              <td>
                {{ p.ville?.nom ?? '—' }}
                @if (p.zone) {
                  <span class="text-texte-2">· {{ p.zone.nom }}</span>
                }
              </td>
              <td class="whitespace-nowrap">{{ p.telephone ?? '—' }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @if (p.actif) {
                    <span class="pastille-verte">Active</span>
                  } @else {
                    <span class="pastille-grise">Désactivée</span>
                  }
                  @if (p.h24) {
                    <span class="pastille-verte">24 h/24</span>
                  }
                  @if (!p.position) {
                    <span class="pastille-ocre gap-1"
                      ><lucide-icon [img]="MapPinOff" [size]="12" /> Position à confirmer</span
                    >
                  }
                </div>
              </td>
              <td class="whitespace-nowrap text-texte-2">
                {{ p.verifiee_le ? (p.verifiee_le | date: 'd MMM y') : 'Jamais' }}
              </td>
            </tr>
          } @empty {
            @if (!charge()) {
              <tr>
                <td colspan="5" class="py-8 text-center text-texte-2">
                  Aucune pharmacie ne correspond.
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
      <div class="px-4"><app-etat [charge]="charge()" [erreur]="erreur()" /></div>
    </div>
    <app-pagination [pagination]="pagination()" (page)="charger($event)" />
  `,
})
export class ListePharmacies implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);
  protected readonly session = inject(SessionService);
  protected readonly territoire = inject(TerritoireService);

  /** Filtre reçu par l'adresse (`?actif=0` depuis le tableau de bord). */
  readonly actif = input<string>();

  protected q = '';
  protected ville = '';
  protected actifFiltre = '';
  protected h24 = '';

  protected readonly pharmacies = signal<Pharmacie[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly charge = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly Search = Search;
  protected readonly MapPinOff = MapPinOff;
  protected readonly FileUp = FileUp;
  protected readonly Download = Download;

  protected readonly exportEnCours = signal(false);
  protected readonly erreurExport = signal<string | null>(null);

  /** Filtres de la liste affichée : la recherche tapée mais pas encore lancée n'en fait pas partie. */
  private filtresAffiches: Parametres = {};

  ngOnInit(): void {
    this.actifFiltre = this.actif() ?? '';
    void this.territoire.charger();
    void this.charger(1);
  }

  protected chercher(): void {
    void this.charger(1);
  }

  protected async charger(page: number): Promise<void> {
    this.charge.set(true);
    this.erreur.set(null);
    this.filtresAffiches = {
      q: this.q.trim(),
      'filter[ville]': this.ville,
      'filter[actif]': this.actifFiltre,
      'filter[h24]': this.h24,
    };
    try {
      const r = await firstValueFrom(
        this.api.page<Pharmacie>('admin/pharmacies', {
          ...this.filtresAffiches,
          sort: 'nom',
          page,
          per_page: 25,
        }),
      );
      this.pharmacies.set(r.donnees);
      this.pagination.set(r.pagination);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.charge.set(false);
    }
  }

  /** Toutes les pages de la liste affichée, en CSV réimportable (colonne id comprise). */
  protected async exporter(): Promise<void> {
    this.exportEnCours.set(true);
    this.erreurExport.set(null);
    try {
      const fichier = await firstValueFrom(
        this.api.telecharger('admin/pharmacies/export', this.filtresAffiches),
      );
      const url = URL.createObjectURL(fichier.contenu);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download =
        fichier.nom ?? `pharmacies-${formatDate(new Date(), 'yyyy-MM-dd', this.locale)}.csv`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.erreurExport.set(messageErreur(e));
    } finally {
      this.exportEnCours.set(false);
    }
  }

  protected ouvrir(p: Pharmacie): void {
    void this.router.navigate(['/pharmacies', p.id]);
  }
}
