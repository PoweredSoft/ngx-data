import { Component, OnInit } from '@angular/core';
import { GenericRestDataSourceService } from 'projects/poweredsoft/ngx-data/src/public-api';
import { of, Observable } from 'rxjs';
import { DataSource, IResolveCommandModelEvent } from '@poweredsoft/data';
import {  } from 'projects/poweredsoft/ngx-data-apollo/src/public-api';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { DocumentNode } from 'graphql';
import { GraphQLDataSourceService, IGraphQLAdvanceQueryInput } from 'projects/poweredsoft/ngx-data-apollo/src/public-api';
import { TestService, ITestModel, IValidationTestCommand } from './services/test.service';


export interface IContact {
  id: number;
  firstName :string;
  lastName: string;
}

export interface IContactModel {
  id: number;
  firstName: string;
  lastName: string;
}

export interface IFooCommand {
  amount: number;
  comment: string;
}

export interface IContactDetailQuery extends IGraphQLAdvanceQueryInput<IContactModel>
{
  sex?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ngx-data';
  dataSource: DataSource<ITestModel>;

  constructor(private testService: TestService) {
    this.dataSource = testService.generateDatasource({
      criteria: {
        page: 1,
        pageSize: 10
      }
    });
  }

  ngOnInit(): void {
    this.dataSource.notifyMessage$.subscribe((notification) => {
      console.log('notifcation', notification);
    });

    this.dataSource.validationError$.subscribe((notification) => {
      console.log('error', notification);
    });
  }

  testValidation() {
    this.dataSource.executeCommandByName<IValidationTestCommand, string>('validationTest', {
      value: 'test'
    }).subscribe((result) => {
      console.log(result);
    });
  }
}
