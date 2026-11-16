import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/** Adds the JWT to every request and logs out when the token is rejected. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
