import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../../core/services/auth.service';

/**
 * Coquille de l'espace professionnel (agent/admin) : sidebar de navigation
 * et zone de contenu accueillant les pages enfants via le routeur.
 */
@Component({
  selector: 'app-agent-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './agent-layout.html',
  styleUrl: './agent-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Utilisateur courant, affiché en bas de la sidebar. */
  protected readonly currentUser = this.authService.currentUser;

  /** Déconnecte l'utilisateur et le redirige vers l'accueil. */
  protected logout(): void {
    this.authService.logout().subscribe();
    this.router.navigate(['/']);
  }
}
