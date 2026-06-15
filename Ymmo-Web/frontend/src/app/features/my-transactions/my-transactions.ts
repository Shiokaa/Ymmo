import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { catchError, map, of, startWith } from 'rxjs';

import { TransactionService } from '../../core/services/transaction.service';
import { TransactionResponseDto, TransactionStatus } from '../../core/models/transaction.model';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/** État de chargement de la liste des transactions. */
type TransactionsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; transactions: TransactionResponseDto[] };

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

/**
 * Page « Mes démarches » : suivi de l'avancement des transactions du client.
 */
@Component({
  selector: 'app-my-transactions',
  imports: [RouterLink, TagModule, Header, Footer],
  templateUrl: './my-transactions.html',
  styleUrl: './my-transactions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTransactions {
  private readonly transactionService = inject(TransactionService);

  /** Chargement des transactions, avec gestion d'erreur intégrée à l'état. */
  protected readonly transactionsState = toSignal(
    this.transactionService.getMine().pipe(
      map((transactions): TransactionsState => ({ status: 'ready', transactions })),
      catchError(() => of<TransactionsState>({ status: 'error' })),
      startWith<TransactionsState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Transactions chargées, ou tableau vide si non prêtes. */
  protected readonly transactions = computed(() => {
    const state = this.transactionsState();
    return state.status === 'ready' ? state.transactions : [];
  });

  /** Libellé français du statut de transaction. */
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
}
