import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { NutritionGoal, ProfileForm, PublicUser } from '../../core/models';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB, same limit as the backend

/**
 * Profile: personal info + avatar, interface language, choice of nutritionist (regular users only)
 * and the nutrition goal.
 */
@Component({
  selector: 'app-profile',
  imports: [FormsModule, TranslatePipe],
  template: `
    <h1>{{ 'nav.profile' | translate }}</h1>

    @if (auth.user(); as u) {
      <div class="card">
        <div class="row" style="margin-bottom: 16px">
          @if (avatarUrl(); as url) {
            <img class="avatar" [src]="url" alt="" style="width: 72px; height: 72px" />
          } @else {
            <span class="avatar" style="width: 72px; height: 72px; font-size: 28px">{{ u.username[0].toUpperCase() }}</span>
          }
          <div>
            <p style="margin: 0"><strong>{{ u.username }}</strong> · {{ 'role.' + u.role | translate }}</p>
            <label style="margin: 8px 0 0">{{ 'profile.avatar' | translate }}
              <input type="file" accept="image/*" (change)="onAvatar($event)" />
            </label>
            <span class="muted" style="font-size: 13px">{{ 'profile.avatarHint' | translate }}</span>
          </div>
        </div>

        <div class="grid">
          <label>{{ 'profile.firstName' | translate }}<input [(ngModel)]="form.first_name" maxlength="150" /></label>
          <label>{{ 'profile.lastName' | translate }}<input [(ngModel)]="form.last_name" maxlength="150" /></label>
          <label>{{ 'profile.email' | translate }}<input type="email" [(ngModel)]="form.email" /></label>
          <label>{{ 'profile.language' | translate }}
            <select [(ngModel)]="form.preferred_language">
              @for (l of lang.languages; track l.code) { <option [value]="l.code">{{ l.label }}</option> }
            </select>
          </label>
        </div>
        <label>{{ 'profile.bio' | translate }}<textarea [(ngModel)]="form.bio" rows="3"></textarea></label>

        <button class="btn" type="button" (click)="saveProfile()" [disabled]="savingProfile()">
          {{ 'common.save' | translate }}
        </button>
        @if (profileSaved()) { <span class="muted"> ✓ {{ 'common.saved' | translate }}</span> }
        @if (profileError()) { <p class="error">{{ profileError() | translate }}</p> }
      </div>

      <!-- Choosing a nutritionist: regular users only -->
      @if (!auth.isNutritionist()) {
        <div class="card">
          <h2>{{ 'profile.myNutritionist' | translate }}</h2>
          @if (u.nutritionist_detail; as n) {
            <div class="row">
              @if (n.avatar) { <img class="avatar" [src]="n.avatar" alt="" style="width: 40px; height: 40px" /> }
              <div>
                <strong>{{ fullName(n) }}</strong>
                @if (n.bio) { <div class="muted">{{ n.bio }}</div> }
              </div>
            </div>
          } @else {
            <p class="muted">{{ 'profile.noNutritionist' | translate }}</p>
          }
          @if (!pickerOpen()) {
            <button class="btn secondary" type="button" style="margin-top: 12px" (click)="openPicker()">
              {{ (u.nutritionist ? 'profile.change' : 'profile.chooseNutritionist') | translate }}
            </button>
          } @else {
            <label style="margin-top: 12px">{{ 'profile.searchNutritionist' | translate }}
              <input type="search" [(ngModel)]="query" (ngModelChange)="searchNutritionists()"
                     [placeholder]="'common.searchPlaceholder' | translate" />
            </label>
            @for (n of nutritionists(); track n.id) {
              <div class="row" style="justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border)">
                <div>
                  <strong>{{ fullName(n) }}</strong>
                  @if (n.bio) { <div class="muted">{{ n.bio }}</div> }
                </div>
                <button class="btn" type="button" (click)="chooseNutritionist(n)" [disabled]="n.id === u.nutritionist">
                  {{ 'profile.choose' | translate }}
                </button>
              </div>
            } @empty {
              <p class="muted">{{ 'common.nothingFound' | translate }}</p>
            }
          }
          @if (nutritionistError()) { <p class="error">{{ 'profile.saveError' | translate }}</p> }
        </div>
      }
    }

    @if (goal(); as g) {
      <div class="card">
        <h2>{{ 'profile.goal' | translate }}</h2>
        <div class="grid">
          <label>{{ 'profile.goalType' | translate }}
            <select [(ngModel)]="g.goal_type">
              <option value="lose">{{ 'goal.lose' | translate }}</option>
              <option value="keep">{{ 'goal.keep' | translate }}</option>
              <option value="gain">{{ 'goal.gain' | translate }}</option>
            </select>
          </label>
          <label>{{ 'common.kcal' | translate }} / {{ 'profile.day' | translate }}<input type="number" [(ngModel)]="g.daily_calories" /></label>
          <label>{{ 'nutrients.protein' | translate }}, {{ 'common.g' | translate }}<input type="number" [(ngModel)]="g.daily_protein" /></label>
          <label>{{ 'nutrients.fat' | translate }}, {{ 'common.g' | translate }}<input type="number" [(ngModel)]="g.daily_fat" /></label>
          <label>{{ 'nutrients.carbs' | translate }}, {{ 'common.g' | translate }}<input type="number" [(ngModel)]="g.daily_carbs" /></label>
        </div>
        <button class="btn" type="button" (click)="save(g)">{{ 'common.save' | translate }}</button>
        @if (saved()) { <span class="muted"> ✓ {{ 'common.saved' | translate }}</span> }
      </div>
    }
  `,
})
export class ProfilePage implements OnInit {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
  private api = inject(ApiService);

