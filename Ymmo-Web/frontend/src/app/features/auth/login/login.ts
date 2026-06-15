import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../core/services/auth.service';
import { Footer } from '../../../layout/footer/footer';
import { Header } from '../../../layout/header/header';

/**
 * Page de connexion : formulaire email / mot de passe.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule, Header, Footer],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  /** Indique que l'utilisateur arrive juste après une inscription réussie. */
  protected readonly justRegistered = this.route.snapshot.queryParamMap.get('registered') === '1';

  /** Indique qu'une requête de connexion est en cours. */
  protected readonly loading = signal(false);

  /** Message d'erreur renvoyé par le serveur (identifiants invalides, etc.). */
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
  });

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

  /** Soumet le formulaire de connexion. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.loading.set(true);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.serverError.set('Identifiants invalides.');
        this.loading.set(false);
      },
    });
  }
}
