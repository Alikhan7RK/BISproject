import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { LanguageService } from '../../core/language.service';
import { Dish, MealType, Prediction } from '../../core/models';

/**
 * Below this confidence the AI's best guess is NOT pre-selected: the user sees a warning
 * and chooses the dish. 0.5 was too low (a 50% "fried rice" was auto-selected on real photos).
 */
const MIN_CONFIDENCE = 0.6;

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
      <!-- error() holds a translation key, so the message follows the selected language -->
      @if (error()) { <p class="error">{{ error() | translate }}</p> }
    </div>

    <!-- The model always answers with one of its 20 classes, so a weak guess gets a warning instead of auto-select -->
    @if (lowConfidence()) {
      <div class="card" style="border-color: #e0a800; background: #fff8e1">
        {{ 'addMeal.lowConfidence' | translate }}
      </div>
    }

    <!-- Step 2 is shown after recognition, or when the manual search is open (e.g. the model is not ready) -->
    @if (predictions().length || manualOpen()) {
      <div class="card">
        <h2>2. {{ 'addMeal.choose' | translate }}</h2>
        @for (p of predictions(); track p.label) {
          <label class="row">
            <input type="radio" name="pred" style="width: auto" [disabled]="!p.dish"
                   [checked]="selected()?.id === p.dish?.id" (change)="select(p.dish, p.confidence)" />
            <span>
              <strong>{{ p.dish ? lang.localName(p.dish) : p.label }}</strong>
              — {{ p.confidence | percent: '1.0-0' }}
              @if (p.dish) { <span class="muted">· {{ p.dish.calories }} {{ 'addMeal.kcalPer100' | translate }}</span> }
              @else { <span class="muted">· {{ 'addMeal.notInCatalog' | translate }}</span> }
            </span>
          </label>
        }

        <!-- Always visible: the user can overrule the AI even when it is confident (plov -> "pizza 98%") -->
        <button class="btn secondary" type="button" (click)="openManual()">
          {{ 'addMeal.chooseManually' | translate }}
        </button>

        @if (manualOpen()) {
          <label style="margin-top: 12px">{{ 'addMeal.searchDish' | translate }}
            <input type="search" [(ngModel)]="query" (ngModelChange)="searchDishes()"
                   [placeholder]="'common.searchPlaceholder' | translate" />
          </label>
          @for (d of results(); track d.id) {
            <div class="row" style="margin-bottom: 8px">
              <button class="btn secondary" type="button" (click)="select(d, null)">
                {{ lang.localName(d) }}
              </button>
              <span class="muted">{{ d.calories }} {{ 'addMeal.kcalPer100' | translate }}</span>
            </div>
          } @empty {
            <p class="muted">{{ 'common.nothingFound' | translate }}</p>
          }
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
  error = signal(''); // translation key of the error message ('' = no error)

  // Low confidence + manual search state
  lowConfidence = signal(false);
  manualOpen = signal(false);
  query = '';
  results = signal<Dish[]>([]);

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.file = file;
    // A new photo starts everything from scratch
    this.predictions.set([]);
    this.selected.set(null);
    this.confidence = null;
    this.error.set('');
    this.lowConfidence.set(false);
    this.manualOpen.set(false);
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  recognize(): void {
    if (!this.file) return;
    this.loading.set(true);
    this.error.set('');
    this.lowConfidence.set(false);
    this.selected.set(null);
    this.api.recognize(this.file).subscribe({
      next: (res) => {
        this.predictions.set(res.predictions);
        const best = res.predictions[0]; // predictions come sorted, the first one is the most likely
        if (best && best.confidence >= MIN_CONFIDENCE) {
          this.select(best.dish, best.confidence); // sure enough -> pre-select it
        } else {
          this.lowConfidence.set(true); // not sure -> warn and let the user choose
          this.openManual();
        }
        this.loading.set(false);
      },
      error: (err) => {
        // 503 = weights are missing or torch is not installed on the server
        this.error.set(err.status === 503 ? 'addMeal.modelNotReady' : 'addMeal.recognizeFailed');
        this.predictions.set([]);
        this.openManual(); // the user can still add the meal without the AI
        this.loading.set(false);
      },
    });
  }

  /** confidence = the AI's confidence, or null when the user picked the dish manually. */
  select(dish: Dish | null, confidence: number | null): void {
    if (!dish) return;
    this.selected.set(dish);
    this.confidence = confidence;
    this.portion = dish.default_portion_grams;
  }

  /** Opens the manual search and shows the start of the catalog. */
  openManual(): void {
    this.manualOpen.set(true);
    this.searchDishes();
  }

  /** Runs on every keystroke in the search box. */
  searchDishes(): void {
    const term = this.query;
    this.api.dishes(term).subscribe((page) => {
      // Ignore a slow answer if the user has typed something else since then
      if (term === this.query) this.results.set(page.results);
    });
  }

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
