import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FileText, LucideAngularModule, Plus } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { STATUTS_TOUR, libelle } from '../../noyau/libelles';
import { SessionService } from '../../noyau/session.service';
import { TerritoireService } from '../../noyau/territoire.service';
import { Pagination, TourGarde } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';
import { PaginationListe } from '../../ui/pagination';

/** Tours de garde : brouillons à contrôler et publier, tours publiés. */
@Component({
  selector: 'app-liste-tours',
  imports: [FormsModule, RouterLink, DatePipe, LucideAngularModule, PaginationListe, EtatChargement],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1>Tours de garde</h1>
        <p class="mt-1 text-sm text-texte-2">Un tour couvre une ville sur une période ; l'app ne montre que les tours publiés.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        @if (session.estAdmin()) {
          <a routerLink="/gardes/liste-officielle" class="bouton-principal">
            <lucide-icon [img]="FileText" [size]="16" /> Importer la liste officielle
          </a>
        }
        <button type="button" class="bouton-secondaire" (click)="nouveau = !nouveau">
          <lucide-icon [img]="Plus" [size]="16" /> Tour vide
        </button>
      </div>
    </div>

    @if (nouveau) {
      <form class="carte mt-5 grid gap-3 sm:grid-cols-4" (ngSubmit)="creer()">
        <div>
          <label class="etiquette" for="ville">Ville</label>
          <select id="ville" name="ville" class="champ" required [(ngModel)]="nouvelleVille">
            <option value="" disabled>Choisir…</option>
            @for (v of villesPossibles(); track v.id) { <option [value]="v.id">{{ v.nom }}</option> }
          </select>
        </div>
        <div>
          <label class="etiquette" for="debut">Début</label>
          <input id="debut" name="debut" type="datetime-local" class="champ" required [(ngModel)]="debut" />
        </div>
        <div>
          <label class="etiquette" for="fin">Fin</label>
          <input id="fin" name="fin" type="datetime-local" class="champ" required [(ngModel)]="fin" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="bouton-principal w-full" [disabled]="!nouvelleVille || !debut || !fin">Créer le brouillon</button>
        </div>
        @if (erreurCreation()) { <p class="erreur sm:col-span-4">{{ erreurCreation() }}</p> }
      </form>
    }

    <div class="carte mt-4 flex flex-wrap gap-3">
      @if (session.estAdmin()) {
        <select name="fville" class="champ max-w-xs" [(ngModel)]="ville" (change)="charger(1)">
          <option value="">Toutes les villes</option>
          @for (v of territoire.villes(); track v.id) { <option [value]="v.id">{{ v.nom }}</option> }
        </select>
      }
      <select name="fstatut" class="champ max-w-xs" [(ngModel)]="statutFiltre" (change)="charger(1)">
        <option value="">Tous les statuts</option>
        <option value="brouillon">Brouillons</option>
        <option value="publie">Publiés</option>
      </select>
    </div>

    <div class="carte mt-4 overflow-x-auto p-0">
      <table class="tableau">
        <thead>
          <tr><th>Période</th><th>Ville</th><th>Pharmacies</th><th>Statut</th><th>Saisi par</th></tr>
        </thead>
        <tbody>
          @for (t of tours(); track t.id) {
            <tr class="cursor-pointer" (click)="ouvrir(t)">
              <td class="whitespace-nowrap">
                <a [routerLink]="['/gardes', t.id]" class="font-medium text-marque-fonce hover:underline">
                  {{ t.debut | date: 'EEE d MMM HH:mm' }} → {{ t.fin | date: 'EEE d MMM HH:mm' }}
                </a>
              </td>
              <td>{{ t.ville?.nom }}@if (t.secteur) { · {{ t.secteur.nom }} }</td>
              <td>{{ t.nombre_gardes ?? '—' }}</td>
              <td>
                <span [class]="t.statut === 'publie' ? 'pastille-verte' : 'pastille-ocre'">{{ statut(t.statut) }}</span>
              </td>
              <td class="text-texte-2">{{ t.saisi_par?.nom ?? '—' }}</td>
            </tr>
          } @empty {
            @if (!charge()) { <tr><td colspan="5" class="py-8 text-center text-texte-2">Aucun tour.</td></tr> }
          }
        </tbody>
      </table>
      <div class="px-4"><app-etat [charge]="charge()" [erreur]="erreur()" /></div>
    </div>
    <app-pagination [pagination]="pagination()" (page)="charger($event)" />
  `,
})
export class ListeTours implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);
  protected readonly territoire = inject(TerritoireService);

  readonly statut$ = input<string>(undefined, { alias: 'statut' });

  protected ville = '';
  protected statutFiltre = '';
  protected nouveau = false;
  protected nouvelleVille = '';
  protected debut = '';
  protected fin = '';

  protected readonly tours = signal<TourGarde[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly charge = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurCreation = signal<string | null>(null);
  protected readonly FileText = FileText;
  protected readonly Plus = Plus;

  ngOnInit(): void {
    this.statutFiltre = this.statut$() ?? '';
    this.nouvelleVille = this.session.compte()?.ville?.id ?? '';
    void this.territoire.charger();
    void this.charger(1);
  }

  protected villesPossibles() {
    const compte = this.session.compte();
    return this.session.estAdmin() ? this.territoire.villes() : (compte?.villes ?? []);
  }

  protected statut(s: string): string {
    return libelle(STATUTS_TOUR, s);
  }

  protected async charger(page: number): Promise<void> {
    this.charge.set(true);
    this.erreur.set(null);
    try {
      const r = await firstValueFrom(
        this.api.page<TourGarde>('admin/tours-garde', {
          'filter[ville]': this.ville,
          'filter[statut]': this.statutFiltre,
          sort: '-debut',
          page,
          per_page: 25,
        }),
      );
      this.tours.set(r.donnees);
      this.pagination.set(r.pagination);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.charge.set(false);
    }
  }

  protected async creer(): Promise<void> {
    this.erreurCreation.set(null);
    try {
      const t = await firstValueFrom(
        this.api.post<TourGarde>('admin/tours-garde', {
          ville: this.nouvelleVille,
          debut: new Date(this.debut).toISOString(),
          fin: new Date(this.fin).toISOString(),
        }),
      );
      await this.router.navigate(['/gardes', t.id]);
    } catch (e) {
      this.erreurCreation.set(messageErreur(e));
    }
  }

  protected ouvrir(t: TourGarde): void {
    void this.router.navigate(['/gardes', t.id]);
  }
}
