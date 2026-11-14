import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { MOTIFS_SIGNALEMENT, STATUTS_SIGNALEMENT, libelle } from '../../noyau/libelles';
import { SessionService } from '../../noyau/session.service';
import { TerritoireService } from '../../noyau/territoire.service';
import { Pagination, Signalement } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';
import { PaginationListe } from '../../ui/pagination';

/** Erreurs remontées par les usagers : corriger la fiche, puis traiter ou rejeter avec un commentaire. */
@Component({
  selector: 'app-signalements',
  imports: [FormsModule, RouterLink, DatePipe, PaginationListe, EtatChargement],
  template: `
    <h1>Signalements</h1>
    <p class="mt-1 text-sm text-texte-2">Erreurs signalées depuis l'app. Corrigez la fiche, puis clôturez avec un mot d'explication.</p>

    <div class="carte mt-5 flex flex-wrap gap-3">
      <select name="statut" class="champ max-w-xs" [(ngModel)]="statutFiltre" (change)="charger(1)">
        <option value="">Tous les statuts</option>
        @for (s of statuts; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }
      </select>
      <select name="motif" class="champ max-w-xs" [(ngModel)]="motif" (change)="charger(1)">
        <option value="">Tous les motifs</option>
        @for (m of motifs; track m[0]) { <option [value]="m[0]">{{ m[1] }}</option> }
      </select>
      @if (session.estAdmin()) {
        <select name="ville" class="champ max-w-xs" [(ngModel)]="ville" (change)="charger(1)">
          <option value="">Toutes les villes</option>
          @for (v of territoire.villes(); track v.id) { <option [value]="v.id">{{ v.nom }}</option> }
        </select>
      }
    </div>

    <div class="mt-4 space-y-3">
      @for (s of signalements(); track s.id) {
        <div class="carte">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ s.motif_libelle || motifLibelle(s.motif) }}</span>
                <span [class]="classe(s.statut)">{{ statutLibelle(s.statut) }}</span>
              </div>
              @if (s.pharmacie) {
                <a [routerLink]="['/pharmacies', s.pharmacie.id]" class="text-sm text-marque-fonce hover:underline">{{ s.pharmacie.nom }}</a>
              }
            </div>
            <span class="text-xs text-texte-2">{{ s.cree_le | date: 'd MMM y à HH:mm' }}</span>
          </div>
          @if (s.precisions) { <p class="mt-2 rounded-lg bg-surface px-3 py-2 text-sm">« {{ s.precisions }} »</p> }

          @if (s.statut === 'nouveau') {
            <div class="mt-3 flex flex-wrap gap-2">
              <input class="champ flex-1" [name]="'c' + s.id" placeholder="Commentaire (obligatoire)" [(ngModel)]="commentaires[s.id]" />
              <button type="button" class="bouton-principal" [disabled]="!commentaires[s.id]?.trim() || envoi() === s.id" (click)="cloturer(s, 'traiter')">Traité</button>
              <button type="button" class="bouton-secondaire" [disabled]="!commentaires[s.id]?.trim() || envoi() === s.id" (click)="cloturer(s, 'rejeter')">Rejeter</button>
            </div>
          } @else {
            <p class="mt-2 text-sm text-texte-2">
              {{ s.commentaire }}
              @if (s.traite_par) { · {{ s.traite_par.nom }}, le {{ s.traite_le | date: 'd MMM HH:mm' }} }
            </p>
          }
          @if (erreurs[s.id]) { <p class="erreur mt-2">{{ erreurs[s.id] }}</p> }
        </div>
      } @empty {
        @if (!charge() && !erreur()) { <div class="carte text-center text-texte-2">Aucun signalement.</div> }
      }
    </div>
    <app-etat [charge]="charge()" [erreur]="erreur()" />
    <app-pagination [pagination]="pagination()" (page)="charger($event)" />
  `,
})
export class Signalements implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);
  protected readonly territoire = inject(TerritoireService);

  readonly statut = input<string>();

  protected statutFiltre = 'nouveau';
  protected motif = '';
  protected ville = '';
  protected commentaires: Record<string, string> = {};
  protected erreurs: Record<string, string> = {};

  protected readonly signalements = signal<Signalement[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly charge = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal<string | null>(null);
  protected readonly statuts = Object.entries(STATUTS_SIGNALEMENT);
  protected readonly motifs = Object.entries(MOTIFS_SIGNALEMENT);

  ngOnInit(): void {
    this.statutFiltre = this.statut() ?? 'nouveau';
    void this.territoire.charger();
    void this.charger(1);
  }

  protected motifLibelle(m: string): string {
    return libelle(MOTIFS_SIGNALEMENT, m);
  }

  protected statutLibelle(s: string): string {
    return libelle(STATUTS_SIGNALEMENT, s);
  }

  protected classe(s: string): string {
    return s === 'nouveau' ? 'pastille-ocre' : s === 'traite' ? 'pastille-verte' : 'pastille-grise';
  }

  protected async charger(page: number): Promise<void> {
    this.charge.set(true);
    this.erreur.set(null);
    try {
      const r = await firstValueFrom(
        this.api.page<Signalement>('admin/signalements', {
          'filter[statut]': this.statutFiltre,
          'filter[motif]': this.motif,
          'filter[ville]': this.ville,
          sort: '-cree_le',
          page,
          per_page: 20,
        }),
      );
      this.signalements.set(r.donnees);
      this.pagination.set(r.pagination);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.charge.set(false);
    }
  }

  protected async cloturer(s: Signalement, action: 'traiter' | 'rejeter'): Promise<void> {
    this.envoi.set(s.id);
    delete this.erreurs[s.id];
    try {
      const maj = await firstValueFrom(
        this.api.post<Signalement>(`admin/signalements/${s.id}/${action}`, { commentaire: this.commentaires[s.id].trim() }),
      );
      this.signalements.update((liste) => liste.map((x) => (x.id === s.id ? { ...x, ...maj } : x)));
    } catch (e) {
      this.erreurs[s.id] = messageErreur(e);
    } finally {
      this.envoi.set(null);
    }
  }
}
