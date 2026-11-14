import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArrowLeft, CircleAlert, CircleCheck, LucideAngularModule, Send, Trash2, TriangleAlert } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { STATUTS_TOUR, libelle } from '../../noyau/libelles';
import { Controle, Pharmacie, TourGarde } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';

/** Un tour : pharmacies de garde, contrôle avant publication, publication. */
@Component({
  selector: 'app-fiche-tour',
  imports: [FormsModule, RouterLink, DatePipe, LucideAngularModule, EtatChargement],
  template: `
    <a routerLink="/gardes" class="inline-flex items-center gap-1 text-sm text-marque hover:underline">
      <lucide-icon [img]="ArrowLeft" [size]="14" /> Tours de garde
    </a>
    <app-etat [charge]="!tour() && !erreur()" [erreur]="erreur()" />

    @if (tour(); as t) {
      <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Garde de {{ t.ville?.nom }}</h1>
          <p class="mt-1 text-sm text-texte-2">
            Du {{ t.debut | date: 'EEEE d MMMM y à HH:mm' }} au {{ t.fin | date: 'EEEE d MMMM y à HH:mm' }}
          </p>
        </div>
        <span [class]="t.statut === 'publie' ? 'pastille-verte' : 'pastille-ocre'" class="text-sm">
          {{ statut(t.statut) }}
          @if (t.valide_par) { · par {{ t.valide_par.nom }} le {{ t.valide_le | date: 'd MMM HH:mm' }} }
        </span>
      </div>

      @if (message()) { <p class="succes mt-4">{{ message() }}</p> }
      @if (erreurAction()) { <p class="erreur mt-4">{{ erreurAction() }}</p> }

      <div class="mt-5 grid gap-5 lg:grid-cols-3">
        <div class="carte overflow-x-auto p-0 lg:col-span-2">
          <div class="px-5 pt-5"><h2>{{ t.gardes?.length ?? 0 }} pharmacies de garde</h2></div>
          <table class="tableau mt-3">
            <thead><tr><th>Pharmacie</th><th>Commune</th><th>Confirmée</th><th></th></tr></thead>
            <tbody>
              @for (g of gardesTriees(); track g.id) {
                <tr>
                  <td>
                    @if (g.pharmacie) {
                      <a [routerLink]="['/pharmacies', g.pharmacie.id]" class="text-marque-fonce hover:underline">{{ g.pharmacie.nom }}</a>
                    }
                  </td>
                  <td class="text-texte-2">{{ g.pharmacie?.zone ?? '—' }}</td>
                  <td class="text-texte-2">{{ g.confirmee_le ? (g.confirmee_le | date: 'd MMM HH:mm') : '—' }}</td>
                  <td class="text-right">
                    @if (g.pharmacie) {
                      <button type="button" class="text-texte-2 hover:text-texte" (click)="retirer(g.pharmacie.id, g.pharmacie.nom)" aria-label="Retirer">
                        <lucide-icon [img]="Trash2" [size]="16" />
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="py-6 text-center text-texte-2">Aucune pharmacie dans ce tour.</td></tr>
              }
            </tbody>
          </table>
          <form class="flex flex-wrap gap-2 border-t border-filet p-4" (ngSubmit)="chercher()">
            <input name="recherche" class="champ max-w-xs" placeholder="Ajouter une pharmacie…" [(ngModel)]="recherche" />
            <button type="submit" class="bouton-secondaire">Chercher</button>
          </form>
          @if (resultats().length > 0) {
            <ul class="border-t border-filet px-4 pb-4">
              @for (p of resultats(); track p.id) {
                <li class="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span>{{ p.nom }} <span class="text-texte-2">· {{ p.zone?.nom ?? p.quartier ?? '' }}</span></span>
                  <button type="button" class="bouton-secondaire px-3 py-1 text-xs" (click)="ajouter(p)">Ajouter</button>
                </li>
              }
            </ul>
          }
        </div>

        <div class="space-y-5">
          <div class="carte space-y-3">
            <h2>Publication</h2>
            <p class="text-sm text-texte-2">Le contrôle repère un tour vide, qui chevauche un autre tour, une pharmacie désactivée ou d'une autre ville, et les nuits sans garde.</p>
            <button type="button" class="bouton-secondaire w-full" [disabled]="envoi()" (click)="controler()">Contrôler</button>
            @if (controle(); as c) {
              @if (c.problemes.length === 0) {
                <p class="succes flex items-center gap-2"><lucide-icon [img]="CircleCheck" [size]="16" /> Aucun problème.</p>
              }
              @for (pb of c.problemes; track $index) {
                <p [class]="pb.bloquant ? 'erreur' : 'rounded-lg bg-ocre-clair px-3 py-2 text-sm text-ocre'" class="flex gap-2">
                  <lucide-icon [img]="pb.bloquant ? CircleAlert : TriangleAlert" [size]="16" class="mt-0.5 shrink-0" />
                  {{ pb.message }}
                </p>
              }
            }
            @if (t.statut === 'brouillon') {
              <button type="button" class="bouton-principal w-full" [disabled]="envoi() || (controle() !== null && !controle()!.publiable)" (click)="publier()">
                <lucide-icon [img]="Send" [size]="16" /> Publier dans l'app
              </button>
            } @else {
              <p class="text-sm text-texte-2">Publié : les usagers voient ce tour et reçoivent la notification.</p>
            }
          </div>
          <button type="button" class="bouton-secondaire w-full" [disabled]="envoi()" (click)="supprimer()">
            <lucide-icon [img]="Trash2" [size]="16" /> Supprimer le tour du {{ t.debut | date: 'd MMM' }} au {{ t.fin | date: 'd MMM' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class FicheTour implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  protected readonly tour = signal<TourGarde | null>(null);
  protected readonly controle = signal<Controle | null>(null);
  protected readonly resultats = signal<Pharmacie[]>([]);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurAction = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected recherche = '';

  protected readonly gardesTriees = computed(() =>
    [...(this.tour()?.gardes ?? [])].sort((a, b) =>
      (a.pharmacie?.zone ?? '').localeCompare(b.pharmacie?.zone ?? '', 'fr') || (a.pharmacie?.nom ?? '').localeCompare(b.pharmacie?.nom ?? '', 'fr'),
    ),
  );

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Trash2 = Trash2;
  protected readonly Send = Send;
  protected readonly CircleCheck = CircleCheck;
  protected readonly CircleAlert = CircleAlert;
  protected readonly TriangleAlert = TriangleAlert;

  ngOnInit(): void {
    void this.recharger();
  }

  protected statut(s: string): string {
    return libelle(STATUTS_TOUR, s);
  }

  private async recharger(): Promise<void> {
    try {
      this.tour.set(await firstValueFrom(this.api.get<TourGarde>(`admin/tours-garde/${this.id()}`)));
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  private async action(travail: () => Promise<string | null>): Promise<void> {
    this.envoi.set(true);
    this.erreurAction.set(null);
    this.message.set(null);
    try {
      this.message.set(await travail());
    } catch (e) {
      this.erreurAction.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }

  protected controler(): Promise<void> {
    return this.action(async () => {
      this.controle.set(await firstValueFrom(this.api.post<Controle>(`admin/tours-garde/${this.id()}/controler`)));
      return null;
    });
  }

  protected publier(): Promise<void> {
    if (!confirm('Publier ce tour ? Les usagers de la ville seront notifiés.')) return Promise.resolve();
    return this.action(async () => {
      this.tour.set(await firstValueFrom(this.api.post<TourGarde>(`admin/tours-garde/${this.id()}/publier`)));
      await this.recharger();
      return 'Tour publié.';
    });
  }

  protected async chercher(): Promise<void> {
    const q = this.recherche.trim();
    if (q.length < 2) return;
    const ville = this.tour()?.ville?.id;
    const r = await firstValueFrom(this.api.page<Pharmacie>('admin/pharmacies', { q, 'filter[ville]': ville, 'filter[actif]': 1, per_page: 10 }));
    this.resultats.set(r.donnees);
  }

  protected ajouter(p: Pharmacie): Promise<void> {
    return this.action(async () => {
      await firstValueFrom(this.api.post(`admin/tours-garde/${this.id()}/gardes`, { pharmacie: p.id }));
      this.resultats.set([]);
      this.recherche = '';
      this.controle.set(null);
      await this.recharger();
      return `${p.nom} ajoutée.`;
    });
  }

  protected retirer(id: string, nom: string): Promise<void> {
    if (!confirm(`Retirer ${nom} de ce tour ?`)) return Promise.resolve();
    return this.action(async () => {
      await firstValueFrom(this.api.delete(`admin/tours-garde/${this.id()}/gardes`, { pharmacie: id }));
      this.controle.set(null);
      await this.recharger();
      return `${nom} retirée.`;
    });
  }

  protected supprimer(): Promise<void> {
    if (!confirm('Supprimer ce tour de garde ?')) return Promise.resolve();
    return this.action(async () => {
      await firstValueFrom(this.api.delete(`admin/tours-garde/${this.id()}`));
      await this.router.navigate(['/gardes']);
      return null;
    });
  }
}
