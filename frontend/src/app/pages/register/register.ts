import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { switchMap } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="card auth-box">
      <h1>{{ 'auth.registerTitle' | translate }}</h1>
      <form (ngSubmit)="submit()">
        <label>{{ 'auth.username' | translate }}
          <input name="username" [(ngModel)]="username" required />
        </label>
        <label>Email
          <input name="email" type="email" [(ngModel)]="email" />
        </label>
        <label>{{ 'auth.password' | translate }}
          <input name="password" type="password" [(ngModel)]="password" required minlength="8" />
        </label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button class="btn" type="submit" [disabled]="loading()">{{ 'auth.register' | translate }}</button>
      </form>
      <p class="muted">{{ 'auth.haveAccount' | translate }} <a routerLink="/login">{{ 'auth.login' | translate }}</a></p>
    </div>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private lang = inject(LanguageService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    const data = { username: this.username, email: this.email, password: this.password, preferred_language: this.lang.current() };
    this.auth
      .register(data)
      .pipe(switchMap(() => this.auth.login(this.username, this.password)))
      .subscribe({
        next: () => this.router.navigate(['/profile']),
        error: (err) => {
          this.error.set(Object.values(err.error ?? {}).flat().join(' ') || 'Error');
          this.loading.set(false);
        },
      });
  }
}
