import {NgModule} from '@angular/core';
import {ApolloModule, APOLLO_OPTIONS, Apollo} from 'apollo-angular';
import {HttpLinkModule, HttpLink} from 'apollo-angular-link-http';
import {InMemoryCache} from 'apollo-cache-inmemory';

@NgModule({
  exports: [ApolloModule, HttpLinkModule]
})
export class GraphQLModule {
  constructor(apollo: Apollo,
    httpLink: HttpLink)
    {
      const cache = new InMemoryCache();

      const endpoint = "https://localhost:5001/graphql";
      apollo.create({
        link: httpLink.create({uri: endpoint}),
        cache,
        defaultOptions: {
          query: {
            fetchPolicy: 'network-only'
          }
        }
      });
    }
}
