import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from './auth.service';

/** Lets the route open only for logged-in users. Loads the profile after a page refresh. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  if (!auth.accessToken) return router.createUrlTree(['/login']);
  return auth.loadMe().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

export const nutritionistGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isNutritionist() ? true : inject(Router).createUrlTree(['/dashboard']);
};
