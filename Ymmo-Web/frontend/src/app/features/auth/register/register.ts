import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../core/services/auth.service';
import { Footer } from '../../../layout/footer/footer';
import { Header } from '../../../layout/header/header';

/** Valide que les champs `password` et `confirmPassword` du groupe sont identiques. */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * Page d'inscription : formulaire de création de compte.
 */
@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    Header,
    Footer,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /** Indique qu'une requête d'inscription est en cours. */
  protected readonly loading = signal(false);

  /** Message d'erreur renvoyé par le serveur (email déjà utilisé, etc.). */
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      firstName: this.fb.nonNullable.control('', [Validators.required]),
      lastName: this.fb.nonNullable.control('', [Validators.required]),
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
      password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: this.fb.nonNullable.control('', [Validators.required]),
      phone: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.pattern(/^[0-9+\s]{10,}$/),
      ]),
    },
    { validators: passwordMatchValidator },
  );

  /** Message d'erreur du champ prénom, affiché une fois le champ touché. */
  protected firstNameError(): string | null {
    const control = this.form.controls.firstName;
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
    const control = this.form.controls.lastName;
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
    const control = this.form.controls.email;
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

  /** Message d'erreur du champ mot de passe, affiché une fois le champ touché. */
  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le mot de passe est requis.';
    }
    if (control.errors['minlength']) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    return null;
  }

  /** Message d'erreur du champ de confirmation, affiché une fois le champ touché. */
  protected confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) {
      return null;
    }
    if (control.errors?.['required']) {
      return 'La confirmation du mot de passe est requise.';
    }
    if (this.form.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas.';
    }
    return null;
  }

  /** Message d'erreur du champ téléphone, affiché une fois le champ touché. */
  protected phoneError(): string | null {
    const control = this.form.controls.phone;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le numéro de téléphone est requis.';
    }
    if (control.errors['pattern']) {
      return 'Numéro de téléphone invalide.';
    }
    return null;
  }

  /** Soumet le formulaire d'inscription. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.loading.set(true);

    const { confirmPassword, ...payload } = this.form.getRawValue();

    this.authService.register(payload).subscribe({
      next: () => this.router.navigate(['/auth/login'], { queryParams: { registered: 1 } }),
      error: (err: HttpErrorResponse) => {
        this.serverError.set(
          err.status === 409
            ? 'Cet email est déjà utilisé.'
            : 'Une erreur est survenue, réessayez.',
        );
        this.loading.set(false);
      },
    });
  }
}
