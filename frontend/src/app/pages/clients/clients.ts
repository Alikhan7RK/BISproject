import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { PublicUser } from '../../core/models';

// TODO: open a client -> see their meals (api.clientMeals) and write a recommendation (api.createRecommendation)
@Component({
  selector: 'app-clients',
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'nav.clients' | translate }}</h1>
    <div class="grid">
      @for (c of clients(); track c.id) {
        <div class="card">
          <h2>{{ c.first_name || c.username }} {{ c.last_name }}</h2>
          <p class="muted">{{ c.username }}</p>
        </div>
      } @empty {
        <p class="muted">{{ 'common.nothingFound' | translate }}</p>
      }
    </div>
  `,
})
export class ClientsPage implements OnInit {
  private api = inject(ApiService);
  clients = signal<PublicUser[]>([]);

  ngOnInit(): void {
    this.api.clients().subscribe((page) => this.clients.set(page.results));
  }
}
