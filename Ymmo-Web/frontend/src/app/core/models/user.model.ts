/** Rôles applicatifs (aligné sur l'enum backend). */
export type UserRole = 'USER' | 'AGENT' | 'ADMIN';

/** Payload de changement de rôle (ADMIN). */
export interface UserUpdateRoleDto {
  role: UserRole;
}

/** Utilisateur courant renvoyé par GET /auth/me. */
export interface UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload de mise à jour du profil utilisateur. */
export interface UserUpdateProfilDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Payload de mise à jour du mot de passe utilisateur. */
export interface UserUpdatePasswordDto {
  oldPassword: string;
  newPassword: string;
  validPassword: string;
}
