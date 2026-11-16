import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { LanguageService } from '../../core/language.service';
import { Dish, DishCategory } from '../../core/models';

@Component({
  selector: 'app-dishes',
  imports: [FormsModule, TranslatePipe],
  template: `
    <h1>{{ 'nav.dishes' | translate }}</h1>
    <div class="card row">
      <input style="flex: 2" [placeholder]="'common.searchPlaceholder' | translate" [(ngModel)]="query" (input)="load()" />
      <select style="flex: 1" [(ngModel)]="category" (change)="load()">
        <option [ngValue]="undefined">{{ 'dishes.allCategories' | translate }}</option>
        @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ lang.localName(c) }}</option> }
      </select>
    </div>
    <div class="grid">
      @for (d of dishes(); track d.id) {
        <div class="card">
          <h2>{{ lang.localName(d) }}</h2>
          <p class="muted">{{ lang.localName(d.category) }}</p>
          <p><strong>{{ d.calories }}</strong> kcal / 100 g</p>
          <p class="muted">P {{ d.protein }} · F {{ d.fat }} · C {{ d.carbs }}</p>
        </div>
      } @empty {
        <p class="muted">{{ 'common.nothingFound' | translate }}</p>
      }
    </div>
  `,
})
export class DishesPage implements OnInit {
  protected lang = inject(LanguageService);
  private api = inject(ApiService);

  query = '';
  category: number | undefined;
  dishes = signal<Dish[]>([]);
  categories = signal<DishCategory[]>([]);

  ngOnInit(): void {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.load();
  }

  load(): void {
    this.api.dishes(this.query, this.category).subscribe((page) => this.dishes.set(page.results));
  }
}
