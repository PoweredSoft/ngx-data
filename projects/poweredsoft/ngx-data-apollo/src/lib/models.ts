export enum AggregateType {
    COUNT,
    SUM,
    AVG,
    LONGCOUNT,
    MIN,
    MAX,
    FIRST,
    FIRSTORDEFAULT,
    LAST,
    LASTORDEFAULT
}

export enum FilterType {
    EQUAL,
    CONTAINS,
    STARTSWITH,
    ENDSWITH,
    COMPOSITE,
    NOTEQUAL,
    GREATERTHAN,
    LESSTHANOREQUAL,
    GREATERTHANOREQUAL,
    LESSTHAN,
    IN,
    NOTIN
}

export interface IGraphQLVariantInput {
    dateTimeValue?: Date
    decimalValue?: number
    intValue?: number
    longValue?: number
    stringValue?: string
    booleanValue?: boolean;
}

export interface IGraphQLVariantResult {
    dateTimeValue?: string;
    decimalValue?: number;
    intValue?: number;
    json?: string;
    longValue?: number;
    stringValue?: string;
    booleanValue?: boolean;
    typeName: string;
}

export interface IGraphQLAdvanceQueryAggregateInput {
    path?: string;
    type: AggregateType;
}

export interface IGraphQLAdvanceQueryAggregateResult {
    path: string
    type: string
    value: IGraphQLVariantResult
}

export interface IGraphQLAdvanceQueryFilterInput {
    and?: boolean
    filters?: IGraphQLAdvanceQueryFilterInput[]
    not?: boolean
    path?: string
    type: FilterType
    value?: IGraphQLVariantInput
}

export interface IGraphQLAdvanceQueryGroupInput {
    ascending?: boolean
    path: string
}

export interface IGraphQLAdvanceQuerySortInput {
    ascending?: boolean
    path: string
}

export interface IGraphQLAdvanceQueryInput<T> {
    aggregates?: IGraphQLAdvanceQueryAggregateInput[]
    filters?: IGraphQLAdvanceQueryFilterInput[]
    groups?: IGraphQLAdvanceQueryGroupInput[]
    page?: number
    pageSize?: number
    sorts?: IGraphQLAdvanceQuerySortInput[]
}

export interface IGraphQLAdvanceQueryResult<T> {
    aggregates?: IGraphQLAdvanceQueryAggregateResult[];
    data?: T[];
    groups?: IGraphQLAdvanceQueryResult<T>[];
    numberOfPages?: number;
    totalRecords: number;
}