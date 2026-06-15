import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/**
 * Page de contact : formulaire de prise de contact (front-only, aucun appel API).
 */
@Component({
  selector: 'app-contact',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    Header,
    Footer,
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private readonly fb = inject(FormBuilder);

  /** Indique que le formulaire a été soumis avec succès. */
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fullName: this.fb.nonNullable.control('', [Validators.required]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    subject: this.fb.nonNullable.control('', [Validators.required]),
    message: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(10)]),
  });

  /** Message d'erreur du champ nom complet, affiché une fois le champ touché. */
  protected fullNameError(): string | null {
    const control = this.form.controls.fullName;
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

  /** Message d'erreur du champ sujet, affiché une fois le champ touché. */
  protected subjectError(): string | null {
    const control = this.form.controls.subject;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le sujet est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ message, affiché une fois le champ touché. */
  protected messageError(): string | null {
    const control = this.form.controls.message;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le message est requis.';
    }
    if (control.errors['minlength']) {
      return 'Le message doit contenir au moins 10 caractères.';
    }
    return null;
  }

  /** Soumet le formulaire de contact. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.set(true);
  }
}
