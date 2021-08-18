import { Component, OnInit } from '@angular/core';
import { GenericRestDataSourceService } from 'projects/poweredsoft/ngx-data/src/public-api';
import { of, Observable } from 'rxjs';
import { DataSource, IDataSource, IQueryCriteria, IResolveCommandModelEvent } from '@poweredsoft/data';
import {  } from 'projects/poweredsoft/ngx-data-apollo/src/public-api';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { DocumentNode } from 'graphql';
import { GraphQLDataSourceService, IGraphQLAdvanceQueryInput } from 'projects/poweredsoft/ngx-data-apollo/src/public-api';
import { TestService, ITestModel, IValidationTestCommand } from './services/test.service';
import { HttpDataSourceService} from '@poweredsoft/ngx-data';

export interface IContact 
{
  id: number
  displayName: string
}

export interface IPerson {
  id: number,
  firstName: string,
  lastName: string
}

export interface ICreatePerson {
  firstName: string
  lastName: string
}

export interface IEchoCommand {
  message: string
}

export interface IMyQuery extends IQueryCriteria{
  params: {
    showDisabled: boolean
  }
}

export interface IOnePersonQuery {
  personId: number
}

export interface IListPersonQuery {
  search?: string
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ngx-data';
  dataSource: IDataSource<IContact>;
  latestData: any;

  onePersonDs: IDataSource<IPerson>;
  listPersonDs: IDataSource<IPerson>;
  latestSingle: any;
  latestList: any;

  constructor(private hdss: HttpDataSourceService) {

    this.onePersonDs = hdss.singleBuilder<IOnePersonQuery, IPerson, number>()
      .keyResolver(t => t.id)
      .queryUrl('https://localhost:5001/api/query/onePerson')
      .beforeRead(_ => {
        return of({
          personId: 1
        })
      })
      .createDataSource();

    this.listPersonDs = hdss.listBuilder<IListPersonQuery, IPerson, number>()
      .keyResolver(t => t.id)
      .queryUrl('https://localhost:5001/api/query/listPerson')
      .beforeRead(criteria => {
        return of({
          search: "Doe"
        })
      })
      .createDataSource();

    const ds = hdss
      .builder<IContact, number>()
      .keyResolver(m => m.id)
      .defaultCriteria({
        page: 1,
        pageSize: 5
      })
      .beforeRead<IMyQuery>(q => {
        q.params = { 
          showDisabled: true
        };
        return of(q);
      })
      .queryUrl('https://localhost:5001/api/query/contacts')
      .addCommandByUrl<ICreatePerson, void>("createPerson", 'https://localhost:5001/api/command/createPerson', 
        e => {
        return of (<ICreatePerson>{
          firstName: '',
          lastName: ''
        })
      })
      .addCommandByUrl<IEchoCommand, string>('echo', 'https://localhost:5001/api/command/echo')
      .createDataSource();

      this.dataSource = ds;
  }

  ngOnInit(): void {

    this.dataSource.data$.subscribe(newData => {
      this.latestData = newData;
    });

    this.dataSource.notifyMessage$.subscribe(message => {
      if (message.type == 'error')
        alert(message.message);
    });

    this.onePersonDs.data$.subscribe(onePerson => {
      this.latestSingle = onePerson;
    })

    this.listPersonDs.data$.subscribe(t => {
      this.latestList = t;
    })
  }

  refresh() {
    this.dataSource.refresh();
    this.onePersonDs.refresh();
    this.listPersonDs.refresh();
  }

  echoCommand() {
    const message = prompt('What message you wish to echo? ');
    this.dataSource.executeCommandByName<IEchoCommand, string>('echo', {
      message: message
    }).subscribe(
      commandResult => alert(commandResult),
      err => console.log(err)
      );
  }
}
