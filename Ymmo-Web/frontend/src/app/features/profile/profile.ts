import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/** Valide que les champs `newPassword` et `validPassword` du groupe sont identiques. */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const validPassword = group.get('validPassword')?.value;
  return newPassword === validPassword ? null : { passwordMismatch: true };
}

/**
 * Page de l'espace compte : modification du profil et du mot de passe.
 */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, Header, Footer],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  /** Indique qu'une requête de mise à jour du profil est en cours. */
  protected readonly loadingProfile = signal(false);

  /** Indique qu'une requête de mise à jour du mot de passe est en cours. */
  protected readonly loadingPassword = signal(false);

  /** Message (succès ou erreur) suite à la mise à jour du profil. */
  protected readonly profileMessage = signal<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  /** Message (succès ou erreur) suite à la mise à jour du mot de passe. */
  protected readonly passwordMessage = signal<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: this.fb.nonNullable.control('', [Validators.required]),
    lastName: this.fb.nonNullable.control('', [Validators.required]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    phone: this.fb.nonNullable.control('', [Validators.required]),
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      oldPassword: this.fb.nonNullable.control('', [Validators.required]),
      newPassword: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
      validPassword: this.fb.nonNullable.control('', [Validators.required]),
    },
    { validators: passwordMatchValidator },
  );

  constructor() {
    if (!this.authService.currentUser()) {
      this.authService.me().subscribe();
    }

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        });
      }
    });
  }

  /** Message d'erreur du champ prénom, affiché une fois le champ touché. */
  protected firstNameError(): string | null {
    const control = this.profileForm.controls.firstName;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le prénom est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ nom, affiché une fois le champ touché. */
  protected lastNameError(): string | null {
    const control = this.profileForm.controls.lastName;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le nom est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ email, affiché une fois le champ touché. */
  protected emailError(): string | null {
    const control = this.profileForm.controls.email;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return "L'email est requis.";
    }
    if (control.errors['email']) {
      return 'Adresse email invalide.';
    }
    return null;
  }

  /** Message d'erreur du champ téléphone, affiché une fois le champ touché. */
  protected phoneError(): string | null {
    const control = this.profileForm.controls.phone;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le numéro de téléphone est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ ancien mot de passe, affiché une fois le champ touché. */
  protected oldPasswordError(): string | null {
    const control = this.passwordForm.controls.oldPassword;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le mot de passe actuel est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ nouveau mot de passe, affiché une fois le champ touché. */
  protected newPasswordError(): string | null {
    const control = this.passwordForm.controls.newPassword;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le nouveau mot de passe est requis.';
    }
    if (control.errors['minlength']) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    return null;
  }

  /** Message d'erreur du champ de confirmation, affiché une fois le champ touché. */
  protected validPasswordError(): string | null {
    const control = this.passwordForm.controls.validPassword;
    if (!control.touched) {
      return null;
    }
    if (control.errors?.['required']) {
      return 'La confirmation du mot de passe est requise.';
    }
    if (this.passwordForm.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas.';
    }
    return null;
  }

  /** Déconnecte l'utilisateur et le redirige vers l'accueil. */
  protected logout(): void {
    this.authService.logout().subscribe();
    this.router.navigate(['/']);
  }

  /** Soumet le formulaire de mise à jour du profil. */
  protected submitProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    this.profileMessage.set(null);
    this.loadingProfile.set(true);

    this.userService.updateProfile(user.id, this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.authService.me().subscribe();
        this.profileMessage.set({
          type: 'success',
          text: 'Vos informations ont été mises à jour.',
        });
        this.loadingProfile.set(false);
      },
      error: () => {
        this.profileMessage.set({
          type: 'error',
          text: 'Une erreur est survenue, réessayez.',
        });
        this.loadingProfile.set(false);
      },
    });
  }

  /** Soumet le formulaire de changement de mot de passe. */
  protected submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    this.passwordMessage.set(null);
    this.loadingPassword.set(true);

    this.userService.updatePassword(user.id, this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.passwordMessage.set({
          type: 'success',
          text: 'Votre mot de passe a été mis à jour.',
        });
        this.loadingPassword.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.passwordMessage.set({
          type: 'error',
          text:
            err.status >= 400 && err.status < 500
              ? 'Mot de passe actuel incorrect.'
              : 'Une erreur est survenue, réessayez.',
        });
        this.loadingPassword.set(false);
      },
    });
  }
}
