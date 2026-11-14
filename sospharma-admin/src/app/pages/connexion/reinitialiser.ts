import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { CadreInvite } from './cadre-invite';

/** Ouverte depuis le lien de l'e-mail : `?token=…&email=…`. */
@Component({
  selector: 'app-reinitialiser',
  imports: [FormsModule, RouterLink, CadreInvite],
  template: `
    <app-cadre-invite titre="Nouveau mot de passe">
      @if (!token() || !email()) {
        <p class="erreur">Ce lien est incomplet. Redemandez un lien depuis « Mot de passe oublié ».</p>
      } @else if (message()) {
        <p class="succes">{{ message() }}</p>
      } @else {
        <form (ngSubmit)="envoyer()" class="space-y-4">
          <p class="text-sm text-texte-2">Compte : <strong>{{ email() }}</strong></p>
          <div>
            <label class="etiquette" for="mdp">Nouveau mot de passe</label>
            <input id="mdp" name="password" type="password" class="champ" autocomplete="new-password" required [(ngModel)]="motDePasse" />
            <p class="mt-1 text-xs text-texte-2">10 caractères au moins, avec des lettres et des chiffres.</p>
          </div>
          <div>
            <label class="etiquette" for="mdp2">Confirmation</label>
            <input id="mdp2" name="password_confirmation" type="password" class="champ" autocomplete="new-password" required [(ngModel)]="confirmation" />
          </div>
          @if (erreur()) {
            <p class="erreur">{{ erreur() }}</p>
          }
          <button type="submit" class="bouton-principal w-full" [disabled]="envoi() || !motDePasse || motDePasse !== confirmation">
            Enregistrer
          </button>
        </form>
      }
      <a routerLink="/connexion" class="mt-4 block text-center text-sm text-marque hover:underline">Aller à la connexion</a>
    </app-cadre-invite>
  `,
})
export class Reinitialiser {
  private readonly api = inject(ApiService);
  readonly token = input<string>();
  readonly email = input<string>();

  protected motDePasse = '';
  protected confirmation = '';
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  protected async envoyer(): Promise<void> {
    this.envoi.set(true);
    this.erreur.set(null);
    try {
      const r = await firstValueFrom(
        this.api.post<{ message: string }>('auth/mot-de-passe/reinitialiser', {
          token: this.token(),
          email: this.email(),
          password: this.motDePasse,
          password_confirmation: this.confirmation,
        }),
      );
      this.message.set(r.message);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
