import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserResponseDto, UserRole } from '../../../core/models/user.model';

/** Libellés français des rôles. */
const roleLabels: Record<UserRole, string> = {
  USER: 'Client',
  AGENT: 'Agent',
  ADMIN: 'Admin',
};

/** Sévérités `p-tag` associées à chaque rôle. */
const roleSeverities: Record<UserRole, 'info' | 'success' | 'warn'> = {
  USER: 'info',
  AGENT: 'success',
  ADMIN: 'warn',
};

/** Options du sélecteur de rôle. */
const roleOptions: { label: string; value: UserRole }[] = (
  Object.entries(roleLabels) as [UserRole, string][]
).map(([value, label]) => ({ value, label }));

/**
 * Liste de tous les utilisateurs, avec changement de rôle et suppression de compte (ADMIN).
 */
@Component({
  selector: 'app-agent-user-list',
  imports: [ButtonModule, TableModule, TagModule, SelectModule, FormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentUserList {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  /** Options du sélecteur de rôle, exposées au template. */
  protected readonly roleOptions = roleOptions;

  /** Utilisateurs, `null` pendant le chargement initial. */
  protected readonly users = signal<UserResponseDto[] | null>(null);

  /** Indique si le chargement des utilisateurs a échoué. */
  protected readonly loadError = signal(false);

  /** Identifiant de l'utilisateur connecté, pour interdire l'auto-suppression. */
  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  constructor() {
    this.load();
  }

  /** Charge (ou recharge) la liste des utilisateurs. */
  protected load(): void {
    this.userService.getAllUsers().subscribe({
      next: (list) => this.users.set(list),
      error: () => this.loadError.set(true),
    });
  }

  /** Libellé lisible du rôle. */
  protected roleLabel(role: UserRole): string {
    return roleLabels[role];
  }

  /** Sévérité `p-tag` associée au rôle. */
  protected roleSeverity(role: UserRole): 'info' | 'success' | 'warn' {
    return roleSeverities[role];
  }

  /** Change le rôle d'un utilisateur, puis recharge la liste. */
  protected changeRole(user: UserResponseDto, role: UserRole): void {
    this.userService.updateRole(user.id, { role }).subscribe({
      next: () => this.load(),
    });
  }

  /** Supprime un utilisateur après confirmation, puis recharge la liste. */
  protected deleteUser(user: UserResponseDto): void {
    if (!confirm('Supprimer cet utilisateur ?')) {
      return;
    }
    this.userService.deleteUser(user.id).subscribe({
      next: () => this.load(),
    });
  }
}
