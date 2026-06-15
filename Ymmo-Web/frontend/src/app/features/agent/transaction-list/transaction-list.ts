import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { TransactionService } from '../../../core/services/transaction.service';
import { TransactionResponseDto, TransactionStatus } from '../../../core/models/transaction.model';

/** Formateur de montant FR : « 245 000 € », sans décimales. */
const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Libellés français des statuts de transaction. */
const statusLabels: Record<TransactionStatus, string> = {
  INITIATED: 'Initiée',
  OFFER: 'Offre',
  NEGOTIATION: 'Négociation',
  COMPROMISE: 'Compromis',
  COMPLETED: 'Finalisée',
  CANCELLED: 'Annulée',
};

/** Sévérités `p-tag` associées aux statuts de transaction. */
const statusSeverities: Record<TransactionStatus, 'info' | 'warn' | 'success' | 'danger'> = {
  INITIATED: 'info',
  OFFER: 'warn',
  NEGOTIATION: 'warn',
  COMPROMISE: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

/** Options de statut pour le `p-select` de mise à jour. */
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value: value as TransactionStatus,
  label,
}));

/**
 * Liste des transactions (suivi des démarches), avec mise à jour du statut
 * directement depuis le tableau.
 */
@Component({
  selector: 'app-agent-transaction-list',
  imports: [ButtonModule, TableModule, TagModule, SelectModule, FormsModule],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentTransactionList {
  private readonly transactionService = inject(TransactionService);

  /** Options de statut proposées dans le `p-select` de chaque ligne. */
  protected readonly statusOptions = statusOptions;

  /** Transactions, `null` pendant le chargement initial. */
  protected readonly transactions = signal<TransactionResponseDto[] | null>(null);

  /** Indique si le chargement des transactions a échoué. */
  protected readonly loadError = signal(false);

  constructor() {
    this.load();
  }

  /** Charge (ou recharge) la liste des transactions. */
  protected load(): void {
    this.transactionService.getAll().subscribe({
      next: (list) => this.transactions.set(list),
      error: () => this.loadError.set(true),
    });
  }

  /** Libellé français du statut. */
  protected statusLabel(status: TransactionStatus): string {
    return statusLabels[status];
  }

  /** Sévérité `p-tag` associée au statut. */
  protected statusSeverity(status: TransactionStatus): 'info' | 'warn' | 'success' | 'danger' {
    return statusSeverities[status];
  }

  /** Formate un montant en euros (« 245 000 € »), ou « — » si non défini. */
  protected formatAmount(amount: number | null): string {
    return amount === null ? '—' : amountFormatter.format(amount);
  }

  /** Met à jour le statut d'une transaction, puis recharge la liste. */
  protected updateStatus(transaction: TransactionResponseDto, status: TransactionStatus): void {
    this.transactionService
      .update(transaction.id, { status, amount: transaction.amount })
      .subscribe({ next: () => this.load() });
  }
}
