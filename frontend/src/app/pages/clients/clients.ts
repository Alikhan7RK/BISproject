import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { Client } from '../../core/models';

/** Nutritionist: list of my clients with today's calories vs their goal. Click -> /clients/:id */
@Component({
  selector: 'app-clients',
  imports: [TranslatePipe, RouterLink],
  template: `
    <h1>{{ 'nav.clients' | translate }}</h1>
    <div class="grid">
      @for (c of clients(); track c.id) {
        <a class="card" [routerLink]="['/clients', c.id]" style="color: inherit; text-decoration: none">
          <h2>{{ c.first_name || c.username }} {{ c.last_name }}</h2>
          <p class="muted">{{ c.username }}</p>
          <p>
            {{ 'clients.today' | translate }}:
            <strong>{{ c.today_calories }}</strong> / {{ c.daily_calories }} kcal
          </p>
          <div class="progress" [class.over]="c.today_calories > c.daily_calories">
            <div [style.width.%]="percent(c)"></div>
          </div>
        </a>
      } @empty {
        <p class="muted">{{ 'common.nothingFound' | translate }}</p>
      }
    </div>
  `,
})
export class ClientsPage implements OnInit {
  private api = inject(ApiService);
  clients = signal<Client[]>([]);

  ngOnInit(): void {
    this.api.clients().subscribe((page) => this.clients.set(page.results));
  }

  percent(c: Client): number {
    return c.daily_calories ? Math.min(100, (c.today_calories / c.daily_calories) * 100) : 0;
  }
}
