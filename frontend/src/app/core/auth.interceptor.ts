import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Adds the JWT to every API request and logs out when the token is rejected. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Not our API (e.g. /i18n/en.json): no token needed. Returning BEFORE inject(AuthService) also
  // means loading translations never depends on AuthService (avoids a circular dependency).
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthService);
  const token = auth.accessToken;
  const isAuthCall = req.url.includes('/auth/login/') || req.url.includes('/auth/register/');
  const request = token && !isAuthCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      // TODO: refresh the token with /auth/token/refresh/ instead of logging out
      if (err.status === 401 && !isAuthCall) auth.logout();
      return throwError(() => err);
    }),
  );
};
