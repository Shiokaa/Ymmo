import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { UserResponseDto } from '../models/user.model';

/** Seul un ADMIN accède à la ressource. */
function isAdmin(user: UserResponseDto | null): boolean {
  return user?.role === 'ADMIN';
}

/**
 * Protège les ressources réservées aux ADMIN.
 * Si l'utilisateur courant n'est pas encore chargé, on interroge `/auth/me`.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const current = authService.currentUser();
  if (current) {
    return isAdmin(current) ? true : router.createUrlTree(['/']);
  }

  return authService.me().pipe(
    map((user) => (isAdmin(user) ? true : router.createUrlTree(['/']))),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};
