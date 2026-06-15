import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AgentLayout } from './agent-layout';

describe('AgentLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentLayout],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(AgentLayout);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
