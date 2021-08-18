import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { HttpDataSourceOptionsBuilder } from "./HttpDataSourceBuilder";
import { SingleDataSourceOptionsBuilder } from "./SingleObjectDataSourceBuilder";
import { ListDataSourceOptionsBuilder } from "./ListDataSourceBuilder";


@Injectable({
    providedIn: 'root'
})
export class HttpDataSourceService {
    constructor(private http: HttpClient) {
    }

    builder<TModel, TKey>() {
        return new HttpDataSourceOptionsBuilder<TModel, TKey>(this.http);
    }

    singleBuilder<TQuery, TModel, TKey>() {
        return new SingleDataSourceOptionsBuilder<TQuery, TModel, TKey>(this.http);
    }

    listBuilder<TQuery, TModel, TKey>() {
        return new ListDataSourceOptionsBuilder<TQuery, TModel, TKey>(this.http);
    }
}
