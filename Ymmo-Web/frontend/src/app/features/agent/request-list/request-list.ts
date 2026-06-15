import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { RequestService } from '../../../core/services/request.service';
import { TransactionService } from '../../../core/services/transaction.service';
import {
  RequestResponseDto,
  RequestStatus,
  RequestType,
} from '../../../core/models/request.model';

/** Libellés français des types de demande. */
const requestTypeLabels: Record<RequestType, string> = {
  INFO: 'Information',
  VISITE: 'Visite',
};

/** Libellés français des statuts de demande. */
const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  DONE: 'Terminée',
};

/** Sévérités `p-tag` associées à chaque statut. */
const requestStatusSeverities: Record<RequestStatus, 'warn' | 'success' | 'danger' | 'info'> = {
  PENDING: 'warn',
  ACCEPTED: 'success',
  REFUSED: 'danger',
  DONE: 'info',
};

/** Options du sélecteur de statut. */
const statusOptions: { label: string; value: RequestStatus }[] = (
  Object.entries(requestStatusLabels) as [RequestStatus, string][]
).map(([value, label]) => ({ value, label }));

/**
 * Liste des demandes (visite / information) reçues sur les biens de l'agence,
 * avec changement de statut et création de transaction associée.
 */
@Component({
  selector: 'app-agent-request-list',
  imports: [ButtonModule, TableModule, TagModule, SelectModule, FormsModule],
  templateUrl: './request-list.html',
  styleUrl: './request-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentRequestList {
  private readonly requestService = inject(RequestService);
  private readonly transactionService = inject(TransactionService);

  /** Options du sélecteur de statut, exposées au template. */
  protected readonly statusOptions = statusOptions;

  /** Demandes, `null` pendant le chargement initial. */
  protected readonly requests = signal<RequestResponseDto[] | null>(null);

  /** Indique si le chargement des demandes a échoué. */
  protected readonly loadError = signal(false);

  constructor() {
    this.load();
  }

  /** Charge (ou recharge) la liste des demandes. */
  protected load(): void {
    this.requestService.getAll().subscribe({
      next: (list) => this.requests.set(list),
      error: () => this.loadError.set(true),
    });
  }

  /** Libellé lisible du type de demande (le contexte de `p-table` est typé `any`). */
  protected typeLabel(type: RequestType): string {
    return requestTypeLabels[type];
  }

  /** Libellé lisible du statut de demande. */
  protected statusLabel(status: RequestStatus): string {
    return requestStatusLabels[status];
  }

  /** Sévérité `p-tag` associée au statut. */
  protected statusSeverity(status: RequestStatus): 'warn' | 'success' | 'danger' | 'info' {
    return requestStatusSeverities[status];
  }

  /** Change le statut d'une demande, puis recharge la liste. */
  protected changeStatus(request: RequestResponseDto, status: RequestStatus): void {
    this.requestService.updateStatus(request.id, { status }).subscribe({
      next: () => this.load(),
    });
  }

  /** Crée une transaction pour le bien et le demandeur de la demande, après confirmation. */
  protected createTransaction(request: RequestResponseDto): void {
    if (!confirm('Créer une transaction pour ce bien et ce demandeur ?')) {
      return;
    }
    this.transactionService
      .create({ propertyId: request.propertyId, clientId: request.userId })
      .subscribe({
        next: () => alert('Transaction créée.'),
      });
  }
}
