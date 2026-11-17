import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="card auth-box">
      <h1>{{ 'auth.loginTitle' | translate }}</h1>
      <form (ngSubmit)="submit()">
        <label>{{ 'auth.username' | translate }}
          <input name="username" [(ngModel)]="username" required autocomplete="username" />
        </label>
        <label>{{ 'auth.password' | translate }}
          <input name="password" type="password" [(ngModel)]="password" required autocomplete="current-password" />
        </label>
        @if (error()) { <p class="error">{{ 'auth.loginError' | translate }}</p> }
        <button class="btn" type="submit" [disabled]="loading()">{{ 'auth.login' | translate }}</button>
      </form>
      <p class="muted">{{ 'auth.noAccount' | translate }} <a routerLink="/register">{{ 'auth.register' | translate }}</a></p>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private lang = inject(LanguageService);

  username = '';
  password = '';
  loading = signal(false);
  error = signal(false);

  submit(): void {
    this.loading.set(true);
    this.error.set(false);
    this.auth.login(this.username, this.password).subscribe({
      next: (user) => {
        // Use the language saved in the profile (only at login, so a page refresh
        // keeps whatever the user picked in the navbar)
        this.lang.use(user.preferred_language);
        this.router.navigateByUrl(this.auth.homeUrl()); // /clients for nutritionists
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
