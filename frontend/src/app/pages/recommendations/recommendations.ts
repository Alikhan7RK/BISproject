import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Recommendation } from '../../core/models';

// TODO: "AI advice" button that calls an LLM endpoint for meal advice
@Component({
  selector: 'app-recommendations',
  imports: [TranslatePipe, DatePipe],
  template: `
    <h1>{{ 'nav.recommendations' | translate }}</h1>
    @for (r of items(); track r.id) {
      <div class="card" [style.opacity]="r.is_read ? 0.7 : 1">
        <h2>{{ r.title }}</h2>
        <p>{{ r.text }}</p>
        <p class="muted">
          {{ auth.isNutritionist() ? r.client_name : r.nutritionist_name }} · {{ r.created_at | date: 'dd.MM.yyyy' }}
          @if (!r.is_read && !auth.isNutritionist()) {
            · <button class="link" type="button" (click)="markRead(r)">{{ 'recommendations.markRead' | translate }}</button>
          }
        </p>
      </div>
    } @empty {
      <p class="muted">{{ 'common.nothingFound' | translate }}</p>
    }
  `,
})
export class RecommendationsPage implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(ApiService);
  items = signal<Recommendation[]>([]);

  ngOnInit(): void {
    this.api.recommendations().subscribe((page) => this.items.set(page.results));
  }

  markRead(r: Recommendation): void {
    this.api.markRecommendationRead(r.id).subscribe((updated) =>
      this.items.update((list) => list.map((x) => (x.id === updated.id ? updated : x))),
    );
  }
}
