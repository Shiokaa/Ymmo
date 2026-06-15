import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { PropertyType, propertyTypeLabels } from '../../core/models/property-type.enum';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/**
 * Page d'estimation : formulaire de demande d'estimation gratuite (front-only, sans appel API).
 */
@Component({
  selector: 'app-estimate',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    Header,
    Footer,
  ],
  templateUrl: './estimate.html',
  styleUrl: './estimate.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Estimate {
  private readonly fb = inject(FormBuilder);

  /** Options du sélecteur de type de bien. */
  protected readonly propertyTypeOptions = Object.values(PropertyType).map((value) => ({
    label: propertyTypeLabels[value],
    value,
  }));

  /** Indique que la demande d'estimation a été transmise. */
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    propertyType: this.fb.control<PropertyType | null>(null, [Validators.required]),
    surface: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    roomsCount: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    address: this.fb.nonNullable.control('', [Validators.required]),
    city: this.fb.nonNullable.control('', [Validators.required]),
    postalCode: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[0-9]{5}$/),
    ]),
    fullName: this.fb.nonNullable.control('', [Validators.required]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    phone: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[0-9+\s]{10,}$/),
    ]),
  });

  /** Message d'erreur du champ type de bien, affiché une fois le champ touché. */
  protected propertyTypeError(): string | null {
    const control = this.form.controls.propertyType;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le type de bien est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ surface, affiché une fois le champ touché. */
  protected surfaceError(): string | null {
    const control = this.form.controls.surface;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'La surface est requise.';
    }
    if (control.errors['min']) {
      return 'La surface doit être supérieure à 0.';
    }
    return null;
  }

  /** Message d'erreur du champ nombre de pièces, affiché une fois le champ touché. */
  protected roomsCountError(): string | null {
    const control = this.form.controls.roomsCount;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le nombre de pièces est requis.';
    }
    if (control.errors['min']) {
      return 'Le nombre de pièces doit être supérieur à 0.';
    }
    return null;
  }

  /** Message d'erreur du champ adresse, affiché une fois le champ touché. */
  protected addressError(): string | null {
    const control = this.form.controls.address;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return "L'adresse est requise.";
    }
    return null;
  }

  /** Message d'erreur du champ ville, affiché une fois le champ touché. */
  protected cityError(): string | null {
    const control = this.form.controls.city;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'La ville est requise.';
    }
    return null;
  }

  /** Message d'erreur du champ code postal, affiché une fois le champ touché. */
  protected postalCodeError(): string | null {
    const control = this.form.controls.postalCode;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le code postal est requis.';
    }
    if (control.errors['pattern']) {
      return 'Code postal invalide (5 chiffres).';
    }
    return null;
  }

  /** Message d'erreur du champ nom complet, affiché une fois le champ touché. */
  protected fullNameError(): string | null {
    const control = this.form.controls.fullName;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le nom complet est requis.';
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

  /** Soumet la demande d'estimation (front-only : aucun appel API). */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.set(true);
  }
}
