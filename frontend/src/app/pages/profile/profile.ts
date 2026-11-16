import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { NutritionGoal } from '../../core/models';

// TODO: edit name/email/bio/avatar, choose a nutritionist
@Component({
  selector: 'app-profile',
  imports: [FormsModule, TranslatePipe],
  template: `
    <h1>{{ 'nav.profile' | translate }}</h1>
    @if (auth.user(); as u) {
      <div class="card">
        <p><strong>{{ u.username }}</strong> · {{ 'role.' + u.role | translate }}</p>
        <p class="muted">{{ u.email }}</p>
      </div>
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
          <label>kcal / {{ 'profile.day' | translate }}<input type="number" [(ngModel)]="g.daily_calories" /></label>
          <label>{{ 'nutrients.protein' | translate }}, g<input type="number" [(ngModel)]="g.daily_protein" /></label>
          <label>{{ 'nutrients.fat' | translate }}, g<input type="number" [(ngModel)]="g.daily_fat" /></label>
          <label>{{ 'nutrients.carbs' | translate }}, g<input type="number" [(ngModel)]="g.daily_carbs" /></label>
        </div>
        <button class="btn" type="button" (click)="save(g)">{{ 'common.save' | translate }}</button>
        @if (saved()) { <span class="muted"> ✓ {{ 'common.saved' | translate }}</span> }
      </div>
    }
  `,
})
export class ProfilePage implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(ApiService);
  goal = signal<NutritionGoal | null>(null);
  saved = signal(false);

  ngOnInit(): void {
    this.api.goal().subscribe((g) => this.goal.set(g));
  }

  save(g: NutritionGoal): void {
    this.api.updateGoal(g).subscribe(() => this.saved.set(true));
  }
}
