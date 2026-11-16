import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { LanguageService } from '../../core/language.service';
import { Meal } from '../../core/models';

// TODO: date filter, weekly chart, pagination
@Component({
  selector: 'app-history',
  imports: [TranslatePipe, DatePipe, DecimalPipe],
  template: `
    <h1>{{ 'nav.history' | translate }}</h1>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>{{ 'history.date' | translate }}</th>
            <th>{{ 'history.dish' | translate }}</th>
            <th>{{ 'addMeal.mealType' | translate }}</th>
            <th>{{ 'addMeal.portion' | translate }}</th>
            <th>kcal</th>
            <th>AI</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (m of meals(); track m.id) {
            <tr>
              <td>{{ m.eaten_at | date: 'dd.MM.yyyy HH:mm' }}</td>
              <td>{{ lang.localName(m.dish_detail) }}</td>
              <td>{{ 'mealType.' + m.meal_type | translate }}</td>
              <td>{{ m.portion_grams }} g</td>
              <td>{{ m.calories | number: '1.0-0' }}</td>
              <td>{{ m.ai_confidence != null ? (m.ai_confidence * 100 | number: '1.0-0') + '%' : '—' }}</td>
              <td><button class="link" type="button" (click)="remove(m)">{{ 'common.delete' | translate }}</button></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class HistoryPage implements OnInit {
  protected lang = inject(LanguageService);
  private api = inject(ApiService);
  meals = signal<Meal[]>([]);

  ngOnInit(): void {
    this.api.meals().subscribe((page) => this.meals.set(page.results));
  }

  remove(meal: Meal): void {
    this.api.deleteMeal(meal.id).subscribe(() => this.meals.update((list) => list.filter((m) => m.id !== meal.id)));
  }
}
