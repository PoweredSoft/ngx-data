import { Component, OnInit } from '@angular/core';
import { GenericRestDataSourceService } from 'projects/poweredsoft/ngx-data/src/public-api';
import { of, Observable } from 'rxjs';
import { DataSource, IResolveCommandModelEvent } from '@poweredsoft/data';
import { GraphQLDataSourceService } from 'projects/poweredsoft/ngx-data-apollo/src/public-api';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { DocumentNode } from 'graphql';


export interface IContact {
  id: number;
  firstName :string;
  lastName: string;
}

export interface ICustomerModel {
  id: number;
  firstName: string;
  lastName: string;
}

export interface IFooCommand {
  amount: number;
  comment: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ngx-data';
  dataSource: DataSource<ICustomerModel>;

  constructor(genericService: GenericRestDataSourceService, private apollo: Apollo, private graphQLService: GraphQLDataSourceService) {
    const keyResolver = (model: ICustomerModel) => model.id;

    const transportOptions = genericService.createStandardRestTransportOptions('api/customer', keyResolver);

    this.dataSource = new DataSource<ICustomerModel>({
      resolveIdField: keyResolver,
      transport: transportOptions,
      defaultCriteria: {
        page: 1,
        pageSize: 5,
        groups: [
          { path: 'lastName' }
        ]
      }
    });
  }

  ngOnInit(): void {
    this.dataSource.notifyMessage$.subscribe((notification) => {
      console.log(notification);
    });

    this.dataSource.validationError$.subscribe((notification) => {
      console.log(notification);
    });
  }

  onCreate(): void {
    console.log('excuting command!');
    this.dataSource.executeCommandByName('create', {
      firstName: "",
      lastName: "Baba"
    }).subscribe(() => {

    }, error => {
      //console.log(error);
    });
  }

  onDelete(): void {
    console.log('excuting command!');
    this.dataSource.executeCommandByName('delete', {
      id: 1
    }).subscribe(() => {

    }, error => {
      //console.log(error);
    });
  }

  testGraphQLMutation() {
    const builder = this.graphQLService.createDataSourceOptionsBuilder<IContact, number>(
      'contacts',
      'GraphQLAdvanceQueryOfContactModelInput',
      'id firstName lastName',
      (m) => m.id,
      {
        groups: [
          {
            path: 'sex'
          }
        ],
        aggregates: [
          {
            path: 'id',
            type: 'Max'
          }
        ]
      }
    );

    builder.addMutation<IFooCommand, string>('create', 'foo', (command) => {
      return this.apollo.mutate<string>({
          mutation: gql`mutation executeFoo($command: FooCommandInput) {
            foo(params: $command)
          }`,
          variables: {
            command: command
          }
        });
    },
    (event) => {
      console.log(event);
      if (event.model.id)

      return of({
        firstName: 'hello world'
      });
    });

    const dataSourceOptions = builder.create();
    const dataSource = new DataSource<IContact>(dataSourceOptions);
    let event: IResolveCommandModelEvent<IContact> = {
      command: 'create',
      model: {
        id: 1,
        firstName: 'hello',
        lastName: 'world'
      }
    };

    dataSource.resolveCommandModelByName(event)
      .subscribe((result) => {
        console.log('resolve result', result);
      });

    dataSource.executeCommandByName('create', {
      amount: 0,
      //comment: "hello"
    }).subscribe((result) => {
      console.log(result);
    })
  }

  testGraphQL() {
    const builder = this.graphQLService.createDataSourceOptionsBuilder<IContact, number>(
      'contacts',
      'GraphQLAdvanceQueryOfContactModelInput',
      'id firstName lastName',
      (m) => m.id,
      {
        groups: [
          {
            path: 'sex'
          }
        ],
        aggregates: [
          {
            path: 'id',
            type: 'Max'
          }
        ]
      }
    );

    const dataSourceOptions = builder.create();
    const dataSource = new DataSource<IContact>(dataSourceOptions);
    
    const subscription = dataSource.data$.subscribe(contacts => {
      console.log(contacts);
    });
    dataSource.refresh();
  }
}
