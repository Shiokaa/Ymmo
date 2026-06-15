import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { AuthService } from '../services/auth.service';

/**
 * Ajoute `withCredentials` aux requêtes vers l'API Ymmo (cookie JWT httpOnly) et
 * purge la session sur une réponse 401, sauf pour les appels d'authentification
 * eux-mêmes (pour éviter une boucle de redirection).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (req.url.startsWith(API_BASE_URL)) {
    req = req.clone({ withCredentials: true });
  }

  return next(req).pipe(
    catchError((err) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.includes('/auth/me') &&
        !req.url.includes('/auth/login')
      ) {
        authService.clearSession();
        router.navigate(['/auth/login']);
      }

      return throwError(() => err);
    }),
  );
};
