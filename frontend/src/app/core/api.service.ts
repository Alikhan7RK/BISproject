import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import {
  DayCalories,
  DaySummary,
  Dish,
  DishCategory,
  GlobalSearchResult,
  Meal,
  MealType,
  NutritionGoal,
  Paginated,
  Prediction,
  PublicUser,
  Recommendation,
} from './models';

/** All calls to the NutriScan REST API in one place. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // Dishes
  categories() {
    return this.http.get<DishCategory[]>(`${this.api}/categories/`);
  }
  dishes(search = '', category?: number) {
    let params = new HttpParams().set('search', search);
    if (category) params = params.set('category', category);
    return this.http.get<Paginated<Dish>>(`${this.api}/dishes/`, { params });
  }

  // Meals
  meals(date?: string, search = '') {
    let params = new HttpParams().set('search', search);
    if (date) params = params.set('date', date);
    return this.http.get<Paginated<Meal>>(`${this.api}/meals/`, { params });
  }
  createMeal(data: {
    dish: number;
    portion_grams: number;
    meal_type: MealType;
    eaten_at: string;
    ai_confidence?: number | null;
    photo?: File | null;
  }) {
    const form = new FormData();
    form.append('dish', String(data.dish));
    form.append('portion_grams', String(data.portion_grams));
    form.append('meal_type', data.meal_type);
    form.append('eaten_at', data.eaten_at);
    if (data.ai_confidence != null) form.append('ai_confidence', String(data.ai_confidence));
    if (data.photo) form.append('photo', data.photo);
    return this.http.post<Meal>(`${this.api}/meals/`, form);
  }
  deleteMeal(id: number) {
    return this.http.delete(`${this.api}/meals/${id}/`);
  }
  summary(date?: string) {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<DaySummary>(`${this.api}/meals/summary/`, { params });
  }
  /** Calories per day for the last `days` days, oldest first. */
  weekly(days = 7) {
    return this.http.get<DayCalories[]>(`${this.api}/meals/weekly/`, {
      params: new HttpParams().set('days', days),
    });
  }

  // Goal
  goal() {
    return this.http.get<NutritionGoal>(`${this.api}/goal/`);
  }
  updateGoal(data: Partial<NutritionGoal>) {
    return this.http.patch<NutritionGoal>(`${this.api}/goal/`, data);
  }

  // AI food recognition
  recognize(photo: File) {
    const form = new FormData();
    form.append('photo', photo);
    return this.http.post<{ predictions: Prediction[] }>(`${this.api}/ml/recognize/`, form);
  }
  modelStatus() {
    return this.http.get<{ ready: boolean; classes?: number; detail?: string }>(`${this.api}/ml/status/`);
  }

  // Recommendations & nutritionists
  recommendations() {
    return this.http.get<Paginated<Recommendation>>(`${this.api}/recommendations/`);
  }
  createRecommendation(data: { client: number; title: string; text: string }) {
    return this.http.post<Recommendation>(`${this.api}/recommendations/`, data);
  }
  markRecommendationRead(id: number) {
    return this.http.post<Recommendation>(`${this.api}/recommendations/${id}/mark_read/`, {});
  }
  nutritionists(search = '') {
    return this.http.get<Paginated<PublicUser>>(`${this.api}/auth/nutritionists/`, {
      params: new HttpParams().set('search', search),
    });
  }
  clients() {
    return this.http.get<Paginated<PublicUser>>(`${this.api}/clients/`);
  }
  clientMeals(clientId: number) {
    return this.http.get<Paginated<Meal>>(`${this.api}/clients/${clientId}/meals/`);
  }

  // Global search: dishes, my meals, nutritionists
  search(q: string) {
    return this.http.get<GlobalSearchResult>(`${this.api}/search/`, { params: new HttpParams().set('q', q) });
  }
}
