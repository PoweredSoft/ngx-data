import { IDataSourceOptions, IQueryCriteria, IDataSourceTransportOptions, IDataSourceQueryAdapterOptions, IDataSourceCommandAdapterOptions, IAdvanceQueryAdapter, IFilter, IAggregate, ISort, IGroup, ISimpleFilter, ICompositeFilter, IQueryExecutionGroupResult, IQueryExecutionResult, IAggregateResult } from '@poweredsoft/data';
import { Apollo } from 'apollo-angular';
import { IGraphQLAdvanceQueryResult, IGraphQLAdvanceQueryInput, IGraphQLAdvanceQueryFilterInput, IGraphQLAdvanceQueryAggregateInput, IGraphQLAdvanceQuerySortInput, IGraphQLAdvanceQueryGroupInput, FilterType, IGraphQLAdvanceQueryAggregateResult, IGraphQLVariantResult, AggregateType } from './models';
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';
import { map, catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';

export class GraphQLDataSourceOptionsBuilder<TModel, TKey> {

    private _commands: { [key: string] : IDataSourceCommandAdapterOptions<any> };

    constructor(private apollo: Apollo, 
        private queryName: string, 
        private queryInputName: string, 
        private querySelect: string, 
        private keyResolver: (model: TModel) => TKey, 
        private defaultCriteria: IQueryCriteria, 
        private manageNotificationMessage: boolean) 
    {
    }
    create(): IDataSourceOptions<TModel> {
        let ret: IDataSourceOptions<TModel> = {
            resolveIdField: this.keyResolver,
            defaultCriteria: this.defaultCriteria,
            manageNotificationMessage: this.manageNotificationMessage,
            transport: this.createTransport()
        };
        return ret;
    }
    protected createTransport(): IDataSourceTransportOptions<TModel> {
        let ret: IDataSourceTransportOptions<TModel> = {
            query: this.createQuery(),
            commands: this._commands
        };
        return ret;
    }
    
    protected createQuery(): IDataSourceQueryAdapterOptions<TModel> {
        let ret: IDataSourceQueryAdapterOptions<TModel> = {
            adapter: <IAdvanceQueryAdapter<IQueryCriteria, TModel>>{
                handle: (query: IQueryCriteria) => {
                    const advanceQuery = this.createGraphQLQueryCriteria(query);
                    const o$ = this.apollo.query<any>({
                        query: this.createGraphQLQuery(query),
                        variables: {
                            criteria: advanceQuery
                        }
                    });
                    return o$.pipe(
                        map(result => {
                            const queryResult = result.data[this.queryName] as IGraphQLAdvanceQueryResult<TModel>;
                            return this.queryResultFromGraphQLAdvancedResult(query, queryResult);
                        }),
                        catchError(err => {
                            console.error(err);
                            return err;
                        })
                    );
                }
            }
        };
        return ret;
    }
    private queryResultFromGraphQLAdvancedResult(query: IQueryCriteria, result: IGraphQLAdvanceQueryResult<TModel>): IQueryExecutionResult<TModel> | IQueryExecutionGroupResult<TModel> {
        if (query.groups && query.groups.length) {
            throw 'todo';
        }
        const ret: IQueryExecutionResult<TModel> = {
            data: result.data,
            totalRecords: result.totalRecords,
            numberOfPages: result.numberOfPages,
            aggregates: result.aggregates ? result.aggregates.map(this.fromGraphQLAggregateResult.bind(this)) : null
        };
        return ret;
    }
    private fromGraphQLAggregateResult(agg: IGraphQLAdvanceQueryAggregateResult): IAggregateResult {
        return {
            path: agg.path,
            type: this.normalizeFirstLetter(agg.type),
            value: this.getValueFromVariantResult(agg.value)
        };
    }

    private normalizeFirstLetter(type: string): string {
        if (type) {
            const ret = type.toLowerCase();
            return ret.substring(0, 1).toUpperCase() + ret.substring(1);
        }

        return type;
    }

    private getValueFromVariantResult(variant: IGraphQLVariantResult): any {

        if (variant && variant.typeName)
        {
            if (variant.typeName.toLowerCase()  == "int")
                return variant.intValue;
            else if (variant.typeName.toLowerCase()  == "long")
                return variant.longValue;
            else if (variant.typeName.toLowerCase()  == "boolean")
                return variant.booleanValue;
            else if (variant.typeName.toLowerCase()  == "decimal")
                return variant.decimalValue;
            else if (variant.typeName.toLowerCase()  == "datetime")
                return variant.dateTimeValue;
            else if (variant.typeName.toLowerCase()  == "string")
                return variant.stringValue;
            else if (variant.typeName.toLowerCase() == "json")
                return JSON.parse(variant.json);
        }

        return null;
    }
    private createGraphQLQuery(query: IQueryCriteria): DocumentNode {
        return gql`
            query getAll($criteria: ${this.queryInputName}) {
                ${this.queryName}(params: $criteria) {
                    totalRecords
                    numberOfPages
                    ${this.createAggregateSelect(query)}
                    ${this.createQuerySelect(query)}
                }
            }
        `;
    }

    private createAggregateSelect(query: IQueryCriteria): any {

        if (query.aggregates && query.aggregates.length) 
        {
            return `
                aggregates {
                    type
                    path
                    value {
                        booleanValue
                        dateTimeValue
                        decimalValue
                        intValue
                        json
                        longValue
                        stringValue
                        typeName
                    }
                }
            `;
        }

        return '';
    }

    private createGraphQLQueryCriteria(query: IQueryCriteria): IGraphQLAdvanceQueryInput<TModel> {
        const ret: IGraphQLAdvanceQueryInput<TModel> = {
            page: query.page,
            pageSize: query.pageSize,
            filters: query.filters ? query.filters.map(this.convertFilter.bind(this)) : null,
            sorts: query.sorts ? query.sorts.map(this.convertSort.bind(this)) : null,
            aggregates: query.aggregates ? query.aggregates.map(this.convertAggregates.bind(this)) : null,
            groups: query.groups ? query.groups.map(this.convertGroup.bind(this)) : null
        };
        return ret;
    }

    public addMutation<TMutation, TMutationResult>(name: string, handle: (command: TMutation) => Observable<TMutationResult>) {

        this._commands[name] = <IDataSourceCommandAdapterOptions<TMutation>> {
            adapter: {
                handle: handle
            }
        };

        return this;
    }

    private createQuerySelect(query: IQueryCriteria): string {
        if (query.groups && query.groups.length) {
            throw 'todo';
        }
        return `
            data {
                ${this.querySelect}
            }
        `;
    }
    private convertGroup(group: IGroup): IGraphQLAdvanceQueryGroupInput {
        return {
            path: group.path,
            ascending: group.ascending
        };
    }
    private convertAggregates(aggregate: IAggregate): IGraphQLAdvanceQueryAggregateInput {
        return {
            path: aggregate.path,
            type: this.resolveAggregateType(aggregate.type)
        };
    }

    private resolveAggregateType(type: string): AggregateType {

        return type ? type.toUpperCase() as any : null;

        /*

        if (type)
        {
            if (type.toUpperCase() == 'COUNT') return AggregateType.COUNT
            if (type.toUpperCase() == 'SUM') return AggregateType.SUM
            if (type.toUpperCase() == 'AVG') return AggregateType.AVG
            if (type.toUpperCase() == 'LONGCOUNT') return AggregateType.LONGCOUNT
            if (type.toUpperCase() == 'MIN') return AggregateType.MIN
            if (type.toUpperCase() == 'MAX') return AggregateType.MAX
            if (type.toUpperCase() == 'FIRST') return AggregateType.FIRST
            if (type.toUpperCase() == 'FIRSTORDEFAULT') return AggregateType.FIRSTORDEFAULT
            if (type.toUpperCase() == 'LAST') return AggregateType.LAST
            if (type.toUpperCase() == 'LASTORDEFAULT') return AggregateType.LASTORDEFAULT
        }

        throw new Error('Aggregate type');*/
    }

    private convertSort(sort: ISort): IGraphQLAdvanceQuerySortInput {
        return {
            path: sort.path,
            ascending: sort.ascending
        };
    }
    private convertFilter(filter: IFilter): IGraphQLAdvanceQueryFilterInput {
        if (filter.type == "Composite") {
            const compositeFilter = filter as ICompositeFilter;
            return {
                not: false,
                and: compositeFilter.and,
                type: FilterType.COMPOSITE,
                filters: compositeFilter.filters.map(this.convertFilter.bind(this)),
            };
        }
        const simpleFilter = filter as ISimpleFilter;
        return {
            filters: null,
            and: filter.and,
            not: false,
            path: simpleFilter.path,
            type: this.resolveFilterType(simpleFilter.type),
            value: {
                stringValue: simpleFilter.value as string
            }
        };
    }

    private resolveFilterType(type: string): FilterType {
        return type ? type.toUpperCase() as any: null;

        /*
        if (type)
        {
            if (type.toUpperCase() == 'EQUAL') return FilterType.EQUAL
            if (type.toUpperCase() == 'CONTAINS') return FilterType.CONTAINS
            if (type.toUpperCase() == 'STARTSWITH') return FilterType.STARTSWITH
            if (type.toUpperCase() == 'ENDSWITH') return FilterType.ENDSWITH
            if (type.toUpperCase() == 'COMPOSITE') return FilterType.COMPOSITE
            if (type.toUpperCase() == 'NOTEQUAL') return FilterType.NOTEQUAL
            if (type.toUpperCase() == 'GREATERTHAN') return FilterType.GREATERTHAN
            if (type.toUpperCase() == 'LESSTHANOREQUAL') return FilterType.LESSTHANOREQUAL
            if (type.toUpperCase() == 'GREATERTHANOREQUAL') return FilterType.GREATERTHANOREQUAL
            if (type.toUpperCase() == 'LESSTHAN') return FilterType.LESSTHAN
            if (type.toUpperCase() == 'IN') return FilterType.IN
            if (type.toUpperCase() == 'NOTIN') return FilterType.NOTIN
        }

        throw new Error('unknown filter type');*/
    }
}
