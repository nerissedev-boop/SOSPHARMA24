import { Component, input, output } from '@angular/core';
import { ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { Pagination } from '../noyau/types';

/** Bas de liste : « 21–40 sur 312 » et pages précédente / suivante. */
@Component({
  selector: 'app-pagination',
  imports: [LucideAngularModule],
  template: `
    @if (pagination(); as p) {
      <div class="flex items-center justify-between gap-3 pt-4 text-sm text-texte-2">
        <span>
          @if (p.total === 0) {
            Aucun résultat
          } @else {
            {{ (p.page - 1) * p.per_page + 1 }}–{{ min(p.page * p.per_page, p.total) }} sur {{ p.total }}
          }
        </span>
        <div class="flex gap-2">
          <button type="button" class="bouton-secondaire px-2" [disabled]="p.page <= 1" (click)="page.emit(p.page - 1)" aria-label="Page précédente">
            <lucide-icon [img]="ChevronLeft" [size]="16" />
          </button>
          <span class="self-center">Page {{ p.page }} / {{ p.last_page || 1 }}</span>
          <button type="button" class="bouton-secondaire px-2" [disabled]="p.page >= p.last_page" (click)="page.emit(p.page + 1)" aria-label="Page suivante">
            <lucide-icon [img]="ChevronRight" [size]="16" />
          </button>
        </div>
      </div>
    }
  `,
})
export class PaginationListe {
  readonly pagination = input<Pagination | null>(null);
  readonly page = output<number>();
  protected readonly ChevronLeft = ChevronLeft;
  protected readonly ChevronRight = ChevronRight;
  protected min = Math.min;
}
