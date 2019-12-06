import { Injectable } from '@angular/core';
import { IQueryCriteria, IDataSource } from '@poweredsoft/data';
import { Apollo } from 'apollo-angular';
import { GraphQLDataSourceOptionsBuilder } from './GraphQLDataSourceOptionsBuilder';

@Injectable({
    providedIn: 'root'
})
export class GraphQLDataSourceService
{
    constructor(private apollo: Apollo) {

    }

    createDataSourceOptionsBuilder<TModel, TKey>(
        queryName: string, 
        queryInputName: string,
        querySelect: string,
        keyResolver: (model: TModel) => TKey, 
        defaultCriteria: IQueryCriteria,
        manageNotificationMessage: boolean = true) : GraphQLDataSourceOptionsBuilder<TModel, TKey>
    {
        return new GraphQLDataSourceOptionsBuilder(
            this.apollo, 
            queryName,
            queryInputName, 
            querySelect,
            keyResolver, 
            defaultCriteria, 
            manageNotificationMessage
        );
    }   
}

