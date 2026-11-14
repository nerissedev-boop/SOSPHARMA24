import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, ErreurApi, messageErreur } from '../../noyau/api.service';
import { ORIGINES_TELEPHONE, libelle, telephoneLisible } from '../../noyau/libelles';
import { TelephonePharmacie } from '../../noyau/types';
import { EtatChargement } from '../../ui/chargement';

/**
 * Numéros d'une fiche (table telephones_pharmacie). Le principal est celui du bouton « Appeler » ;
 * l'API le recopie dans pharmacies.telephone, c'est pourquoi la fiche n'a plus de champ téléphone à elle.
 */
@Component({
  selector: 'app-numeros-pharmacie',
  imports: [FormsModule, DatePipe, EtatChargement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="carte overflow-x-auto p-0" aria-labelledby="titre-numeros">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5">
        <h2 id="titre-numeros">Numéros</h2>
        <p class="text-xs text-texte-2">
          Le principal est le numéro du bouton « Appeler » dans l’app.
        </p>
      </div>

      <div class="px-5">
        <app-etat [charge]="chargement() && !telephones()" [erreur]="erreurChargement()" />
        @if (erreurChargement()) {
          <button type="button" class="bouton-secondaire mt-2" (click)="charger()">
            Réessayer
          </button>
        }
      </div>

      @if (telephones(); as liste) {
        @if (liste.length) {
          <table class="tableau mt-3">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>WhatsApp</th>
                <th>Source</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (t of liste; track t.id) {
                @let numero = lisible(t.numero);
                <tr>
                  <td class="whitespace-nowrap">
                    <span class="font-medium tabular-nums">{{ numero }}</span>
                    @if (t.principal) {
                      <span class="pastille-verte ml-2">Principal</span>
                    }
                  </td>
                  <td class="whitespace-nowrap">
                    <div
                      class="inline-flex gap-0.5 rounded-lg bg-surface p-0.5"
                      role="group"
                      [attr.aria-label]="'WhatsApp sur le ' + numero"
                    >
                      <button
                        type="button"
                        class="rounded-md px-3 py-1 text-sm"
                        [class]="
                          t.whatsapp
                            ? 'bg-marque-profond text-white'
                            : 'text-texte-2 hover:bg-filet'
                        "
                        [attr.aria-pressed]="t.whatsapp"
                        [disabled]="occupe()"
                        (click)="repondreWhatsapp(t, true)"
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        class="rounded-md px-3 py-1 text-sm"
                        [class]="
                          nonConfirme(t)
                            ? 'bg-marque-profond text-white'
                            : 'text-texte-2 hover:bg-filet'
                        "
                        [attr.aria-pressed]="nonConfirme(t)"
                        [disabled]="occupe()"
                        (click)="repondreWhatsapp(t, false)"
                      >
                        Non
                      </button>
                    </div>
                    <div class="mt-1 text-xs tabular-nums">
                      @if (t.whatsapp_confirme_le) {
                        <span class="text-texte-2"
                          >Vérifié le {{ t.whatsapp_confirme_le | date: 'd MMM y' }}</span
                        >
                      } @else {
                        <span class="text-ocre">Pas encore vérifié</span>
                      }
                    </div>
                  </td>
                  <td class="text-xs text-texte-2">{{ origine(t.origine) }}</td>
                  <td class="text-right whitespace-nowrap">
                    @if (!t.principal) {
                      <button
                        type="button"
                        class="bouton-secondaire px-3 py-1 text-xs"
                        [disabled]="occupe()"
                        (click)="choisirPrincipal(t)"
                      >
                        Choisir comme principal
                      </button>
                    }
                    <!-- Le principal ne part qu'en dernier : on en choisit d'abord un autre (même règle que l'app et l'API). -->
                    @if (!t.principal || liste.length === 1) {
                      <button
                        type="button"
                        class="bouton-secondaire ml-2 px-3 py-1 text-xs"
                        [disabled]="occupe()"
                        (click)="retirer(t, liste.length === 1)"
                      >
                        Retirer ce numéro
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="px-5 pt-3 text-sm text-texte-2">Aucun numéro sur cette fiche.</p>
        }
      }

      <div aria-live="polite" class="px-5">
        @if (erreurAction()) {
          <p class="erreur mt-3">{{ erreurAction() }}</p>
        }
        @if (message()) {
          <p class="succes mt-3">{{ message() }}</p>
        }
      </div>

      <form
        class="mt-4 flex flex-wrap items-start gap-3 border-t border-filet px-5 py-4"
        (ngSubmit)="ajouter()"
      >
        <div class="w-60">
          <label class="etiquette" for="nouveau-numero">Ajouter un numéro</label>
          <input
            id="nouveau-numero"
            name="numero"
            type="tel"
            inputmode="tel"
            autocomplete="off"
            class="champ tabular-nums"
            placeholder="07 07 12 34 56"
            [ngModel]="nouveau()"
            (ngModelChange)="nouveau.set($event); erreurNumero.set(null)"
            [attr.aria-invalid]="erreurNumero() ? true : null"
            [attr.aria-describedby]="erreurNumero() ? 'erreur-nouveau-numero' : null"
          />
          @if (erreurNumero()) {
            <p id="erreur-nouveau-numero" class="mt-1 text-xs text-alerte-texte">
              {{ erreurNumero() }}
            </p>
          }
        </div>
        <label class="mt-6 flex items-center gap-2 py-2 text-sm">
          <input
            type="checkbox"
            name="whatsapp"
            class="h-4 w-4 accent-marque"
            [ngModel]="nouveauWhatsapp()"
            (ngModelChange)="nouveauWhatsapp.set($event)"
          />
          Ce numéro a WhatsApp
        </label>
        <button
          type="submit"
          class="bouton-principal mt-6"
          [disabled]="occupe() || !nouveau().trim()"
        >
          Ajouter
        </button>
      </form>
    </section>
  `,
})
export class NumerosPharmacie implements OnInit {
  private readonly api = inject(ApiService);

  /** Identifiant public de la pharmacie (ph_…). */
  readonly pharmacie = input.required<string>();

  protected readonly telephones = signal<TelephonePharmacie[] | null>(null);
  protected readonly chargement = signal(false);
  protected readonly erreurChargement = signal<string | null>(null);
  protected readonly occupe = signal(false);
  protected readonly erreurAction = signal<string | null>(null);
  protected readonly erreurNumero = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly nouveau = signal('');
  protected readonly nouveauWhatsapp = signal(false);

  protected readonly lisible = telephoneLisible;

  ngOnInit(): void {
    void this.charger();
  }

  protected origine(origine: string): string {
    return libelle(ORIGINES_TELEPHONE, origine);
  }

  /** « Non » n'est enfoncé que si une personne l'a répondu : un numéro jamais vérifié n'a ni oui ni non. */
  protected nonConfirme(t: TelephonePharmacie): boolean {
    return !t.whatsapp && t.whatsapp_confirme_le !== null;
  }

  protected async charger(): Promise<void> {
    this.chargement.set(true);
    this.erreurChargement.set(null);
    try {
      this.telephones.set(await firstValueFrom(this.api.get<TelephonePharmacie[]>(this.chemin())));
    } catch (e) {
      this.erreurChargement.set(messageErreur(e));
    } finally {
      this.chargement.set(false);
    }
  }

  protected ajouter(): Promise<void> {
    const numero = this.nouveau().trim();
    const corps = this.nouveauWhatsapp() ? { numero, whatsapp: true } : { numero };
    return this.agir(async () => {
      const dejaLa = this.telephones() ?? [];
      const t = await firstValueFrom(this.api.post<TelephonePharmacie>(this.chemin(), corps));
      this.nouveau.set('');
      this.nouveauWhatsapp.set(false);
      // 200 et meta.deja_present : on le reconnaît à l'identifiant, déjà dans la liste.
      return dejaLa.some((d) => d.id === t.id)
        ? `Le ${telephoneLisible(t.numero)} était déjà sur la fiche.`
        : `${telephoneLisible(t.numero)} ajouté.`;
    });
  }

  protected choisirPrincipal(t: TelephonePharmacie): Promise<void> {
    return this.agir(async () => {
      await firstValueFrom(this.api.patch(this.chemin(t.id), { principal: true }));
      return `${telephoneLisible(t.numero)} est maintenant le numéro principal.`;
    });
  }

  /** La réponse est datée et signée par la personne connectée, même si elle ne change pas. */
  protected repondreWhatsapp(t: TelephonePharmacie, whatsapp: boolean): Promise<void> {
    return this.agir(async () => {
      await firstValueFrom(this.api.patch(this.chemin(t.id), { whatsapp }));
      return `WhatsApp sur le ${telephoneLisible(t.numero)} : ${whatsapp ? 'oui' : 'non'}, vérifié aujourd’hui.`;
    });
  }

  protected retirer(t: TelephonePharmacie, dernier: boolean): Promise<void> {
    const numero = telephoneLisible(t.numero);
    const question = dernier
      ? `Retirer le ${numero} ? La fiche n’aura plus aucun numéro à appeler.`
      : `Retirer le ${numero} de la fiche ?`;
    if (!confirm(question)) return Promise.resolve();
    return this.agir(async () => {
      try {
        await firstValueFrom(this.api.delete(this.chemin(t.id)));
      } catch (e) {
        // 404 : déjà retiré (second clic, autre onglet), le résultat voulu est atteint.
        if (!(e instanceof ErreurApi && e.statut === 404)) throw e;
      }
      return `${numero} retiré.`;
    });
  }

  /** Une écriture, puis la liste relue : un changement de principal renumérote tous les numéros. */
  private async agir(ecriture: () => Promise<string>): Promise<void> {
    this.occupe.set(true);
    this.erreurAction.set(null);
    this.erreurNumero.set(null);
    this.message.set(null);
    try {
      const message = await ecriture();
      await this.charger();
      this.message.set(message);
    } catch (e) {
      const surLeNumero =
        e instanceof ErreurApi && e.statut === 422 ? e.details['numero']?.[0] : undefined;
      if (surLeNumero) this.erreurNumero.set(surLeNumero);
      else this.erreurAction.set(messageErreur(e));
    } finally {
      this.occupe.set(false);
    }
  }

  private chemin(telephone?: string): string {
    const base = `admin/pharmacies/${this.pharmacie()}/telephones`;
    return telephone ? `${base}/${telephone}` : base;
  }
}
