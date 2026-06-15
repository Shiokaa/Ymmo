import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';

/**
 * En-tête du site : logo, navigation principale, CTA de connexion.
 * Sticky avec effet d'élévation au scroll, tiroir de navigation sur mobile.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, ButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly router = inject(Router);

  /** Vrai dès que la page est scrollée (bordure + ombre sur le header). */
  protected readonly scrolled = signal(false);

  /** État d'ouverture du tiroir de navigation mobile. */
  protected readonly menuOpen = signal(false);

  /** Indique si un utilisateur est connecté. */
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  /** Utilisateur courant, si connecté. */
  protected readonly currentUser = this.authService.currentUser;

  /** Vrai si l'utilisateur a accès à l'espace professionnel (AGENT ou ADMIN). */
  protected readonly isPro = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'AGENT' || role === 'ADMIN';
  });

  /** Nombre de biens favoris. */
  protected readonly favoritesCount = this.favoritesService.count;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected openMenu(): void {
    this.menuOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    document.body.style.overflow = '';
  }

  protected logout(): void {
    this.authService.logout().subscribe();
    this.router.navigate(['/']);
    this.closeMenu();
  }
}
