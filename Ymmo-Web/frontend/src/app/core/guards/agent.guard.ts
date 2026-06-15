import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { UserResponseDto } from '../models/user.model';

/** Rôles autorisés à accéder à l'espace professionnel. */
function isPro(user: UserResponseDto | null): boolean {
  return user?.role === 'AGENT' || user?.role === 'ADMIN';
}

/**
 * Protège l'espace agent : réservé aux rôles AGENT et ADMIN.
 * Si l'utilisateur courant n'est pas encore chargé, on interroge `/auth/me`.
 */
export const agentGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const current = authService.currentUser();
  if (current) {
    return isPro(current) ? true : router.createUrlTree(['/']);
  }

  return authService.me().pipe(
    map((user) => (isPro(user) ? true : router.createUrlTree(['/']))),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};
