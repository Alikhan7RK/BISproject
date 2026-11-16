import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { DaySummary, Meal } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TranslatePipe, DecimalPipe, DatePipe],
  template: `
    <div class="row" style="justify-content: space-between">
      <h1>{{ 'dashboard.hello' | translate: { name: auth.user()?.username } }}</h1>
      <a class="btn" routerLink="/add-meal">+ {{ 'nav.addMeal' | translate }}</a>
    </div>

    @if (summary(); as s) {
      <div class="card">
        <h2>{{ 'dashboard.today' | translate }}</h2>
        <p>
          <strong>{{ s.totals.calories | number: '1.0-0' }}</strong> / {{ s.goal.daily_calories }} kcal
        </p>
        <div class="progress" [class.over]="s.totals.calories > s.goal.daily_calories">
          <div [style.width.%]="percent(s.totals.calories, s.goal.daily_calories)"></div>
        </div>
        <div class="grid" style="margin-top: 16px">
          <div>{{ 'nutrients.protein' | translate }}: {{ s.totals.protein }} / {{ s.goal.daily_protein }} g</div>
          <div>{{ 'nutrients.fat' | translate }}: {{ s.totals.fat }} / {{ s.goal.daily_fat }} g</div>
          <div>{{ 'nutrients.carbs' | translate }}: {{ s.totals.carbs }} / {{ s.goal.daily_carbs }} g</div>
        </div>
      </div>
    }

    <!-- TODO: weekly calories chart (Chart.js is installed) -->

    <div class="card">
      <h2>{{ 'dashboard.todayMeals' | translate }}</h2>
      @for (m of meals(); track m.id) {
        <div class="row" style="justify-content: space-between; padding: 6px 0">
          <span>{{ 'mealType.' + m.meal_type | translate }} · {{ lang.localName(m.dish_detail) }}</span>
          <span class="muted">{{ m.calories | number: '1.0-0' }} kcal · {{ m.eaten_at | date: 'HH:mm' }}</span>
        </div>
      } @empty {
        <p class="muted">{{ 'dashboard.noMeals' | translate }}</p>
      }
    </div>
  `,
})
export class DashboardPage implements OnInit {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
  private api = inject(ApiService);

  summary = signal<DaySummary | null>(null);
  meals = signal<Meal[]>([]);

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.api.summary(today).subscribe((s) => this.summary.set(s));
    this.api.meals(today).subscribe((page) => this.meals.set(page.results));
  }

  percent(value: number, goal: number): number {
    return goal ? Math.min(100, (value / goal) * 100) : 0;
  }
}
