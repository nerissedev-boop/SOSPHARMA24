import { Component, input } from '@angular/core';
import { LoaderCircle, LucideAngularModule } from 'lucide-angular';

/** Indicateur de chargement, ou message d'erreur si l'appel a échoué. */
@Component({
  selector: 'app-etat',
  imports: [LucideAngularModule],
  template: `
    @if (erreur()) {
      <div class="erreur">{{ erreur() }}</div>
    } @else if (charge()) {
      <div class="flex items-center gap-2 py-8 text-sm text-texte-2">
        <lucide-icon [img]="LoaderCircle" [size]="18" class="animate-spin" /> Chargement…
      </div>
    }
  `,
})
export class EtatChargement {
  readonly charge = input(false);
  readonly erreur = input<string | null>(null);
  protected readonly LoaderCircle = LoaderCircle;
}
