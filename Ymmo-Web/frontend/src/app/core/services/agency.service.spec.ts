import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AgencyResponseDto } from '../models/agency.model';
import { AgencyStatus } from '../models/agency-status.enum';
import { GlobalResponse } from '../models/global-response.model';
import { AgencyService } from './agency.service';

describe('AgencyService', () => {
  let service: AgencyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AgencyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("devrait extraire les agences de l'enveloppe GlobalResponse", () => {
    const agences = [
      {
        id: '7b0a9a1e-0000-0000-0000-00000000000a',
        name: 'Ymmo Aix Centre',
        city: 'Aix-en-Provence',
        postalCode: '13100',
        status: AgencyStatus.OPEN,
      } as unknown as AgencyResponseDto,
    ];
    const enveloppe: GlobalResponse<AgencyResponseDto[]> = {
      data: agences,
      message: null,
      success: true,
      timestamp: '01-06-2026 10:00:00',
    };

    let resultat: AgencyResponseDto[] | undefined;
    service.getAllAgencies().subscribe((liste) => (resultat = liste));

    const requete = httpMock.expectOne('http://localhost:8080/api/agencies');
    expect(requete.request.method).toBe('GET');
    requete.flush(enveloppe);

    expect(resultat).toEqual(agences);
  });
});
