import { HttpClient, HttpResponse } from "@angular/common/http";
import { IQueryCriteria, IQueryExecutionGroupResult, IQueryExecutionResult } from "@poweredsoft/data";
import { Observable, of } from "rxjs";
import { switchMap } from "rxjs/operators";
import { BaseHttpDataSourceOptionsBuilder } from "./BaseHttpDataSourceOptionsBuilder";

export class HttpDataSourceOptionsBuilder<TModel, TKey> 
    extends BaseHttpDataSourceOptionsBuilder<TModel, TKey>
{
    private _beforeRead: (TQuery: IQueryCriteria) => Observable<IQueryCriteria>;


    constructor(http: HttpClient) {
        super(http);
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

    defaultCriteria(criteria: IQueryCriteria) {
        this._defaultCriteria = criteria;
        return this;
    }
}
