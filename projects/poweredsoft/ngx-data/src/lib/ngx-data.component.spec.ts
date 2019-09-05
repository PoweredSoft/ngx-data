import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxDataComponent } from './ngx-data.component';

describe('NgxDataComponent', () => {
  let component: NgxDataComponent;
  let fixture: ComponentFixture<NgxDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
