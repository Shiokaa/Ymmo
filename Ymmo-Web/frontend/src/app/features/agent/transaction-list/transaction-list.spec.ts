import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../../core/models/global-response.model';
import { TransactionResponseDto } from '../../../core/models/transaction.model';
import { AgentTransactionList } from './transaction-list';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('AgentTransactionList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentTransactionList],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(AgentTransactionList);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock
      .expectOne('http://localhost:8080/api/transactions')
      .flush(envelope<TransactionResponseDto[]>([]));
  });
});
