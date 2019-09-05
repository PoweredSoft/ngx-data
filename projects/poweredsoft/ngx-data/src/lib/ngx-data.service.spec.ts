import { TestBed } from '@angular/core/testing';

import { NgxDataService } from './ngx-data.service';

describe('NgxDataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NgxDataService = TestBed.get(NgxDataService);
    expect(service).toBeTruthy();
  });
});
