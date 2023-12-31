import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { IDataSourceTransportOptions, IDataSourceCommandAdapterOptions, IDataSourceOptions, IResolveCommandModelEvent, IDataSourceError, IDataSourceErrorMessage, IDataSourceValidationError } from '@poweredsoft/data';
import { IQueryExecutionResult, IQueryExecutionGroupResult, IQueryCriteria } from '@poweredsoft/data';
import { IDataSourceQueryAdapterOptions } from '@poweredsoft/data';
import { catchError, switchMap} from 'rxjs/operators';
import { throwError, Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GenericRestDataSourceService 
{
    constructor(private http: HttpClient) {


    }

    private _handleErrorPipe(err: HttpErrorResponse) : Observable<IDataSourceError> {
        
        if (err.status == 500) {
            return throwError(<IDataSourceErrorMessage>{
                type: 'message',
                message: 'UNEXPECTED_ERROR_MESSAGE'
            });
        }

        if (err.status == 400) 
        {
            if (err.error && err.error.errors)
                return throwError(<IDataSourceValidationError>{
                    type: 'validation',
                    errors: err.error.errors
                });

            // if status not okay then its an exception error
            if (err.error.hasOwnProperty('Message') && typeof(err.error['Message']) == "string") {
                return throwError(<IDataSourceErrorMessage>{
                    type: 'message',
                    message: err.error['Message']
                });
            }
        }

        // general error message
        if (typeof(err.error) == "string") {
            return throwError(<IDataSourceErrorMessage>{
                type: 'message',
                message: err.error
            });
        }

        return throwError(<IDataSourceErrorMessage>{
            type: 'message',
            message: 'UNEXPECTED_ERROR_MESSAGE'
        });
    }

    createDataSourceOptions<TModel, TKey>(route: string, keyResolver: (model: TModel) => TKey, defaultCriteria: IQueryCriteria, beforeRead?: (query: IQueryCriteria) => Observable<IQueryCriteria>) : IDataSourceOptions<TModel>
    {
        const dataSourceTransportOptions = this.createStandardRestTransportOptions<TModel, TKey>(route, keyResolver, beforeRead);

        const dataSourceOptions: IDataSourceOptions<TModel> = {
            defaultCriteria: defaultCriteria,
            resolveIdField: keyResolver,
            transport: dataSourceTransportOptions
        };

        return dataSourceOptions;
    }

    setResolveCommand<TModel>(options: IDataSourceOptions<TModel>, name: string, resolveCommandModel: (event: IResolveCommandModelEvent<TModel>) => Observable<any>) {
        options.transport.commands[name].resolveCommandModel = resolveCommandModel;
    }

    createStandardRestTransportOptions<TModel, TKey>(route: string, keyResolver: (model: TModel) => TKey, beforeRead?: (query: IQueryCriteria) => Observable<IQueryCriteria>) : IDataSourceTransportOptions<TModel> {

        const query: IDataSourceQueryAdapterOptions<TModel> = {
            adapter: {
                handle: (criteria: IQueryCriteria) => {
                    const queryRoute = `${route}/read`;
                    const finalBeforeRead = beforeRead || (t => of(criteria));
                    return finalBeforeRead(criteria)
                        .pipe(
                            switchMap(finalQuery => {
                                return this.http.post<IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>(queryRoute, finalQuery);
                            })
                        );
                }
            }
        };

        const createCommand: IDataSourceCommandAdapterOptions<TModel> = {
            adapter: {
                handle: (command: TModel) => {
                    return this.http.post<TModel>(route, command).pipe(catchError(this._handleErrorPipe));
                }
            }
        };

        const updateCommand: IDataSourceCommandAdapterOptions<TModel> = {
            adapter: {
                handle: (command: TModel) => {
                    const key = keyResolver(command);
                    const updateRoute = `${route}/${encodeURIComponent(key as any)}`;
                    return this.http.put<TModel>(updateRoute, command).pipe(catchError(this._handleErrorPipe));
                }
            }
        };

        const deleteCommand: IDataSourceCommandAdapterOptions<TModel> = {
            adapter: {
                handle: (command: TModel) => {
                    const key = keyResolver(command);
                    const updateRoute = `${route}/${encodeURIComponent(key as any)}`;
                    return this.http.delete<TModel>(updateRoute).pipe(catchError(this._handleErrorPipe));
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