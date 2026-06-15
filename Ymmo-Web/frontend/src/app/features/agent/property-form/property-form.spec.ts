import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AgencyResponseDto } from '../../../core/models/agency.model';
import { AgencyStatus } from '../../../core/models/agency-status.enum';
import { GlobalResponse } from '../../../core/models/global-response.model';
import { AgentPropertyForm } from './property-form';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('AgentPropertyForm', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentPropertyForm],
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

  it('devrait se créer en mode création', () => {
    const fixture = TestBed.createComponent(AgentPropertyForm);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance['isEditMode']()).toBe(false);

    httpMock.expectOne('http://localhost:8080/api/agencies').flush(
      envelope<AgencyResponseDto[]>([
        {
          id: crypto.randomUUID(),
          name: 'Agence du Centre',
          description: '',
          email: 'contact@agence.fr',
          address: '1 place de la Mairie',
          city: 'Aix-en-Provence',
          postalCode: '13100',
          phone: '0442000000',
          status: AgencyStatus.OPEN,
          createdAt: '01-06-2026 10:00:00',
          updatedAt: '01-06-2026 10:00:00',
        },
      ]),
    );
  });
});
