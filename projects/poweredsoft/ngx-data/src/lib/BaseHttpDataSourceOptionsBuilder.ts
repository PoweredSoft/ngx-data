import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { DataSource, IDataSource, IDataSourceCommandAdapterOptions, IDataSourceError, IDataSourceErrorMessage, IDataSourceOptions, IDataSourceQueryAdapterOptions, IDataSourceTransportOptions, IDataSourceValidationError, IQueryCriteria, IResolveCommandModelEvent } from "@poweredsoft/data";
import { Observable, of, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";



export abstract class BaseHttpDataSourceOptionsBuilder<TModel, TKey> {
    protected _commands: { [key: string]: IDataSourceCommandAdapterOptions<any>; } = {};
    protected _keyResolver: (model: TModel) => TKey;
    protected _defaultCriteria: IQueryCriteria;
    protected _query: IDataSourceQueryAdapterOptions<TModel>;

    constructor(protected http: HttpClient) {
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


    createOptions(): IDataSourceOptions<TModel> {
        let ret: IDataSourceOptions<TModel> = {
            resolveIdField: this._keyResolver,
            defaultCriteria: this._defaultCriteria,
            transport: this.createTransport()
        };
        return ret;
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

}
