import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { LanguageService } from '../../core/language.service';
import { Dish, MealType, Prediction } from '../../core/models';

/**
 * The main AI feature:
 * 1. user picks a photo  2. backend model returns top-3 dishes
 * 3. user confirms one (or searches manually)  4. meal is saved.
 */
@Component({
  selector: 'app-add-meal',
  imports: [FormsModule, TranslatePipe, DecimalPipe, PercentPipe],
  template: `
    <h1>{{ 'addMeal.title' | translate }}</h1>

    <div class="card">
      <h2>1. {{ 'addMeal.photo' | translate }}</h2>
      <input type="file" accept="image/*" (change)="onFile($event)" />
      @if (previewUrl()) {
        <img [src]="previewUrl()" alt="meal" style="max-width: 320px; margin-top: 12px; border-radius: 12px" />
        <div style="margin-top: 12px">
          <button class="btn" type="button" (click)="recognize()" [disabled]="loading()">
            {{ (loading() ? 'addMeal.recognizing' : 'addMeal.recognize') | translate }}
          </button>
        </div>
      }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </div>

    @if (predictions().length) {
      <div class="card">
        <h2>2. {{ 'addMeal.choose' | translate }}</h2>
        @for (p of predictions(); track p.label) {
          <label class="row">
            <input type="radio" name="pred" style="width: auto" [disabled]="!p.dish"
                   [checked]="selected()?.id === p.dish?.id" (change)="select(p.dish, p.confidence)" />
            <span>
              <strong>{{ p.dish ? lang.localName(p.dish) : p.label }}</strong>
              — {{ p.confidence | percent: '1.0-0' }}
              @if (p.dish) { <span class="muted">· {{ p.dish.calories }} kcal / 100 g</span> }
              @else { <span class="muted">· {{ 'addMeal.notInCatalog' | translate }}</span> }
            </span>
          </label>
        }
      </div>
    }

    @if (selected(); as dish) {
      <div class="card">
        <h2>3. {{ 'addMeal.confirm' | translate }}</h2>
        <div class="grid">
          <label>{{ 'addMeal.portion' | translate }}
            <input type="number" min="10" step="10" [(ngModel)]="portion" />
          </label>
          <label>{{ 'addMeal.mealType' | translate }}
            <select [(ngModel)]="mealType">
              @for (t of mealTypes; track t) { <option [value]="t">{{ 'mealType.' + t | translate }}</option> }
            </select>
          </label>
        </div>
        <p>
          {{ lang.localName(dish) }}: <strong>{{ +dish.calories * portion / 100 | number: '1.0-0' }} kcal</strong>
        </p>
        <button class="btn" type="button" (click)="save()" [disabled]="saving()">{{ 'common.save' | translate }}</button>
      </div>
    }
  `,
})
export class AddMealPage {
  protected lang = inject(LanguageService);
  private api = inject(ApiService);
  private router = inject(Router);

  readonly mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  file: File | null = null;
  previewUrl = signal<string | null>(null);
  predictions = signal<Prediction[]>([]);
  selected = signal<Dish | null>(null);
  confidence: number | null = null;
  portion = 250;
  mealType: MealType = 'lunch';
  loading = signal(false);
  saving = signal(false);
  error = signal('');

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.file = file;
    this.predictions.set([]);
    this.selected.set(null);
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  recognize(): void {
    if (!this.file) return;
    this.loading.set(true);
    this.error.set('');
    this.api.recognize(this.file).subscribe({
      next: (res) => {
        this.predictions.set(res.predictions);
        const best = res.predictions.find((p) => p.dish);
        if (best) this.select(best.dish, best.confidence);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail ?? 'Recognition failed');
        this.loading.set(false);
      },
    });
  }

  select(dish: Dish | null, confidence: number | null): void {
    if (!dish) return;
    this.selected.set(dish);
    this.confidence = confidence;
    this.portion = dish.default_portion_grams;
  }

  // TODO: let the user pick a dish manually from the catalog when the AI is wrong

  save(): void {
    const dish = this.selected();
    if (!dish) return;
    this.saving.set(true);
    this.api
      .createMeal({
        dish: dish.id,
        portion_grams: this.portion,
        meal_type: this.mealType,
        eaten_at: new Date().toISOString(),
        ai_confidence: this.confidence,
        photo: this.file,
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => this.saving.set(false),
      });
  }
}
