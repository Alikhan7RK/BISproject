import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { Lang, User } from './models';

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

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
