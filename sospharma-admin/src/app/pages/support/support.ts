import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { SUJETS_SUPPORT, libelle } from '../../noyau/libelles';
import { MessageSupport, Pagination } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';
import { PaginationListe } from '../../ui/pagination';

/** Messages envoyés depuis l'écran « Aide » de l'app. */
@Component({
  selector: 'app-support',
  imports: [FormsModule, DatePipe, PaginationListe, EtatChargement],
  template: `
    <h1>Support</h1>
    <p class="mt-1 text-sm text-texte-2">Messages envoyés depuis l'app. Répondez par le contact laissé, puis marquez le message traité.</p>

    <div class="carte mt-5 flex flex-wrap gap-3">
      <select name="statut" class="champ max-w-xs" [(ngModel)]="statut" (change)="charger(1)">
        <option value="nouveau">Non traités</option>
        <option value="traite">Traités</option>
        <option value="">Tous</option>
      </select>
      <select name="sujet" class="champ max-w-xs" [(ngModel)]="sujet" (change)="charger(1)">
        <option value="">Tous les sujets</option>
        @for (s of sujets; track s[0]) { <option [value]="s[0]">{{ s[1] }}</option> }
      </select>
    </div>

    <div class="mt-4 space-y-3">
      @for (m of messages(); track m.id) {
        <div class="carte">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ sujetLibelle(m.sujet) }}</span>
              <span [class]="m.statut === 'nouveau' ? 'pastille-ocre' : 'pastille-verte'">{{ m.statut === 'nouveau' ? 'Non traité' : 'Traité' }}</span>
            </div>
            <span class="text-xs text-texte-2">{{ m.cree_le | date: 'd MMM y à HH:mm' }}</span>
          </div>
          <p class="mt-2 whitespace-pre-line text-sm">{{ m.message }}</p>
          <div class="mt-2 text-sm text-texte-2">Contact : {{ m.contact || 'aucun' }}</div>
          @if (m.a_une_capture && m.capture_url) {
            @if (captures()[m.id]; as url) {
              <img [src]="url" alt="Capture d'écran jointe" class="mt-3 max-h-96 rounded-lg border border-stone-200" />
            } @else {
              <button type="button" class="mt-2 text-sm text-marque hover:underline" (click)="voirCapture(m)">Voir la capture d'écran</button>
            }
          }
          @if (m.statut === 'nouveau') {
            <button type="button" class="bouton-principal mt-3" [disabled]="envoi() === m.id" (click)="traiter(m)">Marquer traité</button>
          }
          @if (erreurs[m.id]) { <p class="erreur mt-2">{{ erreurs[m.id] }}</p> }
        </div>
      } @empty {
        @if (!charge() && !erreur()) { <div class="carte text-center text-texte-2">Aucun message.</div> }
      }
    </div>
    <app-etat [charge]="charge()" [erreur]="erreur()" />
    <app-pagination [pagination]="pagination()" (page)="charger($event)" />
  `,
})
export class Support implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);

  protected statut = 'nouveau';
  protected sujet = '';
  protected erreurs: Record<string, string> = {};
  protected readonly sujets = Object.entries(SUJETS_SUPPORT);
  protected readonly messages = signal<MessageSupport[]>([]);
  protected readonly captures = signal<Record<string, string>>({});
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly charge = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal<string | null>(null);

  ngOnInit(): void {
    void this.charger(1);
  }

  ngOnDestroy(): void {
    Object.values(this.captures()).forEach((url) => URL.revokeObjectURL(url));
  }

  protected sujetLibelle(s: string): string {
    return libelle(SUJETS_SUPPORT, s);
  }

  protected async charger(page: number): Promise<void> {
    this.charge.set(true);
    this.erreur.set(null);
    try {
      const r = await firstValueFrom(
        this.api.page<MessageSupport>('admin/support/messages', { 'filter[statut]': this.statut, 'filter[sujet]': this.sujet, page, per_page: 20 }),
      );
      this.messages.set(r.donnees);
      this.pagination.set(r.pagination);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.charge.set(false);
    }
  }

  /** La capture est privée : on la télécharge avec le jeton, puis on l'affiche depuis la mémoire. */
  protected async voirCapture(m: MessageSupport): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.fichier(m.capture_url!));
      this.captures.update((c) => ({ ...c, [m.id]: URL.createObjectURL(blob) }));
    } catch (e) {
      this.erreurs[m.id] = messageErreur(e);
    }
  }

  protected async traiter(m: MessageSupport): Promise<void> {
    this.envoi.set(m.id);
    delete this.erreurs[m.id];
    try {
      const maj = await firstValueFrom(this.api.post<MessageSupport>(`admin/support/messages/${m.id}/traiter`));
      this.messages.update((liste) => liste.map((x) => (x.id === m.id ? maj : x)));
    } catch (e) {
      this.erreurs[m.id] = messageErreur(e);
    } finally {
      this.envoi.set(null);
    }
  }
}
