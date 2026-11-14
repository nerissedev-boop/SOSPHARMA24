import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, Parametres } from '../../noyau/api.service';
import { SessionService } from '../../noyau/session.service';

interface Tuile {
  texte: string;
  detail: string;
  chemin: string;
  parametres: Parametres;
  lien: string | null;
  requete?: Record<string, string>;
  valeur: number | null;
  urgent?: boolean;
}

/** Ce qui attend l'équipe : un compteur par file, lu avec `per_page=1` (seul le total compte). */
@Component({
  selector: 'app-tableau-bord',
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <h1>Bonjour {{ session.compte()?.nom }}</h1>
    <p class="mt-1 text-sm text-texte-2">Ce qui attend l'équipe aujourd'hui.</p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (t of tuiles(); track t.texte) {
        @if (t.lien) {
          <a [routerLink]="t.lien" [queryParams]="t.requete" class="carte block transition hover:border-marque hover:shadow">
            <ng-container *ngTemplateOutlet="contenu; context: { $implicit: t }" />
          </a>
        } @else {
          <div class="carte"><ng-container *ngTemplateOutlet="contenu; context: { $implicit: t }" /></div>
        }
      }
    </div>

    <ng-template #contenu let-t>
      <div class="text-sm text-texte-2">{{ t.texte }}</div>
      <div class="mt-1 text-3xl font-semibold" [class.text-ocre]="t.urgent && t.valeur">
        {{ t.valeur ?? '…' }}
      </div>
      <div class="mt-1 text-xs text-texte-2">{{ t.detail }}</div>
    </ng-template>

    @if (erreur()) {
      <p class="erreur mt-6">{{ erreur() }}</p>
    }
  `,
})
export class TableauBord implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);
  protected readonly tuiles = signal<Tuile[]>([
    { texte: 'Signalements à traiter', detail: 'Remontés par les usagers', chemin: 'admin/signalements', parametres: { 'filter[statut]': 'nouveau' }, lien: '/signalements', requete: { statut: 'nouveau' }, valeur: null, urgent: true },
    { texte: 'Messages de support', detail: 'Non traités', chemin: 'admin/support/messages', parametres: { 'filter[statut]': 'nouveau' }, lien: '/support', valeur: null, urgent: true },
    { texte: 'Tours de garde en brouillon', detail: 'À contrôler puis publier', chemin: 'admin/tours-garde', parametres: { 'filter[statut]': 'brouillon' }, lien: '/gardes', requete: { statut: 'brouillon' }, valeur: null, urgent: true },
    { texte: 'Relevés à valider', detail: 'Agents terrain et usagers (écran à venir)', chemin: 'admin/releves', parametres: { 'filter[statut]': 'envoye' }, lien: null, valeur: null },
    { texte: 'Pharmacies actives', detail: "Dans l'annuaire", chemin: 'admin/pharmacies', parametres: { 'filter[actif]': 1 }, lien: '/pharmacies', valeur: null },
    { texte: 'Pharmacies désactivées', detail: 'Masquées dans l’app', chemin: 'admin/pharmacies', parametres: { 'filter[actif]': 0 }, lien: '/pharmacies', requete: { actif: '0' }, valeur: null },
  ]);
  protected readonly erreur = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const resultats = await Promise.allSettled(
      this.tuiles().map((t) => firstValueFrom(this.api.page(t.chemin, { ...t.parametres, per_page: 1 }))),
    );
    this.tuiles.update((liste) =>
      liste.map((t, i) => {
        const r = resultats[i];
        return { ...t, valeur: r.status === 'fulfilled' ? r.value.pagination.total : null };
      }),
    );
    if (resultats.every((r) => r.status === 'rejected')) {
      this.erreur.set("Impossible de lire les compteurs : l'API ne répond pas.");
    }
  }
}
