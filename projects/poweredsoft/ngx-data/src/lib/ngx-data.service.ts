import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { IDataSourceTransportOptions, IDataSourceCommandAdapterOptions } from '@poweredsoft/data';
import { IQueryExecutionResult, IQueryExecutionGroupResult, IQueryCriteria } from '@poweredsoft/data';
import { IDataSourceQueryAdapterOptions } from '@poweredsoft/data';

@Injectable({
    providedIn: 'root'
})
export class GenericRestDataSourceService 
{
    constructor(private http: HttpClient) {


    }

    createStandardRestTransportOptions<TModel, TKey>(route: string, keyResolver: (model: TModel) => TKey) : IDataSourceTransportOptions<TModel> {

        const query: IDataSourceQueryAdapterOptions<TModel> = {
            adapter: {
                handle: (criteria: IQueryCriteria) => {
                    const queryRoute = `${route}/read`;
                    return this.http.post<IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>(queryRoute, criteria);
                }
            }
        };

        const createCommand: IDataSourceCommandAdapterOptions<TModel> = {
            adapter: {
                handle: (command: TModel) => {
                    return this.http.post<TModel>(route, command);
                }
            }
        };

        const updateCommand: IDataSourceCommandAdapterOptions<TModel> = {
            adapter: {
                handle: (command: TModel) => {
                    const key = keyResolver(command);
                    const updateRoute = `${route}/${encodeURIComponent(key as any)}`;
                    return this.http.put<TModel>(updateRoute, command);
                }
            }
        };

        const deleteCommand: IDataSourceCommandAdapterOptions<TModel> = {
            adapter: {
                handle: (command: TModel) => {
                    const key = keyResolver(command);
                    const updateRoute = `${route}/${encodeURIComponent(key as any)}`;
                    return this.http.delete<TModel>(updateRoute);
                }
            }
        };

        return {
            query: query,
            commands: {
                'create': createCommand,
                'update': updateCommand,
                'delete': deleteCommand
            }
        };
    }
}