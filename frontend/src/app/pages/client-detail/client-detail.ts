import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { LanguageService } from '../../core/language.service';
import { Client, Meal, Recommendation } from '../../core/models';

const DAYS = 7; // how many days of meals the nutritionist sees

/** One day on the page: its meals and the total calories. */
interface DayGroup {
  date: Date;
  meals: Meal[];
  total: number;
}

/** "YYYY-MM-DD" of a date in the browser's time zone (used to group meals by day). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Nutritionist: one client (/clients/:id).
 * Shows the client's meals for the last 7 days grouped by day, and a form to write a recommendation.
 * The backend returns 404 if this user is not my client.
 */
@Component({
  selector: 'app-client-detail',
  imports: [FormsModule, RouterLink, TranslatePipe, DatePipe, DecimalPipe],
  template: `
    <a routerLink="/clients" class="muted">← {{ 'clients.back' | translate }}</a>

    @if (notFound()) {
      <p class="error">{{ 'clients.notFound' | translate }}</p>
    }

    @if (client(); as c) {
      <h1 style="margin-top: 12px">{{ c.first_name || c.username }} {{ c.last_name }}</h1>

      <div class="card">
        <h2>{{ 'clients.lastDays' | translate: { days: days } }}</h2>
        @for (g of groups(); track g.date.getTime()) {
          <div style="margin-bottom: 14px">
            <div class="row" style="justify-content: space-between; border-bottom: 1px solid var(--border)">
              <strong>{{ g.date | date: 'dd.MM.yyyy' }}</strong>
              <!-- daily total, red when above the client's goal -->
              <span [class.error]="g.total > c.daily_calories">
                {{ 'clients.total' | translate }}: <strong>{{ g.total | number: '1.0-0' }}</strong> / {{ c.daily_calories }} {{ 'common.kcal' | translate }}
              </span>
            </div>
            @for (m of g.meals; track m.id) {
              <div class="row" style="justify-content: space-between; padding: 4px 0">
                <span>{{ 'mealType.' + m.meal_type | translate }} · {{ lang.localName(m.dish_detail) }} · {{ m.portion_grams }} g</span>
                <span class="muted">{{ m.calories | number: '1.0-0' }} {{ 'common.kcal' | translate }} · {{ m.eaten_at | date: 'HH:mm' }}</span>
              </div>
            } @empty {
              <p class="muted" style="margin: 4px 0">{{ 'clients.noMealsDay' | translate }}</p>
            }
          </div>
        }
      </div>

      <div class="card">
        <h2>{{ 'clients.writeRec' | translate }}</h2>
        <label>{{ 'clients.recTitle' | translate }}
          <input [(ngModel)]="title" maxlength="200" />
        </label>
        <label>{{ 'clients.recText' | translate }}
          <textarea [(ngModel)]="text" rows="4"></textarea>
        </label>
        <button class="btn" type="button" (click)="send()" [disabled]="sending() || !title.trim() || !text.trim()">
          {{ 'clients.send' | translate }}
        </button>
        @if (sent()) { <p style="color: var(--primary)">{{ 'clients.sent' | translate }}</p> }
        @if (sendError()) { <p class="error">{{ 'clients.sendError' | translate }}</p> }
      </div>

      <div class="card">
        <h2>{{ 'clients.recList' | translate }}</h2>
        @for (r of recommendations(); track r.id) {
          <div style="padding: 8px 0; border-bottom: 1px solid var(--border)">
            <strong>{{ r.title }}</strong>
            <span class="muted"> · {{ r.created_at | date: 'dd.MM.yyyy' }}
              · {{ (r.is_read ? 'clients.read' : 'clients.unread') | translate }}</span>
            <p style="margin: 4px 0; white-space: pre-line">{{ r.text }}</p>
          </div>
        } @empty {
          <p class="muted">{{ 'common.nothingFound' | translate }}</p>
        }
      </div>
    }
  `,
})
export class ClientDetailPage implements OnInit {
  protected lang = inject(LanguageService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly days = DAYS;
  private clientId = Number(this.route.snapshot.paramMap.get('id'));

  client = signal<Client | null>(null);
  notFound = signal(false);
  meals = signal<Meal[]>([]);
  recommendations = signal<Recommendation[]>([]);

  // Form state
  title = '';
  text = '';
  sending = signal(false);
  sent = signal(false);
  sendError = signal(false);

  /** Meals grouped by day: one group for EVERY day of the period (empty days too), newest first. */
  groups = computed<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    const byKey = new Map<string, DayGroup>();
    for (let i = 0; i < DAYS; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const group = { date, meals: [], total: 0 };
      groups.push(group);
      byKey.set(dayKey(date), group);
    }
    for (const meal of this.meals()) {
      const group = byKey.get(dayKey(new Date(meal.eaten_at)));
      if (group) {
        group.meals.push(meal);
        group.total += meal.calories;
      }
    }
    return groups;
  });

  ngOnInit(): void {
    this.api.client(this.clientId).subscribe({
      next: (c) => this.client.set(c),
      error: () => this.notFound.set(true), // 404: not my client (or no such user)
    });
    this.api.clientMeals(this.clientId, DAYS).subscribe((meals) => this.meals.set(meals));
    this.api.recommendations(this.clientId).subscribe((page) => this.recommendations.set(page.results));
  }

  send(): void {
    this.sending.set(true);
    this.sent.set(false);
    this.sendError.set(false);
    this.api.createRecommendation({ client: this.clientId, title: this.title.trim(), text: this.text.trim() })
      .subscribe({
        next: (rec) => {
          this.recommendations.update((list) => [rec, ...list]); // newest on top
          this.title = '';
          this.text = '';
          this.sent.set(true);
          this.sending.set(false);
        },
        error: () => {
          this.sendError.set(true);
          this.sending.set(false);
        },
      });
  }
}
