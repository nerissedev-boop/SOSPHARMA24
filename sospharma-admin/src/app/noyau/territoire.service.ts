import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { Pays, Ville } from './types';

/** Villes de tous les pays, lues une fois par les routes publiques, pour remplir les filtres. */
@Injectable({ providedIn: 'root' })
export class TerritoireService {
  private readonly api = inject(ApiService);
  readonly villes = signal<Ville[]>([]);
  private charge: Promise<void> | null = null;

  charger(): Promise<void> {
    this.charge ??= (async () => {
      try {
        const pays = await firstValueFrom(this.api.get<Pays[]>('pays'));
        const listes = await Promise.all(
          pays.map((p) => firstValueFrom(this.api.get<Ville[]>(`pays/${p.code}/villes`))),
        );
        this.villes.set(listes.flat().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
      } catch {
        this.charge = null;
      }
    })();
    return this.charge;
  }
}
