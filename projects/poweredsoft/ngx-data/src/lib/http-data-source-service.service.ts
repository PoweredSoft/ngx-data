import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { HttpDataSourceOptionsBuilder } from "./HttpDataSourceBuilder";


@Injectable({
    providedIn: 'root'
})
export class HttpDataSourceService {
    constructor(private http: HttpClient) {
    }

    builder<TModel, TKey>() {
        return new HttpDataSourceOptionsBuilder<TModel, TKey>(this.http);
    }
}
