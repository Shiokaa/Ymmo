import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { catchError, map, of, startWith } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PropertyService } from '../../core/services/property.service';
import { RequestService } from '../../core/services/request.service';
import { PropertyResponseDto } from '../../core/models/property.model';
import { propertyTypeLabels } from '../../core/models/property-type.enum';
import { RequestType } from '../../core/models/request.model';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/** État de chargement du détail d'un bien. */
type PropertyState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; property: PropertyResponseDto };

/** Formateur de prix FR : « 245 000 € », sans décimales. */
const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/**
 * Page de détail d'un bien immobilier : galerie, caractéristiques, agence.
 */
@Component({
  selector: 'app-property-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    SelectModule,
    TextareaModule,
    Header,
    Footer,
  ],
  templateUrl: './property-detail.html',
  styleUrl: './property-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyDetail {
  private readonly propertyService = inject(PropertyService);
  private readonly route = inject(ActivatedRoute);
  private readonly favorites = inject(FavoritesService);
  private readonly requestService = inject(RequestService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  /** Chargement du bien, avec gestion d'erreur intégrée à l'état. */
  protected readonly propertyState = toSignal(
    this.propertyService.getPropertyById(this.route.snapshot.paramMap.get('id') ?? '').pipe(
      map((property): PropertyState => ({ status: 'ready', property })),
      catchError(() => of<PropertyState>({ status: 'error' })),
      startWith<PropertyState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** URL de l'image actuellement sélectionnée dans la galerie. */
  protected readonly selectedImageUrl = signal<string | null>(null);

  /** Bien chargé (ou null tant que l'état n'est pas « ready ») — narrowing pour le template. */
  protected readonly property = computed(() => {
    const state = this.propertyState();
    return state.status === 'ready' ? state.property : null;
  });

  protected readonly typeLabel = computed(() => {
    const state = this.propertyState();
    return state.status === 'ready' ? propertyTypeLabels[state.property.type] : '';
  });

  protected readonly formattedPrice = computed(() => {
    const state = this.propertyState();
    return state.status === 'ready' ? priceFormatter.format(state.property.price) : '';
  });

  /** Image de couverture : isCover prioritaire, sinon première image. */
  protected readonly coverImageUrl = computed(() => {
    const state = this.propertyState();
    if (state.status !== 'ready') {
      return null;
    }
    const images = state.property.propertyImages ?? [];
    const cover = images.find((image) => image.isCover) ?? images[0];
    return cover?.imageUrl ?? null;
  });

  /** Image actuellement affichée dans la galerie (sélection ou couverture). */
  protected readonly displayedImageUrl = computed(
    () => this.selectedImageUrl() ?? this.coverImageUrl(),
  );

  /** Sélectionne une image de la galerie comme image principale. */
  protected selectImage(imageUrl: string): void {
    this.selectedImageUrl.set(imageUrl);
  }

  /** Indique si le bien affiché fait partie des favoris. */
  protected readonly isFavorite = computed(() => {
    const property = this.property();
    return property ? this.favorites.has(property.id) : false;
  });

  /** Ajoute ou retire le bien des favoris. */
  protected toggleFavorite(id: string): void {
    this.favorites.toggle(id);
  }

  /** Indique si un utilisateur est connecté. */
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  /** Options du sélecteur de type de demande. */
  protected readonly requestTypeOptions: { label: string; value: RequestType }[] = [
    { label: 'Visite', value: 'VISITE' },
    { label: 'Information', value: 'INFO' },
  ];

  /** Formulaire de demande de visite ou d'information. */
  protected readonly requestForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<RequestType>('VISITE', [Validators.required]),
    message: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5)]),
  });

  /** Indique qu'une demande est en cours d'envoi. */
  protected readonly requestSending = signal(false);

  /** Indique que la demande a été envoyée avec succès. */
  protected readonly requestSent = signal(false);

  /** Message d'erreur renvoyé par le serveur lors de l'envoi de la demande. */
  protected readonly requestError = signal<string | null>(null);

  /** Message d'erreur du champ message, affiché une fois le champ touché. */
  protected requestMessageError(): string | null {
    const control = this.requestForm.controls.message;
    if (!control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Le message est requis.';
    }
    if (control.errors['minlength']) {
      return 'Le message doit contenir au moins 5 caractères.';
    }
    return null;
  }

  /** Soumet la demande de visite ou d'information pour le bien donné. */
  protected submitRequest(propertyId: string): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.requestError.set(null);
    this.requestSending.set(true);

    this.requestService
      .create({ propertyId, ...this.requestForm.getRawValue() })
      .subscribe({
        next: () => {
          this.requestSent.set(true);
          this.requestSending.set(false);
        },
        error: () => {
          this.requestError.set("Échec de l'envoi, réessayez.");
          this.requestSending.set(false);
        },
      });
  }
}
