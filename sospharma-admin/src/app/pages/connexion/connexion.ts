import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { messageErreur } from '../../noyau/api.service';
import { SessionService } from '../../noyau/session.service';
import { CadreInvite } from './cadre-invite';

@Component({
  selector: 'app-connexion',
  imports: [FormsModule, RouterLink, CadreInvite],
  template: `
    <app-cadre-invite titre="Connexion de l'équipe">
      @if (expiree()) {
        <p class="erreur mb-4">Votre session a expiré. Reconnectez-vous.</p>
      }
      @if (refuse()) {
        <p class="erreur mb-4">Ce compte n'a pas accès au back-office. Les pharmaciens et agents terrain passent par l'app.</p>
      }
      <form (ngSubmit)="connecter()" class="space-y-4">
        <div>
          <label class="etiquette" for="email">E-mail</label>
          <input id="email" name="email" type="email" class="champ" autocomplete="username" required [(ngModel)]="email" />
        </div>
        <div>
          <label class="etiquette" for="mdp">Mot de passe</label>
          <input id="mdp" name="password" type="password" class="champ" autocomplete="current-password" required [(ngModel)]="motDePasse" />
        </div>
        @if (erreur()) {
          <p class="erreur">{{ erreur() }}</p>
        }
        <button type="submit" class="bouton-principal w-full" [disabled]="envoi() || !email || !motDePasse">
          {{ envoi() ? 'Connexion…' : 'Se connecter' }}
        </button>
        <a routerLink="/mot-de-passe-oublie" class="block text-center text-sm text-marque hover:underline">Mot de passe oublié ?</a>
      </form>
    </app-cadre-invite>
  `,
})
export class Connexion {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly expiree = input<string>();
  readonly refuse = input<string>();

  protected email = '';
  protected motDePasse = '';
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected async connecter(): Promise<void> {
    this.envoi.set(true);
    this.erreur.set(null);
    try {
      const { compte } = await firstValueFrom(this.session.connexion(this.email.trim(), this.motDePasse));
      if (compte.role !== 'admin' && compte.role !== 'editeur_ville') {
        await this.session.deconnexion();
        this.erreur.set("Ce compte n'a pas accès au back-office. Les pharmaciens et agents terrain passent par l'app.");
        return;
      }
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
