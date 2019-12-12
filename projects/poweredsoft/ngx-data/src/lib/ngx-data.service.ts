import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { IDataSourceTransportOptions, IDataSourceCommandAdapterOptions, IDataSourceOptions, IResolveCommandModelEvent, IDataSourceError, IDataSourceErrorMessage, IDataSourceValidationError } from '@poweredsoft/data';
import { IQueryExecutionResult, IQueryExecutionGroupResult, IQueryCriteria } from '@poweredsoft/data';
import { IDataSourceQueryAdapterOptions } from '@poweredsoft/data';
import { catchError} from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GenericRestDataSourceService 
{
    constructor(private http: HttpClient) {


    }

    private _handleErrorPipe(err: HttpErrorResponse) : Observable<IDataSourceError> {
        //console.log(typeof(err.error), err);

        if (err.status == 500) {
            return throwError(<IDataSourceErrorMessage>{
                type: 'message',
                message: 'An unexpected error has occured'
            });
        }

        if (typeof(err.error) == "object") {
            // if status not okay then its an exception error
            if (err.error.hasOwnProperty('Message') && typeof(err.error['Message']) == "string") {
                return throwError(<IDataSourceErrorMessage>{
                    type: 'message',
                    message: err.error['Message']
                });
            }

            return throwError(<IDataSourceValidationError>{
                type: 'validation',
                errors: err.error
            });
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
            message: 'An unexpected error has occured'
        });
    }

    createDataSourceOptions<TModel, TKey>(route: string, keyResolver: (model: TModel) => TKey, defaultCriteria: IQueryCriteria, manageNotificationMessage: boolean = true) : IDataSourceOptions<TModel>
    {
        const dataSourceTransportOptions = this.createStandardRestTransportOptions<TModel, TKey>(route, keyResolver);

        const dataSourceOptions: IDataSourceOptions<TModel> = {
            defaultCriteria: defaultCriteria,
            resolveIdField: keyResolver,
            manageNotificationMessage: manageNotificationMessage,
            transport: dataSourceTransportOptions
        };

        return dataSourceOptions;
    }

    setResolveCommand<TModel>(options: IDataSourceOptions<TModel>, name: string, resolveCommandModel: (event: IResolveCommandModelEvent<TModel>) => Observable<any>) {
        options.transport.commands[name].resolveCommandModel = resolveCommandModel;
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