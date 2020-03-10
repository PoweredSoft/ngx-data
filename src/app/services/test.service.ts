import { Injectable } from '@angular/core';
import { IGraphQLAdvanceQueryInput, GraphQLDataSourceService } from 'projects/poweredsoft/ngx-data-apollo/src/public-api';
import { IQueryCriteria, DataSource } from '@poweredsoft/data';
import { of } from 'rxjs';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

export interface IValidationTestCommand {
  value: string;
}

export interface ITestModel {
  id: string;
}

export interface ITestQuery extends IGraphQLAdvanceQueryInput<ITestModel> {

}

export interface IGenerateDatasource<T, TAdvanceQuery extends IGraphQLAdvanceQueryInput<T>> {
  criteria: IQueryCriteria;
  beforeReadQueryCriteria?: TAdvanceQuery
}

export interface IGenerateItemDatasource extends IGenerateDatasource<ITestModel, ITestQuery> {
}

@Injectable({
  providedIn: 'root'
})
export class TestService {
  constructor(private graphQLService: GraphQLDataSourceService, private apollo: Apollo) { }

  generateDatasource(options: IGenerateItemDatasource) {
    const keyResolver = (m: ITestModel) => m.id;
    let builder = this.graphQLService.createDataSourceOptionsBuilder<ITestModel, string>(
      "test",
      "TestQueryInput",
      [
        'id'
      ],
      keyResolver,
      options.criteria
    );

    if (options.beforeReadQueryCriteria) {
      builder.beforeRead<ITestQuery>(query => {
        return of({ ...query, ...options.beforeReadQueryCriteria });
      });
    }

    builder.addMutation<IValidationTestCommand, string>(
      'validationTest',
      'validationTest',
      (command) => {
        return this.apollo.mutate<string>({
          mutation:gql`mutation executeValidationTest($command: ValidationTestCommandInput) {
            validationTest(params: $command)
          }`,
          variables: {
            command: command
          }
      });
    });

    return new DataSource<ITestModel>(builder.create());
  }
}
