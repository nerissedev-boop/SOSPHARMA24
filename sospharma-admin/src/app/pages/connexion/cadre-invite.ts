import { Component, input } from '@angular/core';

/** Fond des pages hors session : logo, titre et carte centrée. */
@Component({
  selector: 'app-cadre-invite',
  template: `
    <div class="flex min-h-full items-center justify-center bg-gradient-to-br from-marque-profond to-marque px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-6 text-center text-white">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl font-bold text-marque">+</div>
          <div class="text-xl font-semibold">SOS Pharma 24</div>
          <div class="text-sm text-white/70">Back-office</div>
        </div>
        <div class="carte p-6">
          <h1 class="mb-5 text-xl">{{ titre() }}</h1>
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class CadreInvite {
  readonly titre = input.required<string>();
}
