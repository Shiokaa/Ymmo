import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { catchError, map, of, startWith } from 'rxjs';

import { RequestService } from '../../core/services/request.service';
import { RequestResponseDto, RequestStatus, RequestType } from '../../core/models/request.model';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/** État de chargement de la liste des demandes. */
type RequestsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; requests: RequestResponseDto[] };

/** Libellés français des types de demande. */
const typeLabels: Record<RequestType, string> = {
  INFO: 'Information',
  VISITE: 'Visite',
};

/** Libellés français des statuts de demande. */
const statusLabels: Record<RequestStatus, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  DONE: 'Terminée',
};

/** Sévérités `p-tag` associées à chaque statut de demande. */
const statusSeverities: Record<RequestStatus, 'warn' | 'success' | 'danger' | 'info'> = {
  PENDING: 'warn',
  ACCEPTED: 'success',
  REFUSED: 'danger',
  DONE: 'info',
};

/**
 * Page « Mes demandes » : demandes de visite / d'information envoyées par le client.
 */
@Component({
  selector: 'app-my-requests',
  imports: [RouterLink, TagModule, Header, Footer],
  templateUrl: './my-requests.html',
  styleUrl: './my-requests.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyRequests {
  private readonly requestService = inject(RequestService);

  /** Chargement des demandes, avec gestion d'erreur intégrée à l'état. */
  protected readonly requestsState = toSignal(
    this.requestService.getMine().pipe(
      map((requests): RequestsState => ({ status: 'ready', requests })),
      catchError(() => of<RequestsState>({ status: 'error' })),
      startWith<RequestsState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Demandes chargées, ou tableau vide si non prêtes. */
  protected readonly requests = computed(() => {
    const state = this.requestsState();
    return state.status === 'ready' ? state.requests : [];
  });

  /** Libellé français du type de demande. */
  protected typeLabel(type: RequestType): string {
    return typeLabels[type];
  }

  /** Libellé français du statut de demande. */
  protected statusLabel(status: RequestStatus): string {
    return statusLabels[status];
  }

  /** Sévérité `p-tag` associée au statut. */
  protected statusSeverity(status: RequestStatus): 'warn' | 'success' | 'danger' | 'info' {
    return statusSeverities[status];
  }
}
