import { HttpClient } from "@angular/common/http";
import { IQueryCriteria, IQueryExecutionGroupResult, IQueryExecutionResult, IQueryExecutionResultPaging } from "@poweredsoft/data";
import { Observable, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { BaseHttpDataSourceOptionsBuilder } from "./BaseHttpDataSourceOptionsBuilder";

export class ListDataSourceOptionsBuilder<TQuery, TModel, TKey> 
    extends BaseHttpDataSourceOptionsBuilder<TModel, TKey>
{
    private _beforeRead: (query: IQueryCriteria) => Observable<TQuery>;
    
    constructor(http: HttpClient) {
        super(http);
    }

    public beforeRead(beforeRead: (query: IQueryCriteria) => Observable<TQuery>) {
        this._beforeRead = beforeRead;
        return this;
    }

    public queryUrlWithGet(url: string) {
        this._query = {
            adapter: {
                handle: (query: IQueryCriteria) => {
                    const finalBeforeRead = this._beforeRead || ((_: IQueryCriteria) => of(<TQuery>{}));
                    return finalBeforeRead(query)
                        .pipe(
                            switchMap(finalQuery => {
                                return this.http.get<TModel[]>(url, {
                                    params: this.convertToParams(finalQuery)
                                }).pipe(
                                    map(result => {
                                        return <IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>
                                        {
                                            totalRecords: result.length,
                                            data: result
                                        };
                                    })
                                )
                            })
                        );
                }
            }
        }

        return this;
    }

    protected convertToParams(finalQuery: TQuery) 
    {
        return Object.keys(finalQuery).reduce((prev, key) => {
            prev[key] = finalQuery[key];
            return prev;
        }, {} as { [param: string]: string | string[]; });
    }

    public queryUrl(url: string) {
        this._query = {
            adapter: {
                handle: (query: IQueryCriteria) => {
                    const finalBeforeRead = this._beforeRead || ((_: IQueryCriteria) => of(<TQuery>{}));
                    return finalBeforeRead(query)
                        .pipe(
                            switchMap(finalQuery => {
                                return this.http.post<TModel[]>(url, finalQuery).pipe(
                                    map(result => {
                                        return <IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>
                                        {
                                            totalRecords: result.length,
                                            data: result
                                        };
                                    })
                                )
                            })
                        );
                }
            }
        }

        return this;
    }

    public queryHandler(queryHandler: (query: IQueryCriteria) => Observable<TModel[]>) {
        this._query = {
            adapter: {
                handle: (query: TQuery) => {
                    const finalBeforeRead = this._beforeRead || (t => of({}));
                    return finalBeforeRead(query)
                        .pipe(
                            switchMap(finalQuery => {
                                return queryHandler(finalQuery).pipe(
                                    map(result => {
                                        return <IQueryExecutionResult<TModel> & IQueryExecutionGroupResult<TModel>>{
                                            totalRecords: result.length,
                                            data: result
                                        };
                                    })
                                )
                            })
                        );
                }
            }
        }

        return this;
    }
}
