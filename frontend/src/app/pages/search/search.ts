import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { LanguageService } from '../../core/language.service';
import { GlobalSearchResult } from '../../core/models';

/** One search box over 3 entity types: dishes, my meals, nutritionists. */
@Component({
  selector: 'app-search',
  imports: [FormsModule, TranslatePipe, DatePipe],
  template: `
    <h1>{{ 'nav.search' | translate }}</h1>
    <div class="card">
      <input [placeholder]="'common.searchPlaceholder' | translate" [(ngModel)]="query" (input)="input$.next(query)" />
    </div>

    @if (result(); as r) {
      <div class="card">
        <h2>{{ 'nav.dishes' | translate }} ({{ r.dishes.length }})</h2>
        @for (d of r.dishes; track d.id) { <div>{{ lang.localName(d) }} · {{ d.calories }} {{ 'common.kcalPer100' | translate }}</div> }
      </div>
      <div class="card">
        <h2>{{ 'search.myMeals' | translate }} ({{ r.meals.length }})</h2>
        @for (m of r.meals; track m.id) {
          <div>{{ m.eaten_at | date: 'dd.MM.yyyy' }} · {{ lang.localName(m.dish_detail) }}</div>
        }
      </div>
      <div class="card">
        <h2>{{ 'search.nutritionists' | translate }} ({{ r.nutritionists.length }})</h2>
        @for (n of r.nutritionists; track n.id) { <div>{{ n.first_name }} {{ n.last_name }} ({{ n.username }})</div> }
      </div>
    }
  `,
})
export class SearchPage implements OnInit {
  protected lang = inject(LanguageService);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  query = '';
  input$ = new Subject<string>();
  result = signal<GlobalSearchResult | null>(null);

  ngOnInit(): void {
    this.input$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => this.api.search(q)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => this.result.set(r));
  }
}
