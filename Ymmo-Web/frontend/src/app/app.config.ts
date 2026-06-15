import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';

/**
 * Préréglage PrimeNG basé sur Aura, personnalisé avec la couleur d'accent
 * terracotta de l'identité visuelle Ymmo.
 */
const YmmoPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fbf1ec',
      100: '#efd8cf',
      200: '#e0b8a9',
      300: '#d29882',
      400: '#cb7a5e',
      500: '#c0563d',
      600: '#9c4530',
      700: '#7a3625',
      800: '#5a271b',
      900: '#3d1a12',
      950: '#240f0a',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    // darkModeSelector désactivé : la charte Ymmo est claire, on ignore le thème système
    providePrimeNG({ theme: { preset: YmmoPreset, options: { darkModeSelector: false } } }),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
