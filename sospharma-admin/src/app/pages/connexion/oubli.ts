import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { CadreInvite } from './cadre-invite';

@Component({
  selector: 'app-oubli',
  imports: [FormsModule, RouterLink, CadreInvite],
  template: `
    <app-cadre-invite titre="Mot de passe oublié">
      @if (message()) {
        <p class="succes mb-4">{{ message() }}</p>
      } @else {
        <form (ngSubmit)="envoyer()" class="space-y-4">
          <p class="text-sm text-texte-2">Indiquez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <div>
            <label class="etiquette" for="email">E-mail</label>
            <input id="email" name="email" type="email" class="champ" required [(ngModel)]="email" />
          </div>
          @if (erreur()) {
            <p class="erreur">{{ erreur() }}</p>
          }
          <button type="submit" class="bouton-principal w-full" [disabled]="envoi() || !email">Envoyer le lien</button>
        </form>
      }
      <a routerLink="/connexion" class="mt-4 block text-center text-sm text-marque hover:underline">Retour à la connexion</a>
    </app-cadre-invite>
  `,
})
export class Oubli {
  private readonly api = inject(ApiService);
  protected email = '';
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  protected async envoyer(): Promise<void> {
    this.envoi.set(true);
    this.erreur.set(null);
    try {
      const r = await firstValueFrom(this.api.post<{ message: string }>('auth/mot-de-passe/oubli', { email: this.email.trim() }));
      this.message.set(r.message);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
