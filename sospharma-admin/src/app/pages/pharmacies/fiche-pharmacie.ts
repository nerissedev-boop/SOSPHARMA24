import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArrowLeft, LucideAngularModule, Plus, Trash2 } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { JOURS } from '../../noyau/libelles';
import { SessionService } from '../../noyau/session.service';
import { Pharmacie, Plage, Reference } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';

interface Formulaire {
  nom: string;
  adresse: string;
  quartier: string;
  zone: string;
  telephone: string;
  whatsapp: string;
  latitude: string;
  longitude: string;
  actif: boolean;
}

/** Fiche d'une pharmacie : informations, position, horaires et assurances (lecture). */
@Component({
  selector: 'app-fiche-pharmacie',
  imports: [FormsModule, RouterLink, DatePipe, LucideAngularModule, EtatChargement],
  template: `
    <a routerLink="/pharmacies" class="inline-flex items-center gap-1 text-sm text-marque hover:underline">
      <lucide-icon [img]="ArrowLeft" [size]="14" /> Pharmacies
    </a>
    <app-etat [charge]="!pharmacie() && !erreur()" [erreur]="erreur()" />

    @if (pharmacie(); as p) {
      <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>{{ p.nom }}</h1>
          <p class="mt-1 text-sm text-texte-2">
            {{ p.ville?.nom }} · créée le {{ p.cree_le | date: 'd MMM y' }} · modifiée le {{ p.modifie_le | date: 'd MMM y à HH:mm' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (p.actif) { <span class="pastille-verte">Active</span> } @else { <span class="pastille-grise">Désactivée</span> }
          @if (p.verifiee_le) {
            <span class="pastille-verte">Vérifiée le {{ p.verifiee_le | date: 'd MMM y' }}</span>
          } @else {
            <span class="pastille-ocre">Jamais vérifiée</span>
          }
        </div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-3">
        <form class="carte space-y-4 lg:col-span-2" (ngSubmit)="enregistrer(false)">
          <h2>Informations</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="etiquette" for="nom">Nom</label>
              <input id="nom" name="nom" class="champ" required [(ngModel)]="f.nom" />
            </div>
            <div class="sm:col-span-2">
              <label class="etiquette" for="adresse">Adresse ou repère</label>
              <input id="adresse" name="adresse" class="champ" required [(ngModel)]="f.adresse" />
            </div>
            <div>
              <label class="etiquette" for="quartier">Quartier</label>
              <input id="quartier" name="quartier" class="champ" [(ngModel)]="f.quartier" />
            </div>
            <div>
              <label class="etiquette" for="zone">Commune</label>
              <select id="zone" name="zone" class="champ" [(ngModel)]="f.zone">
                <option value="">Non rattachée</option>
                @for (z of zones(); track z.id) {
                  <option [value]="z.id">{{ z.nom }}</option>
                }
              </select>
            </div>
            <div>
              <label class="etiquette" for="tel">Téléphone</label>
              <input id="tel" name="telephone" class="champ" placeholder="+2250102030405" [(ngModel)]="f.telephone" />
            </div>
            <div>
              <label class="etiquette" for="wa">WhatsApp</label>
              <input id="wa" name="whatsapp" class="champ" placeholder="+2250102030405" [(ngModel)]="f.whatsapp" />
            </div>
            <div>
              <label class="etiquette" for="lat">Latitude</label>
              <input id="lat" name="latitude" class="champ" inputmode="decimal" placeholder="5.3600" [(ngModel)]="f.latitude" />
            </div>
            <div>
              <label class="etiquette" for="lng">Longitude</label>
              <input id="lng" name="longitude" class="champ" inputmode="decimal" placeholder="-3.9600" [(ngModel)]="f.longitude" />
            </div>
            @if (!p.position) {
              <p class="pastille-ocre sm:col-span-2 justify-self-start">Position à confirmer : l'app affiche la pharmacie sans la placer sur la carte.</p>
            } @else {
              <a class="text-sm text-marque hover:underline sm:col-span-2" target="_blank" rel="noopener"
                 [href]="'https://www.openstreetmap.org/?mlat=' + p.position.lat + '&mlon=' + p.position.lng + '#map=18/' + p.position.lat + '/' + p.position.lng">
                Voir la position sur OpenStreetMap
              </a>
            }
            <label class="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="actif" [(ngModel)]="f.actif" class="h-4 w-4 accent-marque" />
              Active (visible dans l'app)
            </label>
          </div>
          @if (erreurFiche()) { <p class="erreur">{{ erreurFiche() }}</p> }
          @if (messageFiche()) { <p class="succes">{{ messageFiche() }}</p> }
          <div class="flex flex-wrap gap-2">
            <button type="submit" class="bouton-principal" [disabled]="envoi()">Enregistrer</button>
            <button type="button" class="bouton-secondaire" [disabled]="envoi()" (click)="enregistrer(true)">
              Enregistrer et marquer vérifiée
            </button>
            @if (session.estAdmin()) {
              <button type="button" class="bouton-secondaire ml-auto" [disabled]="envoi()" (click)="supprimer()">
                <lucide-icon [img]="Trash2" [size]="16" /> Supprimer « {{ pharmacie()?.nom }} »
              </button>
            }
          </div>
        </form>

        <div class="space-y-5">
          <form class="carte space-y-3" (ngSubmit)="enregistrerHoraires()">
            <h2>Horaires</h2>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" name="h24" [(ngModel)]="h24" class="h-4 w-4 accent-marque" /> Ouverte 24 h/24
            </label>
            @if (!h24) {
              @for (pl of plages; track $index; let i = $index) {
                <div class="flex items-center gap-1.5">
                  <select class="champ px-2" [name]="'jour' + i" [(ngModel)]="pl.jour">
                    @for (j of jours; track $index; let n = $index) { <option [ngValue]="n">{{ j.slice(0, 3) }}.</option> }
                  </select>
                  <input type="time" class="champ px-2" [name]="'ouv' + i" [(ngModel)]="pl.ouverture" />
                  <input type="time" class="champ px-2" [name]="'fer' + i" [(ngModel)]="pl.fermeture" />
                  <button type="button" class="text-texte-2 hover:text-texte" (click)="plages.splice(i, 1)" aria-label="Retirer la plage">
                    <lucide-icon [img]="Trash2" [size]="16" />
                  </button>
                </div>
              } @empty {
                <p class="text-sm text-texte-2">Aucune plage : l'app affichera « horaires à confirmer ».</p>
              }
              <div class="flex flex-wrap gap-2">
                <button type="button" class="bouton-secondaire px-3 py-1.5 text-xs" (click)="ajouterPlage()">
                  <lucide-icon [img]="Plus" [size]="14" /> Plage
                </button>
                <button type="button" class="bouton-secondaire px-3 py-1.5 text-xs" (click)="semaineType()">Lun–sam 8 h–20 h</button>
              </div>
              <p class="text-xs text-texte-2">Une plage qui finit après minuit (ex. 20:00–02:00) est acceptée.</p>
            }
            @if (erreurHoraires()) { <p class="erreur">{{ erreurHoraires() }}</p> }
            @if (messageHoraires()) { <p class="succes">{{ messageHoraires() }}</p> }
            <button type="submit" class="bouton-principal w-full" [disabled]="envoi()">Enregistrer les horaires</button>
          </form>

          <div class="carte">
            <h2>Assurances acceptées</h2>
            @for (a of p.assurances; track a.id) {
              <div class="mt-2 flex items-center justify-between gap-2 text-sm">
                <span>{{ a.nom }}</span>
                @if (a.tiers_payant) { <span class="pastille-verte">Tiers payant</span> }
              </div>
            } @empty {
              <p class="mt-2 text-sm text-texte-2">Aucune assurance renseignée.</p>
            }
          </div>

          @if (p.photo_facade) {
            <div class="carte">
              <h2 class="mb-2">Façade</h2>
              <img [src]="p.photo_facade" alt="Façade de la pharmacie" class="w-full rounded-lg" />
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class FichePharmacie implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  readonly id = input.required<string>();

  protected readonly pharmacie = signal<Pharmacie | null>(null);
  protected readonly zones = signal<Reference[]>([]);
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected readonly erreurFiche = signal<string | null>(null);
  protected readonly messageFiche = signal<string | null>(null);
  protected readonly erreurHoraires = signal<string | null>(null);
  protected readonly messageHoraires = signal<string | null>(null);

  protected f: Formulaire = vide();
  protected h24 = false;
  protected plages: Plage[] = [];
  protected readonly jours = JOURS;
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Trash2 = Trash2;
  protected readonly Plus = Plus;

  async ngOnInit(): Promise<void> {
    try {
      const p = await firstValueFrom(this.api.get<Pharmacie>(`admin/pharmacies/${this.id()}`));
      this.remplir(p);
      if (p.ville) {
        this.zones.set(await firstValueFrom(this.api.get<Reference[]>(`villes/${p.ville.id}/zones`)));
      }
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  private remplir(p: Pharmacie): void {
    this.pharmacie.set(p);
    this.f = {
      nom: p.nom,
      adresse: p.adresse ?? '',
      quartier: p.quartier ?? '',
      zone: p.zone?.id ?? '',
      telephone: p.telephone ?? '',
      whatsapp: p.whatsapp ?? '',
      latitude: p.position ? String(p.position.lat) : '',
      longitude: p.position ? String(p.position.lng) : '',
      actif: p.actif,
    };
    this.h24 = p.h24;
    this.plages = (p.horaires ?? []).map((h) => ({ ...h }));
  }

  protected async enregistrer(verifiee: boolean): Promise<void> {
    this.erreurFiche.set(null);
    this.messageFiche.set(null);
    const corps: Record<string, unknown> = {
      nom: this.f.nom.trim(),
      adresse: this.f.adresse.trim(),
      quartier: this.f.quartier.trim() || null,
      zone: this.f.zone || null,
      telephone: this.f.telephone.replace(/\s/g, '') || null,
      whatsapp: this.f.whatsapp.replace(/\s/g, '') || null,
      actif: this.f.actif,
    };
    const lat = this.f.latitude.trim().replace(',', '.');
    const lng = this.f.longitude.trim().replace(',', '.');
    if (lat !== '' || lng !== '') {
      if (lat === '' || lng === '' || isNaN(+lat) || isNaN(+lng)) {
        this.erreurFiche.set('Indiquez la latitude et la longitude, en nombres (ex. 5.36 et -3.96).');
        return;
      }
      corps['latitude'] = +lat;
      corps['longitude'] = +lng;
    }
    if (verifiee) corps['verifiee'] = true;

    this.envoi.set(true);
    try {
      const p = await firstValueFrom(this.api.patch<Pharmacie>(`admin/pharmacies/${this.id()}`, corps));
      this.remplir({ ...p, horaires: p.horaires ?? this.pharmacie()?.horaires ?? null });
      this.messageFiche.set(verifiee ? 'Fiche enregistrée et marquée vérifiée.' : 'Fiche enregistrée.');
    } catch (e) {
      this.erreurFiche.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }

  protected ajouterPlage(): void {
    const dernier = this.plages.at(-1);
    this.plages.push({ jour: dernier ? (dernier.jour + 1) % 7 : 1, ouverture: dernier?.ouverture ?? '08:00', fermeture: dernier?.fermeture ?? '20:00' });
  }

  protected semaineType(): void {
    this.plages = [1, 2, 3, 4, 5, 6].map((jour) => ({ jour, ouverture: '08:00', fermeture: '20:00' }));
  }

  protected async enregistrerHoraires(): Promise<void> {
    this.erreurHoraires.set(null);
    this.messageHoraires.set(null);
    this.envoi.set(true);
    try {
      const p = await firstValueFrom(
        this.api.put<Pharmacie>(`admin/pharmacies/${this.id()}/horaires`, {
          h24: this.h24,
          horaires: this.h24 ? [] : this.plages.map((pl) => ({ jour: +pl.jour, ouverture: pl.ouverture, fermeture: pl.fermeture })),
        }),
      );
      this.remplir(p);
      this.messageHoraires.set('Horaires enregistrés.');
    } catch (e) {
      this.erreurHoraires.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }

  protected async supprimer(): Promise<void> {
    if (!confirm(`Supprimer « ${this.pharmacie()?.nom} » ? Elle disparaîtra de l'app.`)) return;
    this.envoi.set(true);
    try {
      await firstValueFrom(this.api.delete(`admin/pharmacies/${this.id()}`));
      await this.router.navigate(['/pharmacies']);
    } catch (e) {
      this.erreurFiche.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}

function vide(): Formulaire {
  return { nom: '', adresse: '', quartier: '', zone: '', telephone: '', whatsapp: '', latitude: '', longitude: '', actif: true };
}
