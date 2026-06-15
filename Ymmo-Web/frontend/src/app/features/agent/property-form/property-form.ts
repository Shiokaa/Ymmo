import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { AgencyService } from '../../../core/services/agency.service';
import { PropertyService } from '../../../core/services/property.service';
import { AgencyResponseDto } from '../../../core/models/agency.model';
import { PropertyImageResponseDto } from '../../../core/models/property-image.model';
import { PropertyRequestDto } from '../../../core/models/property-request.model';
import { PropertyType, propertyTypeLabels } from '../../../core/models/property-type.enum';

/**
 * Page de création / édition d'un bien immobilier de l'espace agent, avec gestion des photos.
 */
@Component({
  selector: 'app-agent-property-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    InputNumberModule,
    CheckboxModule,
    TagModule,
  ],
  templateUrl: './property-form.html',
  styleUrl: './property-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentPropertyForm {
  private readonly fb = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly agencyService = inject(AgencyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Options du sélecteur de type de bien. */
  protected readonly propertyTypeOptions = Object.values(PropertyType).map((value) => ({
    label: propertyTypeLabels[value],
    value,
  }));

  /** Agences disponibles pour le sélecteur, `null` pendant le chargement. */
  protected readonly agencies = signal<AgencyResponseDto[] | null>(null);

  /** Identifiant du bien en cours d'édition (défini aussi après une création réussie). */
  protected readonly propertyId = signal<string | null>(this.route.snapshot.paramMap.get('id'));

  /** Mode édition (sinon création) — dérivé de `propertyId`. */
  protected readonly isEditMode = computed(() => this.propertyId() !== null);

  /** Images existantes du bien, pour la galerie de gestion. */
  protected readonly images = signal<PropertyImageResponseDto[]>([]);

  /** Indique qu'un enregistrement (création ou mise à jour) est en cours. */
  protected readonly saving = signal(false);

  /** Indique qu'un upload d'image est en cours. */
  protected readonly uploading = signal(false);

  /** Message d'erreur renvoyé par le serveur. */
  protected readonly serverError = signal<string | null>(null);

  /** Message de succès affiché après une opération. */
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    agencyId: this.fb.nonNullable.control('', [Validators.required]),
    title: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required]),
    type: this.fb.control<PropertyType | null>(null, [Validators.required]),
    address: this.fb.nonNullable.control('', [Validators.required]),
    city: this.fb.nonNullable.control('', [Validators.required]),
    postalCode: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[0-9]{5}$/),
    ]),
    price: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    size: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    roomsCount: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    available: this.fb.nonNullable.control(true),
  });

  /** Fichier sélectionné pour l'ajout d'une nouvelle photo. */
  protected readonly uploadFile = signal<File | null>(null);

  /** Champs du formulaire d'ajout d'une nouvelle photo (description + couverture). */
  protected readonly imageForm = this.fb.nonNullable.group({
    description: this.fb.nonNullable.control(''),
    isCover: this.fb.nonNullable.control(false),
  });

  constructor() {
    this.agencyService.getAllAgencies().subscribe({
      next: (list) => this.agencies.set(list),
      error: () => this.agencies.set([]),
    });

    const id = this.propertyId();
    if (id !== null) {
      this.propertyService.getPropertyById(id).subscribe({
        next: (property) => {
          this.form.patchValue({
            agencyId: property.agency.id,
            title: property.title,
            description: property.description,
            type: property.type,
            address: property.address,
            city: property.city,
            postalCode: property.postalCode,
            price: property.price,
            size: property.size,
            roomsCount: property.roomsCount,
            available: property.available,
          });
          this.images.set(property.propertyImages);
        },
        error: () => this.serverError.set('Impossible de charger ce bien.'),
      });
    }
  }

  /** Message d'erreur du champ agence, affiché une fois le champ touché. */
  protected agencyIdError(): string | null {
    const control = this.form.controls.agencyId;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return "L'agence est requise.";
    }
    return null;
  }

  /** Message d'erreur du champ titre, affiché une fois le champ touché. */
  protected titleError(): string | null {
    const control = this.form.controls.title;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le titre est requis.';
    }
    return null;
  }

  /** Message d'erreur du champ description, affiché une fois le champ touché. */
  protected descriptionError(): string | null {
    const control = this.form.controls.description;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'La description est requise.';
    }
    return null;
  }

  /** Message d'erreur du champ type de bien, affiché une fois le champ touché. */
  protected typeError(): string | null {
    const control = this.form.controls.type;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le type de bien est requis.';
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

  /** Message d'erreur du champ prix, affiché une fois le champ touché. */
  protected priceError(): string | null {
    const control = this.form.controls.price;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le prix est requis.';
    }
    if (control.errors['min']) {
      return 'Le prix doit être supérieur à 0.';
    }
    return null;
  }

  /** Message d'erreur du champ surface, affiché une fois le champ touché. */
  protected sizeError(): string | null {
    const control = this.form.controls.size;
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

  /** Soumet le formulaire de création ou de mise à jour du bien. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.successMessage.set(null);
    this.saving.set(true);

    const payload = this.form.getRawValue() as PropertyRequestDto;
    const id = this.propertyId();

    if (id === null) {
      this.propertyService.createProperty(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.propertyId.set(created.id);
          this.images.set(created.propertyImages);
          this.successMessage.set('Bien créé, ajoutez des photos.');
          this.router.navigate(['/agent/properties', created.id, 'edit']);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.serverError.set(this.errorMessage(err));
        },
      });
    } else {
      this.propertyService.updateProperty(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set('Bien mis à jour.');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.serverError.set(this.errorMessage(err));
        },
      });
    }
  }

  /** Message d'erreur générique selon le statut HTTP. */
  private errorMessage(err: HttpErrorResponse): string {
    return err.status === 400
      ? 'Données invalides, vérifiez les champs du formulaire.'
      : 'Une erreur est survenue, réessayez.';
  }

  /** Mémorise le fichier sélectionné pour l'upload de photo. */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile.set(input.files?.[0] ?? null);
  }

  /** Ajoute la photo sélectionnée au bien courant. */
  protected addImage(): void {
    const propertyId = this.propertyId();
    const file = this.uploadFile();
    if (propertyId === null || file === null) {
      return;
    }

    this.uploading.set(true);

    const { description, isCover } = this.imageForm.getRawValue();

    this.propertyService.uploadImage(propertyId, file, description, isCover).subscribe({
      next: (image) => {
        this.images.update((current) => [...current, image]);
        this.uploadFile.set(null);
        this.imageForm.reset({ description: '', isCover: false });
        this.uploading.set(false);
      },
      error: () => {
        this.serverError.set("Impossible d'ajouter cette photo.");
        this.uploading.set(false);
      },
    });
  }

  /** Supprime une photo du bien courant. */
  protected removeImage(image: PropertyImageResponseDto): void {
    const propertyId = this.propertyId();
    if (propertyId === null) {
      return;
    }

    this.propertyService.deleteImage(propertyId, image.id).subscribe({
      next: () => this.images.update((current) => current.filter((img) => img.id !== image.id)),
      error: () => this.serverError.set('Impossible de supprimer cette photo.'),
    });
  }
}
