// Types that mirror the Django REST API responses.

export type Role = 'user' | 'nutritionist' | 'admin';
export type Lang = 'en' | 'ru' | 'kk';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  preferred_language: Lang;
  avatar: string | null;
  bio: string;
  nutritionist: number | null;
  nutritionist_detail: PublicUser | null; // read only: name/avatar of the chosen nutritionist
}

/** Fields the user edits on the profile page (sent as multipart, together with the avatar file). */
export interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  preferred_language: Lang;
}

export interface PublicUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string;
}

/** A nutritionist's client (GET /api/clients/ and /api/clients/:id/) */
export interface Client extends PublicUser {
  today_calories: number;
  daily_calories: number; // the client's goal
}

export interface DishCategory {
  id: number;
  name_en: string;
  name_ru: string;
  name_kk: string;
}

export interface Dish {
  id: number;
  category: DishCategory;
  name_en: string;
  name_ru: string;
  name_kk: string;
  ml_label: string | null;
  calories: string; // DecimalField comes as string, per 100 g
  protein: string;
  fat: string;
  carbs: string;
  default_portion_grams: number;
  image: string | null;
}

export interface Meal {
  id: number;
  dish: number;
  dish_detail: Dish;
  meal_type: MealType;
  portion_grams: number;
  photo: string | null;
  ai_confidence: number | null;
  note: string;
  eaten_at: string;
  created_at: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface NutritionGoal {
  goal_type: 'lose' | 'keep' | 'gain';
  daily_calories: number;
  daily_protein: number;
  daily_fat: number;
  daily_carbs: number;
  weight_kg: string | null;
  updated_at: string;
}

export interface DaySummary {
  date: string;
  meals_count: number;
  totals: { calories: number; protein: number; fat: number; carbs: number };
  goal: NutritionGoal;
}

/** One day of GET /api/meals/weekly/ */
export interface DayCalories {
  date: string; // YYYY-MM-DD
  calories: number;
  goal: number;
}

export interface Prediction {
  label: string;
  confidence: number;
  dish: Dish | null;
}

export interface Recommendation {
  id: number;
  nutritionist: number;
  nutritionist_name: string;
  client: number;
  client_name: string;
  title: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface GlobalSearchResult {
  dishes: Dish[];
  meals: Meal[];
  nutritionists: PublicUser[];
}
