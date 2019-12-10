import { IDataSourceOptions, IQueryCriteria, IDataSourceTransportOptions, IDataSourceQueryAdapterOptions, IDataSourceCommandAdapterOptions, IAdvanceQueryAdapter, IFilter, IAggregate, ISort, IGroup, ISimpleFilter, ICompositeFilter, IQueryExecutionGroupResult, IQueryExecutionResult, IAggregateResult, IGroupQueryResult, IResolveCommandModelEvent, IDataSourceErrorMessage, IDataSourceValidationError } from '@poweredsoft/data';
import { Apollo } from 'apollo-angular';
import { IGraphQLAdvanceQueryResult, IGraphQLAdvanceQueryInput, IGraphQLAdvanceQueryFilterInput, IGraphQLAdvanceQueryAggregateInput, IGraphQLAdvanceQuerySortInput, IGraphQLAdvanceQueryGroupInput, FilterType, IGraphQLAdvanceQueryAggregateResult, IGraphQLVariantResult, AggregateType, IGraphQLAdvanceGroupResult } from './models';
import gql from 'graphql-tag';
import { DocumentNode, GraphQLError } from 'graphql';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { FetchResult } from 'apollo-link';
import { of } from 'zen-observable';
import { ApolloError } from 'apollo-client';

export class GraphQLDataSourceOptionsBuilder<TModel, TKey> {
    querySelect: string;
    private _commands: { [key: string] : IDataSourceCommandAdapterOptions<any> } = {};

    constructor(private apollo: Apollo, 
        private queryName: string, 
        private queryInputName: string, 
        querySelect: string | string[], 
        private keyResolver: (model: TModel) => TKey, 
        private defaultCriteria: IQueryCriteria, 
        private manageNotificationMessage: boolean) 
    {
        if (Array.isArray(querySelect))
            this.querySelect = querySelect.join(' ');
        else
            this.querySelect = querySelect;
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
                        })
                    );
                }
            }
        };
        return ret;
    }
    private queryResultFromGraphQLAdvancedResult(query: IQueryCriteria, result: IGraphQLAdvanceQueryResult<TModel>): IQueryExecutionResult<TModel> | IQueryExecutionGroupResult<TModel> {
 
        const ret: IQueryExecutionGroupResult<TModel> & IQueryExecutionResult<TModel> = {
            data: result.data,
            groups: result.groups ? result.groups.map(this.fromGraphQLGroupResult.bind(this)) : null,
            totalRecords: result.totalRecords,
            numberOfPages: result.numberOfPages,
            aggregates: result.aggregates ? result.aggregates.map(this.fromGraphQLAggregateResult.bind(this)) : null
        };
        return ret;
    }

    private fromGraphQLGroupResult(group: IGraphQLAdvanceGroupResult<TModel>) : IGroupQueryResult<TModel> {
        return {
            aggregates: group.aggregates ? group.aggregates.map(this.convertAggregates.bind(this)) : null,
            data: group.data,
            groupPath: group.groupPath,
            groupValue: this.getValueFromVariantResult(group.groupValue),
            hasSubGroups: group.hasSubGroups,
            subGroups: group.subGroups ? group.subGroups.map(this.fromGraphQLGroupResult.bind(this)) : null
        };
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
                        ${this.createSelectVariant()}
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
        
    /*public addMutationTest<TMutation, TMutationResult>(name: string, mutationName: string, mutationSelect?: string, resolveCommandModel?: (event: IResolveCommandModelEvent<TModel>) => Observable<TMutation & any>) {
        this._commands[name] = <IDataSourceCommandAdapterOptions<TModel>> {
            adapter: {
                handle: this.apollo.use()
            },
            resolveCommandModel: resolveCommandModel
        };

        return this;
    }*/

    public addMutation<TMutation, TMutationResult>(name: string, mutationName: string, handle: (command: TMutation) => Observable<FetchResult<TMutationResult>>, resolveCommandModel?: (event: IResolveCommandModelEvent<TModel>) => Observable<TMutation & any>) {
        const handleWrapper = command => {
            return handle(command)
                .pipe(
                    map(result => {
                        return result.data[mutationName];
                    }),
                    catchError((error: any) => {
                        // should handle bad request with exception
                        // should handle bad request with validation
                        // should handle forbidden result 403
                        // should handle not authorized result 401

                        const apolloError : ApolloError = error;
                        if (!apolloError.networkError) {
                            const validationError = apolloError.graphQLErrors.find(t => t.extensions.code == 'ValidationError');
                            if (validationError) {
                                const extensions = validationError.extensions;
                                const result = Object.keys(extensions).filter(t => t != 'code').reduce((prev, attributeName) => {
                                    prev[attributeName] = extensions[attributeName];
                                    return prev;
                                }, {});

                                return throwError(<IDataSourceValidationError>{
                                    type: 'validation',
                                    errors: result
                                });
                            }
                        }

                        return throwError(<IDataSourceErrorMessage>{
                            type: 'message',
                            message: apolloError.message
                        });
                    })
                );
        };
        
        this._commands[name] = <IDataSourceCommandAdapterOptions<TModel>> {
            adapter: {
                handle: handleWrapper
            },
            resolveCommandModel: resolveCommandModel
        };

        return this;
    }

    private createGroupSelect(query: IQueryCriteria, group: IGroup, isLast: boolean) {
        let ret = `
            groupPath
            groupValue {
                ${this.createSelectVariant()}
            }
            hasSubGroups
            ${this.createAggregateSelect(query)}
        `;

        if (isLast) {
            ret += `
                data {
                    ${this.querySelect}
                }
            `;
        } else {
            ret += `
                subGroups {
                    ___INNER___
                }
            `;
        }

        return ret;
    }

    private createSelectVariant() {
        return `booleanValue dateTimeValue decimalValue intValue json longValue stringValue typeName`;   
    }

    private createQuerySelect(query: IQueryCriteria): string {
        if (query.groups && query.groups.length) {
            
            const groupSelect = query.groups.reduce((prev, current, currentIndex) => {
                const isLast = currentIndex+1 == query.groups.length;
                const group = this.createGroupSelect(query, current, isLast);
                return prev.replace('___INNER___', group);
            }, `
                groups { 
                    ___INNER___ 
                } 
            `);

            return groupSelect;
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
