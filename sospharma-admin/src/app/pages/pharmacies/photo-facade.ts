import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { Pharmacie } from '../../noyau/types';

/** Limite de l'API (5 Mo) : vérifiée avant l'envoi pour ne pas attendre un refus sur un réseau lent. */
const TAILLE_MAX = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Photo de façade d'une fiche, posée sans relevé terrain. Elle s'affiche dans l'app (accueil, garde,
 * fiche, aperçu de la carte, favoris) ; sans photo, l'app montre la devanture dessinée.
 */
@Component({
  selector: 'app-photo-facade',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="carte" aria-labelledby="titre-facade">
      <h2 id="titre-facade">Façade</h2>

      @if (photo(); as url) {
        <img
          [src]="url"
          [alt]="'Façade de ' + nom()"
          class="mt-2 aspect-[4/3] w-full rounded-lg bg-surface object-cover"
        />
      } @else {
        <p class="mt-2 text-sm text-texte-2">
          Pas encore de photo : l’app montre la devanture dessinée.
        </p>
      }

      <p class="mt-3 text-xs text-texte-2">
        La devanture prise de face, enseigne lisible. JPEG, PNG ou WebP, 5 Mo au plus.
      </p>

      @if (erreur()) {
        <p class="erreur" role="alert">{{ erreur() }}</p>
      }
      @if (message()) {
        <p class="succes" role="status">{{ message() }}</p>
      }

      <div class="mt-3 flex flex-wrap gap-2">
        <label
          class="bouton-principal cursor-pointer"
          [class.pointer-events-none]="envoi()"
          [class.opacity-60]="envoi()"
        >
          {{ envoi() ? 'Envoi…' : photo() ? 'Remplacer la photo' : 'Choisir une photo' }}
          <input
            type="file"
            class="sr-only"
            accept="image/jpeg,image/png,image/webp"
            [disabled]="envoi()"
            (change)="choisir($event)"
            data-test="champ-photo"
          />
        </label>
        @if (photo()) {
          <button type="button" class="bouton-secondaire" [disabled]="envoi()" (click)="retirer()">
            Retirer la photo
          </button>
        }
      </div>
    </section>
  `,
})
export class PhotoFacade {
  private readonly api = inject(ApiService);

  /** Identifiant public de la pharmacie (ph_…). */
  readonly pharmacie = input.required<string>();
  readonly nom = input.required<string>();
  readonly photo = input<string | null>(null);
  /** La fiche renvoyée par l'API après l'envoi ou le retrait. */
  readonly modifiee = output<Pharmacie>();

  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  protected async choisir(evenement: Event): Promise<void> {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    // Vidé tout de suite : choisir à nouveau le même fichier relance l'envoi.
    champ.value = '';
    if (!fichier) return;
    this.erreur.set(null);
    this.message.set(null);
    if (!TYPES.includes(fichier.type)) {
      this.erreur.set('Image JPEG, PNG ou WebP attendue.');
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      this.erreur.set('La photo dépasse 5 Mo. Réduisez-la puis réessayez.');
      return;
    }

    const corps = new FormData();
    corps.append('photo', fichier);
    await this.appeler(
      this.api.post<Pharmacie>(`admin/pharmacies/${this.pharmacie()}/photo`, corps),
      'Photo enregistrée. Elle apparaît dans l’app.',
    );
  }

  protected async retirer(): Promise<void> {
    if (!confirm(`Retirer la photo de « ${this.nom()} » ? L’app montrera la devanture dessinée.`)) {
      return;
    }
    this.erreur.set(null);
    this.message.set(null);
    await this.appeler(
      this.api.delete<Pharmacie>(`admin/pharmacies/${this.pharmacie()}/photo`),
      'Photo retirée.',
    );
  }

  private async appeler(requete: Observable<Pharmacie>, succes: string): Promise<void> {
    this.envoi.set(true);
    try {
      this.modifiee.emit(await firstValueFrom(requete));
      this.message.set(succes);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
