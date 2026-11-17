import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { Lang, ProfileForm, User } from './models';

// NOTE: do NOT inject LanguageService/TranslateService here. The HTTP interceptor injects AuthService,
// and TranslateService makes an HTTP request while it is being created -> circular dependency ->
// en.json never loads and the UI shows raw keys. Pages switch the language themselves.

const ACCESS_KEY = 'nutriscan.access';
const REFRESH_KEY = 'nutriscan.refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/auth`;

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isNutritionist = computed(() => this.user()?.role === 'nutritionist');
  /** Start page for the current role: nutritionists work with clients, users with their own dashboard. */
  readonly homeUrl = computed(() => (this.isNutritionist() ? '/clients' : '/dashboard'));

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<{ access: string; refresh: string }>(`${this.api}/login/`, { username, password })
      .pipe(
        tap((tokens) => {
          localStorage.setItem(ACCESS_KEY, tokens.access);
          localStorage.setItem(REFRESH_KEY, tokens.refresh);
        }),
        switchMap(() => this.loadMe()),
      );
  }

  register(data: { username: string; email: string; password: string; preferred_language: Lang }) {
    return this.http.post(`${this.api}/register/`, data);
  }

  loadMe(): Observable<User> {
    return this.http.get<User>(`${this.api}/me/`).pipe(tap((u) => this.user.set(u)));
  }

  updateMe(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.api}/me/`, data).pipe(tap((u) => this.user.set(u)));
  }

  /** Saves the profile form. Multipart because it can contain the avatar file. */
  updateProfile(data: ProfileForm, avatar: File | null): Observable<User> {
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) form.append(key, value);
    if (avatar) form.append('avatar', avatar);
    return this.http.patch<User>(`${this.api}/me/`, form).pipe(tap((u) => this.user.set(u)));
  }

  /** Remembers the language in the profile (if logged in), so the next login uses it. */
  savePreferredLanguage(code: Lang): void {
    const user = this.user();
    if (user && user.preferred_language !== code) {
      this.updateMe({ preferred_language: code }).subscribe({ error: () => {} }); // not critical if it fails
    }
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