  goal = signal<NutritionGoal | null>(null);
  saved = signal(false);

  // Personal info form (a copy of the user, saved with the Save button)
  form: ProfileForm = { first_name: '', last_name: '', email: '', bio: '', preferred_language: 'en' };
  avatarFile: File | null = null;
  avatarUrl = signal<string | null>(null); // the saved avatar, or a preview of the new file
  savingProfile = signal(false);
  profileSaved = signal(false);
  profileError = signal(''); // translation key ('' = no error)

  // Nutritionist picker
  pickerOpen = signal(false);
  query = '';
  nutritionists = signal<PublicUser[]>([]);
  nutritionistError = signal(false);

  ngOnInit(): void {
    const u = this.auth.user(); // always loaded here: authGuard runs before this page
    if (u) {
      this.form = {
        first_name: u.first_name, last_name: u.last_name, email: u.email,
        bio: u.bio, preferred_language: u.preferred_language,
      };
      this.avatarUrl.set(u.avatar);
    }
    this.api.goal().subscribe((g) => this.goal.set(g));
  }

  /** Check the photo in the browser first (the backend checks it again). */
  onAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.profileError.set('');
    if (file && (!file.type.startsWith('image/') || file.size > MAX_AVATAR_BYTES)) {
      this.profileError.set('profile.avatarInvalid');
      this.avatarFile = null;
      return;
    }
    this.avatarFile = file;
    this.avatarUrl.set(file ? URL.createObjectURL(file) : (this.auth.user()?.avatar ?? null));
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.profileSaved.set(false);
    this.profileError.set('');
    this.auth.updateProfile(this.form, this.avatarFile).subscribe({
      next: (u) => {
        this.lang.use(u.preferred_language); // switch the UI language right away
        this.avatarFile = null;
        this.avatarUrl.set(u.avatar);
        this.profileSaved.set(true);
        this.savingProfile.set(false);
      },
      error: (err) => {
        // Show a specific message for the two fields the backend validates the most
        const field = err.error?.avatar ? 'profile.avatarInvalid' : err.error?.email ? 'profile.emailInvalid' : 'profile.saveError';
        this.profileError.set(field);
        this.savingProfile.set(false);
      },
    });
  }

  openPicker(): void {
    this.pickerOpen.set(true);
    this.searchNutritionists();
  }

  searchNutritionists(): void {
    const term = this.query;
    this.api.nutritionists(term).subscribe((page) => {
      if (term === this.query) this.nutritionists.set(page.results); // ignore late answers
    });
  }

  chooseNutritionist(n: PublicUser): void {
    this.nutritionistError.set(false);
    this.auth.updateMe({ nutritionist: n.id }).subscribe({
      next: () => this.pickerOpen.set(false),
      error: () => this.nutritionistError.set(true),
    });
  }

  fullName(u: PublicUser): string {
    return `${u.first_name} ${u.last_name}`.trim() || u.username;
  }

  save(g: NutritionGoal): void {
    this.api.updateGoal(g).subscribe(() => this.saved.set(true));
  }
}
