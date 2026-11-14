import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { ROLES, libelle } from '../../noyau/libelles';
import { SessionService } from '../../noyau/session.service';
import { TerritoireService } from '../../noyau/territoire.service';
import { Compte, Pagination, Role } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';
import { PaginationListe } from '../../ui/pagination';

interface Formulaire {
  id: string | null;
  nom: string;
  email: string;
  role: Role;
  ville: string;
  villes: string[];
  actif: boolean;
}

/** Comptes de l'équipe, des pharmaciens et des agents terrain (admin seulement). */
@Component({
  selector: 'app-comptes',
  imports: [FormsModule, DatePipe, LucideAngularModule, PaginationListe, EtatChargement],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1>Comptes</h1>
        <p class="mt-1 text-sm text-texte-2">Un nouveau compte reçoit un e-mail pour choisir son mot de passe.</p>
      </div>
      <button type="button" class="bouton-principal" (click)="ouvrir(null)">
        <lucide-icon [img]="Plus" [size]="16" /> Nouveau compte
      </button>
    </div>

    @if (f) {
      <form class="carte mt-5 grid gap-4 sm:grid-cols-2" (ngSubmit)="enregistrer()">
        <h2 class="sm:col-span-2">{{ f.id ? 'Modifier le compte' : 'Nouveau compte' }}</h2>
        <div>
          <label class="etiquette" for="nom">Nom</label>
          <input id="nom" name="nom" class="champ" required [(ngModel)]="f.nom" />
        </div>
        <div>
          <label class="etiquette" for="email">E-mail</label>
          <input id="email" name="email" type="email" class="champ" required [(ngModel)]="f.email" />
        </div>
        <div>
          <label class="etiquette" for="role">Rôle</label>
          <select id="role" name="role" class="champ" [(ngModel)]="f.role">
            @for (r of roles; track r[0]) { <option [value]="r[0]">{{ r[1] }}</option> }
          </select>
        </div>
        @if (f.role === 'editeur_ville') {
          <div>
            <label class="etiquette" for="ville">Ville</label>
            <select id="ville" name="ville" class="champ" required [(ngModel)]="f.ville">
              <option value="" disabled>Choisir…</option>
              @for (v of territoire.villes(); track v.id) { <option [value]="v.id">{{ v.nom }}</option> }
            </select>
          </div>
        }
        @if (f.role === 'agent_terrain') {
          <div>
            <span class="etiquette">Villes de l'agent</span>
            <div class="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-filet bg-white p-2">
              @for (v of territoire.villes(); track v.id) {
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="accent-marque" [checked]="f.villes.includes(v.id)" (change)="basculerVille(v.id)" /> {{ v.nom }}
                </label>
              }
            </div>
          </div>
        }
        @if (f.role === 'pharmacien') {
          <p class="text-sm text-texte-2 sm:col-span-2">Le rattachement à une pharmacie se fait depuis l'API pour l'instant (écran à venir).</p>
        }
        <label class="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="actif" class="h-4 w-4 accent-marque" [(ngModel)]="f.actif" /> Compte actif
        </label>
        @if (erreurForm()) { <p class="erreur sm:col-span-2">{{ erreurForm() }}</p> }
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" class="bouton-principal" [disabled]="envoi()">Enregistrer</button>
          <button type="button" class="bouton-secondaire" (click)="f = null">Annuler</button>
        </div>
      </form>
    }

    <div class="carte mt-4 flex flex-wrap gap-3">
      <input name="q" class="champ max-w-xs" placeholder="Nom ou e-mail" [(ngModel)]="q" (keydown.enter)="charger(1)" />
      <select name="frole" class="champ max-w-xs" [(ngModel)]="role" (change)="charger(1)">
        <option value="">Tous les rôles</option>
        @for (r of roles; track r[0]) { <option [value]="r[0]">{{ r[1] }}</option> }
      </select>
    </div>

    <div class="carte mt-4 overflow-x-auto p-0">
      <table class="tableau">
        <thead><tr><th>Nom</th><th>Rôle</th><th>Villes</th><th>Dernière connexion</th><th>État</th><th></th></tr></thead>
        <tbody>
          @for (c of comptes(); track c.id) {
            <tr>
              <td><div class="font-medium">{{ c.nom }}</div><div class="text-xs text-texte-2">{{ c.email }}</div></td>
              <td>{{ roleLibelle(c.role) }}</td>
              <td class="text-texte-2">{{ nomsVilles(c) }}</td>
              <td class="whitespace-nowrap text-texte-2">{{ c.derniere_connexion_le ? (c.derniere_connexion_le | date: 'd MMM y HH:mm') : 'Jamais' }}</td>
              <td>@if (c.actif) { <span class="pastille-verte">Actif</span> } @else { <span class="pastille-grise">Désactivé</span> }</td>
              <td class="text-right">
                <button type="button" class="text-sm text-marque hover:underline" (click)="ouvrir(c)">Modifier</button>
              </td>
            </tr>
          } @empty {
            @if (!charge()) { <tr><td colspan="6" class="py-8 text-center text-texte-2">Aucun compte.</td></tr> }
          }
        </tbody>
      </table>
      <div class="px-4"><app-etat [charge]="charge()" [erreur]="erreur()" /></div>
    </div>
    <app-pagination [pagination]="pagination()" (page)="charger($event)" />
  `,
})
export class Comptes implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);
  protected readonly territoire = inject(TerritoireService);

  protected q = '';
  protected role = '';
  protected f: Formulaire | null = null;
  protected readonly roles = Object.entries(ROLES);
  protected readonly comptes = signal<Compte[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly charge = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurForm = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected readonly Plus = Plus;
  private page = 1;

  ngOnInit(): void {
    void this.territoire.charger();
    void this.charger(1);
  }

  protected roleLibelle(r: string): string {
    return libelle(ROLES, r);
  }

  protected nomsVilles(c: Compte): string {
    return c.villes.map((v) => v.nom).join(', ') || '—';
  }

  protected async charger(page: number): Promise<void> {
    this.page = page;
    this.charge.set(true);
    this.erreur.set(null);
    try {
      const r = await firstValueFrom(this.api.page<Compte>('admin/comptes', { q: this.q.trim(), 'filter[role]': this.role, page, per_page: 25 }));
      this.comptes.set(r.donnees);
      this.pagination.set(r.pagination);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.charge.set(false);
    }
  }

  protected ouvrir(c: Compte | null): void {
    this.erreurForm.set(null);
    this.f = c
      ? { id: c.id, nom: c.nom, email: c.email, role: c.role, ville: c.ville?.id ?? '', villes: c.villes.map((v) => v.id), actif: c.actif }
      : { id: null, nom: '', email: '', role: 'editeur_ville', ville: '', villes: [], actif: true };
  }

  protected basculerVille(id: string): void {
    if (!this.f) return;
    this.f.villes = this.f.villes.includes(id) ? this.f.villes.filter((v) => v !== id) : [...this.f.villes, id];
  }

  protected async enregistrer(): Promise<void> {
    const f = this.f;
    if (!f) return;
    this.envoi.set(true);
    this.erreurForm.set(null);
    const corps: Record<string, unknown> = { nom: f.nom.trim(), email: f.email.trim(), role: f.role, actif: f.actif };
    if (f.role === 'editeur_ville') corps['ville'] = f.ville || null;
    if (f.role === 'agent_terrain') corps['villes'] = f.villes;
    try {
      if (f.id) await firstValueFrom(this.api.patch(`admin/comptes/${f.id}`, corps));
      else await firstValueFrom(this.api.post('admin/comptes', corps));
      this.f = null;
      await this.charger(f.id ? this.page : 1);
    } catch (e) {
      this.erreurForm.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
