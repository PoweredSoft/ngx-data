import { HttpClient, HttpErrorResponse, HttpResponse } from "@angular/common/http";
import { DataSource, IDataSource, IDataSourceCommandAdapterOptions, IDataSourceError, IDataSourceErrorMessage, IDataSourceOptions, IDataSourceQueryAdapterOptions, IDataSourceTransportOptions, IDataSourceValidationError, IQueryCriteria, IQueryExecutionGroupResult, IQueryExecutionResult, IResolveCommandModelEvent } from "@poweredsoft/data";
import { Observable, of, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";



export class HttpDataSourceOptionsBuilder<TModel, TKey> {

    private _commands: { [key: string]: IDataSourceCommandAdapterOptions<any> } = {};
    private _beforeRead: (TQuery: IQueryCriteria) => Observable<IQueryCriteria>;
    private _keyResolver: (model: TModel) => TKey;
    private _defaultCriteria: IQueryCriteria;
    private _query: IDataSourceQueryAdapterOptions<TModel>;

    constructor(private http: HttpClient) {

    }

    createOptions(): IDataSourceOptions<TModel> {
        let ret: IDataSourceOptions<TModel> = {
            resolveIdField: this._keyResolver,
            defaultCriteria: this._defaultCriteria,
            transport: this.createTransport()
        };
        return ret;
    }

    createDataSource(): IDataSource<TModel> {
        return new DataSource<TModel>(this.createOptions());
    }

    protected createTransport(): IDataSourceTransportOptions<TModel> {
        let ret: IDataSourceTransportOptions<TModel> = {
            query: this._query,
            commands: this._commands
        };
        return ret;
    }

    public keyResolver(resolver: (model: TModel) => TKey) {
        this._keyResolver = resolver;
        return this;
    }

    public beforeRead<TDynamicQuery extends IQueryCriteria>(beforeRead: (query: TDynamicQuery) => Observable<TDynamicQuery>) {
        this._beforeRead = beforeRead;
        return this;
    }

    public queryUrl(url: string) {
        this._query = {
            adapter: {
                handle: (query: IQueryCriteria) => {
                    const finalBeforeRead = this._beforeRead || (t => of(query));
                    return finalBeforeRead(query)
                        .pipe(
                            switchMap(finalQuery => {
                                return this.http.post<IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>(url, finalQuery);
                            })
                        );
                }
            }
        }

        return this;
    }

    public queryHandler<TQuery extends IQueryCriteria>(queryHandler: (query: TQuery) => Observable<IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>) {
        this._query = {
            adapter: {
                handle: (query: TQuery) => {
                    const finalBeforeRead = this._beforeRead || (t => of(query));
                    return finalBeforeRead(query)
                        .pipe(
                            switchMap(finalQuery => {
                                return queryHandler(finalQuery as any);
                            })
                        );
                }
            }
        }

        return this;
    }

    private _messageErrorHandler(err: HttpErrorResponse) {

        if (typeof err.error == "object") {
            // if status not okay then its an exception error
            if (err.error.hasOwnProperty('Message') && typeof (err.error['Message']) == "string") {
                return throwError(<IDataSourceErrorMessage>{
                    type: 'message',
                    message: err.error['Message']
                });
            }
            else if (err.error.hasOwnProperty('message') && typeof (err.error['message']) == "string") {
                return throwError(<IDataSourceErrorMessage>{
                    type: 'message',
                    message: err.error['message']
                });
            }
        }

        // general error message
        if (typeof (err.error) == "string") {
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

    private _handleErrorPipe(err: HttpErrorResponse): Observable<IDataSourceError> {

        if (err.status == 400) {
            if (err.error && err.error.errors)
                return throwError(<IDataSourceValidationError>{
                    type: 'validation',
                    errors: err.error.errors
                });
        }

        return this._messageErrorHandler(err);
    }

    public addCommandByCallback<TCommand, TCommandResult>(name: string, commandHandler: (command: TCommand) => Observable<TCommandResult>, resolveCommandModel?: (event: IResolveCommandModelEvent<TModel>) => Observable<TCommand & any>) {
        const handleWrapper = command => {
            return commandHandler(command).pipe(catchError(err => this._handleErrorPipe.bind(this)));
        };

        this._commands[name] = <IDataSourceCommandAdapterOptions<TModel>>{
            adapter: {
                handle: handleWrapper
            },
            resolveCommandModel: resolveCommandModel
        };

        return this;
    }

    public addCommandByUrl<TCommand, TCommandResult>(name: string, url: string, resolveCommandModel?: (event: IResolveCommandModelEvent<TModel>) => Observable<TCommand & any>, beforeCommand?: (command: TCommand) => Observable<TCommand>) {
        const handleWrapper = command => {
            const finalBeforeCommand = beforeCommand || (_ => of(command));
            return finalBeforeCommand(command)
                .pipe(
                    switchMap(finalCommand => {
                        return this.http.post<TCommandResult>(url, finalCommand).pipe(catchError(this._handleErrorPipe.bind(this)));
                    })
                );
        };

        this._commands[name] = <IDataSourceCommandAdapterOptions<TModel>>{
            adapter: {
                handle: handleWrapper
            },
            resolveCommandModel: resolveCommandModel
        };

        return this;
    }

    defaultCriteria(criteria: IQueryCriteria) {
        this._defaultCriteria = criteria;
        return this;
    }
}
